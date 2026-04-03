import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { RouteDetails, Theme } from '../types';
import { decodePolyline } from '../services/api';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapViewProps {
    route: RouteDetails | null;
    theme: Theme;
    onMapReady?: (map: mapboxgl.Map) => void;
}

export const MapView = ({ route, theme, onMapReady }: MapViewProps) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const routeCoordinatesRef = useRef<[number, number][] | null>(null);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: theme.map.style,
            center: [-122.4, 37.8], // Default center (San Francisco)
            zoom: 12,
            preserveDrawingBuffer: true,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        onMapReady?.(map.current);

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

    // Update route when it or the map style changes
    useEffect(() => {
        if (!map.current) return;

        // Decode and cache the current route coordinates (if any)
        if (route) {
            const polyline = route.map.polyline || route.map.summary_polyline;
            if (!polyline) {
                routeCoordinatesRef.current = null;
            } else {
                routeCoordinatesRef.current = decodePolyline(polyline);
            }
        } else {
            routeCoordinatesRef.current = null;
        }

        const applyRouteFromCache = () => {
            if (!map.current) return;
            const coordinates = routeCoordinatesRef.current;
            if (!coordinates || coordinates.length === 0) return;

            // Remove existing route layer and source
            if (map.current.getLayer('route')) {
                map.current.removeLayer('route');
            }
            if (map.current.getSource('route')) {
                map.current.removeSource('route');
            }

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

        if (map.current.isStyleLoaded()) {
            applyRouteFromCache();
        } else {
            map.current.once('style.load', applyRouteFromCache);
        }
    }, [route, theme]);

    return (
        <div className="map-container">
            <div ref={mapContainer} className="map" />
        </div>
    );
};