import logging
from typing import List, Optional
import pandas as pd
from datetime import datetime

from app.models import JobPost
from app.utils.deduplicator import generate_job_id
from app.utils.contact_extractor import extract_all_contacts

logger = logging.getLogger(__name__)

def map_site_names(sources: List[str]) -> List[str]:
    """Maps internal source strings to jobspy supported site names."""
    valid_map = {
        "linkedin": "linkedin",
        "indeed": "indeed",
        "naukri": "naukri",
        "glassdoor": "glassdoor",
        "google": "google",
        "zip_recruiter": "zip_recruiter",
        "ziprecruiter": "zip_recruiter",
        "google_jobs": "google",
        "bayt": "bayt",
    }
    mapped = []
    for s in sources:
        clean = s.strip().lower()
        if clean in valid_map:
            mapped.append(valid_map[clean])
    return list(set(mapped))


def _resolve_country_indeed(location: str) -> str:
    loc_lower = (location or "").lower()
    if "usa" in loc_lower or "united states" in loc_lower or "us" == loc_lower.strip():
        return "USA"
    elif "uk" in loc_lower or "united kingdom" in loc_lower:
        return "UK"
    elif "canada" in loc_lower:
        return "Canada"
    elif any(k in loc_lower for k in ["uae", "dubai", "abu dhabi", "sharjah", "emirates"]):
        return "United Arab Emirates"
    elif any(k in loc_lower for k in ["germany", "berlin", "munich"]):
        return "Germany"
    elif any(k in loc_lower for k in ["australia", "sydney", "melbourne"]):
        return "Australia"
    return "India"


def _dataframe_to_jobposts(jobs_df: pd.DataFrame, default_location: str = "", default_site: str = "Job Board") -> List[JobPost]:
    """Helper to convert a JobSpy pandas DataFrame into JobPost pydantic models."""
    if jobs_df is None or jobs_df.empty:
        return []

    results: List[JobPost] = []
    for _, row in jobs_df.iterrows():
        try:
            title = str(row.get("title", "") or "").strip()
            company = str(row.get("company", "") or "").strip()
            if not title or not company or title.lower() == "nan" or company.lower() == "nan":
                continue

            job_loc = str(row.get("location", "") or default_location).strip()
            if job_loc.lower() == "nan" or not job_loc:
                job_loc = default_location or "Disclosed on Portal"

            description = str(row.get("description", "") or "").strip()
            if description.lower() == "nan":
                description = ""

            job_url = str(row.get("job_url", "") or row.get("job_url_direct", "") or "").strip()
            if not job_url or job_url.lower() == "nan":
                continue

            # Format salary if present
            salary = None
            min_amt = row.get("min_amount")
            max_amt = row.get("max_amount")
            currency = str(row.get("currency", "") or "").strip()
            if currency.lower() == "nan":
                currency = ""
            if pd.notna(min_amt) and pd.notna(max_amt):
                salary = f"{currency} {min_amt:,.0f} - {max_amt:,.0f}".strip()
            elif pd.notna(min_amt):
                salary = f"From {currency} {min_amt:,.0f}".strip()

            # Format date posted
            date_posted = ""
            raw_date = row.get("date_posted")
            if pd.notna(raw_date):
                if isinstance(raw_date, datetime):
                    date_posted = raw_date.strftime("%Y-%m-%d")
                else:
                    date_posted = str(raw_date)[:10]
            if not date_posted:
                date_posted = datetime.now().strftime("%Y-%m-%d")

            source_site = str(row.get("site", default_site) or default_site).capitalize()

            # Extract recruiter details from description or dedicated fields
            email_field = str(row.get("emails", "") or "")
            if email_field.lower() == "nan":
                email_field = ""
            recruiter_email, recruiter_phone, recruiter_name = extract_all_contacts(
                f"{email_field} \n {description}"
            )

            # Generate stable ID
            job_id = generate_job_id(title, company, job_loc)

            # Method
            apply_method = "Direct Link"
            if "easy" in str(row.get("job_type", "")).lower():
                apply_method = "Easy Apply"
            elif recruiter_email:
                apply_method = "Email / Direct Portal"

            job_post = JobPost(
                job_id=job_id,
                title=title,
                company=company,
                company_details=str(row.get("company_industry", "") or "").strip() or None,
                description=description[:3000],
                location=job_loc,
                required_skills=[],
                experience="Experienced",
                salary=salary,
                date_posted=date_posted,
                job_url=job_url,
                apply_method=apply_method,
                recruiter_name=recruiter_name,
                recruiter_email=recruiter_email,
                recruiter_phone=recruiter_phone,
                source_website=source_site,
                status="New"
            )
            results.append(job_post)
        except Exception as row_err:
            logger.debug(f"Error parsing row in JobSpy ({default_site}): {row_err}")
            continue

    return results


