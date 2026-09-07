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
        "google_jobs": "google"
    }
    mapped = []
    for s in sources:
        clean = s.strip().lower()
        if clean in valid_map:
            mapped.append(valid_map[clean])
    return list(set(mapped))

def scrape_via_jobspy(
    search_term: str,
    location: str = "",
    results_per_site: int = 20,
    sources: Optional[List[str]] = None,
    hours_old: int = 72
) -> List[JobPost]:
    """
    Scrapes job listings across LinkedIn, Indeed, Naukri, Glassdoor, ZipRecruiter, etc.
    using python-jobspy and normalizes them into JobPost models.
    """
    if sources is None:
        sources = ["linkedin", "indeed", "naukri", "glassdoor", "zip_recruiter"]

    jobspy_sites = map_site_names(sources)
    if not jobspy_sites:
        return []

    loc_display = location if location.strip() else "Worldwide / Broad"
    logger.info(f"Running JobSpy scraper for sites: {jobspy_sites} | Search: '{search_term}' | Location: '{loc_display}'")
    
    country_indeed = "India"
    loc_lower = location.lower()
    if "usa" in loc_lower or "united states" in loc_lower:
        country_indeed = "USA"
    elif "uk" in loc_lower or "united kingdom" in loc_lower:
        country_indeed = "UK"
    elif "canada" in loc_lower:
        country_indeed = "Canada"
        country_indeed = "Canada"

    try:
        from jobspy import scrape_jobs
        jobs_df: pd.DataFrame = scrape_jobs(
            site_name=jobspy_sites,
            search_term=search_term,
            location=location,
            results_wanted=results_per_site,
            hours_old=hours_old,
            country_indeed=country_indeed,
            linkedin_fetch_description=True, # Fetch full description to extract skills & recruiter info
        )
    except Exception as e:
        logger.error(f"Error during JobSpy execution: {e}", exc_info=True)
        return []

    if jobs_df is None or jobs_df.empty:
        logger.warning("JobSpy returned empty results.")
        return []

    results: List[JobPost] = []

    for _, row in jobs_df.iterrows():
        try:
            title = str(row.get("title", "") or "").strip()
            company = str(row.get("company", "") or "").strip()
            if not title or not company or title.lower() == "nan" or company.lower() == "nan":
                continue

            job_loc = str(row.get("location", "") or location).strip()
            if job_loc.lower() == "nan":
                job_loc = location

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
            if pd.notna(min_amt) and pd.notna(max_amt):
                salary = f"{currency} {min_amt:,.0f} - {max_amt:,.0f}"
            elif pd.notna(min_amt):
                salary = f"From {currency} {min_amt:,.0f}"

            # Format date posted
            date_posted = ""
            raw_date = row.get("date_posted")
            if pd.notna(raw_date):
                if isinstance(raw_date, datetime):
                    date_posted = raw_date.strftime("%Y-%m-%d")
                else:
                    date_posted = str(raw_date)[:10]

            source_site = str(row.get("site", "job_board")).capitalize()

            # Extract recruiter details from description or dedicated fields
            email_field = str(row.get("emails", "") or "")
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
                description=description[:3000], # Keep up to 3000 chars for LLM
                location=job_loc,
                required_skills=[], # Extracted downstream by AI or rules
                experience="",
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
            logger.debug(f"Error parsing row in JobSpy: {row_err}")
            continue

    logger.info(f"JobSpy successfully parsed {len(results)} jobs.")
    return results
