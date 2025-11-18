"""Strava API client"""

import httpx
from typing import List, Optional
from .config import settings
from .models import SummaryActivity, DetailedActivity


class StravaClient:
    """Client for interacting with Strava API"""

    def __init__(self):
        self.base_url = settings.strava_api_base_url
        self.access_token = settings.strava_access_token
        self.client = httpx.AsyncClient(timeout=30.0)

    def _get_headers(self) -> dict:
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.access_token}"}

    async def search_activities(self, query: str) -> List[SummaryActivity]:
        """
        Search for activities by name/keyword
        Note: Strava API doesn't have a direct search endpoint,
        so we get athlete's activities and filter by name
        """
        try:
            # Get athlete's activities
            url = f"{self.base_url}/athlete/activities"
            response = await self.client.get(
                url, headers=self._get_headers(), params={"per_page": 50}
            )
            response.raise_for_status()

            activities_data = response.json()

            # Filter routes by query (case-insensitive)
            query_lower = query.lower()
            filtered_activities = [
                activity
                for activity in activities_data
                if query_lower in activity.get("name", "").lower()
            ]

            return [SummaryActivity(**activity) for activity in filtered_activities]

        except httpx.HTTPError as e:
            print(f"Error searching routes: {e}")
            return []

    async def get_activity_details(
        self, activity_id: int
    ) -> Optional[DetailedActivity]:
        """Get detailed information about a specific activity"""
        try:
            url = f"{self.base_url}/activities/{activity_id}"
            response = await self.client.get(url, headers=self._get_headers())
            response.raise_for_status()

            activity_data = response.json()
            return DetailedActivity(**activity_data)

        except httpx.HTTPError as e:
            print(f"Error getting route details: {e}")
            return None

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global client instance
strava_client = StravaClient()
