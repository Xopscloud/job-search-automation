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
INFOPARK_JOBS_URL = "https://infopark.in/companies-job"

DEVOPS_CORE_KEYWORDS = [
    "devops", "sre", "site reliability", "cloud", "infrastructure",
    "platform", "ci/cd", "ci-cd", "kubernetes", "k8s", "terraform",
    "ansible", "sysadmin", "system admin", "systems admin", "systems engineer",
    "system engineer", "linux admin", "linux engineer", "devsecops",
    "cloud architect", "aws", "azure", "gcp", "docker", "build and release",
    "release engineer", "automation engineer"
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
        # Title must match at least one DevOps/Cloud core term
        if any(k in t_lower for k in DEVOPS_CORE_KEYWORDS):
            return True

        # If title is generic (e.g. "Associate Engineer"), description must mention at least 2 DevOps tools
        devops_hits = [k for k in ["kubernetes", "docker", "terraform", "ci/cd", "aws", "azure", "jenkins", "ansible", "linux", "git"] if k in desc_lower]
        if len(devops_hits) >= 2:
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
    Scrapes active job vacancies directly from Infopark Kochi portal with strict DevOps filtering.
    """
    logger.info(f"Scraping Infopark Kochi jobs for query: '{search_term}'...")
    jobs: List[JobPost] = []

    try:
        with httpx.Client(headers=settings.DEFAULT_HEADERS, timeout=settings.DEFAULT_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(INFOPARK_JOBS_URL)
            if resp.status_code != 200:
                # Try fallback URL
                resp = client.get(f"{INFOPARK_BASE_URL}/companies/job-search")

            if resp.status_code != 200:
                logger.warning(f"Failed to fetch Infopark page, status: {resp.status_code}")
                return []

            soup = BeautifulSoup(resp.text, "html.parser")

            # Look for job rows or cards
            # Infopark typically renders either a table or card list with class containing 'job' or 'company'
            job_rows = soup.select("table tr, .job-item, .job-card, .company-job-box, div.row.py-2, .list-group-item")

            # If standard selectors didn't match, search for links containing job detail paths
            if not job_rows or len(job_rows) < 3:
                job_links = soup.find_all("a", href=re.compile(r'/job|career|vacanc', re.IGNORECASE))
                for link in job_links:
                    title_elem = link.text.strip()
                    if title_elem and len(title_elem) > 3:
                        parent = link.find_parent("tr") or link.find_parent("div", class_=re.compile("card|box|item|row"))
                        if parent and parent not in job_rows:
                            job_rows.append(parent)

            logger.info(f"Found {len(job_rows)} candidate rows on Infopark page.")

            for row in job_rows:
                try:
                    text_content = row.get_text(" ", strip=True)
                    if not text_content or len(text_content) < 15:
                        continue

                    # Search for job link
                    link_elem = row.find("a", href=True)
                    if not link_elem:
                        continue
                    
                    href = link_elem["href"]
                    if not href.startswith("http"):
                        job_url = f"{INFOPARK_BASE_URL}{href if href.startswith('/') else '/' + href}"
                    else:
                        job_url = href

                    # Extract title and company
                    # Check table cells if row is <tr>
                    cells = row.find_all("td")
                    if len(cells) >= 2:
                        title = cells[0].get_text(strip=True)
                        company = cells[1].get_text(strip=True)
                    else:
                        title = link_elem.get_text(strip=True)
                        # Company might be in another span or strong tag
                        company_elem = row.find(class_=re.compile("company|employer|org", re.IGNORECASE)) or row.find("strong")
                        company = company_elem.get_text(strip=True) if company_elem else "Infopark Company"

                    if not title or len(title) < 2:
                        continue

                    # Filter strictly for DevOps / Cloud relevance
                    if not is_devops_relevant(title, text_content, search_term):
                        continue

                    # Extract experience if specified (e.g. 2-4 years, 3+ yrs)
                    exp_match = re.search(r'(\d+[\s\-\+to]+\d*\s*(?:years?|yrs?))', text_content, re.IGNORECASE)
                    experience = exp_match.group(1).strip() if exp_match else "Experienced"

                    # Extract contacts
                    recruiter_email, recruiter_phone, recruiter_name = extract_all_contacts(text_content)

                    # Date
                    date_match = re.search(r'\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b', text_content)
                    date_posted = date_match.group(1) if date_match else datetime.now().strftime("%Y-%m-%d")

                    job_id = generate_job_id(title, company, "Kochi, Kerala")

                    job_post = JobPost(
                        job_id=job_id,
                        title=title,
                        company=company,
                        company_details="Infopark Kochi Campus",
                        description=text_content[:2000],
                        location="Infopark Kochi, Kerala",
                        required_skills=[],
                        experience=experience,
                        salary=None,
                        date_posted=date_posted,
                        job_url=job_url,
                        apply_method="Email / Infopark Portal" if recruiter_email else "Infopark Portal",
                        recruiter_name=recruiter_name,
                        recruiter_email=recruiter_email,
                        recruiter_phone=recruiter_phone,
                        source_website="Infopark Kochi",
                        status="New"
                    )
                    jobs.append(job_post)
                    if len(jobs) >= limit:
                        break

                except Exception as row_err:
                    logger.debug(f"Error parsing Infopark row: {row_err}")
                    continue

    except Exception as e:
        logger.error(f"Error scraping Infopark: {e}", exc_info=True)

    logger.info(f"Infopark scraper extracted {len(jobs)} jobs.")
    return jobs
