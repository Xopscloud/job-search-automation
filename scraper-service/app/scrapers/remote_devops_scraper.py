import logging
import re
from typing import List, Optional
from datetime import datetime
import httpx
from bs4 import BeautifulSoup

from app.models import JobPost
from app.config import settings
from app.utils.deduplicator import generate_job_id
from app.utils.contact_extractor import extract_all_contacts
from app.scrapers.infopark_scraper import is_devops_relevant

logger = logging.getLogger(__name__)

REMOTEOK_API_URL = "https://remoteok.com/api"
REMOTEOK_RSS_URL = "https://remoteok.com/remote-devops-jobs.rss"
WEWORKREMOTELY_RSS_URL = "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss"
JOBICY_API_URL = "https://jobicy.com/api/v2/remote-jobs"
REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"
ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api"


def scrape_remoteok(search_term: str = "DevOps", limit: int = 25) -> List[JobPost]:
    """
    Fetches live DevOps/SRE/Cloud listings from RemoteOK's public API or RSS feed fallback.
    """
    logger.info(f"Fetching RemoteOK jobs for query: '{search_term}'...")
    jobs: List[JobPost] = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "application/json, text/xml, application/xml, */*",
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
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    if isinstance(data, list):
                        items = data[1:] if len(data) > 1 else data
                        for item in items[:limit]:
                            title = str(item.get("position", "") or "").strip()
                            company = str(item.get("company", "") or "").strip()
                            if not title or not company:
                                continue

                            description = str(item.get("description", "") or "").strip()
                            if "<" in description and ">" in description:
                                soup = BeautifulSoup(description, "html.parser")
                                description = soup.get_text(separator=" ", strip=True)

                            raw_location = str(item.get("location", "") or "Worldwide / Remote").strip() or "Remote"
                            url_job = str(item.get("url", "") or item.get("apply_url", "") or "").strip()
                            if url_job.startswith("/"):
                                url_job = f"https://remoteok.com{url_job}"

                            tags = item.get("tags", []) if isinstance(item.get("tags"), list) else []

                            salary = None
                            s_min = item.get("salary_min")
                            s_max = item.get("salary_max")
                            if s_min and s_max:
                                salary = f"${s_min:,.0f} - ${s_max:,.0f} USD"
                            elif s_min:
                                salary = f"From ${s_min:,.0f} USD"

                            date_posted = str(item.get("date", "") or "")[:10] or datetime.now().strftime("%Y-%m-%d")
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
                                    required_skills=tags[:8] if tags else ["DevOps", "Cloud"],
                                    experience="Experienced",
                                    salary=salary,
                                    date_posted=date_posted,
                                    job_url=url_job or "https://remoteok.com",
                                    apply_method="Direct Link",
                                    recruiter_name=recruiter,
                                    recruiter_email=email,
                                    recruiter_phone=phone,
                                    source_website="RemoteOK",
                                    status="New",
                                )
                            )
                except Exception as json_err:
                    logger.debug(f"RemoteOK JSON parse error: {json_err}")

            # Fallback to RemoteOK RSS feed if JSON was empty or blocked
            if not jobs:
                rss_resp = client.get(REMOTEOK_RSS_URL)
                if rss_resp.status_code == 200:
                    soup = BeautifulSoup(rss_resp.text, "html.parser")
                    items = soup.find_all("item")
                    for item in items[:limit]:
                        title_tag = item.find("title")
                        link_tag = item.find("link")
                        desc_tag = item.find("description")
                        if not title_tag or not link_tag:
                            continue

                        raw_title = title_tag.get_text(strip=True)
                        parts = raw_title.split(" is hiring ")
                        if len(parts) == 2:
                            company = parts[0].strip()
                            title = parts[1].strip()
                        else:
                            company = "RemoteOK Tech"
                            title = raw_title

                        description = desc_tag.get_text(strip=True) if desc_tag else ""
                        job_url = link_tag.get_text(strip=True)
                        email, phone, recruiter = extract_all_contacts(description)
                        job_id = generate_job_id(title, company, "Remote")

                        jobs.append(
                            JobPost(
                                job_id=job_id,
                                title=title,
                                company=company,
                                company_details="RemoteOK Verified Hiring Team",
                                description=description[:2000],
                                location="Worldwide / Remote",
                                required_skills=["DevOps", "Cloud", "SRE"],
                                experience="Experienced",
                                salary=None,
                                date_posted=datetime.now().strftime("%Y-%m-%d"),
                                job_url=job_url,
                                apply_method="Direct Link",
                                recruiter_name=recruiter,
                                recruiter_email=email,
                                recruiter_phone=phone,
                                source_website="RemoteOK",
                                status="New",
                            )
                        )

    except Exception as e:
        logger.error(f"Error fetching RemoteOK jobs: {e}")

    logger.info(f"Retrieved {len(jobs)} jobs from RemoteOK.")
    return jobs


