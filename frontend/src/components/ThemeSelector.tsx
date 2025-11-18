import { Theme } from '../types';
import { getAllThemes } from '../themes';

interface ThemeSelectorProps {
    currentTheme: Theme;
    onThemeChange: (theme: Theme) => void;
}

export const ThemeSelector = ({ currentTheme, onThemeChange }: ThemeSelectorProps) => {
    const themes = getAllThemes();

    return (
        <div className="theme-selector">
            <label htmlFor="theme-select" style={{ color: currentTheme.colors.textSecondary }}>
                Theme:
            </label>
            <select
                id="theme-select"
                value={currentTheme.name}
                onChange={(e) => {
                    const selected = themes.find((t) => t.name === e.target.value);
                    if (selected) onThemeChange(selected);
                }}
                className="theme-select"
                style={{
                    backgroundColor: currentTheme.colors.surface,
                    color: currentTheme.colors.text,
                    borderColor: currentTheme.colors.border,
                }}
            >
                {themes.map((theme) => (
                    <option key={theme.name} value={theme.name}>
                        {theme.displayName}
                    </option>
                ))}
            </select>
        </div>
    );
};