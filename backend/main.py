"""FastAPI application entry point"""

import secrets
import time

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from typing import List
from .config import settings
from .strava_client import strava_client
from .models import SummaryActivity, DetailedActivity, RouteStats, Athlete
from .strava_oauth import build_authorize_url, exchange_code_for_tokens
from .token_store import token_store, StoredTokens


_oauth_states: dict[str, float] = {}

# Create FastAPI app
app = FastAPI(
    title="Strava Route Viewer API",
    description="Backend API for Strava Route Viewer",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Strava Route Viewer API", "version": "0.1.0"}


@app.get("/api/strava/oauth/start")
async def strava_oauth_start(
    request: Request,
    scope: str = "activity:read,activity:read_all",
):
    """
    Redirects the user to Strava OAuth so they can authorize the requested scopes.
    """
    state = secrets.token_urlsafe(16)
    _oauth_states[state] = time.time()

    # Use a stable dev redirect URI so it matches Strava "Callback Domain".
    redirect_uri = f"http://localhost:{settings.port}/api/strava/oauth/callback"
    url = build_authorize_url(
        client_id=settings.strava_client_id,
        redirect_uri=redirect_uri,
        scope=scope,
        state=state,
    )
    return RedirectResponse(url)


@app.get("/api/strava/oauth/callback")
async def strava_oauth_callback(
    code: str,
    state: str,
    request: Request,
):
    """
    OAuth callback endpoint that exchanges `code` for tokens and stores them.
    """
    created_at = _oauth_states.pop(state, None)
    if created_at is None or (time.time() - created_at) > 600:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    redirect_uri = f"http://localhost:{settings.port}/api/strava/oauth/callback"

    try:
        token_data = await exchange_code_for_tokens(
            client_id=settings.strava_client_id,
            client_secret=settings.strava_client_secret,
            code=code,
            redirect_uri=redirect_uri,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Token exchange failed: {e}"
        ) from e

    await token_store.set_tokens(
        StoredTokens(
            access_token=str(token_data["access_token"]),
            refresh_token=token_data.get("refresh_token"),
            expires_at=token_data.get("expires_at"),
        )
    )

    # After successful OAuth, send user back to the frontend app.
    frontend_url = "http://localhost:3000/?strava=connected"
    return RedirectResponse(frontend_url)


@app.get("/api/strava/whoami", response_model=Athlete)
async def strava_whoami():
    """
    Validate whether the current stored token can access Strava.
    Returns 401 if not authenticated.
    """
    # If we don't have stored tokens, don't even call Strava.
    tokens = await token_store.get_tokens()
    if not tokens.access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    athlete = await strava_client.get_logged_in_athlete()
    if athlete is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return athlete


@app.post("/api/strava/logout")
async def strava_logout():
    """Wipe token storage and force unauthenticated UI."""
    await token_store.clear_tokens()
    return {"status": "ok"}


@app.get("/api/routes/search", response_model=List[SummaryActivity])
@app.get("/api/activities/search", response_model=List[SummaryActivity])
async def search_activities(q: str = Query(..., description="Search query")):
    """
    Search for activities by name/keyword

    - **q**: Search query string
    """
    if not q or len(q.strip()) == 0:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    activities = await strava_client.search_activities(q)
    return activities


@app.get("/api/routes/{activity_id}", response_model=DetailedActivity)
@app.get("/api/activities/{activity_id}", response_model=DetailedActivity)
async def get_activity_details(activity_id: int):
    """
    Get detailed information about a specific activity

    - **activity_id**: Strava activity ID
    """
    activity = await strava_client.get_activity_details(activity_id)

    if not activity:
        raise HTTPException(status_code=404, detail="Route not found")

    return activity


@app.get("/api/routes/{activity_id}/stats", response_model=RouteStats)
@app.get("/api/activities/{activity_id}/stats", response_model=RouteStats)
async def get_activity_stats(activity_id: int):
    """
    Get statistics for a specific activity/route.
    """
    stats = await strava_client.get_activity_stats(activity_id)

    if not stats:
        raise HTTPException(status_code=404, detail="Stats not found")

    return stats


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await strava_client.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host=settings.host, port=settings.port, reload=True)
