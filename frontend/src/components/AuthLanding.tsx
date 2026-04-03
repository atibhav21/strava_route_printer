import { Theme } from '../types';

interface AuthLandingProps {
    theme: Theme;
    onConnect: () => void;
    onThemeChange: (theme: Theme) => void;
}

export const AuthLanding = ({ theme, onConnect }: AuthLandingProps) => {
    return (
        <div className="app" style={{ backgroundColor: theme.colors.background }}>
            <header className="app-header" style={{ backgroundColor: theme.colors.surface }}>
                <h1 style={{ color: theme.colors.text }}>Strava Route Viewer</h1>
            </header>
            <div className="auth-landing" aria-label="Connect Strava">
                <div
                    className="auth-card"
                    style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                    }}
                >
                    <h2 style={{ color: theme.colors.text }}>Connect your Strava</h2>
                    <p style={{ color: theme.colors.textSecondary }}>
                        Connect your Strava account to search for activities and see rich stats and
                        routes for your runs and rides.
                    </p>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.9rem' }}>
                        We request read access to your activities only.
                    </p>
                    <div className="auth-actions">
                        <button
                            type="button"
                            onClick={onConnect}
                            className="search-button"
                            style={{
                                backgroundColor: theme.colors.secondary,
                                color: '#ffffff',
                                padding: '0.75rem 1.25rem',
                                borderRadius: 999,
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Connect Strava
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

