import { useState, useEffect } from 'react';
import { Route, RouteDetails, RouteStats, Theme } from './types';
import { getRouteDetails, getRouteStats, logout, whoAmI } from './services/api';
import { getTheme } from './themes';
import { RouteSearch } from './components/RouteSearch';
import { MapView } from './components/MapView';
import { StatsPanel } from './components/StatsPanel';
import { PrintComposer } from './components/PrintComposer';
import { ThemeSelector } from './components/ThemeSelector';
import { AuthLanding } from './components/AuthLanding';
// import type mapboxgl from 'mapbox-gl';
import './styles/main.css';

function App() {
    const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme('default'));
    const [authLoading, setAuthLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<RouteDetails | null>(null);
    const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

    // Apply theme to body
    useEffect(() => {
        document.body.style.backgroundColor = currentTheme.colors.background;
    }, [currentTheme]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                await whoAmI();
                if (cancelled) return;
                setIsAuthenticated(true);
            } catch (err) {
                if (cancelled) return;
                setIsAuthenticated(false);
            } finally {
                if (cancelled) return;
                setAuthLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleRouteSelect = async (route: Route, preloadedDetails?: RouteDetails) => {
        setLoading(true);
        setRouteStats(null);

        try {
            if (preloadedDetails) {
                setSelectedRoute(preloadedDetails);
            } else {
                const details = await getRouteDetails(route.id);
                setSelectedRoute(details);

                try {
                    const stats = await getRouteStats(route.id);
                    setRouteStats(stats);
                } catch (err) {
                    console.log('Stats not available for this route');
                }
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

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            setIsAuthenticated(false);
            setSelectedRoute(null);
            setRouteStats(null);
        }
    };

    if (authLoading) {
        return (
            <div className="app" style={{ backgroundColor: currentTheme.colors.background }}>
                <header className="app-header" style={{ backgroundColor: currentTheme.colors.surface }}>
                    <h1 style={{ color: currentTheme.colors.text }}>Strava Route Viewer</h1>
                </header>
                <div style={{ padding: '1rem', color: currentTheme.colors.textSecondary }}>
                    Checking Strava connection...
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <AuthLanding
                theme={currentTheme}
                onConnect={() => {
                    window.location.href = '/api/strava/oauth/start';
                }}
                onThemeChange={handleThemeChange}
            />
        );
    }

    return (
        <div className="app" style={{ backgroundColor: currentTheme.colors.background }}>
            <header className="app-header" style={{ backgroundColor: currentTheme.colors.surface }}>
                <h1 style={{ color: currentTheme.colors.text }}>Strava Route Viewer</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="search-button"
                        style={{
                            backgroundColor: currentTheme.colors.secondary,
                            color: '#ffffff',
                            padding: '0.4rem 0.8rem',
                            borderRadius: 999,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Logout
                    </button>
                    <ThemeSelector currentTheme={currentTheme} onThemeChange={handleThemeChange} />
                </div>
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
                    <PrintComposer
                        route={selectedRoute}
                        stats={routeStats}
                        theme={currentTheme}
                        map={mapInstance}
                    />
                </aside>

                <main className="main-content">
                    <MapView
                        route={selectedRoute}
                        theme={currentTheme}
                        onMapReady={(m) => {
                            setMapInstance(m);
                        }}
                    />
                </main>
            </div>
        </div>
    );
}

export default App;