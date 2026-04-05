// components/MapboxStaticImage.tsx
import { useEffect, useState } from 'react';
import { decodePolyline } from '../utils/decodePolyline';
import { Route } from '../types';

type Props = {
    route: Route;
    width: number;
    height: number;
    styleId: string;         // e.g. 'dark-v11', 'outdoors-v12'
    accessToken: string;
    strokeColor?: string;     // hex without #
    strokeWidth?: number;
    strokeOpacity?: number;

    onSrcReady?: (blobUrl: string) => void;
};

const simplifyPolyline = (coords: [number, number][], tolerance = 0.0001): [number, number][] => {
    if (coords.length <= 2) return coords;


    const sqSegDist = (p: [number, number], a: [number, number], b: [number, number]) => {
        let [x, y] = a, [dx, dy] = [b[0] - a[0], b[1] - a[1]];
        if (dx || dy) {
            const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) { x = b[0]; y = b[1]; }
            else if (t > 0) { x += dx * t; y += dy * t; }
        }
        return (p[0] - x) ** 2 + (p[1] - y) ** 2;
    };

    // Ramer-Douglas-Peucker
    const rdp = (points: [number, number][], sqTol: number): [number, number][] => {
        let maxSqDist = 0, idx = 0;
        for (let i = 1; i < points.length - 1; i++) {
            const d = sqSegDist(points[i], points[0], points[points.length - 1]);
            if (d > maxSqDist) { maxSqDist = d; idx = i; }
        }
        if (maxSqDist > sqTol) {
            return [
                ...rdp(points.slice(0, idx + 1), sqTol).slice(0, -1),
                ...rdp(points.slice(idx), sqTol),
            ];
        }
        return [points[0], points[points.length - 1]];
    };

    return rdp(coords, tolerance * tolerance);
};

// Re-encode simplified coords back to polyline for the Mapbox URL
const encodePolyline = (coords: [number, number][]): string => {
    let output = '';
    let prevLat = 0, prevLng = 0;

    const encodeVal = (val: number) => {
        let v = Math.round(val * 1e5);
        v = v < 0 ? ~(v << 1) : v << 1;
        let chunk = '';
        while (v >= 0x20) {
            chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
            v >>= 5;
        }
        return chunk + String.fromCharCode(v + 63);
    };

    for (const [lng, lat] of coords) {
        output += encodeVal(lat - prevLat);
        output += encodeVal(lng - prevLng);
        prevLat = lat;
        prevLng = lng;
    }
    return output;
};

export const MapboxStaticImage = ({
    route,
    width,
    height,
    styleId,
    accessToken,
    strokeColor = 'ffffff',
    strokeWidth = 3,
    strokeOpacity = 1,
    onSrcReady,
}: Props) => {
    const [src, setSrc] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const encoded = route.map.polyline ?? route.map.summary_polyline;
        if (!encoded) return;

        let objectUrl: string | null = null;

        const run = async () => {
            setError(false);
            setSrc(null);

            const coords = decodePolyline(encoded);
            // Simplify aggressively to stay under URL length limits (~8k chars)
            const simplified = simplifyPolyline(coords, 0.0002);
            const reEncoded = encodePolyline(simplified);

            const resolvedStyle = styleId.startsWith('mapbox://styles/')
                ? styleId.replace('mapbox://styles/', '')   // → 'your-username/style-id'
                : `mapbox/${styleId}`;

            const path = `path-${strokeWidth}+${strokeColor}-${strokeOpacity}(${encodeURIComponent(reEncoded)})`;
            const url = [
                `https://api.mapbox.com/styles/v1/${resolvedStyle}/static`,
                `/${path}`,
                `/auto`,
                `/${width}x${height}@2x`,
                `?padding=60&access_token=${accessToken}`,
            ].join('');

            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Mapbox error ${res.status}`);
                const blob = await res.blob();
                objectUrl = URL.createObjectURL(blob);
                setSrc(objectUrl);

                onSrcReady?.(objectUrl);
            } catch {
                setError(true);
            }
        };

        run();

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [route.id, width, height, styleId, accessToken, strokeColor, strokeWidth]);

    if (error) return <div className="poster-map-fallback">Map unavailable</div>;
    if (!src) return <div className="poster-map-fallback poster-map-loading" />;

    return (
        <img
            src={src}
            width={width}
            height={height}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
    );
};