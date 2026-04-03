"""Strava API client"""

import httpx
import asyncio
from typing import List, Optional
from .config import settings
from .models import Athlete, SummaryActivity, DetailedActivity, RouteStats
from .strava_oauth import refresh_access_token
from .token_store import token_store, StoredTokens


class StravaClient:
    """Client for interacting with Strava API"""

    def __init__(self):
        self.base_url = settings.strava_api_base_url
        self.client = httpx.AsyncClient(timeout=30.0)

    async def _get_headers(self) -> dict:
        """Get authorization headers (token may be refreshed)."""
        tokens = await token_store.get_tokens()

        if tokens.refresh_token and tokens.is_expired:
            refreshed = await refresh_access_token(
                client_id=settings.strava_client_id,
                client_secret=settings.strava_client_secret,
                refresh_token=tokens.refresh_token,
            )
            tokens = StoredTokens(
                access_token=str(refreshed["access_token"]),
                refresh_token=refreshed.get("refresh_token")
                or tokens.refresh_token,
                expires_at=refreshed.get("expires_at"),
            )
            await token_store.set_tokens(tokens)

        return {"Authorization": f"Bearer {tokens.access_token}"}

    async def search_activities(self, query: str) -> List[SummaryActivity]:
        """
        Search for activities by name/keyword
        Note: Strava API doesn't have a direct search endpoint,
        so we get athlete's activities and filter by name.

        Strava activities are paginated; we fetch multiple pages so you can
        find activities older than the most recent page.
        """
        try:
            query_lower = query.lower()
            # Get athlete's activities
            url = f"{self.base_url}/athlete/activities"
            per_page = 200  # Strava max is 200
            max_pages = 5

            # Fetch several pages concurrently to reduce latency.
            # We still stop early once we find matches in the newest pages.
            concurrency = 3
            page_numbers = list(range(1, max_pages + 1))

            matches: List[SummaryActivity] = []

            async def fetch_page(page: int) -> list[dict]:
                response = await self.client.get(
                    url,
                    headers=await self._get_headers(),
                    params={"per_page": per_page, "page": page},
                )
                response.raise_for_status()
                return response.json()

            for i in range(0, len(page_numbers), concurrency):
                batch = page_numbers[i : i + concurrency]
                tasks = [asyncio.create_task(fetch_page(p)) for p in batch]
                results = await asyncio.gather(*tasks, return_exceptions=True)

                batch_matches: List[SummaryActivity] = []
                for page, result in zip(batch, results):
                    if isinstance(result, Exception):
                        raise result
                    filtered_activities = [
                        activity
                        for activity in result
                        if query_lower in activity.get("name", "").lower()
                    ]
                    batch_matches.extend(
                        [SummaryActivity(**activity) for activity in filtered_activities]
                    )

                matches.extend(batch_matches)
                if batch_matches:
                    # Stop early once we found matches in a newer batch.
                    break

            return matches

        except httpx.HTTPError as e:
            print(f"Error searching routes: {e}")
            return []
        except Exception as e:
            print(f"Error searching routes: {e}")
            return []

    async def get_logged_in_athlete(self) -> Optional[Athlete]:
        """Call Strava's "whoami" endpoint to validate token."""
        try:
            url = f"{self.base_url}/athlete"
            response = await self.client.get(
                url, headers=await self._get_headers()
            )
            response.raise_for_status()
            return Athlete(**response.json())
        except httpx.HTTPStatusError:
            return None
        except httpx.HTTPError as e:
            print(f"Error calling Strava whoami: {e}")
            return None

    async def get_activity_details(
        self, activity_id: int
    ) -> Optional[DetailedActivity]:
        """Get detailed information about a specific activity"""
        try:
            url = f"{self.base_url}/activities/{activity_id}"
            response = await self.client.get(url, headers=await self._get_headers())
            response.raise_for_status()

            activity_data = response.json()
            return DetailedActivity(**activity_data)

        except httpx.HTTPError as e:
            print(f"Error getting route details: {e}")
            return None

    async def get_activity_stats(self, activity_id: int) -> Optional[RouteStats]:
        """
        Get statistics for a specific activity.

        Uses the same activity details endpoint and extracts the stats fields.
        """
        try:
            url = f"{self.base_url}/activities/{activity_id}"
            response = await self.client.get(url, headers=await self._get_headers())
            response.raise_for_status()

            data = response.json()

            stats_data = {
                "distance": float(data.get("distance", 0.0) or 0.0),
                "elevation_gain": float(
                    data.get("total_elevation_gain", 0.0) or 0.0
                ),
                "moving_time": data.get("moving_time"),
                "elapsed_time": data.get("elapsed_time"),
                "average_speed": data.get("average_speed"),
                "max_speed": data.get("max_speed"),
                "average_heartrate": data.get("average_heartrate"),
                "max_heartrate": data.get("max_heartrate"),
                "average_watts": data.get("average_watts"),
                "kilojoules": data.get("kilojoules"),
            }

            return RouteStats(**stats_data)

        except httpx.HTTPError as e:
            print(f"Error getting activity stats: {e}")
            return None

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global client instance
strava_client = StravaClient()