def scrape_weworkremotely(search_term: str = "DevOps", limit: int = 25) -> List[JobPost]:
    """
    Fetches real-time DevOps postings from WeWorkRemotely RSS feed.
    """
    logger.info(f"Fetching WeWorkRemotely RSS feed for DevOps roles...")
    jobs: List[JobPost] = []
    try:
        with httpx.Client(headers=settings.DEFAULT_HEADERS, timeout=15.0, follow_redirects=True) as client:
            resp = client.get(WEWORKREMOTELY_RSS_URL)
            if resp.status_code != 200:
                logger.warning(f"WeWorkRemotely RSS returned HTTP {resp.status_code}")
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            items = soup.find_all("item")
            for item in items[:limit]:
                title_elem = item.find("title")
                link_elem = item.find("link")
                desc_elem = item.find("description")
                pub_elem = item.find("pubdate")

                if not title_elem or not link_elem:
                    continue

                full_title = title_elem.text.strip()
                company = "WeWorkRemotely Company"
                title = full_title
                if ":" in full_title:
                    parts = full_title.split(":", 1)
                    company = parts[0].strip()
                    title = parts[1].strip()

                raw_desc = desc_elem.text.strip() if desc_elem else ""
                if "<" in raw_desc and ">" in raw_desc:
                    raw_desc = BeautifulSoup(raw_desc, "html.parser").get_text(separator=" ", strip=True)

                job_url = link_elem.text.strip()
                date_posted = str(pub_elem.text.strip() if pub_elem else "")[:16]
                email, phone, recruiter = extract_all_contacts(raw_desc)
                job_id = generate_job_id(title, company, "Remote")

                jobs.append(
                    JobPost(
                        job_id=job_id,
                        title=title,
                        company=company,
                        company_details="Top Remote Employer via WeWorkRemotely",
                        description=raw_desc[:2500],
                        location="Remote / Anywhere",
                        required_skills=["DevOps", "Infrastructure", "Linux", "Cloud"],
                        experience="Experienced",
                        salary=None,
                        date_posted=date_posted or datetime.now().strftime("%Y-%m-%d"),
                        job_url=job_url,
                        apply_method="Direct Link",
                        recruiter_name=recruiter,
                        recruiter_email=email,
                        recruiter_phone=phone,
                        source_website="WeWorkRemotely",
                        status="New",
                    )
                )

    except Exception as e:
        logger.error(f"Error fetching WeWorkRemotely jobs: {e}")

    logger.info(f"Retrieved {len(jobs)} jobs from WeWorkRemotely.")
    return jobs


def scrape_jobicy(search_term: str = "DevOps", limit: int = 50) -> List[JobPost]:
    """
    Fetches real-time DevOps postings from Jobicy Public JSON API.
    """
    logger.info(f"Fetching Jobicy remote jobs for query: '{search_term}'...")
    jobs: List[JobPost] = []
    try:
        tag = "devops"
        st_lower = search_term.lower()
        if "sre" in st_lower:
            tag = "sre"
        elif "cloud" in st_lower:
            tag = "cloud"

        url = f"{JOBICY_API_URL}?count={limit}&tag={tag}"
        with httpx.Client(headers=settings.DEFAULT_HEADERS, timeout=15.0, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                resp = client.get(f"{JOBICY_API_URL}?count={limit}")

            if resp.status_code != 200:
                logger.warning(f"Jobicy returned HTTP {resp.status_code}")
                return []

            data = resp.json()
            items = data.get("jobs", [])
            for item in items[:limit]:
                title = str(item.get("jobTitle", "") or "").strip()
                company = str(item.get("companyName", "") or "").strip()
                if not title or not company:
                    continue

                raw_desc = str(item.get("jobDescription", "") or "").strip()
                if "<" in raw_desc and ">" in raw_desc:
                    raw_desc = BeautifulSoup(raw_desc, "html.parser").get_text(separator=" ", strip=True)

                location = str(item.get("jobGeo", "") or "Remote / Anywhere").strip()
                job_url = str(item.get("url", "") or "").strip()

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
                        status="New",
                    )
                )

    except Exception as e:
        logger.error(f"Error scraping Jobicy: {e}")

    logger.info(f"Retrieved {len(jobs)} jobs from Jobicy.")
    return jobs


