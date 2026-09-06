"""
Job scrapers package
"""
from app.scrapers.jobspy_scraper import scrape_via_jobspy
from app.scrapers.infopark_scraper import scrape_infopark
from app.scrapers.technopark_scraper import scrape_technopark
from app.scrapers.google_jobs_scraper import scrape_google_jobs_ats

__all__ = [
    "scrape_via_jobspy",
    "scrape_infopark",
    "scrape_technopark",
    "scrape_google_jobs_ats",
]
