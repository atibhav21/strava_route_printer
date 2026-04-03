"""Parse Strava / standard GPX into activity-shaped payloads."""

from __future__ import annotations

import hashlib
import math
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Tuple

from .models import DetailedActivity, RouteMap

Point = Tuple[float, float]  # (lat, lng)


def _encode_signed(n: int) -> str:
    sgn = n << 1
    if n < 0:
        sgn = ~sgn
    chunks: List[str] = []
    while sgn >= 0x20:
        chunks.append(chr((0x20 | (sgn & 0x1F)) + 63))
        sgn >>= 5
    chunks.append(chr(sgn + 63))
    return "".join(chunks)


def encode_polyline(lat_lngs: List[Point]) -> str:
    """Encode (lat, lng) pairs as a Google-encoded polyline."""
    last_lat = last_lng = 0
    out: List[str] = []
    for lat, lng in lat_lngs:
        ilat = int(round(lat * 1e5))
        ilng = int(round(lng * 1e5))
        dlat = ilat - last_lat
        dlng = ilng - last_lng
        last_lat, last_lng = ilat, ilng
        out.append(_encode_signed(dlat))
        out.append(_encode_signed(dlng))
    return "".join(out)


def _haversine_m(a: Point, b: Point) -> float:
    r = 6_371_000.0
    la1, lo1 = math.radians(a[0]), math.radians(a[1])
    la2, lo2 = math.radians(b[0]), math.radians(b[1])
    dla = la2 - la1
    dlo = lo2 - lo1
    h = (
        math.sin(dla / 2) ** 2
        + math.cos(la1) * math.cos(la2) * math.sin(dlo / 2) ** 2
    )
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


def path_distance_m(points: List[Point]) -> float:
    if len(points) < 2:
        return 0.0
    return sum(_haversine_m(points[i], points[i + 1]) for i in range(len(points) - 1))


def elevation_gain_m(elevations: List[float]) -> float:
    if len(elevations) < 2:
        return 0.0
    gain = 0.0
    for i in range(1, len(elevations)):
        d = elevations[i] - elevations[i - 1]
        if d > 0:
            gain += d
    return gain


def _local_tag(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def parse_gpx(
    content: str,
) -> Tuple[List[Point], List[float | None], str | None]:
    """
    Strava activity GPX uses <trkpt>; saved routes often use <rtept>.
    Both use lat/lon attributes like standard GPX 1.1.
    """
    root = ET.fromstring(content)
    points: List[Point] = []
    eles: List[float | None] = []
    first_time: str | None = None

    for el in root.iter():
        tag = _local_tag(el.tag)
        if tag not in ("trkpt", "rtept"):
            continue
        lat_s = el.get("lat")
        lon_s = el.get("lon")
        if lat_s is None or lon_s is None:
            continue
        lat, lon = float(lat_s), float(lon_s)
        elev: float | None = None
        for child in el:
            ln = _local_tag(child.tag)
            if ln == "ele" and child.text:
                try:
                    elev = float(child.text.strip())
                except ValueError:
                    pass
            elif ln == "time" and child.text and first_time is None:
                first_time = child.text.strip()
        points.append((lat, lon))
        eles.append(elev)

    return points, eles, first_time


def stable_route_id(content: bytes) -> int:
    h = hashlib.sha256(content).hexdigest()
    return int(h[:12], 16) % (2**31 - 1)


def filename_to_name(filename: str) -> str:
    base = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    base = re.sub(r"\.gpx$", "", base, flags=re.I)
    return base or "Uploaded route"


def build_activity_from_points(
    *,
    name: str,
    points: List[Point],
    elevations: List[float | None],
    start_date_local: str,
    route_id: int,
) -> DetailedActivity:
    if len(points) < 2:
        raise ValueError("Need at least two points in the GPX track or route")

    dist_m = path_distance_m(points)
    enc = encode_polyline(points)
    if (
        len(elevations) == len(points)
        and elevations
        and all(x is not None for x in elevations)
    ):
        ele_gain = elevation_gain_m([float(x) for x in elevations])
    else:
        ele_gain = 0.0

    return DetailedActivity(
        id=route_id,
        name=name,
        distance=dist_m,
        moving_time=0,
        total_elevation_gain=ele_gain,
        sport_type="gpx",
        start_date_local=start_date_local,
        map=RouteMap(summary_polyline=enc, polyline=enc),
    )


def parse_route_file(*, content: bytes, filename: str) -> DetailedActivity:
    # utf-8-sig strips UTF-8 BOM (common from Windows / some exporters)
    text = content.decode("utf-8-sig", errors="replace")
    name = filename_to_name(filename)
    rid = stable_route_id(content)
    lower = filename.lower()
    stripped = text.lstrip()

    looks_like_xml = stripped.startswith("<")
    is_gpx_name = lower.endswith(".gpx")

    if not (is_gpx_name or looks_like_xml):
        raise ValueError("Only GPX files are supported. In Strava: ⋮ → Export GPX.")

    if not looks_like_xml:
        raise ValueError(
            "File does not look like GPX (XML). Export from Strava as GPX and try again."
        )

    try:
        points, eles, t = parse_gpx(text)
    except ET.ParseError as e:
        raise ValueError(f"Could not parse GPX XML: {e}") from e

    if len(points) < 2:
        raise ValueError(
            "No usable points in GPX. Strava activity files use <trkpt>; "
            "saved routes use <rtept>. Re-export as GPX from Strava."
        )

    start = t or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return build_activity_from_points(
        name=name,
        points=points,
        elevations=eles,
        start_date_local=start,
        route_id=rid,
    )
