"""Configuration management using pydantic-settings"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Strava API credentials
    strava_client_id: str
    strava_client_secret: str
    strava_access_token: str
    strava_refresh_token: str | None = None

    # Server configuration
    port: int = 8000
    host: str = "0.0.0.0"

    # Strava API base URL
    strava_api_base_url: str = "https://www.strava.com/api/v3"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Global settings instance
settings = Settings()
