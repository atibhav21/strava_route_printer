# Strava Route Viewer - Frontend Setup

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your MapBox access token:

```
VITE_MAPBOX_TOKEN=pk.your_actual_mapbox_token_here
```

**Get your MapBox token:** https://account.mapbox.com/access-tokens/

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── tsconfig.node.json      # TypeScript config for Vite
├── .env.example            # Example environment variables
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Main app component
│   ├── components/
│   │   ├── RouteSearch.tsx     # Search routes component
│   │   ├── MapView.tsx         # Map display component
│   │   ├── StatsPanel.tsx      # Statistics display component
│   │   └── ThemeSelector.tsx   # Theme switcher component
│   ├── services/
│   │   └── api.ts          # API client for backend
│   ├── themes/
│   │   ├── index.ts        # Theme utilities
│   │   └── themes.ts       # Theme definitions
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions
│   └── styles/
│       └── main.css        # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Key Features

### Theme System

Five built-in themes:
- **Default** - Classic Strava orange
- **Dark** - Dark mode
- **Ocean** - Blue tones
- **Forest** - Green tones
- **Sunset** - Orange/yellow tones

Each theme includes:
- Color palette for UI components
- MapBox map style
- Custom route line styling

### Components

**RouteSearch**
- Search input with live results
- Displays route name, distance, and elevation
- Click to select a route

**MapView**
- MapBox GL integration
- Displays route polyline
- Auto-fits bounds to route
- Updates with theme changes

**StatsPanel**
- Route name and description
- Distance and elevation
- Optional activity stats (speed, heart rate, power, etc.)
- Responsive grid layout

**ThemeSelector**
- Dropdown to switch themes
- Updates entire UI and map

### API Integration

The `api.ts` service provides:
- `searchRoutes(query)` - Search for routes
- `getRouteDetails(routeId)` - Get full route data
- `getRouteStats(routeId)` - Get activity statistics
- `decodePolyline(encoded)` - Decode Google polyline format

API calls are proxied to `http://localhost:8000/api` via Vite.

## Backend Requirements

The frontend expects these backend endpoints:

```
GET /api/routes/search?q={query}
    Response: Route[]

GET /api/routes/{route_id}
    Response: RouteDetails

GET /api/routes/{route_id}/stats
    Response: RouteStats
```

## Adding New Themes

Edit `src/themes/themes.ts`:

```typescript
export const themes: Record<string, Theme> = {
  // ... existing themes
  myTheme: {
    name: 'myTheme',
    displayName: 'My Theme',
    colors: {
      primary: '#your-color',
      secondary: '#your-color',
      background: '#your-color',
      surface: '#your-color',
      text: '#your-color',
      textSecondary: '#your-color',
      border: '#your-color',
      accent: '#your-color',
    },
    map: {
      style: 'mapbox://styles/mapbox/streets-v12',
      routeColor: '#your-color',
      routeWidth: 4,
      routeOpacity: 0.8,
    },
  },
};
```

## MapBox Styles

Available MapBox styles:
- `mapbox://styles/mapbox/streets-v12` - Street map
- `mapbox://styles/mapbox/outdoors-v12` - Topographic
- `mapbox://styles/mapbox/light-v11` - Light theme
- `mapbox://styles/mapbox/dark-v11` - Dark theme
- `mapbox://styles/mapbox/satellite-v9` - Satellite imagery
- `mapbox://styles/mapbox/satellite-streets-v12` - Satellite with streets

## Troubleshooting

### MapBox not displaying

1. Check your `.env` file has the correct token
2. Verify token at https://account.mapbox.com/access-tokens/
3. Ensure token has correct scopes

### API calls failing

1. Verify backend is running on port 8000
2. Check browser console for CORS errors
3. Verify proxy configuration in `vite.config.ts`

### TypeScript errors

```bash
npm run build
```

This will show any type errors that need fixing.

## Production Build

```bash
npm run build
```

Output will be in `dist/` directory. Serve with any static file server:

```bash
npm run preview
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires ES2020+ JavaScript support.