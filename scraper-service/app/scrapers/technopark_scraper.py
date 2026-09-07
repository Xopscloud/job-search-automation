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

logger = logging.getLogger(__name__)

TECHNOPARK_BASE_URL = "https://technopark.org"
TECHNOPARK_JOBS_URL = "https://technopark.org/job-search"

def scrape_technopark(
    search_term: str = "",
    limit: int = 30
) -> List[JobPost]:
    """
    Scrapes active job listings from Technopark Trivandrum portal.
    Extracts structured data from Inertia.js state or DOM elements.
    """
    logger.info(f"Scraping Technopark Trivandrum jobs for query: '{search_term}'...")
    jobs: List[JobPost] = []
    keywords = [k.strip().lower() for k in search_term.split() if len(k.strip()) > 2]

    try:
        headers = settings.DEFAULT_HEADERS.copy()
        # Header to ask Inertia for data or accept standard HTML
        headers["X-Requested-With"] = "XMLHttpRequest"

        with httpx.Client(headers=headers, timeout=settings.DEFAULT_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(TECHNOPARK_JOBS_URL)
            if resp.status_code != 200:
                resp = client.get("https://technopark.in/job-search")

            if resp.status_code != 200:
                logger.warning(f"Technopark request failed with status: {resp.status_code}")
                return []

            # 1. Try parsing Inertia.js data-page payload
            soup = BeautifulSoup(resp.text, "html.parser")
            app_div = soup.find("div", id="app")
            
            parsed_from_inertia = False
            if app_div and app_div.has_attr("data-page"):
                try:
                    data_page = json.loads(app_div["data-page"])
                    props = data_page.get("props", {})
                    # Inertia props might contain 'jobs', 'jobListing', or 'items'
                    job_items = (
                        props.get("jobs", {}).get("data", []) or
                        props.get("jobs", []) or
                        props.get("jobListing", {}).get("data", []) or
                        props.get("vacancies", [])
                    )

                    if isinstance(job_items, list) and job_items:
                        logger.info(f"Found {len(job_items)} jobs in Technopark Inertia payload.")
                        for item in job_items:
                            if not isinstance(item, dict):
                                continue
                            title = str(item.get("title") or item.get("job_title") or item.get("designation") or "").strip()
                            company = str(item.get("company_name") or item.get("company", {}).get("name") or item.get("company") or "").strip()
                            if not title or not company:
                                continue

                            # Keyword filter
                            if keywords:
                                full_text = f"{title} {company} {item.get('description', '')}".lower()
                                if not any(kw in full_text for kw in keywords):
                                    continue

                            desc = str(item.get("description") or item.get("job_description") or item.get("skills") or "")
                            job_url = str(item.get("url") or item.get("apply_url") or f"{TECHNOPARK_BASE_URL}/job-search")
                            exp = str(item.get("experience") or item.get("exp") or "")
                            email = str(item.get("email") or item.get("contact_email") or "")
                            phone = str(item.get("phone") or item.get("contact_phone") or "")
                            
                            if not email:
                                email, p_extracted, _ = extract_all_contacts(desc)
                                if not phone:
                                    phone = p_extracted

                            job_id = generate_job_id(title, company, "Trivandrum, Kerala")
                            jobs.append(JobPost(
                                job_id=job_id,
                                title=title,
                                company=company,
                                company_details="Technopark Trivandrum Campus",
                                description=desc[:2000],
                                location="Technopark Trivandrum, Kerala",
                                required_skills=[],
                                experience=exp or "Experienced",
                                salary=None,
                                date_posted=datetime.now().strftime("%Y-%m-%d"),
                                job_url=job_url,
                                apply_method="Email / Direct Apply" if email else "Technopark Portal",
                                recruiter_name=None,
                                recruiter_email=email or None,
                                recruiter_phone=phone or None,
                                source_website="Technopark Trivandrum",
                                status="New"
                            ))
                            if len(jobs) >= limit:
                                break
                        parsed_from_inertia = len(jobs) > 0
                except Exception as inertia_err:
                    logger.debug(f"Failed to parse Inertia payload: {inertia_err}")

            # 2. Fallback: Parse HTML cards / lists if Inertia payload had no job items
            if not parsed_from_inertia:
                logger.info("Falling back to HTML scraping for Technopark...")
                job_cards = soup.select(".job-card, .border, article, .p-4, .rounded-lg, div[data-page] a")
                for card in job_cards:
                    card_text = card.get_text(" ", strip=True)
                    if len(card_text) < 20:
                        continue

                    link = card.find("a", href=True) if card.name != "a" else card
                    if not link:
                        continue

                    title = link.get_text(strip=True)
                    if not title or len(title) < 3:
                        continue

                    if keywords:
                        if not any(kw in f"{title} {card_text}".lower() for kw in keywords):
                            continue

                    href = link["href"]
                    job_url = f"{TECHNOPARK_BASE_URL}{href}" if not href.startswith("http") else href

                    company_elem = card.find(class_=re.compile("company|employer|text-gray", re.IGNORECASE))
                    company = company_elem.get_text(strip=True) if company_elem else "Technopark Company"

                    email, phone, recruiter = extract_all_contacts(card_text)
                    job_id = generate_job_id(title, company, "Trivandrum, Kerala")

                    jobs.append(JobPost(
                        job_id=job_id,
                        title=title,
                        company=company,
                        company_details="Technopark Trivandrum",
                        description=card_text[:1500],
                        location="Technopark Trivandrum, Kerala",
                        required_skills=[],
                        experience="Experienced",
                        salary=None,
                        date_posted=datetime.now().strftime("%Y-%m-%d"),
                        job_url=job_url,
                        apply_method="Technopark Portal",
                        recruiter_name=recruiter,
                        recruiter_email=email,
                        recruiter_phone=phone,
                        source_website="Technopark Trivandrum",
                        status="New"
                    ))
                    if len(jobs) >= limit:
                        break

    except Exception as e:
        logger.error(f"Error scraping Technopark direct site: {e}", exc_info=True)

    # 3. If direct scraping yielded no jobs (due to JS-only client hydration on Technopark),
    # query Technopark's live indexed job vacancies directly
    if not jobs:
        logger.info(f"Direct Technopark scrape yielded 0 jobs. Running live search dork fallback for Technopark vacancies...")
        import urllib.parse
        search_kw = search_term if search_term.strip() else "DevOps"
        query = f'(site:technopark.in OR site:technopark.org) "{search_kw}"'
        try:
            headers = settings.DEFAULT_HEADERS.copy()
            headers["Referer"] = "https://html.duckduckgo.com/"
            data = {"q": query, "b": "", "kl": "in-en"}
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

                            if "technopark.in" not in job_url and "technopark.org" not in job_url:
                                continue

                            full_title = title_elem.get_text(strip=True)
                            snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""

                            # Clean up title and company
                            # Example: "DevOps Engineer - ThinkPalm Technologies | Technopark"
                            clean_title = full_title.split(" - ")[0].split(" | ")[0].split(" : ")[0].strip()
                            company = "Technopark Trivandrum Company"
                            if " - " in full_title:
                                parts = full_title.split(" - ")
                                if len(parts) > 1 and "technopark" not in parts[1].lower():
                                    company = parts[1].split(" | ")[0].strip()
                            elif " | " in full_title:
                                parts = full_title.split(" | ")
                                if len(parts) > 1 and "technopark" not in parts[1].lower():
                                    company = parts[1].strip()

                            email, phone, recruiter = extract_all_contacts(snippet)
                            job_id = generate_job_id(clean_title, company, "Trivandrum, Kerala")

                            jobs.append(JobPost(
                                job_id=job_id,
                                title=clean_title,
                                company=company,
                                company_details="Technopark Trivandrum Campus",
                                description=snippet,
                                location="Technopark Trivandrum, Kerala",
                                required_skills=[],
                                experience="Experienced",
                                salary=None,
                                date_posted=datetime.now().strftime("%Y-%m-%d"),
                                job_url=job_url,
                                apply_method="Email / Technopark Portal" if email else "Technopark Portal",
                                recruiter_name=recruiter,
                                recruiter_email=email,
                                recruiter_phone=phone,
                                source_website="Technopark Trivandrum",
                                status="New"
                            ))
                            if len(jobs) >= limit:
                                break
                        except Exception as row_err:
                            logger.debug(f"Error parsing Technopark search row: {row_err}")
                            continue
        except Exception as search_err:
            logger.error(f"Error in Technopark search fallback: {search_err}")

    logger.info(f"Technopark scraper extracted {len(jobs)} jobs.")
    return jobs

