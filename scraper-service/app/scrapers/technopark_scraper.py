import logging
import json
import re
from typing import List, Dict, Any
from datetime import datetime
import httpx
from bs4 import BeautifulSoup

from app.models import JobPost
from app.config import settings
from app.utils.deduplicator import generate_job_id
from app.utils.contact_extractor import extract_all_contacts
from app.scrapers.infopark_scraper import is_devops_relevant

logger = logging.getLogger(__name__)

TECHNOPARK_BASE_URL = "https://technopark.in"
TECHNOPARK_API_URL = "https://technopark.in/api/paginated-jobs"

def scrape_technopark(
    search_term: str = "DevOps",
    limit: int = 50
) -> List[JobPost]:
    """
    Scrapes active job listings directly from Technopark Trivandrum's JSON API.
    Retrieves structured job postings, company info, and direct contact emails.
    """
    clean_term = search_term.strip() if search_term else "DevOps"
    logger.info(f"Querying Technopark Trivandrum direct API for: '{clean_term}'...")
    jobs: List[JobPost] = []

    headers = settings.DEFAULT_HEADERS.copy()
    headers.update({
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://technopark.in/job-search",
        "X-Requested-With": "XMLHttpRequest",
    })

    try:
        with httpx.Client(headers=headers, timeout=settings.DEFAULT_TIMEOUT, follow_redirects=True) as client:
            # Query pages from Technopark paginated jobs API
            for page in range(1, 4):
                if len(jobs) >= limit:
                    break

                url = f"{TECHNOPARK_API_URL}?page={page}&search={clean_term}&type="
                try:
                    resp = client.get(url)
                    if resp.status_code != 200:
                        # Fallback query with general devops term if specific title had 0 hits
                        if clean_term.lower() != "devops":
                            url = f"{TECHNOPARK_API_URL}?page={page}&search=devops&type="
                            resp = client.get(url)
                        if resp.status_code != 200:
                            break

                    data = resp.json()
                    raw_items = data.get("data", []) if isinstance(data, dict) else []
                    if not raw_items:
                        break

                    logger.info(f"Technopark API page {page} returned {len(raw_items)} listings.")

                    for item in raw_items:
                        if not isinstance(item, dict):
                            continue

                        title = str(item.get("job_title") or item.get("title") or "").strip()
                        company_info = item.get("company", {})
                        if isinstance(company_info, dict):
                            company = str(company_info.get("company") or company_info.get("name") or "Technopark Company").strip()
                        else:
                            company = str(company_info or "Technopark Company").strip()

                        if not title:
                            continue

                        # Check DevOps relevance
                        if not is_devops_relevant(title, f"{title} {company}", clean_term):
                            continue

                        job_id_num = item.get("id") or item.get("job_listing_id")
                        job_url = f"{TECHNOPARK_BASE_URL}/job-details/{job_id_num}" if job_id_num else f"{TECHNOPARK_BASE_URL}/job-search"
                        posted_date = str(item.get("posted_date") or "")[:10]
                        if not posted_date:
                            posted_date = datetime.now().strftime("%Y-%m-%d")

                        description = f"Technopark opening: {title} at {company}. Closing date: {item.get('closing_date') or 'Open'}."
                        contact_email = None

                        # For top jobs, attempt to retrieve enriched contact email and description
                        if len(jobs) < 15 and job_id_num:
                            try:
                                detail_headers = headers.copy()
                                detail_headers["X-Inertia"] = "true"
                                detail_headers["X-Inertia-Version"] = "83418256e21952fdfebaa5e4041d2607"
                                detail_resp = client.get(f"{TECHNOPARK_BASE_URL}/job-details/{job_id_num}", headers=detail_headers, timeout=6.0)
                                if detail_resp.status_code == 200:
                                    detail_json = detail_resp.json()
                                    job_listing = detail_json.get("props", {}).get("jobListing", {})
                                    if job_listing:
                                        contact_email = job_listing.get("contact_email") or None
                                        raw_desc = job_listing.get("job_description") or ""
                                        if "<" in raw_desc:
                                            raw_desc = BeautifulSoup(raw_desc, "html.parser").get_text(" ", strip=True)
                                        skills_raw = job_listing.get("preferred_skills") or ""
                                        if skills_raw and "<" in skills_raw:
                                            skills_raw = BeautifulSoup(skills_raw, "html.parser").get_text(" ", strip=True)
                                        if raw_desc:
                                            description = f"{raw_desc}\nPreferred Skills: {skills_raw}".strip()[:2000]
                            except Exception as det_err:
                                logger.debug(f"Detail fetch error for job {job_id_num}: {det_err}")

                        stable_id = generate_job_id(title, company, "Trivandrum, Kerala")
                        jobs.append(JobPost(
                            job_id=stable_id,
                            title=title,
                            company=company,
                            company_details="Technopark Trivandrum Campus",
                            description=description,
                            location="Technopark Trivandrum, Kerala",
                            required_skills=["DevOps", "Cloud", "CI/CD"],
                            experience="3-5 Years",
                            salary=None,
                            date_posted=posted_date,
                            job_url=job_url,
                            apply_method="Email / Direct Apply" if contact_email else "Technopark Portal",
                            recruiter_name="Technopark HR Team",
                            recruiter_email=contact_email,
                            recruiter_phone=None,
                            source_website="Technopark Trivandrum",
                            status="New"
                        ))

                        if len(jobs) >= limit:
                            break

                except Exception as page_err:
                    logger.error(f"Error fetching Technopark page {page}: {page_err}")
                    break

    except Exception as e:
        logger.error(f"Error scraping Technopark direct API: {e}", exc_info=True)

    logger.info(f"Technopark scraper extracted {len(jobs)} jobs.")
    return jobs
