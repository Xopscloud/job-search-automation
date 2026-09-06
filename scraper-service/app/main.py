import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.config import settings
from app.models import (
    JobPost,
    ScrapeRequest,
    ScrapeResponse,
    ExportExcelRequest,
)
from app.utils.deduplicator import deduplicate_jobs
from app.utils.excel_generator import generate_excel_bytes
from app.scrapers.jobspy_scraper import scrape_via_jobspy
from app.scrapers.infopark_scraper import scrape_infopark
from app.scrapers.technopark_scraper import scrape_technopark
from app.scrapers.google_jobs_scraper import scrape_google_jobs_ats

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("scraper_app")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Automated multi-portal job scraper microservice for LinkedIn, Indeed, Naukri, Infopark, Technopark, and ATS career sites."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

thread_pool = ThreadPoolExecutor(max_workers=10)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0"
    }

@app.post("/api/scrape/all", response_model=ScrapeResponse)
async def scrape_all_sources(request: ScrapeRequest):
    """
    Unified endpoint that concurrently queries all specified job sources,
    aggregates results, and removes duplicate postings.
    """
    logger.info(f"Received scrape request: Query='{request.search_term}', Location='{request.location}', Sources={request.sources}")
    loop = asyncio.get_running_loop()

    tasks = []
    task_source_names = []
    errors: Dict[str, str] = {}

    # 1. JobSpy Sources (LinkedIn, Indeed, Naukri, Glassdoor)
    jobspy_sources = [s for s in request.sources if s.lower() in ["linkedin", "indeed", "naukri", "glassdoor", "zip_recruiter"]]
    if jobspy_sources:
        task_source_names.append("jobspy")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_via_jobspy,
                request.search_term,
                request.location,
                request.results_per_site,
                jobspy_sources,
                request.hours_old or 72
            )
        )

    # 2. Infopark Kochi
    if "infopark" in [s.lower() for s in request.sources]:
        task_source_names.append("infopark")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_infopark,
                request.search_term,
                request.results_per_site
            )
        )

    # 3. Technopark Trivandrum
    if "technopark" in [s.lower() for s in request.sources]:
        task_source_names.append("technopark")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_technopark,
                request.search_term,
                request.results_per_site
            )
        )

    # 4. Direct Company ATS Career Portals
    if any(s.lower() in ["google_jobs", "ats", "career_sites"] for s in request.sources):
        task_source_names.append("ats_career_sites")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_google_jobs_ats,
                request.search_term,
                request.location,
                request.results_per_site
            )
        )

    # Run tasks concurrently
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    all_jobs: List[JobPost] = []
    for source_name, result in zip(task_source_names, raw_results):
        if isinstance(result, Exception):
            logger.error(f"Error scraping {source_name}: {result}")
            errors[source_name] = str(result)
        elif isinstance(result, list):
            logger.info(f"Source {source_name} returned {len(result)} items.")
            all_jobs.extend(result)

    # Deduplicate against current batch and historical existing_ids
    existing_set = set(request.existing_job_ids)
    unique_jobs = deduplicate_jobs(all_jobs, existing_ids=existing_set)

    logger.info(f"Total raw jobs collected: {len(all_jobs)} | Net unique new jobs: {len(unique_jobs)}")

    return ScrapeResponse(
        success=True,
        total_found=len(all_jobs),
        new_jobs_count=len(unique_jobs),
        sources_queried=request.sources,
        jobs=unique_jobs,
        errors=errors
    )

@app.post("/api/scrape/infopark", response_model=List[JobPost])
async def scrape_infopark_endpoint(query: str = "", limit: int = 25):
    """Direct endpoint to scrape only Infopark Kochi."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(thread_pool, scrape_infopark, query, limit)

@app.post("/api/scrape/technopark", response_model=List[JobPost])
async def scrape_technopark_endpoint(query: str = "", limit: int = 25):
    """Direct endpoint to scrape only Technopark Trivandrum."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(thread_pool, scrape_technopark, query, limit)

@app.post("/api/export-excel")
async def export_excel_endpoint(request: ExportExcelRequest):
    """
    Builds and streams a professionally formatted .xlsx file containing
    the provided job listings with active hyperlinks and match scoring.
    """
    if not request.jobs:
        raise HTTPException(status_code=400, detail="No jobs provided to export.")

    try:
        excel_bytes = generate_excel_bytes(request.jobs)
        filename = request.filename if request.filename.endswith(".xlsx") else f"{request.filename}.xlsx"
        
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
        return Response(
            content=excel_bytes.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )
    except Exception as e:
        logger.error(f"Failed to generate Excel file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel: {str(e)}")
