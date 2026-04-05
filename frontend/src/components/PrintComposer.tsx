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
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: isA3 ? 'a3' : 'letter',
            });

            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();

            // ── Layout constants ──────────────────────────────────────────
            const footerH = isA3 ? 70 : 55;
            const mapH = pageH - footerH;

            // ── 1. Map image ──────────────────────────────────────────────
            // Convert blob URL to base64 so jsPDF can embed it
            const imgBase64 = await blobUrlToBase64(mapImageRef.current);
            doc.addImage(imgBase64, 'PNG', 0, 0, pageW, mapH, undefined, 'FAST');

            const p = theme.print;

            // Narrower content column — centered, ~60% of page width
            const colLeft = pageW * 0.20;
            const colRight = pageW * 0.80;
            const colW = colRight - colLeft;

            // Footer bg
            doc.setFillColor(p.footerBg);
            doc.rect(0, mapH, pageW, footerH, 'F');

            // Accent rule — only under the content column, not full width
            doc.setDrawColor(p.accentRule);
            doc.setLineWidth(0.6);
            doc.line(colLeft, mapH, colRight, mapH);

            // Title — all caps, bold
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(isA3 ? 22 : 16);
            doc.setTextColor(p.footerText);
            doc.text(effectiveTitle.toUpperCase(), colLeft, mapH + (isA3 ? 14 : 11));

            // Divider
            const dividerY = mapH + (isA3 ? 28 : 22);
            doc.setDrawColor(p.accentRule);
            doc.setLineWidth(0.2);
            doc.line(colLeft, dividerY, colRight, dividerY);

            // Stats — distributed across the content column only
            const statsY = dividerY + (isA3 ? 10 : 8);
            const statColW = colW / selectedStatKeys.length;

            selectedStatKeys.forEach((key, i) => {
                const item = statValueFor({ key, route, stats });
                const x = colLeft + i * statColW;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(isA3 ? 14 : 10);
                doc.setTextColor(p.footerText);
                doc.text(item.unit ? `${item.value} ${item.unit}` : item.value, x, statsY);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(isA3 ? 7 : 5.5);
                doc.setTextColor(p.footerTextMuted);
                doc.text(item.label.toUpperCase(), x, statsY + (isA3 ? 6 : 4.5));
            });

            const fileBase = sanitizeFileName(effectiveTitle) || `route_${route.id}`;
            doc.save(`${fileBase}.pdf`);
        } catch (e) {
            console.error(e);
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

