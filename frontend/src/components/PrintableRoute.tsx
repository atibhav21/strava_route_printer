import { RouteDetails, RouteStats, Theme } from '../types';
import type { PaperSize } from '../services/mapExport';
import { MapboxStaticImage } from './MapboxStaticImage';
import { statValueFor } from '../utils/stats';

export type StatKey =
    | 'distance'
    | 'elevation_gain'
    | 'moving_time'
    | 'elapsed_time'
    | 'avg_pace'
    | 'best_pace'
    | 'avg_speed'
    | 'max_speed'
    | 'avg_heartrate'
    | 'max_heartrate'
    | 'avg_watts'
    | 'kilojoules';

type PrintableRouteProps = {
    route: RouteDetails;
    stats: RouteStats | null;
    theme: Theme;
    printTitle: string;
    selectedStatKeys: StatKey[];
    // mapImageSrc: string;
    paperSize: PaperSize;

    onMapImageReady?: (blobUrl: string) => void;
};



export const PrintableRoute = ({
    route,
    stats,
    theme,
    printTitle,
    selectedStatKeys,
    paperSize,
    onMapImageReady,
}: PrintableRouteProps) => {
    const orderedKeys: StatKey[] = [
        'distance',
        'elevation_gain',
        'avg_pace',
        'best_pace',
        'avg_speed',
        'max_speed',
        'moving_time',
        'elapsed_time',
        'avg_heartrate',
        'max_heartrate',
        'avg_watts',
        'kilojoules',
    ];

    const keysToRender = orderedKeys.filter((k) => selectedStatKeys.includes(k));

    return <div className={`print-page ${paperSize}`}>
        <div className="poster-map">
            <MapboxStaticImage
                route={route}
                width={800}
                height={1100}
                styleId={theme.print.printStyleUrl}
                accessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                strokeColor={theme.name === 'dark' ? 'ffffff' : 'ff6b35'}
                strokeWidth={4}
                onSrcReady={onMapImageReady}
            />
        </div>

        <div className="print-overlay">
            <div className="print-title">{printTitle}</div>

            <div className="print-stats-inline">
                {keysToRender.map((key) => {
                    const item = statValueFor({
                        key,
                        route,
                        stats,
                    });
                    return (
                        <div key={key} className="print-stat-inline">
                            <span className="value">{item.value}</span>
                            {item.unit && <span className="unit">{item.unit}</span>}
                            <span className="label">{item.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
};

