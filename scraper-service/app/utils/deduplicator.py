import hashlib
import re
from typing import List, Set
from app.models import JobPost

def normalize_string(text: str) -> str:
    """Normalizes string for robust comparison and hashing."""
    if not text:
        return ""
    # Lowercase, strip punctuation, collapse whitespace
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def generate_job_id(title: str, company: str, location: str = "") -> str:
    """Generates deterministic MD5 hash for a job posting."""
    norm_title = normalize_string(title)
    norm_company = normalize_string(company)
    # Use only city/state or major words for location to handle minor string variances
    norm_loc = normalize_string(location)
    
    unique_key = f"{norm_company}___{norm_title}___{norm_loc}"
    return hashlib.md5(unique_key.encode("utf-8")).hexdigest()

def deduplicate_jobs(jobs: List[JobPost], existing_ids: Set[str] = None) -> List[JobPost]:
    """
    Deduplicates a list of jobs within the batch and filters out
    any job already present in existing_ids.
    """
    if existing_ids is None:
        existing_ids = set()
    else:
        existing_ids = set(existing_ids)

    seen_ids = set(existing_ids)
    unique_jobs: List[JobPost] = []

    for job in jobs:
        if not job.job_id:
            job.job_id = generate_job_id(job.title, job.company, job.location)

        if job.job_id not in seen_ids:
            seen_ids.add(job.job_id)
            unique_jobs.append(job)

    return unique_jobs