def _search_portal_fallback(
    portal: str,
    domain_query: str,
    search_term: str,
    location: str = "",
    limit: int = 20
) -> List[JobPost]:
    """
    Search-engine fallback that retrieves active job postings when a job board's
    anti-bot protection or rate limiter blocks direct automated scraping.
    """
    import urllib.parse
    import httpx
    from bs4 import BeautifulSoup
    from app.config import settings

    logger.info(f"Executing search fallback for {portal} ({domain_query}) | Query: '{search_term}' | Location: '{location}'")
    jobs: List[JobPost] = []

    clean_loc = (location or "").replace("Remote,", "").replace("Remote", "").strip()
    query = f'{domain_query} "{search_term}"'
    if clean_loc:
        query += f' "{clean_loc}"'

    try:
        headers = settings.DEFAULT_HEADERS.copy()
        headers["Referer"] = "https://html.duckduckgo.com/"
        data = {
            "q": query,
            "b": "",
            "kl": "in-en" if "india" in (location or "").lower() else "us-en"
        }
        with httpx.Client(headers=headers, timeout=settings.DEFAULT_TIMEOUT, follow_redirects=True) as client:
            resp = client.post("https://html.duckduckgo.com/html/", data=data)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                results = soup.select(".result, .results_links")
                for res in results:
                    try:
                        title_elem = res.select_one(".result__title a")
                        snippet_elem = res.select_one(".result__snippet")
                        if not title_elem:
                            continue

                        raw_url = title_elem.get("href", "")
                        if "uddg=" in raw_url:
                            parsed_q = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                            job_url = parsed_q.get("uddg", [raw_url])[0]
                        else:
                            job_url = raw_url

                        full_title = title_elem.get_text(strip=True)
                        snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""

                        clean_title = full_title.split(" - ")[0].split(" | ")[0].strip()
                        company = f"{portal} Verified Employer"
                        if " at " in clean_title.lower():
                            parts = clean_title.split(" at ")
                            clean_title = parts[0].strip()
                            company = parts[1].strip()
                        elif " - " in full_title:
                            company = full_title.split(" - ")[1].split(" | ")[0].strip()

                        job_loc = location or f"Worldwide / Remote ({portal})"
                        email, phone, recruiter = extract_all_contacts(snippet)
                        job_id = generate_job_id(clean_title, company, job_loc)

                        jobs.append(JobPost(
                            job_id=job_id,
                            title=clean_title,
                            company=company,
                            company_details=f"Retrieved via {portal}",
                            description=snippet,
                            location=job_loc,
                            required_skills=[],
                            experience="Experienced",
                            salary=None,
                            date_posted=datetime.now().strftime("%Y-%m-%d"),
                            job_url=job_url,
                            apply_method=f"{portal} Direct Apply",
                            recruiter_name=recruiter,
                            recruiter_email=email,
                            recruiter_phone=phone,
                            source_website=portal,
                            status="New"
                        ))
                        if len(jobs) >= limit:
                            break
                    except Exception as parse_err:
                        logger.debug(f"Error parsing {portal} result: {parse_err}")
                        continue
    except Exception as search_err:
        logger.error(f"Error in {portal} search fallback: {search_err}")

    logger.info(f"{portal} fallback retrieved {len(jobs)} postings.")
    return jobs


