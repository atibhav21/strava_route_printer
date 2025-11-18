import { themes } from './themes';
import type { Theme } from '../types';

export const getTheme = (name: string): Theme => {
    return themes[name] || themes.default;
};

export const getThemeNames = (): string[] => {
    return Object.keys(themes);
};

export const getAllThemes = (): Theme[] => {
    return Object.values(themes);
};

export { themes };