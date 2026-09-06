import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "Job Search Automation Scraper Microservice"
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    DEFAULT_TIMEOUT: int = 30  # seconds
    DEFAULT_RESULTS_PER_SITE: int = 25
    DEFAULT_HOURS_OLD: int = 72
    EXPORTS_DIR: str = os.getenv("EXPORTS_DIR", "/app/exports")

    # Common HTTP request headers for custom scrapers
    DEFAULT_HEADERS: dict = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }

settings = Settings()