def scrape_single_jobspy_site(
    site: str,
    search_term: str,
    location: str = "",
    results_wanted: int = 20,
    hours_old: int = 72
) -> List[JobPost]:
    """
    Scrapes a single job board using python-jobspy with independent error isolation.
    If JobSpy is blocked or returns 0 jobs due to anti-bot detection or location mismatch,
    transparently falls back to search engine discovery to ensure results are always returned.
    """
    import re

    clean_site = site.strip().lower()
    if clean_site in ["google_jobs", "google"]:
        target_site = "google"
    elif clean_site in ["ziprecruiter", "zip_recruiter"]:
        target_site = "zip_recruiter"
    else:
        target_site = clean_site

    logger.info(f"Scraping single JobSpy portal: '{target_site}' | Term: '{search_term}' | Location: '{location or 'Worldwide'}' | Wanted: {results_wanted}")

    # Detect remote intent and normalize location
    is_remote = False
    clean_loc = (location or "").strip()
    if "remote" in clean_loc.lower():
        is_remote = True
        clean_loc = re.sub(r'(?i)\b(remote|work from home|wfh)\b', '', clean_loc)
        clean_loc = re.sub(r'^[,\s/|-]+|[,\s/|-]+$', '', clean_loc).strip()

    country_indeed = _resolve_country_indeed(location or clean_loc)

    # Portal-specific location adjustments
    site_location = clean_loc
    if target_site == "indeed":
        # Indeed uses country_indeed; if site_location is country name, clear it to avoid "India in India" search error
        if site_location.lower() in ["india", "usa", "uk", "canada", "united arab emirates", "uae"]:
            site_location = ""
    elif target_site == "zip_recruiter":
        if not site_location or any(c in site_location.lower() for c in ["india", "kerala", "dubai", "uae"]):
            site_location = "United States"
    elif target_site == "bayt":
        if not site_location or "india" in site_location.lower():
            site_location = "United Arab Emirates"

    # Step 1: Attempt JobSpy
    try:
        from jobspy import scrape_jobs
        kwargs = {
            "site_name": [target_site],
            "search_term": search_term,
            "location": site_location,
            "results_wanted": results_wanted,
            "hours_old": hours_old,
        }
        if is_remote:
            kwargs["is_remote"] = True
        if target_site == "indeed":
            kwargs["country_indeed"] = country_indeed
        if target_site == "linkedin":
            kwargs["linkedin_fetch_description"] = True

        try:
            jobs_df: pd.DataFrame = scrape_jobs(**kwargs)
        except Exception as retry_err:
            if "is_remote" in kwargs:
                kwargs.pop("is_remote", None)
                jobs_df = scrape_jobs(**kwargs)
            else:
                raise retry_err

        parsed = _dataframe_to_jobposts(jobs_df, default_location=location or site_location, default_site=target_site.capitalize())
        if parsed:
            logger.info(f"JobSpy [{target_site}] successfully retrieved {len(parsed)} postings.")
            return parsed
        logger.info(f"JobSpy [{target_site}] returned 0 jobs. Activating search fallback...")

    except Exception as e:
        logger.warning(f"JobSpy portal [{target_site}] encountered error ({e}). Activating fallback...")

    # Step 2: Fallback queries per portal when direct scraping returns 0 or gets blocked
    fallback_map = {
        "indeed": ("Indeed", "site:indeed.com OR site:in.indeed.com"),
        "glassdoor": ("Glassdoor", "site:glassdoor.com/job-listing OR site:glassdoor.co.in"),
        "zip_recruiter": ("ZipRecruiter", "site:ziprecruiter.com/jobs"),
        "google": ("Google Jobs", "site:careers.google.com OR site:google.com/search"),
        "bayt": ("Bayt", "site:bayt.com/en/international/jobs OR site:bayt.com/en/uae/jobs"),
    }

    if target_site in fallback_map:
        disp_name, dork = fallback_map[target_site]
        return _search_portal_fallback(disp_name, dork, search_term, location=location, limit=results_wanted)

    return []


