"""
Diagnostic and Local Test Script for Job Scrapers
Runs individual scrapers and generates a test Excel spreadsheet.
"""

import sys
import os
from pathlib import Path

# Add scraper-service to path
current_dir = Path(__file__).resolve().parent
service_dir = current_dir.parent / "scraper-service"
sys.path.insert(0, str(service_dir))

def main():
    print("=" * 65)
    print("🧪 RUNNING JOB SEARCH SCRAPER DIAGNOSTIC TEST")
    print("=" * 65)

    try:
        from app.models import JobPost
        from app.scrapers.infopark_scraper import scrape_infopark
        from app.scrapers.technopark_scraper import scrape_technopark
        from app.utils.excel_generator import generate_excel_bytes
        from app.utils.contact_extractor import extract_all_contacts
        from app.utils.deduplicator import deduplicate_jobs
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Ensure you have installed dependencies: pip install -r scraper-service/requirements.txt")
        return

    # 1. Test Contact Extractor
    print("\n🔍 Test 1: Contact & Recruiter Extractor")
    sample_text = (
        "We are looking for a Senior Python Developer. "
        "Send your resume to hr@techcorp.in or reach out to Talent Recruiter Anjali Nair "
        "at +91 98471 23456. Walk-in drive on 15th Sep."
    )
    email, phone, recruiter = extract_all_contacts(sample_text)
    print(f"  • Extracted Email:     {email}")
    print(f"  • Extracted Phone:     {phone}")
    print(f"  • Extracted Recruiter: {recruiter}")
    assert email == "hr@techcorp.in", "Email extraction mismatch"

    # 2. Test Infopark Scraper
    print("\n🌐 Test 2: Scraping Infopark Kochi (Live Fetch)...")
    infopark_jobs = scrape_infopark(search_term="Developer", limit=5)
    print(f"  • Retrieved {len(infopark_jobs)} jobs from Infopark Kochi.")
    for j in infopark_jobs[:2]:
        print(f"    - [{j.source_website}] {j.title} @ {j.company} ({j.job_url})")

    # 3. Test Technopark Scraper
    print("\n🌐 Test 3: Scraping Technopark Trivandrum (Live Fetch)...")
    technopark_jobs = scrape_technopark(search_term="", limit=5)
    print(f"  • Retrieved {len(technopark_jobs)} jobs from Technopark Trivandrum.")
    for j in technopark_jobs[:2]:
        print(f"    - [{j.source_website}] {j.title} @ {j.company} ({j.job_url})")

    # 4. Synthesize Sample Ranked Dataset for Excel Test
    print("\n📊 Test 4: Generating Sample Excel (.xlsx) Report...")
    all_sample_jobs = [
        JobPost(
            job_id="job_001",
            title="Senior Full Stack Engineer (Python/React)",
            company="UST Global",
            company_details="Global Digital Transformation Leader",
            description="Developing scalable cloud microservices with FastAPI and React.",
            location="Infopark Kochi, Kerala",
            required_skills=["Python", "FastAPI", "React", "Docker", "PostgreSQL"],
            experience="3 - 5 Years",
            salary="₹14,00,000 - ₹20,00,000",
            date_posted="2026-09-06",
            job_url="https://infopark.in/companies-job",
            apply_method="Direct Email",
            recruiter_name="Anjali Menon",
            recruiter_email="careers@ust.com",
            recruiter_phone="+91 98470 12345",
            source_website="Infopark Kochi",
            match_score=94,
            match_summary="Exceptional fit on tech stack and location. Meets 3+ yr exp.",
            status="New"
        ),
        JobPost(
            job_id="job_002",
            title="Backend Python Developer",
            company="CareStack",
            company_details="Healthcare SaaS",
            description="Building high throughput API services using Django & AWS.",
            location="Technopark Trivandrum, Kerala",
            required_skills=["Python", "Django", "AWS", "PostgreSQL"],
            experience="2 - 4 Years",
            salary="₹12,00,000 - ₹16,00,000",
            date_posted="2026-09-05",
            job_url="https://technopark.org/job-search",
            apply_method="Technopark Portal",
            recruiter_name="Rahul Verma",
            recruiter_email="hr@carestack.com",
            recruiter_phone="+91 94471 99887",
            source_website="Technopark Trivandrum",
            match_score=88,
            match_summary="Strong match on backend Python & SQL. Trivandrum campus.",
            status="New"
        )
    ]

    all_sample_jobs.extend(infopark_jobs)
    all_sample_jobs.extend(technopark_jobs)

    # Deduplicate
    unique_jobs = deduplicate_jobs(all_sample_jobs)
    excel_stream = generate_excel_bytes(unique_jobs)
    
    test_output_path = current_dir.parent / "test_jobs_export.xlsx"
    with open(test_output_path, "wb") as f:
        f.write(excel_stream.getvalue())

    print(f"  ✅ Excel export generated: {test_output_path} ({len(unique_jobs)} rows)")
    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
