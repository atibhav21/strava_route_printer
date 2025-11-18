import axios from 'axios';
import { Route, RouteDetails, RouteStats } from '../types';

const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
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

// Utility function to decode polyline
export const decodePolyline = (encoded: string): [number, number][] => {
    const points: [number, number][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let b;
        let shift = 0;
        let result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lat += dlat;

        shift = 0;
        result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lng += dlng;

        points.push([lng / 1e5, lat / 1e5]);
    }

    return points;
};