from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional


@dataclass
class StoredTokens:
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[int] = None

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        # Refresh a little early to avoid edge cases.
        return time.time() >= (self.expires_at - 30)


class TokenStore:
    """
    Very small token persistence layer for local development.

    - Reads tokens from a JSON file if present.
    """

    def __init__(self, tokens_path: str):
        self._tokens_path = Path(tokens_path)
        self._lock = asyncio.Lock()
        self._cache: Optional[StoredTokens] = None

    def _load_from_disk(self) -> Optional[StoredTokens]:
        try:
            if not self._tokens_path.exists():
                return None
            raw = json.loads(self._tokens_path.read_text(encoding="utf-8"))
            return StoredTokens(
                access_token=str(raw["access_token"]),
                refresh_token=raw.get("refresh_token"),
                expires_at=raw.get("expires_at"),
            )
        except Exception:
            # If the file is malformed, prefer env defaults.
            return None

    def _save_to_disk(self, tokens: StoredTokens) -> None:
        self._tokens_path.parent.mkdir(parents=True, exist_ok=True)
        payload: dict[str, Any] = {
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
            "expires_at": tokens.expires_at,
        }
        self._tokens_path.write_text(
            json.dumps(payload, indent=2), encoding="utf-8"
        )

    async def get_tokens(self) -> StoredTokens:
        async with self._lock:
            if self._cache is None:
                # Rely solely on stored OAuth tokens (no env fallback).
                self._cache = self._load_from_disk() or StoredTokens(
                    access_token="",
                    refresh_token=None,
                    expires_at=None,
                )
            return self._cache

    async def set_tokens(self, tokens: StoredTokens) -> None:
        async with self._lock:
            self._cache = tokens
            self._save_to_disk(tokens)

    async def clear_tokens(self) -> None:
        """Log out: wipe persisted tokens."""
        async with self._lock:
            self._cache = StoredTokens(access_token="", refresh_token=None, expires_at=None)
            try:
                if self._tokens_path.exists():
                    self._tokens_path.unlink()
            except Exception:
                pass


# Store tokens in backend/ so it stays in the same project.
token_store = TokenStore(tokens_path="backend/strava_tokens.json")

