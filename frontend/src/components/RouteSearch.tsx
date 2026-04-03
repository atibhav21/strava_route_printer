import { useRef, useState } from 'react';
import { Route, RouteDetails } from '../types';
import { searchRoutes, uploadRouteFromFile } from '../services/api';

interface RouteSearchProps {
    onRouteSelect: (route: Route, preloadedDetails?: RouteDetails) => void;
    theme: any;
}

export const RouteSearch = ({ onRouteSelect, theme }: RouteSearchProps) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Route[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const routes = await searchRoutes(query);
            setResults(routes);
        } catch (err) {
            setError('Failed to search routes. Please try again.');
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const formatDistance = (meters: number) => {
        const km = meters / 1000;
        return km.toFixed(2) + ' km';
    };

    const formatElevation = (meters: number) => {
        return meters.toFixed(0) + ' m';
    };

    const routeElevation = (route: Route) =>
        route.total_elevation_gain ?? route.elevation_gain ?? 0;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setLoading(true);
        setError(null);
        try {
            const details = await uploadRouteFromFile(file);
            const route: Route = {
                id: details.id,
                name: details.name,
                distance: details.distance,
                total_elevation_gain: details.total_elevation_gain,
                map: details.map,
            };
            onRouteSelect(route, details);
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { detail?: string } } };
            const detail = ax.response?.data?.detail;
            setError(
                typeof detail === 'string'
                    ? detail
                    : 'Could not read GPX. Export the activity or route from Strava as GPX (.gpx).'
            );
            console.error('Upload error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="route-search">
            <div className="file-upload-row">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".gpx,application/gpx+xml"
                    onChange={handleFileChange}
                    className="file-input-hidden"
                    aria-label="Upload GPX from Strava"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="search-button upload-route-button"
                    style={{
                        backgroundColor: theme.colors.secondary,
                        color: '#ffffff',
                        width: '100%',
                    }}
                >
                    {loading ? 'Loading…' : 'Upload GPX (Strava export)'}
                </button>
            </div>
            <div className="search-input-container">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search for routes..."
                    className="search-input"
                    style={{
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                    }}
                />
                <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="search-button"
                    style={{
                        backgroundColor: theme.colors.primary,
                        color: '#ffffff',
                    }}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {error && (
                <div className="error-message" style={{ color: '#d32f2f' }}>
                    {error}
                </div>
            )}

            {results.length > 0 && (
                <div className="search-results">
                    <h3 style={{ color: theme.colors.text }}>Results</h3>
                    <ul className="results-list">
                        {results.map((route) => (
                            <li
                                key={route.id}
                                onClick={() => onRouteSelect(route)}
                                className="result-item"
                                style={{
                                    backgroundColor: theme.colors.surface,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text,
                                }}
                            >
                                <div className="result-name">{route.name}</div>
                                <div className="result-details" style={{ color: theme.colors.textSecondary }}>
                                    {formatDistance(route.distance)} • {formatElevation(routeElevation(route))} elevation
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};