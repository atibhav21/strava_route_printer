export interface Route {
    id: number;
    name: string;
    distance: number;
    /** Strava / API uses total_elevation_gain */
    total_elevation_gain?: number;
    elevation_gain?: number;
    map: {
        summary_polyline?: string | null;
        polyline?: string | null;
    };
    athlete?: {
        id: number;
        firstname: string;
        lastname: string;
    };
}

export interface RouteDetails extends Route {
    description?: string;
    type?: number;
    sub_type?: number;
    private?: boolean;
    starred?: boolean;
    timestamp?: number;
    segments?: any[];
}

export interface RouteStats {
    distance: number;
    elevation_gain: number;
    moving_time?: number;
    elapsed_time?: number;
    average_speed?: number;
    max_speed?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    average_watts?: number;
    kilojoules?: number;
}

export interface ThemePrintConfig {
    pageBg: string;
    footerText: string;
    footerTextMuted: string;
    accentRule: string;
    routeStrokeColor: string;  // hex without #
    routeStrokeWidth: number;
    printStyleUrl: string;
}

export interface Theme {
    name: string;
    displayName: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        border: string;
        accent: string;
    };
    map: {
        style: string;
        routeColor: string;
        routeWidth: number;
        routeOpacity: number;
    };
    print: ThemePrintConfig;
}

export interface DecodedPoint {
    lat: number;
    lng: number;
}

export interface Athlete {
    id: number;
    firstname?: string | null;
    lastname?: string | null;
}