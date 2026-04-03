"""FastAPI application entry point"""

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from .config import settings
from .strava_client import strava_client
from .models import SummaryActivity, DetailedActivity
from .route_file import parse_route_file

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


@app.post("/api/routes/upload", response_model=DetailedActivity)
async def upload_route(file: UploadFile = File(...)):
    """Load a route from a Strava (or standard) GPX file."""
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    name = file.filename or "route"
    try:
        return parse_route_file(content=raw, filename=name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


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


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await strava_client.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host=settings.host, port=settings.port, reload=True)