def scrape_naukri(
    search_term: str,
    location: str = "",
    limit: int = 25
) -> List[JobPost]:
    """
    Scrapes Naukri job listings:
    1. First attempts via JobSpy's native Naukri driver.
    2. If JobSpy returns 0 jobs or fails (due to Akamai / bot challenges),
       falls back to a live search dork across naukri.com to extract active postings.
    """
    logger.info(f"Querying Naukri for '{search_term}' (Location: '{location or 'India'}')...")
    
    # 1. Try JobSpy first
    try:
        naukri_jobs = scrape_single_jobspy_site(
            site="naukri",
            search_term=search_term,
            location=location,
            results_wanted=limit,
            hours_old=72
        )
        if naukri_jobs:
            logger.info(f"Naukri via JobSpy returned {len(naukri_jobs)} jobs.")
            return naukri_jobs
    except Exception as err:
        logger.warning(f"JobSpy Naukri attempt failed: {err}. Proceeding to search fallback.")

    # 2. Search Fallback for Naukri
    import urllib.parse
    import httpx
    from bs4 import BeautifulSoup
    from app.config import settings

    logger.info("Executing search fallback for Naukri postings...")
    jobs: List[JobPost] = []
    
    query = f'site:naukri.com "{search_term}"'
    if location and location.strip():
        query += f' "{location.strip()}"'

    try:
        headers = settings.DEFAULT_HEADERS.copy()
        headers["Referer"] = "https://html.duckduckgo.com/"
        data = {
            "q": query,
            "b": "",
            "kl": "in-en"
        }
        with httpx.Client(headers=headers, timeout=settings.DEFAULT_TIMEOUT, follow_redirects=True) as client:
            resp = client.post("https://html.duckduckgo.com/html/", data=data)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                results = soup.select(".result, .results_links")
                for res in results:
                    try:
                        title_elem = res.select_one(".result__title a")
                        snippet_elem = res.select_one(".result__snippet")
                        if not title_elem:
                            continue

                        raw_url = title_elem.get("href", "")
                        if "uddg=" in raw_url:
                            parsed_q = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                            job_url = parsed_q.get("uddg", [raw_url])[0]
                        else:
                            job_url = raw_url

                        # Must be a naukri.com job URL
                        if "naukri.com" not in job_url:
                            continue

                        full_title = title_elem.get_text(strip=True)
                        snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""

                        # Extract title and company e.g. "DevOps Engineer Jobs in TCS - Naukri.com"
                        clean_title = full_title.split(" - ")[0].split(" | ")[0].strip()
                        company = "Naukri Verified Employer"
                        if " at " in clean_title.lower():
                            parts = clean_title.split(" at ")
                            clean_title = parts[0].strip()
                            company = parts[1].strip()
                        elif " in " in clean_title.lower() and ("tcs" in clean_title.lower() or "infosys" in clean_title.lower() or "wipro" in clean_title.lower()):
                            company = clean_title.split(" in ")[-1].strip()

                        job_loc = location or "India (Naukri)"
                        email, phone, recruiter = extract_all_contacts(snippet)
                        job_id = generate_job_id(clean_title, company, job_loc)

                        jobs.append(JobPost(
                            job_id=job_id,
                            title=clean_title,
                            company=company,
                            company_details="Naukri India Talent Portal",
                            description=snippet,
                            location=job_loc,
                            required_skills=[],
                            experience="Experienced",
                            salary=None,
                            date_posted=datetime.now().strftime("%Y-%m-%d"),
                            job_url=job_url,
                            apply_method="Naukri Portal Apply",
                            recruiter_name=recruiter,
                            recruiter_email=email,
                            recruiter_phone=phone,
                            source_website="Naukri",
                            status="New"
                        ))
                        if len(jobs) >= limit:
                            break
                    except Exception as parse_err:
                        logger.debug(f"Error parsing Naukri result: {parse_err}")
                        continue
    except Exception as search_err:
        logger.error(f"Error in Naukri search fallback: {search_err}")

    logger.info(f"Naukri extracted {len(jobs)} jobs via fallback.")
    return jobs


def scrape_via_jobspy(
    search_term: str,
    location: str = "",
    results_per_site: int = 20,
    sources: Optional[List[str]] = None,
    hours_old: int = 72
) -> List[JobPost]:
    """
    Scrapes job listings across specified JobSpy supported portals.
    Crucially: Scrapes EACH site individually so results from the first site
    do NOT starve or prevent scraping subsequent sites!
    """
    if sources is None:
        sources = ["linkedin", "indeed", "naukri", "glassdoor", "zip_recruiter"]

    jobspy_sites = map_site_names(sources)
    if not jobspy_sites:
        return []

    all_jobs: List[JobPost] = []
    for site in jobspy_sites:
        if site == "naukri":
            site_jobs = scrape_naukri(search_term, location=location, limit=results_per_site)
        else:
            site_jobs = scrape_single_jobspy_site(
                site=site,
                search_term=search_term,
                location=location,
                results_wanted=results_per_site,
                hours_old=hours_old
            )
        all_jobs.extend(site_jobs)

    logger.info(f"scrape_via_jobspy aggregated a total of {len(all_jobs)} jobs across {jobspy_sites}.")
    return all_jobs

