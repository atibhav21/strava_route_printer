import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { RouteDetails, Theme } from '../types';
import { decodePolyline } from '../services/api';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapViewProps {
    route: RouteDetails | null;
    theme: Theme;
}

export const MapView = ({ route, theme }: MapViewProps) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: theme.map.style,
            center: [-122.4, 37.8], // Default center (San Francisco)
            zoom: 12,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        return () => {
            map.current?.remove();
        };
    }, []);

    // Update map style when theme changes
    useEffect(() => {
        if (map.current) {
            map.current.setStyle(theme.map.style);
        }
    }, [theme]);

    // Update route when it changes
    useEffect(() => {
        if (!map.current || !route) return;

        // Wait for map to load if it hasn't yet
        const updateRoute = () => {
            if (!map.current) return;

            // Remove existing route layer and source
            if (map.current.getLayer('route')) {
                map.current.removeLayer('route');
            }
            if (map.current.getSource('route')) {
                map.current.removeSource('route');
            }

            // Decode polyline
            const polyline = route.map.polyline || route.map.summary_polyline;
            if (!polyline) return;

            const coordinates = decodePolyline(polyline);

            // Add route source and layer
            map.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates,
                    },
                },
            });

            map.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                },
                paint: {
                    'line-color': theme.map.routeColor,
                    'line-width': theme.map.routeWidth,
                    'line-opacity': theme.map.routeOpacity,
                },
            });

            // Fit map to route bounds
            const bounds = coordinates.reduce(
                (bounds, coord) => bounds.extend(coord as [number, number]),
                new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
            );

            map.current.fitBounds(bounds, {
                padding: 50,
                maxZoom: 15,
            });
        };

        if (map.current.loaded()) {
            updateRoute();
        } else {
            map.current.on('load', updateRoute);
        }
    }, [route, theme]);

    return (
        <div className="map-container">
            <div ref={mapContainer} className="map" />
        </div>
    );
};