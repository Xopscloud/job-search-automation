import logging
import re
from typing import List, Optional
import httpx
from bs4 import BeautifulSoup

from app.models import JobPost
from app.config import settings
from app.utils.deduplicator import generate_job_id
from app.utils.contact_extractor import extract_all_contacts

logger = logging.getLogger(__name__)

REMOTEOK_API_URL = "https://remoteok.com/api"
WEWORKREMOTELY_RSS_URL = "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss"
JOBICY_API_URL = "https://jobicy.com/api/v2/remote-jobs"


def scrape_remoteok(search_term: str = "DevOps", limit: int = 25) -> List[JobPost]:
    """
    Fetches live DevOps/SRE/Cloud listings from RemoteOK's public API.
    """
    logger.info(f"Fetching RemoteOK jobs for query: '{search_term}'...")
    jobs: List[JobPost] = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }

    try:
        tag = "devops"
        st_lower = search_term.lower()
        if "sre" in st_lower or "reliability" in st_lower:
            tag = "sre"
        elif "cloud" in st_lower:
            tag = "cloud"
        elif "security" in st_lower or "devsecops" in st_lower:
            tag = "security"

        url = f"{REMOTEOK_API_URL}?tag={tag}"
        with httpx.Client(headers=headers, timeout=15.0, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                logger.warning(f"RemoteOK returned HTTP {resp.status_code}")
                return []

            data = resp.json()
            if not isinstance(data, list):
                return []

            # First element is usually disclaimer
            items = data[1:] if len(data) > 1 else data

            for item in items[:limit]:
                title = str(item.get("position", "") or "").strip()
                company = str(item.get("company", "") or "").strip()
                if not title or not company:
                    continue

                description = str(item.get("description", "") or "").strip()
                # Clean html tags from description
                if "<" in description and ">" in description:
                    soup = BeautifulSoup(description, "html.parser")
                    description = soup.get_text(separator=" ", strip=True)

                raw_location = str(item.get("location", "") or "Worldwide / Remote").strip()
                if not raw_location:
                    raw_location = "Remote"

                url = str(item.get("url", "") or item.get("apply_url", "") or "").strip()
                if url.startswith("/"):
                    url = f"https://remoteok.com{url}"

                tags = item.get("tags", [])
                if not isinstance(tags, list):
                    tags = []

                # Salary formatting
                salary = None
                s_min = item.get("salary_min")
                s_max = item.get("salary_max")
                if s_min and s_max:
                    salary = f"${s_min:,.0f} - ${s_max:,.0f} USD"
                elif s_min:
                    salary = f"From ${s_min:,.0f} USD"

                date_posted = str(item.get("date", "") or "")[:10]

                email, phone, recruiter = extract_all_contacts(description)
                job_id = generate_job_id(title, company, raw_location)

                jobs.append(
                    JobPost(
                        job_id=job_id,
                        title=title,
                        company=company,
                        company_details="Global Remote Tech Organization",
                        description=description[:2500],
                        location=raw_location,
                        required_skills=tags[:8],
                        experience="Experienced",
                        salary=salary,
                        date_posted=date_posted,
                        job_url=url,
                        apply_method="Direct Apply Link",
                        recruiter_name=recruiter,
                        recruiter_email=email,
                        recruiter_phone=phone,
                        source_website="RemoteOK",
                        match_score=None,
                        match_summary=None,
                        status="New",
                    )
                )

    except Exception as e:
        logger.error(f"Error scraping RemoteOK: {e}")

    logger.info(f"Retrieved {len(jobs)} jobs from RemoteOK.")
    return jobs


def scrape_weworkremotely(search_term: str = "DevOps", limit: int = 25) -> List[JobPost]:
    """
    Fetches real-time DevOps and Sysadmin vacancies from WeWorkRemotely RSS feed.
    """
    logger.info(f"Fetching WeWorkRemotely RSS feed...")
    jobs: List[JobPost] = []
    headers = {
        "User-Agent": settings.DEFAULT_HEADERS["User-Agent"],
        "Accept": "application/rss+xml, application/xml, text/xml",
    }

    try:
        with httpx.Client(headers=headers, timeout=15.0, follow_redirects=True) as client:
            resp = client.get(WEWORKREMOTELY_RSS_URL)
            if resp.status_code != 200:
                logger.warning(f"WeWorkRemotely returned HTTP {resp.status_code}")
                return []

            soup = BeautifulSoup(resp.text, "xml")
            items = soup.find_all("item")

            for item in items[:limit]:
                raw_title = item.find("title")
                link_elem = item.find("link")
                desc_elem = item.find("description")
                pub_elem = item.find("pubDate")
                region_elem = item.find("region")

                if not raw_title:
                    continue

                full_title = raw_title.get_text(strip=True)
                # WeWorkRemotely format: "Company: Job Title"
                if ":" in full_title:
                    company = full_title.split(":", 1)[0].strip()
                    title = full_title.split(":", 1)[1].strip()
                else:
                    company = "Tech Company"
                    title = full_title

                job_url = link_elem.get_text(strip=True) if link_elem else ""
                
                raw_desc = desc_elem.get_text(strip=True) if desc_elem else ""
                if "<" in raw_desc:
                    raw_desc = BeautifulSoup(raw_desc, "html.parser").get_text(separator=" ", strip=True)

                location = region_elem.get_text(strip=True) if region_elem else "Worldwide / Remote"
                if not location:
                    location = "Worldwide / Remote"

                date_posted = ""
                if pub_elem:
                    try:
                        from email.utils import parsedate_to_datetime
                        dt = parsedate_to_datetime(pub_elem.get_text(strip=True))
                        date_posted = dt.strftime("%Y-%m-%d")
                    except Exception:
                        date_posted = ""

                email, phone, recruiter = extract_all_contacts(raw_desc)
                job_id = generate_job_id(title, company, location)

                jobs.append(
                    JobPost(
                        job_id=job_id,
                        title=title,
                        company=company,
                        company_details="WeWorkRemotely Verified Employer",
                        description=raw_desc[:2500],
                        location=location,
                        required_skills=["DevOps", "Cloud", "CI/CD", "Infrastructure"],
                        experience="Experienced",
                        salary=None,
                        date_posted=date_posted,
                        job_url=job_url,
                        apply_method="Direct Link",
                        recruiter_name=recruiter,
                        recruiter_email=email,
                        recruiter_phone=phone,
                        source_website="WeWorkRemotely",
                        match_score=None,
                        match_summary=None,
                        status="New",
                    )
                )

    except Exception as e:
        logger.error(f"Error scraping WeWorkRemotely: {e}")

    logger.info(f"Retrieved {len(jobs)} jobs from WeWorkRemotely.")
    return jobs


def scrape_jobicy(search_term: str = "DevOps", limit: int = 25) -> List[JobPost]:
    """
    Fetches global remote tech vacancies from Jobicy's API.
    """
    logger.info("Fetching Jobicy remote DevOps feed...")
    jobs: List[JobPost] = []
    headers = {
        "User-Agent": settings.DEFAULT_HEADERS["User-Agent"],
        "Accept": "application/json",
    }

    try:
        url = f"{JOBICY_API_URL}?count={limit}&tag=devops"
        with httpx.Client(headers=headers, timeout=15.0, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                return []

            data = resp.json()
            items = data.get("jobs", [])
            for item in items:
                title = str(item.get("jobTitle", "") or "").strip()
                company = str(item.get("companyName", "") or "").strip()
                if not title or not company:
                    continue

                location = str(item.get("jobGeo", "") or "Worldwide / Remote").strip()
                job_url = str(item.get("url", "") or "").strip()
                
                raw_desc = str(item.get("jobDescription", "") or "").strip()
                if "<" in raw_desc:
                    raw_desc = BeautifulSoup(raw_desc, "html.parser").get_text(separator=" ", strip=True)

                salary = None
                s_min = item.get("annualSalaryMin")
                s_max = item.get("annualSalaryMax")
                cur = item.get("salaryCurrency", "USD")
                if s_min and s_max:
                    salary = f"{cur} {s_min:,.0f} - {s_max:,.0f}"

                date_posted = str(item.get("pubDate", "") or "")[:10]

                email, phone, recruiter = extract_all_contacts(raw_desc)
                job_id = generate_job_id(title, company, location)

                jobs.append(
                    JobPost(
                        job_id=job_id,
                        title=title,
                        company=company,
                        company_details="Jobicy Remote Network",
                        description=raw_desc[:2500],
                        location=location,
                        required_skills=["DevOps", "Cloud", "Kubernetes", "Linux"],
                        experience="Experienced",
                        salary=salary,
                        date_posted=date_posted,
                        job_url=job_url,
                        apply_method="Direct Link",
                        recruiter_name=recruiter,
                        recruiter_email=email,
                        recruiter_phone=phone,
                        source_website="Jobicy",
                        match_score=None,
                        match_summary=None,
                        status="New",
                    )
                )

    except Exception as e:
        logger.error(f"Error scraping Jobicy: {e}")

    logger.info(f"Retrieved {len(jobs)} jobs from Jobicy.")
    return jobs


def scrape_all_remote_devops(search_term: str = "DevOps", limit: int = 25) -> List[JobPost]:
    """
    Aggregates DevOps listings across RemoteOK, WeWorkRemotely, and Jobicy.
    """
    results: List[JobPost] = []
    
    ro_jobs = scrape_remoteok(search_term, limit=limit)
    results.extend(ro_jobs)

    wwr_jobs = scrape_weworkremotely(search_term, limit=limit)
    results.extend(wwr_jobs)

    jb_jobs = scrape_jobicy(search_term, limit=limit)
    results.extend(jb_jobs)

    return results
