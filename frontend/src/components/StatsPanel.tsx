import { RouteDetails, RouteStats, Theme } from '../types';

interface StatsPanelProps {
    route: RouteDetails | null;
    stats: RouteStats | null;
    theme: Theme;
}

export const StatsPanel = ({ route, stats, theme }: StatsPanelProps) => {
    if (!route) {
        return (
            <div className="stats-panel" style={{ backgroundColor: theme.colors.surface }}>
                <p style={{ color: theme.colors.textSecondary }}>Select a route to view statistics</p>
            </div>
        );
    }

    const formatDistance = (meters: number) => {
        const km = meters / 1000;
        return km.toFixed(2);
    };

    const formatElevation = (meters: number) => {
        return meters.toFixed(0);
    };

    const formatTime = (seconds?: number) => {
        if (!seconds) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const formatSpeed = (metersPerSecond?: number) => {
        if (!metersPerSecond) return 'N/A';
        const kmh = metersPerSecond * 3.6;
        return kmh.toFixed(1);
    };

    const formatPower = (watts?: number) => {
        if (!watts) return 'N/A';
        return watts.toFixed(0);
    };

    const formatHeartRate = (bpm?: number) => {
        if (!bpm) return 'N/A';
        return bpm.toFixed(0);
    };

    return (
        <div className="stats-panel" style={{ backgroundColor: theme.colors.surface }}>
            <h2 style={{ color: theme.colors.text }}>{route.name}</h2>
            {route.description && (
                <p className="route-description" style={{ color: theme.colors.textSecondary }}>
                    {route.description}
                </p>
            )}

            <div className="stats-grid">
                <div className="stat-item" style={{ borderColor: theme.colors.border }}>
                    <div className="stat-label" style={{ color: theme.colors.textSecondary }}>
                        Distance
                    </div>
                    <div className="stat-value" style={{ color: theme.colors.text }}>
                        {formatDistance(route.distance)} <span className="stat-unit">km</span>
                    </div>
                </div>

                <div className="stat-item" style={{ borderColor: theme.colors.border }}>
                    <div className="stat-label" style={{ color: theme.colors.textSecondary }}>
                        Elevation Gain
                    </div>
                    <div className="stat-value" style={{ color: theme.colors.text }}>
                        {formatElevation(route.elevation_gain)} <span className="stat-unit">m</span>
                    </div>
                </div>

                {stats && (
                    <>
                        {stats.moving_time && (
                            <div className="stat-item" style={{ borderColor: theme.colors.border }}>
                                <div className="stat-label" style={{ color: theme.colors.textSecondary }}>
                                    Moving Time
                                </div>
                                <div className="stat-value" style={{ color: theme.colors.text }}>
                                    {formatTime(stats.moving_time)}
                                </div>
                            </div>
                        )}

                        {stats.average_speed && (
                            <div className="stat-item" style={{ borderColor: theme.colors.border }}>
                                <div className="stat-label" style={{ color: theme.colors.textSecondary }}>
                                    Avg Speed
                                </div>
                                <div className="stat-value" style={{ color: theme.colors.text }}>
                                    {formatSpeed(stats.average_speed)} <span className="stat-unit">km/h</span>
                                </div>
                            </div>
                        )}

                        {stats.max_speed && (
                            <div className="stat-item" style={{ borderColor: theme.colors.border }}>
                                <div className="stat-label" style={{ color: theme.colors.textSecondary }}>
                                    Max Speed
                                </div>
                                <div className="stat-value" style={{ color: theme.colors.text }}>
                                    {formatSpeed(stats.max_speed)} <span className="stat-unit">km/h</span>
                                </div>
                            </div>
                        )}

                        {stats.average_heartrate && (
                            <div className="stat-item" style={{ borderColor: theme.colors.border }}>
                                <div className="stat-label" style={{ color: theme.colors.textSecondary }}>
                                    Avg Heart Rate
                                </div>
                                <div className="stat-value" style={{ color: theme.colors.text }}>
                                    {formatHeartRate(stats.average_heartrate)} <span className="stat-unit">bpm</span>
                                </div>
                            </div>
                        )}

                        {stats.average_watts && (
                            <div className="stat-item" style={{ borderColor: theme.colors.border }}>
                                <div className="stat-label" style={{ color: theme.colors.textSecondary }}>
                                    Avg Power
                                </div>
                                <div className="stat-value" style={{ color: theme.colors.text }}>
                                    {formatPower(stats.average_watts)} <span className="stat-unit">W</span>
                                </div>
                            </div>
                        )}

                        {stats.kilojoules && (
                            <div className="stat-item" style={{ borderColor: theme.colors.border }}>
                                <div className="stat-label" style={{ color: theme.colors.textSecondary }}>
                                    Energy
                                </div>
                                <div className="stat-value" style={{ color: theme.colors.text }}>
                                    {stats.kilojoules.toFixed(0)} <span className="stat-unit">kJ</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};