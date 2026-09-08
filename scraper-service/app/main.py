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
from app.scrapers.jobspy_scraper import (
    scrape_via_jobspy,
    scrape_single_jobspy_site,
    scrape_naukri,
)
from app.scrapers.infopark_scraper import scrape_infopark
from app.scrapers.technopark_scraper import scrape_technopark
from app.scrapers.google_jobs_scraper import scrape_google_jobs_ats
from app.scrapers.remote_devops_scraper import (
    scrape_all_remote_devops,
    scrape_remoteok,
    scrape_weworkremotely,
    scrape_jobicy,
    scrape_remotive,
    scrape_arbeitnow,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("scraper_app")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Automated multi-portal job scraper microservice for LinkedIn, Indeed, Naukri, Infopark, Technopark, Remotive, Arbeitnow, and ATS career sites."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

thread_pool = ThreadPoolExecutor(max_workers=25)

ALL_SUPPORTED_SOURCES = [
    "linkedin",
    "indeed",
    "naukri",
    "glassdoor",
    "zip_recruiter",
    "google_jobs",
    "ats",
    "infopark",
    "technopark",
    "remoteok",
    "weworkremotely",
    "jobicy",
    "remotive",
    "arbeitnow",
    "bayt",
]

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
    Unified endpoint that concurrently queries ALL specified job sources.
    Each portal is executed in its own isolated task with its own results quota,
    ensuring that one site's quota or rate-limit never starves or cancels other sites.
    """
    # Normalize requested sources; expand "all" or empty to all supported portals
    raw_sources = [s.strip().lower() for s in (request.sources or [])]
    if not raw_sources or any(s in ["all", "all_sites", "*", "all_sources"] for s in raw_sources):
        active_sources = ALL_SUPPORTED_SOURCES.copy()
    else:
        active_sources = raw_sources

    logger.info(f"Received scrape request: Query='{request.search_term}', Location='{request.location}', Active Sources ({len(active_sources)})={active_sources}")
    loop = asyncio.get_running_loop()

    tasks = []
    task_source_names = []
    errors: Dict[str, str] = {}
    hours_old = request.hours_old or 72

    # 1. LinkedIn (JobSpy)
    if "linkedin" in active_sources:
        task_source_names.append("linkedin")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_single_jobspy_site,
                "linkedin",
                request.search_term,
                request.location,
                request.results_per_site,
                hours_old
            )
        )

    # 2. Indeed (JobSpy)
    if "indeed" in active_sources:
        task_source_names.append("indeed")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_single_jobspy_site,
                "indeed",
                request.search_term,
                request.location,
                request.results_per_site,
                hours_old
            )
        )

    # 3. Naukri (JobSpy with Fallback)
    if "naukri" in active_sources:
        task_source_names.append("naukri")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_naukri,
                request.search_term,
                request.location,
                request.results_per_site
            )
        )

    # 4. Glassdoor (JobSpy)
    if "glassdoor" in active_sources:
        task_source_names.append("glassdoor")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_single_jobspy_site,
                "glassdoor",
                request.search_term,
                request.location,
                request.results_per_site,
                hours_old
            )
        )

    # 5. ZipRecruiter (JobSpy)
    if any(s in active_sources for s in ["zip_recruiter", "ziprecruiter"]):
        task_source_names.append("zip_recruiter")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_single_jobspy_site,
                "zip_recruiter",
                request.search_term,
                request.location,
                request.results_per_site,
                hours_old
            )
        )

    # 6. Google Jobs Search (JobSpy)
    if any(s in active_sources for s in ["google_jobs", "google"]):
        task_source_names.append("google_jobs")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_single_jobspy_site,
                "google",
                request.search_term,
                request.location,
                request.results_per_site,
                hours_old
            )
        )

    # 7. Bayt (Middle East / Gulf)
    if "bayt" in active_sources:
        task_source_names.append("bayt")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_single_jobspy_site,
                "bayt",
                request.search_term,
                request.location,
                request.results_per_site,
                hours_old
            )
        )

    # 8. Infopark Kochi
    if "infopark" in active_sources:
        task_source_names.append("infopark")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_infopark,
                request.search_term,
                request.results_per_site
            )
        )

    # 9. Technopark Trivandrum
    if "technopark" in active_sources:
        task_source_names.append("technopark")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_technopark,
                request.search_term,
                request.results_per_site
            )
        )

    # 10. Direct Company ATS Career Portals (Greenhouse, Lever, Workday, Ashby, SmartRecruiters)
    if any(s in active_sources for s in ["ats", "career_sites", "company_ats"]):
        task_source_names.append("ats")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_google_jobs_ats,
                request.search_term,
                request.location,
                request.results_per_site
            )
        )

    # 11. RemoteOK
    if "remoteok" in active_sources or "remote_devops" in active_sources:
        task_source_names.append("remoteok")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_remoteok,
                request.search_term,
                request.results_per_site
            )
        )

    # 12. WeWorkRemotely
    if "weworkremotely" in active_sources or "remote_devops" in active_sources:
        task_source_names.append("weworkremotely")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_weworkremotely,
                request.search_term,
                request.results_per_site
            )
        )

    # 13. Jobicy
    if "jobicy" in active_sources or "remote_devops" in active_sources:
        task_source_names.append("jobicy")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_jobicy,
                request.search_term,
                request.results_per_site
            )
        )

    # 14. Remotive (DevOps API)
    if any(s in active_sources for s in ["remotive", "remote_devops"]):
        task_source_names.append("remotive")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_remotive,
                request.search_term,
                request.results_per_site
            )
        )

    # 15. Arbeitnow (Tech & DevOps API)
    if any(s in active_sources for s in ["arbeitnow", "remote_devops"]):
        task_source_names.append("arbeitnow")
        tasks.append(
            loop.run_in_executor(
                thread_pool,
                scrape_arbeitnow,
                request.search_term,
                request.results_per_site
            )
        )

    # Run ALL tasks concurrently
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    all_jobs: List[JobPost] = []
    for source_name, result in zip(task_source_names, raw_results):
        if isinstance(result, Exception):
            logger.error(f"Error scraping {source_name}: {result}")
            errors[source_name] = str(result)
        elif isinstance(result, list):
            logger.info(f"Source {source_name} returned {len(result)} items.")
            all_jobs.extend(result)

    # Filter for strict DevOps relevance if querying DevOps/Cloud roles
    from app.scrapers.infopark_scraper import is_devops_relevant
    st_clean = (request.search_term or "devops").lower()
    if any(k in st_clean for k in ["devops", "sre", "cloud", "infra", "platform", "sysadmin"]):
        filtered_all_jobs = [j for j in all_jobs if is_devops_relevant(j.title, f"{j.title} {j.description}", request.search_term)]
        logger.info(f"DevOps relevance filter retained {len(filtered_all_jobs)} of {len(all_jobs)} raw postings.")
    else:
        filtered_all_jobs = all_jobs

    # Deduplicate against current batch and historical existing_ids
    existing_set = set(request.existing_job_ids)
    unique_jobs = deduplicate_jobs(filtered_all_jobs, existing_ids=existing_set)

    logger.info(f"Total raw jobs collected: {len(all_jobs)} | Relevant: {len(filtered_all_jobs)} | Net unique new jobs: {len(unique_jobs)}")

    return ScrapeResponse(
        success=True,
        total_found=len(all_jobs),
        new_jobs_count=len(unique_jobs),
        sources_queried=active_sources,
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
