"""Pydantic models for API responses"""

from pydantic import BaseModel
from typing import Optional


class Athlete(BaseModel):
    """Athlete information"""

    id: int
    firstname: Optional[str] = None
    lastname: Optional[str] = None


class RouteMap(BaseModel):
    """Route map data with polyline"""

    summary_polyline: Optional[str] = None
    polyline: Optional[str] = None


class SummaryActivity(BaseModel):
    """Activity information"""

    id: int
    name: str
    distance: float
    moving_time: int
    total_elevation_gain: float
    sport_type: str
    start_date_local: str
    map: RouteMap
    athlete: Optional[Athlete] = None


class DetailedActivity(SummaryActivity):
    """Detailed activity information"""

    map: RouteMap
