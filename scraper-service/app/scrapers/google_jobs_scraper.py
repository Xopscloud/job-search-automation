import logging
import re
from typing import List
from datetime import datetime
import urllib.parse
import httpx
from bs4 import BeautifulSoup

from app.models import JobPost
from app.config import settings
from app.utils.deduplicator import generate_job_id
from app.utils.contact_extractor import extract_all_contacts

logger = logging.getLogger(__name__)

# Search engines and aggregators for direct ATS / company career sites
DUCKDUCKGO_HTML_URL = "https://html.duckduckgo.com/html/"

def scrape_google_jobs_ats(
    search_term: str = "Full Stack Developer",
    location: str = "India",
    limit: int = 20
) -> List[JobPost]:
    """
    Scrapes company career portals and ATS links (Lever, Greenhouse, Workday)
    via search engine dorks without requiring paid API keys.
    """
    logger.info(f"Querying ATS career portals for: '{search_term}' in '{location}'...")
    jobs: List[JobPost] = []

    # Search queries targeting company ATS platforms directly
    query = f'"{search_term}" (site:boards.greenhouse.io OR site:jobs.lever.co OR site:myworkdayjobs.com) "{location}"'
    
    try:
        data = {
            "q": query,
            "b": "",
            "kl": "in-en" if "india" in location.lower() else "us-en"
        }
        
        headers = settings.DEFAULT_HEADERS.copy()
        headers["Referer"] = "https://html.duckduckgo.com/"

        with httpx.Client(headers=headers, timeout=settings.DEFAULT_TIMEOUT, follow_redirects=True) as client:
            resp = client.post(DUCKDUCKGO_HTML_URL, data=data)
            if resp.status_code != 200:
                logger.warning(f"Search request returned status {resp.status_code}")
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            results = soup.select(".result, .results_links")

            for res in results:
                try:
                    title_elem = res.select_one(".result__title a")
                    snippet_elem = res.select_one(".result__snippet")

                    if not title_elem:
                        continue

                    raw_url = title_elem.get("href", "")
                    # Unquote DuckDuckGo redirect URL
                    if "uddg=" in raw_url:
                        parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                        job_url = parsed.get("uddg", [raw_url])[0]
                    else:
                        job_url = raw_url

                    full_title = title_elem.get_text(strip=True)
                    snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""

                    # Extract company name from title or URL
                    # e.g., "Software Engineer - Stripe (jobs.lever.co/stripe/...)"
                    company = "Company via Career Site"
                    if "boards.greenhouse.io/" in job_url:
                        parts = job_url.split("boards.greenhouse.io/")[-1].split("/")
                        company = parts[0].replace("-", " ").title()
                    elif "jobs.lever.co/" in job_url:
                        parts = job_url.split("jobs.lever.co/")[-1].split("/")
                        company = parts[0].replace("-", " ").title()
                    elif "myworkdayjobs.com" in job_url:
                        domain_part = urllib.parse.urlparse(job_url).netloc
                        company = domain_part.split(".")[0].replace("-", " ").title()
                    elif " - " in full_title:
                        company = full_title.split(" - ")[-1].strip()

                    # Clean up job title
                    clean_title = full_title.split(" - ")[0].split(" | ")[0].strip()

                    email, phone, recruiter = extract_all_contacts(snippet)
                    job_id = generate_job_id(clean_title, company, location)

                    job = JobPost(
                        job_id=job_id,
                        title=clean_title,
                        company=company,
                        company_details="Direct Company Career Portal / ATS",
                        description=snippet,
                        location=location,
                        required_skills=[],
                        experience="Experienced",
                        salary=None,
                        date_posted=datetime.now().strftime("%Y-%m-%d"),
                        job_url=job_url,
                        apply_method="Direct ATS Application",
                        recruiter_name=recruiter,
                        recruiter_email=email,
                        recruiter_phone=phone,
                        source_website="Company Career Website",
                        status="New"
                    )
                    jobs.append(job)

                    if len(jobs) >= limit:
                        break

                except Exception as row_err:
                    logger.debug(f"Error parsing search result: {row_err}")
                    continue

    except Exception as e:
        logger.error(f"Error in ATS scraper: {e}", exc_info=True)

    logger.info(f"ATS / Career portal scraper extracted {len(jobs)} jobs.")
    return jobs
