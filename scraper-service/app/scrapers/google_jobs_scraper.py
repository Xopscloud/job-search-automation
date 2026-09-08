import logging
import re
from typing import List
from datetime import datetime
import urllib.parse
import base64
import httpx
from bs4 import BeautifulSoup

from app.models import JobPost
from app.config import settings
from app.utils.deduplicator import generate_job_id
from app.utils.contact_extractor import extract_all_contacts

logger = logging.getLogger(__name__)

def _decode_bing_url(raw_url: str) -> str:
    """Decodes Bing tracking redirect URL to direct destination URL."""
    try:
        if "bing.com/ck/a" in raw_url and "u=" in raw_url:
            parsed = urllib.parse.urlparse(raw_url)
            qs = urllib.parse.parse_qs(parsed.query)
            u_val = qs.get("u", [""])[0]
            if u_val.startswith("a1"):
                b64_str = u_val[2:]
                padding = "=" * ((4 - len(b64_str) % 4) % 4)
                return base64.b64decode(b64_str + padding).decode("utf-8", errors="ignore")
    except Exception:
        pass
    return raw_url


def scrape_google_jobs_ats(
    search_term: str = "DevOps Engineer",
    location: str = "",
    limit: int = 25
) -> List[JobPost]:
    """
    Scrapes company career portals and ATS links (Greenhouse, Lever, Workday, Ashby, SmartRecruiters, Workable)
    via Bing Search discovery.
    """
    logger.info(f"Querying ATS career portals across the internet for: '{search_term}' (Location: '{location or 'Worldwide'}')...")
    jobs: List[JobPost] = []

    # Search queries targeting company ATS platforms directly
    ats_sites = "site:boards.greenhouse.io OR site:jobs.lever.co OR site:myworkdayjobs.com OR site:ashbyhq.com OR site:jobs.smartrecruiters.com OR site:workable.com"
    if location and location.strip():
        query = f'"{search_term}" ({ats_sites}) "{location.strip()}"'
    else:
        query = f'"{search_term}" ({ats_sites})'
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        with httpx.Client(headers=headers, timeout=settings.DEFAULT_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(f"https://www.bing.com/search?q={query}")
            if resp.status_code != 200:
                logger.warning(f"Bing search request returned status {resp.status_code}")
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            results = soup.select("li.b_algo")

            for res in results:
                try:
                    title_elem = res.select_one("h2 a")
                    snippet_elem = res.select_one(".b_caption p, p")

                    if not title_elem:
                        continue

                    raw_href = title_elem.get("href", "")
                    job_url = _decode_bing_url(raw_href)

                    full_title = title_elem.get_text(strip=True)
                    snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""

                    # Extract company name from title or URL
                    company = "Tech Employer via ATS"
                    if "boards.greenhouse.io/" in job_url:
                        parts = job_url.split("boards.greenhouse.io/")[-1].split("/")
                        company = parts[0].replace("-", " ").title()
                    elif "jobs.lever.co/" in job_url:
                        parts = job_url.split("jobs.lever.co/")[-1].split("/")
                        company = parts[0].replace("-", " ").title()
                    elif "myworkdayjobs.com" in job_url:
                        domain_part = urllib.parse.urlparse(job_url).netloc
                        company = domain_part.split(".")[0].replace("-", " ").title()
                    elif "ashbyhq.com/" in job_url:
                        parts = job_url.split("ashbyhq.com/")[-1].split("/")
                        company = parts[0].replace("-", " ").title()
                    elif "smartrecruiters.com/" in job_url:
                        parts = job_url.split("smartrecruiters.com/")[-1].split("/")
                        company = parts[0].replace("-", " ").title()
                    elif "workable.com/" in job_url:
                        domain_part = urllib.parse.urlparse(job_url).netloc
                        company = domain_part.split(".")[0].replace("-", " ").title()
                    elif " - " in full_title:
                        company = full_title.split(" - ")[-1].strip()

                    clean_title = full_title.split(" - ")[0].split(" | ")[0].strip()
                    detected_location = location.strip() if location and location.strip() else "Remote / Global"
                    email, phone, recruiter = extract_all_contacts(snippet)
                    job_id = generate_job_id(clean_title, company, detected_location)

                    jobs.append(JobPost(
                        job_id=job_id,
                        title=clean_title,
                        company=company,
                        company_details="Direct Company Career Portal / ATS",
                        description=snippet,
                        location=detected_location,
                        required_skills=["DevOps", "Cloud", "Kubernetes"],
                        experience="Experienced",
                        salary=None,
                        date_posted=datetime.now().strftime("%Y-%m-%d"),
                        job_url=job_url,
                        apply_method="Direct ATS Application",
                        recruiter_name=recruiter,
                        recruiter_email=email,
                        recruiter_phone=phone,
                        source_website="Company ATS",
                        status="New"
                    ))

                    if len(jobs) >= limit:
                        break

                except Exception as row_err:
                    logger.debug(f"Error parsing search result: {row_err}")
                    continue

    except Exception as e:
        logger.error(f"Error in ATS scraper: {e}", exc_info=True)

    logger.info(f"ATS / Career portal scraper extracted {len(jobs)} jobs.")
    return jobs
