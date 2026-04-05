import { useEffect, useMemo, useRef, useState } from 'react';
import { RouteDetails, RouteStats, Theme } from '../types';
import jsPDF from 'jspdf';

import { resolveMapImageSrc, getStaticMapImageDimsForPaper, PaperSize } from '../services/mapExport';
import { PrintableRoute, StatKey } from './PrintableRoute';
import { blobUrlToBase64 } from '../utils/image';
import { statValueFor } from '../utils/stats';

type PrintComposerProps = {
    route: RouteDetails | null;
    stats: RouteStats | null;
    theme: Theme;
    map: mapboxgl.Map | null;
};

type StatOption = {
    key: StatKey;
    label: string;
};

const statOptions: StatOption[] = [
    { key: 'distance', label: 'Distance' },
    { key: 'elevation_gain', label: 'Elevation Gain' },
    { key: 'avg_pace', label: 'Avg Pace' },
    { key: 'best_pace', label: 'Best Pace' },
    { key: 'avg_speed', label: 'Avg Speed' },
    { key: 'max_speed', label: 'Max Speed' },
    { key: 'moving_time', label: 'Moving Time' },
    { key: 'elapsed_time', label: 'Elapsed Time' },
    { key: 'avg_heartrate', label: 'Avg Heart Rate' },
    { key: 'max_heartrate', label: 'Max Heart Rate' },
    { key: 'avg_watts', label: 'Avg Power' },
    { key: 'kilojoules', label: 'Energy (kJ)' },
];

const paperOptions: { key: PaperSize; label: string }[] = [
    { key: 'letter', label: 'Letter' },
    { key: 'a3', label: 'A3' },
];

const getElevationPoints = (route: RouteDetails): number[] => {
    // If your route has altitude stream data attached, use that.
    // Otherwise fall back to a flat line so the silhouette still renders.
    if ((route as any).altitude_stream?.length) {
        return (route as any).altitude_stream as number[];
    }
    // Strava segments sometimes carry elevation data
    if (route.segments?.length) {
        return route.segments
            .map((s: any) => s.average_grade ?? 0)
            .filter((v: number) => v != null);
    }
    return [];
};

const sanitizeFileName = (name: string) =>
    name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

