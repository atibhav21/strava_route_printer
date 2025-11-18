import { useState, useEffect } from 'react';
import { Route, RouteDetails, RouteStats, Theme } from './types';
import { getRouteDetails, getRouteStats } from './services/api';
import { getTheme } from './themes';
import { RouteSearch } from './components/RouteSearch';
import { MapView } from './components/MapView';
import { StatsPanel } from './components/StatsPanel';
import { ThemeSelector } from './components/ThemeSelector';
import './styles/main.css';

function App() {
    const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme('default'));
    const [selectedRoute, setSelectedRoute] = useState<RouteDetails | null>(null);
    const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
    const [loading, setLoading] = useState(false);

    // Apply theme to body
    useEffect(() => {
        document.body.style.backgroundColor = currentTheme.colors.background;
    }, [currentTheme]);

    const handleRouteSelect = async (route: Route) => {
        setLoading(true);
        setRouteStats(null);

        try {
            // Fetch full route details
            const details = await getRouteDetails(route.id);
            setSelectedRoute(details);

            // Try to fetch stats (might not always be available)
            try {
                const stats = await getRouteStats(route.id);
                setRouteStats(stats);
            } catch (err) {
                console.log('Stats not available for this route');
            }
        } catch (err) {
            console.error('Failed to load route details:', err);
            alert('Failed to load route details');
        } finally {
            setLoading(false);
        }
    };

    const handleThemeChange = (theme: Theme) => {
        setCurrentTheme(theme);
    };

    return (
        <div className="app" style={{ backgroundColor: currentTheme.colors.background }}>
            <header className="app-header" style={{ backgroundColor: currentTheme.colors.surface }}>
                <h1 style={{ color: currentTheme.colors.text }}>Strava Route Viewer</h1>
                <ThemeSelector currentTheme={currentTheme} onThemeChange={handleThemeChange} />
            </header>

            <div className="app-content">
                <aside className="sidebar" style={{ backgroundColor: currentTheme.colors.surface }}>
                    <RouteSearch onRouteSelect={handleRouteSelect} theme={currentTheme} />
                    {loading && (
                        <div className="loading" style={{ color: currentTheme.colors.text }}>
                            Loading route...
                        </div>
                    )}
                    <StatsPanel route={selectedRoute} stats={routeStats} theme={currentTheme} />
                </aside>

                <main className="main-content">
                    <MapView route={selectedRoute} theme={currentTheme} />
                </main>
            </div>
        </div>
    );
}

export default App;