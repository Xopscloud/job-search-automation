import logging
import re
from typing import List
from datetime import datetime
import httpx
from bs4 import BeautifulSoup

from app.models import JobPost
from app.config import settings
from app.utils.deduplicator import generate_job_id
from app.utils.contact_extractor import extract_all_contacts

logger = logging.getLogger(__name__)

INFOPARK_BASE_URL = "https://infopark.in"
INFOPARK_AJAX_URL = "https://infopark.in/companies-job/0"

DEVOPS_CORE_KEYWORDS = [
    "devops", "sre", "site reliability", "cloud", "infrastructure",
    "platform", "ci/cd", "ci-cd", "kubernetes", "k8s", "terraform",
    "ansible", "sysadmin", "system admin", "systems admin", "systems engineer",
    "system engineer", "linux admin", "linux engineer", "devsecops",
    "cloud architect", "aws", "azure", "gcp", "docker", "build and release",
    "release engineer", "automation engineer", "network engineer", "platform engineer"
]

NON_DEVOPS_EXCLUSIONS = [
    "digital marketing", "seo", "social media", "content writer", "copywriter",
    "sales", "business development", "accountant", "visual builder", "graphic designer",
    "ui/ux", "telecaller", "bpo", "recruiter", "talent acquisition", "hr executive",
    "qa manual", "manual test", "payments & integration", "data & tracking"
]

def is_devops_relevant(title: str, text: str, search_term: str = "") -> bool:
    """
    Validates whether a job posting is genuinely DevOps/Cloud/Infrastructure related,
    strictly filtering out unrelated roles like Marketing, Sales, Visual Builder, etc.
    """
    t_lower = (title or "").lower()
    desc_lower = (text or "").lower()

    # 1. Negative exclusion check on title
    for neg in NON_DEVOPS_EXCLUSIONS:
        if neg in t_lower:
            return False

    # 2. Check search term context
    st = (search_term or "devops").lower().strip()
    is_devops_query = any(k in st for k in ["devops", "sre", "cloud", "infra", "platform", "sysadmin", "linux"])

    if is_devops_query:
        # Title matches any DevOps/Cloud core term
        if any(k in t_lower for k in DEVOPS_CORE_KEYWORDS):
            return True

        # If title is broader (e.g. "Software Engineer", "Technical Lead"), check description for tools
        devops_hits = [k for k in ["kubernetes", "docker", "terraform", "ci/cd", "aws", "azure", "gcp", "jenkins", "ansible", "linux", "helm", "devops"] if k in desc_lower]
        if len(devops_hits) >= 1:
            return True

        return False

    # General query fallback
    kws = [k.strip().lower() for k in st.split() if len(k.strip()) > 2]
    return any(kw in t_lower or kw in desc_lower for kw in kws)


def scrape_infopark(
    search_term: str = "",
    limit: int = 50
) -> List[JobPost]:
    """
    Scrapes active job vacancies directly from Infopark Kochi's AJAX endpoint with DevOps filtering.
    """
    logger.info(f"Scraping Infopark Kochi jobs for query: '{search_term}'...")
    jobs: List[JobPost] = []
    clean_term = search_term.strip() if search_term else "devops"

    headers = settings.DEFAULT_HEADERS.copy()
    headers.update({
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Referer": "https://infopark.in/companies-job",
    })

    try:
        with httpx.Client(headers=headers, timeout=settings.DEFAULT_TIMEOUT, follow_redirects=True) as client:
            # Query multiple pages: first with clean_term, or general all jobs if specific term has few
            pages_to_fetch = [1, 2, 3]
            for page in pages_to_fetch:
                if len(jobs) >= limit:
                    break

                try:
                    resp = client.get(f"{INFOPARK_AJAX_URL}?page={page}&search={clean_term}")
                    # If specific search term returned 404 or empty, try without search param to get all campus jobs
                    if resp.status_code != 200 or len(resp.text) < 100:
                        resp = client.get(f"{INFOPARK_AJAX_URL}?page={page}")

                    if resp.status_code != 200:
                        continue

                    # The response can be JSON with 'all_jobs' HTML or pure HTML
                    html_content = ""
                    try:
                        data = resp.json()
                        html_content = data.get("all_jobs", "")
                    except Exception:
                        html_content = resp.text

                    if not html_content:
                        continue

                    soup = BeautifulSoup(html_content, "html.parser")
                    rows = soup.select("tr")
                    logger.info(f"Infopark page {page} yielded {len(rows)} table rows.")

                    for row in rows:
                        cells = row.find_all("td")
                        if len(cells) < 3:
                            continue

                        # cell 0: posted date, cell 1: title, cell 2: company, cell 3: closing date, cell 4: action link
                        posted_date = cells[0].get_text(strip=True)
                        title = cells[1].get_text(strip=True)
                        company = cells[2].get_text(strip=True)

                        if not title or len(title) < 3:
                            continue

                        # Extract link
                        link_elem = row.find("a", href=True)
                        job_url = link_elem["href"] if link_elem else f"{INFOPARK_BASE_URL}/companies-job"

                        full_text = f"{title} {company}"
                        if not is_devops_relevant(title, full_text, search_term):
                            continue

                        closing_date = cells[3].get_text(strip=True) if len(cells) > 3 else ""
                        desc = f"Infopark Kochi Opening: {title} at {company}. Posted: {posted_date}. Closing: {closing_date}."

                        job_id = generate_job_id(title, company, "Kochi, Kerala")
                        jobs.append(JobPost(
                            job_id=job_id,
                            title=title,
                            company=company,
                            company_details="Infopark Kochi Campus",
                            description=desc,
                            location="Infopark Kochi, Kerala",
                            required_skills=["DevOps", "Linux", "Cloud"],
                            experience="Experienced",
                            salary=None,
                            date_posted=posted_date or datetime.now().strftime("%Y-%m-%d"),
                            job_url=job_url,
                            apply_method="Infopark Direct Portal",
                            recruiter_name=None,
                            recruiter_email=None,
                            recruiter_phone=None,
                            source_website="Infopark Kochi",
                            status="New"
                        ))

                        if len(jobs) >= limit:
                            break

                except Exception as p_err:
                    logger.debug(f"Error fetching Infopark page {page}: {p_err}")
                    continue

    except Exception as e:
        logger.error(f"Error scraping Infopark: {e}", exc_info=True)

    logger.info(f"Infopark scraper extracted {len(jobs)} jobs.")
    return jobs
