import { useEffect, useMemo, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';
import { RouteDetails, RouteStats, Theme } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { resolveMapImageSrc, getStaticMapImageDimsForPaper, PaperSize } from '../services/mapExport';
import { PrintableRoute, StatKey } from './PrintableRoute';

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
        if (!captureRef.current) return;
        if (!map) return;
        if (!mapImageSrc) {
            setDownloadError('Map image is not ready yet. Try again in a moment.');
            return;
        }

        setDownloadError(null);
        setDownloadLoading(true);
        try {
            const canvas = await html2canvas(captureRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: paperSize === 'a3' ? 'a3' : 'letter',
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);

            const fileBase = sanitizeFileName(effectiveTitle) || `route_${route.id}`;
            doc.save(`${fileBase}.pdf`);
        } catch (e) {
            setDownloadError('Failed to generate PDF. If the map export is tainted by cross-origin content, try again.');
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
                                mapImageSrc={mapImageSrc}
                                paperSize={paperSize}
                            />
                        </div>

                        {/* Offscreen, unscaled preview for stable PDF capture */}
                        <div
                            ref={captureRef}
                            className="print-preview-capture"
                            aria-hidden="true"
                        >
                            <PrintableRoute
                                route={route}
                                stats={stats}
                                theme={theme}
                                printTitle={effectiveTitle}
                                selectedStatKeys={selectedStatKeys}
                                mapImageSrc={mapImageSrc}
                                paperSize={paperSize}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

