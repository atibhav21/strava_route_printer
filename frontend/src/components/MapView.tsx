import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { RouteDetails, Theme } from '../types';
import { decodePolyline } from '../utils/decodePolyline';
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
    const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);

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

        map.current.on('style.load', () => {
            const layers = map.current?.getStyle().layers || [];

            for (const layer of layers) {
                if (
                    layer.type === 'symbol' &&
                    layer.layout &&
                    layer.layout['text-field']
                ) {
                    map.current?.setLayoutProperty(
                        layer.id,
                        'visibility',
                        'none'
                    );
                }
            }

            applyRoute.current();
        });

        return () => {
            map.current?.remove();
        };
    }, []);

    const cacheRouteCoordinates = useCallback((route: RouteDetails) => {
        if (!route) return;

        const polyline = route.map.polyline || route.map.summary_polyline;
        if (polyline) {
            setRouteCoordinates(decodePolyline(polyline));
        }
    }, [route, setRouteCoordinates]);

    const applyRoute = useRef<() => void>(() => { });

    applyRoute.current = () => {
        if (!map.current || !route) return;

        // Decode and cache the current route coordinates (if any)
        if (!routeCoordinates) {
            return;
        }

        if (!routeCoordinates) return;

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
                    coordinates: routeCoordinates,
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
        const bounds = routeCoordinates?.reduce(
            (bounds, coord) => bounds.extend(coord as [number, number]),
            new mapboxgl.LngLatBounds(routeCoordinates[0], routeCoordinates[0])
        );

        if (!bounds) return;

        map.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15,
        });
    };

    // Update map when route changes
    useEffect(() => {
        if (!route) return;
        cacheRouteCoordinates(route);
    }, [route, cacheRouteCoordinates]);

    useEffect(() => {
        if (!routeCoordinates) return;
        applyRoute.current();
    }, [routeCoordinates]);

    // Update map style when theme changes
    useEffect(() => {
        if (map.current) {
            map.current.setStyle(theme.map.style);
        }
    }, [theme]);


    return (
        <div className="map-container">
            <div ref={mapContainer} className="map" />
        </div>
    );
};