from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class JobPost(BaseModel):
    job_id: str = Field(description="Unique hash identifier for deduplication")
    title: str = Field(description="Job Title")
    company: str = Field(description="Company Name")
    company_details: Optional[str] = Field(default=None, description="Company industry, website, or size")
    description: Optional[str] = Field(default="", description="Full or excerpted job description")
    location: Optional[str] = Field(default="", description="Job Location or Remote/Hybrid")
    required_skills: List[str] = Field(default_factory=list, description="Extracted or listed required skills")
    experience: Optional[str] = Field(default="", description="Required experience level or years")
    salary: Optional[str] = Field(default=None, description="Salary or compensation package if disclosed")
    date_posted: Optional[str] = Field(default="", description="Date of posting or discovery (YYYY-MM-DD)")
    job_url: str = Field(description="Direct URL to view or apply for the job")
    apply_method: Optional[str] = Field(default="Direct Link", description="e.g., Easy Apply, Portal, Email")
    recruiter_name: Optional[str] = Field(default=None, description="Recruiter or Hiring Manager name")
    recruiter_email: Optional[str] = Field(default=None, description="Public recruiter/HR email address")
    recruiter_phone: Optional[str] = Field(default=None, description="Public phone or WhatsApp contact")
    source_website: str = Field(description="Portal name (LinkedIn, Indeed, Naukri, Infopark, Technopark, etc.)")
    match_score: Optional[int] = Field(default=None, description="Relevance score (0-100) vs candidate profile")
    match_summary: Optional[str] = Field(default=None, description="Brief explanation of fit or missing skills")
    status: str = Field(default="New", description="Application status: New, Applied, Interviewing, Rejected")

class CandidateProfile(BaseModel):
    target_titles: List[str] = Field(default_factory=list, description="Desired job titles")
    locations: List[str] = Field(default_factory=list, description="Desired locations or remote preference")
    skills: List[str] = Field(default_factory=list, description="Primary candidate skills")
    experience_years: int = Field(default=3, description="Candidate years of experience")
    min_match_score: int = Field(default=70, description="Minimum score to highlight or alert")

class ScrapeRequest(BaseModel):
    search_term: str = Field(default="DevOps Engineer", description="Primary job title or query keyword")
    location: str = Field(default="", description="Location filter (leave empty to search all locations/worldwide)")
    results_per_site: int = Field(default=25, description="Maximum results to retrieve per portal")
    sources: List[str] = Field(
        default=[
            "linkedin",
            "indeed",
            "naukri",
            "glassdoor",
            "zip_recruiter",
            "remoteok",
            "weworkremotely",
            "jobicy",
            "ats",
            "infopark",
            "technopark",
            "google_jobs",
        ],
        description="List of sources to query across the internet",
    )
    hours_old: Optional[int] = Field(default=72, description="Max age of job postings in hours")
    existing_job_ids: List[str] = Field(default_factory=list, description="Existing IDs to filter duplicates")

class ScrapeResponse(BaseModel):
    success: bool
    total_found: int
    new_jobs_count: int
    sources_queried: List[str]
    jobs: List[JobPost]
    errors: Dict[str, str] = Field(default_factory=dict)

class ExportExcelRequest(BaseModel):
    jobs: List[JobPost]
    filename: Optional[str] = "job_search_results.xlsx"
