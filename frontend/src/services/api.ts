import axios from 'axios';
import { Route, RouteDetails, RouteStats } from '../types';
import { Athlete } from '../types';

const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
});

export const searchRoutes = async (query: string): Promise<Route[]> => {
    const response = await api.get<Route[]>('/routes/search', {
        params: { q: query },
    });
    return response.data;
};

export const getRouteDetails = async (routeId: number): Promise<RouteDetails> => {
    const response = await api.get<RouteDetails>(`/routes/${routeId}`);
    return response.data;
};

export const getRouteStats = async (routeId: number): Promise<RouteStats> => {
    const response = await api.get<RouteStats>(`/routes/${routeId}/stats`);
    return response.data;
};

export const whoAmI = async (): Promise<Athlete> => {
    const response = await api.get<Athlete>(`/strava/whoami`);
    return response.data;
};

export const logout = async (): Promise<void> => {
    await api.post(`/strava/logout`);
};
