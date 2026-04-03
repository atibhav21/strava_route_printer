import React from 'react';
import { RouteDetails, RouteStats, Theme } from '../types';
import type { PaperSize } from '../services/mapExport';

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
    mapImageSrc: string;
    paperSize: PaperSize;
};

const formatDistanceKm = (meters: number) => {
    const km = meters / 1000;
    return km.toFixed(2);
};

const formatElevationM = (meters: number) => meters.toFixed(0);

const formatTime = (seconds?: number) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const formatSpeedKmh = (metersPerSecond?: number) => {
    if (!metersPerSecond || metersPerSecond <= 0) return 'N/A';
    const kmh = metersPerSecond * 3.6;
    return kmh.toFixed(1);
};

const formatPaceFromSpeedMinPerKm = (metersPerSecond?: number) => {
    if (!metersPerSecond || metersPerSecond <= 0) return 'N/A';
    const secondsPerKm = 1000 / metersPerSecond;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);
    const paddedSeconds = seconds.toString().padStart(2, '0');
    return `${minutes}:${paddedSeconds}`;
};

const formatPaceFromTimeAndDistanceMinPerKm = (
    movingTimeSeconds?: number,
    distanceMeters?: number
) => {
    if (!movingTimeSeconds || !distanceMeters || distanceMeters <= 0) return 'N/A';
    const secondsPerKm = movingTimeSeconds / (distanceMeters / 1000);
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);
    const paddedSeconds = seconds.toString().padStart(2, '0');
    return `${minutes}:${paddedSeconds}`;
};

const formatPowerW = (watts?: number) => {
    if (!watts || watts <= 0) return 'N/A';
    return watts.toFixed(0);
};

const formatHeartRateBpm = (bpm?: number) => {
    if (!bpm || bpm <= 0) return 'N/A';
    return bpm.toFixed(0);
};

const getElevationGainM = (route: RouteDetails) => {
    // Strava uses total_elevation_gain; we also keep elevation_gain for fallback.
    return route.total_elevation_gain ?? (route as any).elevation_gain ?? 0;
};

export const PrintableRoute = ({
    route,
    stats,
    theme,
    printTitle,
    selectedStatKeys,
    mapImageSrc,
    paperSize,
}: PrintableRouteProps) => {
    const elevM = getElevationGainM(route);

    const avgPace =
        stats?.average_speed != null
            ? formatPaceFromSpeedMinPerKm(stats.average_speed)
            : formatPaceFromTimeAndDistanceMinPerKm(stats?.moving_time, stats?.distance);

    const bestPace = formatPaceFromSpeedMinPerKm(stats?.max_speed);

    const statValueFor = (key: StatKey): { label: string; value: string; unit?: string } => {
        switch (key) {
            case 'distance':
                return { label: 'Distance', value: formatDistanceKm(route.distance), unit: 'km' };
            case 'elevation_gain':
                return {
                    label: 'Elevation Gain',
                    value: formatElevationM(elevM),
                    unit: 'm',
                };
            case 'moving_time':
                return { label: 'Moving Time', value: formatTime(stats?.moving_time), unit: undefined };
            case 'elapsed_time':
                return { label: 'Elapsed Time', value: formatTime(stats?.elapsed_time), unit: undefined };
            case 'avg_pace':
                return { label: 'Avg Pace', value: avgPace, unit: 'min/km' };
            case 'best_pace':
                return { label: 'Best Pace', value: bestPace, unit: 'min/km' };
            case 'avg_speed':
                return { label: 'Avg Speed', value: formatSpeedKmh(stats?.average_speed), unit: 'km/h' };
            case 'max_speed':
                return { label: 'Max Speed', value: formatSpeedKmh(stats?.max_speed), unit: 'km/h' };
            case 'avg_heartrate':
                return { label: 'Avg Heart Rate', value: formatHeartRateBpm(stats?.average_heartrate), unit: 'bpm' };
            case 'max_heartrate':
                return { label: 'Max Heart Rate', value: formatHeartRateBpm(stats?.max_heartrate), unit: 'bpm' };
            case 'avg_watts':
                return { label: 'Avg Power', value: formatPowerW(stats?.average_watts), unit: 'W' };
            case 'kilojoules':
                return {
                    label: 'Energy',
                    value: stats?.kilojoules != null ? stats.kilojoules.toFixed(0) : 'N/A',
                    unit: 'kJ',
                };
            default:
                return { label: 'Unknown', value: 'N/A' };
        }
    };

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

    return (
        <div className={`print-page ${paperSize}`} style={{ backgroundColor: '#fff', color: '#000' }}>
            <div className="print-page-inner">
                <div className="print-header">
                    <div className="print-title" style={{ color: '#000' }}>
                        {printTitle}
                    </div>
                </div>

                <div className="print-map">
                    {/* data URL or a CORS-enabled image URL */}
                    <img className="print-map-img" src={mapImageSrc} crossOrigin="anonymous" alt="Route map" />
                </div>

                <div className="print-stats-grid">
                    {keysToRender.length === 0 ? (
                        <div className="print-no-stats">Select stats to include.</div>
                    ) : (
                        keysToRender.map((key) => {
                            const item = statValueFor(key);
                            return (
                                <div key={key} className="print-stat-item" style={{ borderColor: '#000' }}>
                                    <div className="print-stat-label">{item.label}</div>
                                    <div className="print-stat-value">{item.value}</div>
                                    {item.unit ? <div className="print-stat-unit">{item.unit}</div> : null}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="print-footer">
                    <div className="print-accent-bar" style={{ backgroundColor: theme.colors.accent }} />
                </div>
            </div>
        </div>
    );
};