def scrape_remotive(search_term: str = "DevOps", limit: int = 50) -> List[JobPost]:
    """
    Fetches live DevOps and SRE positions directly from Remotive's official JSON API.
    """
    logger.info(f"Fetching Remotive jobs for: '{search_term}'...")
    jobs: List[JobPost] = []
    try:
        url = f"{REMOTIVE_API_URL}?category=devops"
        with httpx.Client(headers=settings.DEFAULT_HEADERS, timeout=15.0, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                logger.warning(f"Remotive returned HTTP {resp.status_code}")
                return []

            data = resp.json()
            items = data.get("jobs", []) if isinstance(data, dict) else []
            for item in items[:limit]:
                title = str(item.get("title", "") or "").strip()
                company = str(item.get("company_name", "") or "").strip()
                if not title or not company:
                    continue

                raw_desc = str(item.get("description", "") or "").strip()
                if "<" in raw_desc:
                    raw_desc = BeautifulSoup(raw_desc, "html.parser").get_text(separator=" ", strip=True)

                location = str(item.get("candidate_required_location", "") or "Worldwide / Remote").strip()
                job_url = str(item.get("url", "") or "").strip()
                salary = str(item.get("salary", "") or "").strip() or None
                date_posted = str(item.get("publication_date", "") or "")[:10]
                tags = item.get("tags", []) if isinstance(item.get("tags"), list) else ["DevOps", "Cloud"]

                email, phone, recruiter = extract_all_contacts(raw_desc)
                job_id = generate_job_id(title, company, location)

                jobs.append(
                    JobPost(
                        job_id=job_id,
                        title=title,
                        company=company,
                        company_details="Remotive Global Tech",
                        description=raw_desc[:2500],
                        location=location or "Remote",
                        required_skills=tags[:6],
                        experience="Experienced",
                        salary=salary,
                        date_posted=date_posted or datetime.now().strftime("%Y-%m-%d"),
                        job_url=job_url,
                        apply_method="Direct Link",
                        recruiter_name=recruiter,
                        recruiter_email=email,
                        recruiter_phone=phone,
                        source_website="Remotive",
                        status="New",
                    )
                )
    except Exception as e:
        logger.error(f"Error fetching Remotive jobs: {e}")

    logger.info(f"Retrieved {len(jobs)} jobs from Remotive.")
    return jobs


def scrape_arbeitnow(search_term: str = "DevOps", limit: int = 50) -> List[JobPost]:
    """
    Fetches verified tech and DevOps openings from Arbeitnow API (Visa sponsorship & Remote friendly).
    """
    logger.info(f"Fetching Arbeitnow tech jobs for: '{search_term}'...")
    jobs: List[JobPost] = []
    try:
        with httpx.Client(headers=settings.DEFAULT_HEADERS, timeout=15.0, follow_redirects=True) as client:
            resp = client.get(ARBEITNOW_API_URL)
            if resp.status_code != 200:
                logger.warning(f"Arbeitnow returned HTTP {resp.status_code}")
                return []

            data = resp.json()
            items = data.get("data", []) if isinstance(data, dict) else []
            for item in items:
                title = str(item.get("title", "") or "").strip()
                company = str(item.get("company_name", "") or "").strip()
                if not title or not company:
                    continue

                raw_desc = str(item.get("description", "") or "").strip()
                if "<" in raw_desc:
                    raw_desc = BeautifulSoup(raw_desc, "html.parser").get_text(separator=" ", strip=True)

                # Filter for DevOps relevance
                if not is_devops_relevant(title, f"{title} {raw_desc}", search_term):
                    continue

                location = str(item.get("location", "") or "Remote").strip()
                job_url = str(item.get("url", "") or "").strip()
                tags = item.get("tags", []) if isinstance(item.get("tags"), list) else ["DevOps"]

                created_at = item.get("created_at")
                date_posted = ""
                if created_at:
                    try:
                        date_posted = datetime.fromtimestamp(created_at).strftime("%Y-%m-%d")
                    except Exception:
                        pass
                if not date_posted:
                    date_posted = datetime.now().strftime("%Y-%m-%d")

                email, phone, recruiter = extract_all_contacts(raw_desc)
                job_id = generate_job_id(title, company, location)

                jobs.append(
                    JobPost(
                        job_id=job_id,
                        title=title,
                        company=company,
                        company_details="Arbeitnow Verified Employer",
                        description=raw_desc[:2500],
                        location=location,
                        required_skills=tags[:6],
                        experience="Experienced",
                        salary=None,
                        date_posted=date_posted,
                        job_url=job_url,
                        apply_method="Direct Link",
                        recruiter_name=recruiter,
                        recruiter_email=email,
                        recruiter_phone=phone,
                        source_website="Arbeitnow",
                        status="New",
                    )
                )
                if len(jobs) >= limit:
                    break

    except Exception as e:
        logger.error(f"Error fetching Arbeitnow jobs: {e}")

    logger.info(f"Retrieved {len(jobs)} jobs from Arbeitnow.")
    return jobs


def scrape_all_remote_devops(search_term: str = "DevOps", limit: int = 25) -> List[JobPost]:
    """
    Aggregates DevOps listings across all high-yield remote tech job APIs.
    """
    results: List[JobPost] = []
    results.extend(scrape_remotive(search_term, limit=limit))
    results.extend(scrape_arbeitnow(search_term, limit=limit))
    results.extend(scrape_jobicy(search_term, limit=limit))
    results.extend(scrape_weworkremotely(search_term, limit=limit))
    results.extend(scrape_remoteok(search_term, limit=limit))
    return results
