import type mapboxgl from 'mapbox-gl';
import { RouteDetails, Theme } from '../types';
import { decodePolyline } from './api';

export type PaperSize = 'letter' | 'a3';

const MAX_LINE_POINTS = 120;

function sampleLinePoints(points: [number, number][]): [number, number][] {
    if (points.length <= MAX_LINE_POINTS) return points;
    const step = Math.ceil(points.length / MAX_LINE_POINTS);
    const sampled = points.filter((_, i) => i % step === 0);
    // Ensure endpoints are always included.
    if (sampled.length === 0) return points.slice(0, 2);
    const first = points[0];
    const last = points[points.length - 1];
    if (sampled[0][0] !== first[0] || sampled[0][1] !== first[1]) sampled.unshift(first);
    if (
        sampled[sampled.length - 1][0] !== last[0] ||
        sampled[sampled.length - 1][1] !== last[1]
    ) {
        sampled.push(last);
    }
    return sampled;
}

function waitForMapIdle(map: mapboxgl.Map, timeoutMs = 5000): Promise<void> {
    return new Promise((resolve) => {
        const timeout = window.setTimeout(() => resolve(), timeoutMs);
        map.once('idle', () => {
            window.clearTimeout(timeout);
            resolve();
        });
    });
}

function parseMapboxStyle(style: string): { username: string; styleId: string } | null {
    // Example: "mapbox://styles/mapbox/streets-v12"
    const cleaned = style.replace(/^mapbox:\/\//, '');
    const parts = cleaned.split('/');
    if (parts.length < 3 || parts[0] !== 'styles') return null;
    const username = parts[1];
    const styleId = parts.slice(2).join('/');
    if (!username || !styleId) return null;
    return { username, styleId };
}

function buildStaticImageUrl(opts: {
    map: mapboxgl.Map;
    route: RouteDetails;
    theme: Theme;
    width: number;
    height: number;
}): string {
    const { map, route, theme, width, height } = opts;
    const token = import.meta.env.VITE_MAPBOX_TOKEN || '';
    const styleParts = parseMapboxStyle(theme.map.style);

    if (!styleParts) {
        throw new Error(`Unsupported Mapbox style format: ${theme.map.style}`);
    }

    const polyline = route.map.polyline || route.map.summary_polyline;
    const coords = polyline ? sampleLinePoints(decodePolyline(polyline)) : null;

    const bounds = map.getBounds();
    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;

    if (coords && coords.length >= 2) {
        // Static Images API geojson overlay with simplestyle-spec line styling.
        const geojson = {
            type: 'Feature',
            properties: {
                stroke: theme.map.routeColor,
                'stroke-width': theme.map.routeWidth,
                'stroke-opacity': theme.map.routeOpacity,
            },
            geometry: {
                type: 'LineString',
                coordinates: coords.map(([lng, lat]) => [
                    // Keep the URL reasonably short.
                    Number(lng.toFixed(5)),
                    Number(lat.toFixed(5)),
                ]),
            },
        };

        const overlay = `geojson(${JSON.stringify(geojson)})`;
        const overlayEncoded = encodeURIComponent(overlay);

        return `https://api.mapbox.com/styles/v1/${styleParts.username}/${styleParts.styleId}/static/${overlayEncoded}/${bbox}/${width}x${height}?access_token=${encodeURIComponent(token)}`;
    }

    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing();
    const pitch = map.getPitch();

    return `https://api.mapbox.com/styles/v1/${styleParts.username}/${styleParts.styleId}/static/${center.lng},${center.lat},${zoom},${bearing},${pitch}/${width}x${height}?access_token=${encodeURIComponent(
        token
    )}`;
}

export async function resolveMapImageSrc(opts: {
    map: mapboxgl.Map;
    route: RouteDetails;
    theme: Theme;
    width: number;
    height: number;
}): Promise<string> {
    const { map, route, theme, width, height } = opts;

    // 1) Canvas export (fastest), but may fail due to CORS/taint.
    await waitForMapIdle(map);
    try {
        return map.getCanvas().toDataURL('image/png');
    } catch {
        // Fall through to static image fallback.
    }

    // 2) Static image fallback: request a pre-rendered image from Mapbox.
    return buildStaticImageUrl({ map, route, theme, width, height });
}

export function getStaticMapImageDimsForPaper(paperSize: PaperSize): {
    width: number;
    height: number;
} {
    // These dimensions are intended to keep enough detail for a one-page PDF capture.
    if (paperSize === 'a3') return { width: 1400, height: 900 };
    return { width: 1200, height: 750 };
}

