# Strava Route Viewer - Backend Setup

## Quick Start

### 1. Install Dependencies

```bash
# From project root
pip install -r requirements.txt

# Or using virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Get Strava API Credentials

1. Go to https://www.strava.com/settings/api
2. Create an application (if you haven't already)
3. Note your **Client ID** and **Client Secret**
4. Generate an **Access Token** (you can use the one shown on the API settings page for testing)

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your Strava credentials:

```bash
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_ACCESS_TOKEN=your_access_token
```

### 4. Run the Server

```bash
# From project root
python -m uvicorn backend.main:app --reload --port 8000

# Or directly with Python
cd backend
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /
```

Returns API status and version.

### Search Routes
```
GET /api/routes/search?q={query}
```

Search for routes by name/keyword.

**Parameters:**
- `q` (required): Search query string

**Response:** Array of `Route` objects

**Example:**
```bash
curl "http://localhost:8000/api/routes/search?q=morning"
```

### Get Route Details
```
GET /api/routes/{route_id}
```

Get detailed information about a specific route including polyline.

**Parameters:**
- `route_id` (required): Strava route ID

**Response:** `RouteDetails` object

**Example:**
```bash
curl "http://localhost:8000/api/routes/12345678"
```

### Get Route Statistics
```
GET /api/routes/{route_id}/stats
```

Get activity statistics for a route (distance, speed, heart rate, power, etc.).

**Parameters:**
- `route_id` (required): Strava route ID

**Response:** `RouteStats` object

**Example:**
```bash
curl "http://localhost:8000/api/routes/12345678/stats"
```

## Project Structure

```
backend/
├── __init__.py         # Package initialization
├── main.py             # FastAPI app and endpoints
├── config.py           # Environment configuration
├── strava_client.py    # Strava API integration
└── models.py           # Pydantic data models
```

## Data Models

### Route
Basic route information returned from search.

### RouteDetails
Extended route information with polyline and additional metadata.

### RouteStats
Activity statistics including:
- Distance and elevation
- Moving/elapsed time
- Average/max speed
- Heart rate data
- Power data (watts, kilojoules)

## Strava API Notes

### Access Tokens

The access token in `.env` is typically short-lived. For production use, you should:

1. Implement OAuth flow for user authentication
2. Store refresh tokens
3. Automatically refresh expired tokens

For development/testing, you can use the token from Strava's API settings page.

### Rate Limits

Strava API has rate limits:
- **100 requests per 15 minutes**
- **1,000 requests per day**

The current implementation doesn't handle rate limiting. For production, consider:
- Caching responses
- Implementing rate limit tracking
- Adding retry logic

### Route Search

Strava doesn't provide a direct route search API. The current implementation:
1. Fetches all of the authenticated athlete's routes
2. Filters them by name (case-insensitive)

This means you can only search **your own routes**. To search other athletes' routes, you'd need their athlete ID and proper permissions.

### Route Statistics

The `get_route_stats` endpoint attempts to find a matching activity for the route by:
1. Fetching recent activities
2. Matching by distance (within 5% tolerance)
3. Returning activity stats if found

This is approximate. For better accuracy, you could:
- Store route-to-activity mappings
- Use route segments for matching
- Allow users to manually link routes to activities

## Development

### Interactive API Docs

FastAPI provides automatic interactive documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Adding New Endpoints

1. Add new function to `strava_client.py` for Strava API interaction
2. Create corresponding endpoint in `main.py`
3. Define models in `models.py` if needed

Example:
```python
# In strava_client.py
async def get_athlete_profile(self):
    url = f"{self.base_url}/athlete"
    response = await self.client.get(url, headers=self._get_headers())
    return response.json()

# In main.py
@app.get("/api/athlete")
async def get_athlete():
    return await strava_client.get_athlete_profile()
```

## Troubleshooting

### "Unauthorized" errors

- Verify your access token is correct
- Check if token has expired (generate a new one)
- Ensure token has proper scopes (read permissions)

### "Route not found" errors

- Verify the route ID is correct
- Ensure the route belongs to the authenticated athlete
- Check if the route is private and you have access

### CORS errors

The backend is configured to allow requests from `http://localhost:3000`. If your frontend runs on a different port, update the CORS settings in `main.py`:

```python
allow_origins=["http://localhost:YOUR_PORT"],
```

### Import errors

Make sure you're running from the project root:
```bash
python -m uvicorn backend.main:app --reload
```

Not from inside the backend directory:
```bash
cd backend
python main.py  # This works too
```

## Production Deployment

For production deployment:

1. **Use environment variables** (not `.env` files)
2. **Implement OAuth flow** for user authentication
3. **Add rate limiting** and request throttling
4. **Enable HTTPS** and update CORS settings
5. **Add logging** and error tracking
6. **Consider caching** (Redis) for frequent requests
7. **Use gunicorn** or similar for production server

Example with gunicorn:
```bash
pip install gunicorn
gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Testing

You can test endpoints with curl:

```bash
# Search routes
curl "http://localhost:8000/api/routes/search?q=test"

# Get route details
curl "http://localhost:8000/api/routes/123456"

# Get route stats
curl "http://localhost:8000/api/routes/123456/stats"
```

Or use the interactive docs at http://localhost:8000/docs