export const PrintComposer = ({ route, stats, theme, map }: PrintComposerProps) => {
    const [paperSize, setPaperSize] = useState<PaperSize>('letter');
    const [printTitle, setPrintTitle] = useState('');
    const [selectedStatKeys, setSelectedStatKeys] = useState<StatKey[]>([
        'distance',
        'elevation_gain',
        'avg_pace',
    ]);

    const mapImageRef = useRef<string>('');

    const [mapImageSrc, setMapImageSrc] = useState<string>('');
    const [mapImageLoading, setMapImageLoading] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const captureRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (route) setPrintTitle(route.name);
    }, [route?.id]);

    useEffect(() => {
        // Generate a map preview image when paper size / route / map changes.
        if (!route || !map) {
            setMapImageSrc('');
            return;
        }

        let cancelled = false;
        const run = async () => {
            setMapImageLoading(true);
            try {
                const dims = getStaticMapImageDimsForPaper(paperSize);
                const src = await resolveMapImageSrc({
                    map,
                    route,
                    theme,
                    width: dims.width,
                    height: dims.height,
                });
                if (cancelled) return;
                setMapImageSrc(src);
            } catch (e) {
                if (cancelled) return;
                setMapImageSrc('');
            } finally {
                if (!cancelled) setMapImageLoading(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [route?.id, paperSize, map, theme.name]);

    const uiScale = useMemo(() => {
        return paperSize === 'a3' ? 0.36 : 0.44;
    }, [paperSize]);

    const effectiveTitle = printTitle?.trim() ? printTitle.trim() : route?.name || 'Route';

    const handleToggleStat = (key: StatKey) => {
        setSelectedStatKeys((prev) => {
            if (prev.includes(key)) return prev.filter((k) => k !== key);
            return [...prev, key];
        });
    };


    const handleDownloadPdf = async () => {
        if (!route) return;
        if (!mapImageRef.current) {
            setDownloadError('Map image is not ready yet.');
            return;
        }

        setDownloadError(null);
        setDownloadLoading(true);

        try {
            const isA3 = paperSize === 'a3';
            const p = theme.print;

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: isA3 ? 'a3' : 'letter',
            });

            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();

            // ── Page background ───────────────────────────────────────────
            doc.setFillColor(p.pageBg);
            doc.rect(0, 0, pageW, pageH, 'F');

            // ── Layout constants ──────────────────────────────────────────
            const margin = isA3 ? 10 : 8;      // outer page margin
            const footerH = isA3 ? 72 : 58;     // footer height
            const elevH = isA3 ? 18 : 14;     // elevation profile height
            const mapW = pageW - margin * 2;
            const mapH = pageH - footerH - elevH - margin * 2;

            // ── Map image (inset with margin) ─────────────────────────────
            doc.addImage(
                mapImageRef.current, 'PNG',
                margin, margin,
                mapW, mapH,
                undefined, 'FAST'
            );

            // ── Elevation profile ─────────────────────────────────────────
            // Filled silhouette drawn as a polygon using elevation data points
            const elevY = margin + mapH;
            const elevPoints = getElevationPoints(route); // see helper below

            if (elevPoints.length > 1) {
                const min = Math.min(...elevPoints);
                const max = Math.max(...elevPoints);
                const range = max - min || 1;

                const xs = elevPoints.map((_, i) =>
                    margin + (i / (elevPoints.length - 1)) * mapW
                );
                const ys = elevPoints.map((v) =>
                    elevY + elevH - ((v - min) / range) * elevH * 0.85
                );

                doc.setFillColor(p.accentRule);

                // Build polygon: left edge down, across points, right edge down, back
                const polyPoints: { x: number; y: number }[] = [
                    { x: margin, y: elevY + elevH },
                    ...xs.map((x, i) => ({ x, y: ys[i] })),
                    { x: margin + mapW, y: elevY + elevH },
                ];

                // jsPDF lines() expects relative coords — use lines from first point
                const first = polyPoints[0];
                const rest = polyPoints.slice(1).map((pt, i) => {
                    const prev = polyPoints[i];
                    return [pt.x - prev.x, pt.y - prev.y];
                });

                doc.lines(rest as any, first.x, first.y, [1, 1], 'F');
            } else {
                // Fallback: solid bar
                doc.setFillColor(p.accentRule);
                doc.rect(margin, elevY, mapW, elevH, 'F');
            }

            // ── Footer ────────────────────────────────────────────────────
            const footerY = elevY + elevH;
            const pad = isA3 ? 10 : 8;
            const halfW = mapW / 2;

            // Left column: title + date
            const titleSize = isA3 ? 20 : 15;
            const titleY = footerY + (isA3 ? 14 : 11);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(titleSize);
            doc.setTextColor(p.footerText);
            doc.text(effectiveTitle.toUpperCase(), margin + pad, titleY);

            const athlete =
                route.athlete?.firstname || route.athlete?.lastname
                    ? [route.athlete.firstname, route.athlete.lastname]
                        .filter(Boolean).join(' ')
                    : null;
            const dateStr = route.timestamp
                ? new Date(route.timestamp * 1000).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                })
                : null;
            const subtitle = [athlete, dateStr].filter(Boolean).join(' · ');

            if (subtitle) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(isA3 ? 9 : 7);
                doc.setTextColor(p.footerTextMuted);
                doc.text(subtitle, margin + pad, titleY + (isA3 ? 8 : 6));
            }

            // Right column: stats in 2-column grid
            const statsStartX = margin + halfW;
            const statColW = halfW / 2 - pad;
            const statRowH = isA3 ? 14 : 11;
            const statsStartY = footerY + (isA3 ? 10 : 8);
            const valueSize = isA3 ? 11 : 9;
            const labelSize = isA3 ? 7 : 5.5;

            selectedStatKeys.forEach((key, i) => {
                const item = statValueFor({ key, route, stats });
                const col = i % 2;
                const row = Math.floor(i / 2);
                const x = statsStartX + col * (statColW + pad);
                const y = statsStartY + row * statRowH;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(valueSize);
                doc.setTextColor(p.footerText);
                doc.text(item.unit ? `${item.value}${item.unit}` : item.value, x, y);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(labelSize);
                doc.setTextColor(p.footerTextMuted);
                doc.text(item.label, x, y + (isA3 ? 5 : 4));
            });

            // ── Save ──────────────────────────────────────────────────────
            const fileBase = sanitizeFileName(effectiveTitle) || `route_${route.id}`;
            doc.save(`${fileBase}.pdf`);
        } catch (e) {
            console.error('PDF generation failed:', e);
            setDownloadError('Failed to generate PDF.');
        } finally {
            setDownloadLoading(false);
        }
    };

    return (
        <div className="print-composer">
            <div className="print-composer-header">
                <h3 className="print-composer-title">Printable Route</h3>
            </div>

            {!route ? (
                <div className="print-composer-empty">Select a route to configure printing.</div>
            ) : (
                <>
                    <div className="print-control">
                        <label className="print-label">Title</label>
                        <input
                            className="print-input"
                            value={effectiveTitle}
                            onChange={(e) => setPrintTitle(e.target.value)}
                            placeholder="Route title"
                        />
                    </div>

                    <div className="print-control">
                        <label className="print-label">Paper</label>
                        <select
                            className="print-select"
                            value={paperSize}
                            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                        >
                            {paperOptions.map((p) => (
                                <option key={p.key} value={p.key}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="print-control">
                        <label className="print-label">Stats</label>
                        <div className="print-checkbox-grid">
                            {statOptions.map((opt) => (
                                <label key={opt.key} className="print-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedStatKeys.includes(opt.key)}
                                        onChange={() => handleToggleStat(opt.key)}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {mapImageLoading && <div className="print-status">Preparing map preview...</div>}
                    {downloadError && <div className="print-error">{downloadError}</div>}

                    <div className="print-actions">
                        <button
                            type="button"
                            className="print-download-button"
                            onClick={handleDownloadPdf}
                            disabled={downloadLoading || mapImageLoading || !map}
                        >
                            {downloadLoading ? 'Generating PDF...' : 'Download PDF'}
                        </button>
                    </div>

                    <div className="print-preview-shell">
                        <div className="print-preview-ui" style={{ transform: `scale(${uiScale})` }}>
                            <PrintableRoute
                                route={route}
                                stats={stats}
                                theme={theme}
                                printTitle={effectiveTitle}
                                selectedStatKeys={selectedStatKeys}
                                paperSize={paperSize}
                                onMapImageReady={(url) => { mapImageRef.current = url; }}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

