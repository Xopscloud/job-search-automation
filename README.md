# 🚀 Automated Job Search & Application Tracking System

An end-to-end automated workflow that aggregates job postings across **LinkedIn, Indeed, Naukri, Infopark Kochi, Technopark Trivandrum, and company career portals**, extracts recruiter contact information, scores fit against your skills and experience using AI, ranks postings by relevance, populates a **Google Sheet / Excel file**, and delivers an **HTML email digest** with priority alerts.

Orchestrated using **n8n** and containerized microservices running on **AWS EC2** with automated Let's Encrypt SSL.

---

## 📑 Table of Contents
1. [Key Features](#-key-features)
2. [Architecture Overview](#-architecture-overview)
3. [Extracted Data Schema](#-extracted-data-schema)
4. [AWS EC2 Deployment Guide](#-aws-ec2-deployment-guide)
5. [Configuration & Environment Variables](#-configuration--environment-variables)
6. [Importing the n8n Master Workflow](#-importing-the-n8n-master-workflow)
7. [Google Sheets Integration Setup](#-google-sheets-integration-setup)
8. [Email Digest & Priority Notifications](#-email-digest--priority-notifications)
9. [Local Testing & Diagnostics](#-local-testing--diagnostics)
10. [Troubleshooting & FAQ](#-troubleshooting--faq)

---

> 📖 **Comprehensive Guides & Resources:**
> - 🌐 **[Interactive HTML Documentation](documentation.html)**: Standalone visual interactive guide with lightbox diagram, step-by-step setup, and copyable code blocks.
> - 📄 **[Full Technical Project Documentation](PROJECT_DOCUMENTATION.md)**: Deep-dive architecture, microservices, anti-bot bypass strategies, and deployment guide.
> - 💼 **[LinkedIn Portfolio & Social Kit](LINKEDIN_PORTFOLIO_KIT.md)**: Pre-formatted LinkedIn project section entry and 3 viral post templates.

---

## 🔄 The 9-Step AI Automation Pipeline

![AI-Powered Job Search Automation](workflow-diagram.jpg)

---

## 🌟 Key Features

- **Concurrent Multi-Source Scraping Across 13 Portals**:
  - **Major Portals**: LinkedIn, Indeed, Naukri, Glassdoor, ZipRecruiter, Google Jobs, Company ATS.
  - **Regional IT Tech Parks**: Infopark Kochi (HTML table parser + HR contacts) & Technopark Trivandrum.
  - **Global Remote Boards**: RemoteOK, WeWorkRemotely, Jobicy.
  - **Gulf / Middle East**: Bayt (UAE, Qatar, Saudi Arabia cloud vacancies).
  - **Dual-Layer Anti-Bot Fallback**: Automatically bypasses Cloudflare/Akamai blocks on AWS EC2 datacenter IPs using live search dorks.
- **Modern Next.js 16 Web Dashboard**:
  - **Indian IT City Selector**: Pre-configured filters for Kochi/Ernakulam, Trivandrum, Bangalore, Hyderabad, Pune, Chennai, Mumbai, Delhi NCR, Coimbatore, and Remote.
  - **Strict DevOps Filtering**: Heuristic keyword inclusion and negative exclusion rules (`is_devops_relevant`) to eliminate non-engineering listings (Digital Marketing, Visual Builders, QA Manual).
  - **Pagination & Limit Removal**: Smooth browsing with customizable cards-per-page (12, 24, 48, All) and page navigation.
- **Automatic Application Tracking (ATS) & Job Card Status**:
  - Automatically identifies and marks jobs as **`✓ Already Applied`** when clicking "Apply on Portal", sending a Gmail pitch, or matching historical tracking records.
  - Emerald highlight accent, status ribbon banners (date, channel, status badge), and **1-click manual apply toggles**.
  - Explorer toolbar filters: `✓ Applied ({count})` and `Hide Applied`.
- **Recruiter Cold Email Outreach Studio**:
  - Built-in cold email drawer connected to Gmail API and n8n webhooks.
  - Automatically generates customized pitches and attaches your PDF resume for instant 1-click delivery.
- **AI Relevance Scoring & Parsing**:
  - Automatically evaluates job fit (0–100% Match Score) based on your target titles, skills, and years of experience using Llama 3.3 70B, Gemini 1.5 Flash, or GPT-4o.
- **Deduplication Engine**:
  - Deterministic MD5 hash (`hash(company + title + location)`) prevents re-processing existing postings.
- **Dual Output (Google Sheets & Excel)**:
  - **Google Sheets**: Live synchronization to an "Active Jobs" sheet with color-coded score status.
  - **Excel (`.xlsx`)**: Formatted workbook with frozen headers, auto-adjusted columns, and clickable hyperlinks.
- **Responsive Email Digest**:
  - HTML summary email delivered to your inbox containing top match cards, recruiter contacts, and the `.xlsx` file attached.

---

## 🏗️ Architecture Overview

```
                        ┌──────────────────────────────────────────────┐
                        │              AWS EC2 Instance                │
                        │                                              │
                        │  ┌───────────┐    ┌───────────────────────┐  │
                        │  │   Caddy   │───▶│   n8n Workflow Engine │  │
                        │  │ (Auto SSL)│    │     (Port 5678)       │  │
                        │  └───────────┘    └───────────┬───────────┘  │
                        │                               │              │
                        │                   ┌───────────▼───────────┐  │
                        │                   │  Scraper Microservice │  │
                        │                   │   (FastAPI - Pt 8000) │  │
                        │                   └───────────┬───────────┘  │
                        │                               │              │
                        │           ┌───────────────────┴──────────┐   │
                        │           ▼                              ▼   │
                        │   [ python-jobspy ]              [ Custom ]  │
                        │  (LinkedIn, Indeed,             (Infopark &  │
                        │    Naukri, Glassdoor)           Technopark)  │
                        └──────────────────────────────────────────────┘
                                    │                      │
                                    ▼                      ▼
                            ┌───────────────┐      ┌───────────────┐
                            │ Google Sheets │      │  HTML Email   │
                            │  Live Sync    │      │ Digest + .xlsx│
                            └───────────────┘      └───────────────┘
```

---

## 📊 Extracted Data Schema

Every posting in the Google Sheet and Excel file contains the following fields:

| Field | Description | Example |
| :--- | :--- | :--- |
| **Match Score** | Fit percentage calculated by AI | `92%` |
| **Job Title** | Designation or role title | `Senior Full Stack Developer` |
| **Company Name** | Hiring organization | `UST Global` |
| **Company Details** | Campus or industry context | `Infopark Kochi Campus` |
| **Location** | City, state, or remote status | `Kochi, Kerala (Hybrid)` |
| **Required Skills** | Clean comma-separated list of tech skills | `Python, FastAPI, React, PostgreSQL` |
| **Experience** | Required experience level | `3 - 5 Years` |
| **Salary** | Compensation package (if disclosed) | `₹14,00,000 - ₹20,00,000` |
| **Date Posted** | Posting or discovery date | `2026-09-06` |
| **Job URL** | Direct clickable link to apply | `https://infopark.in/...` |
| **Apply Method** | Direct link, email, or portal | `Email Resume / Direct Link` |
| **Recruiter Name** | Recruiter or hiring manager | `Anjali Menon` |
| **Recruiter Email** | Direct HR contact email | `careers@ust.com` |
| **Recruiter Phone** | Public phone / WhatsApp contact | `+91 98470 12345` |
| **Source Website** | Origin portal | `Infopark Kochi`, `LinkedIn`, etc. |
| **Match Summary** | AI explanation of fit and missing skills | `Strong match on tech stack and exp.` |
| **Status** | Tracking status | `New` (can be updated to `Applied`) |

---

## ☁️ AWS EC2 Deployment Guide

### Step 1: Launch an EC2 Instance
1. Go to **AWS EC2 Console** -> **Launch Instance**.
2. **Name**: `n8n-job-automation`
3. **OS**: **Ubuntu 24.04 LTS** (or Ubuntu 22.04 LTS).
4. **Instance Type**:
   - **Recommended**: `t3.small` (2 vCPU, 2GB RAM) or `t4g.small` (ARM Graviton).
   - **Free Tier**: `t2.micro` (1 vCPU, 1GB RAM) — our setup script automatically configures a **2GB swap memory file** to prevent OOM errors.
5. **Key Pair**: Select your existing `.pem` key or create a new one.
6. **Network Settings (Security Group)**:
   - Allow **SSH (Port 22)** from your IP.
   - Allow **HTTP (Port 80)** from anywhere (`0.0.0.0/0`).
   - Allow **HTTPS (Port 443)** from anywhere (`0.0.0.0/0`).
   - *(Optional)* Allow custom TCP **Port 5678** if accessing n8n directly via IP.
7. **Storage**: At least **20 GB gp3 SSD**.
8. Click **Launch Instance**.

---

### Step 2: Connect & Run Setup Script
SSH into your instance:
```bash
ssh -i /path/to/your-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
```

Clone the repository and run the automated setup script:
```bash
git clone https://github.com/your-username/JOB_SEARCH_AUTOMATION.git
cd JOB_SEARCH_AUTOMATION
chmod +x scripts/setup-ec2.sh scripts/backup_n8n.sh
./scripts/setup-ec2.sh
```

The script will automatically:
- Update Ubuntu packages.
- Provision a 2GB swap file.
- Install Docker Engine and Docker Compose.
- Configure the UFW firewall.
- Copy `.env.example` to `.env`.
- Build the scraper microservice and start the Docker Compose stack.

---

## ⚙️ Configuration & Environment Variables

Edit the `.env` file on your server or local machine:
```bash
nano .env
```

### 1. Job Search & Candidate Profile
```ini
SEARCH_JOB_TITLES=Full Stack Developer, Python Developer, Backend Engineer
SEARCH_LOCATIONS=Kochi, Trivandrum, Bangalore, Remote, India
CANDIDATE_EXPERIENCE_YEARS=3
CANDIDATE_SKILLS=Python, FastAPI, React, Node.js, PostgreSQL, Docker, AWS
MIN_ALERT_MATCH_SCORE=80
```

### 2. AI Key for Fit Scoring & Recruiter Extraction
Choose one of the following:
```ini
# Option A: Groq (FREE, ultra-fast Llama-3.3-70B model - https://console.groq.com/keys)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Option B: OpenAI (https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-your_openai_api_key_here

# Option C: Google Gemini (https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=AIzaSy_your_gemini_api_key_here
```

### 3. SMTP Email Configuration (Gmail / SES)
```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
# Use an App Password (not your regular password): https://myaccount.google.com/apppasswords
SMTP_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM="Job Search Automation" <your_email@gmail.com>
EMAIL_TO=your_personal_inbox@gmail.com
```

### 4. Custom Domain & SSL (Optional)
If pointing a domain (e.g. `jobs.yourdomain.com`) to your EC2 Elastic IP:
```ini
DOMAIN_NAME=jobs.yourdomain.com
N8N_PROTOCOL=https
WEBHOOK_URL=https://jobs.yourdomain.com/
SSL_EMAIL=admin@yourdomain.com
```

Restart containers to apply new settings:
```bash
sudo docker compose up -d
```

---

## 🔄 Importing the n8n Master Workflow

1. Open your browser and navigate to:
   - If using IP: `http://<YOUR-EC2-PUBLIC-IP>:5678`
   - If using domain: `https://jobs.yourdomain.com`
2. Create your n8n admin account on first launch.
3. In the left navigation, click **Workflows** -> **Add Workflow** (or the **+** button).
4. In the top-right menu (three dots `...`), select **Import from File**.
5. Select [`workflows/master_job_search_workflow.json`](file:///f:/Projects/JOB_SEARCH_AUTOMATION/workflows/master_job_search_workflow.json).
6. Click **Save**.
7. In the **User Search Profile & Config** node, customize your preferred job titles, skills, and target recipient email.
8. Click **Test step** or **Execute workflow** to verify the entire pipeline end-to-end!

---

## 📄 Google Sheets Integration Setup

1. Create a new Google Sheet named **"Job Search Tracker"**.
2. Rename the first tab to **`Active Jobs`**.
3. Copy the headers from [`templates/google_sheets_schema.csv`](file:///f:/Projects/JOB_SEARCH_AUTOMATION/templates/google_sheets_schema.csv) into Row 1:
   ```csv
   Match Score,Job Title,Company Name,Company Details,Location,Required Skills,Experience,Salary,Date Posted,Job URL,Apply Method,Recruiter Name,Recruiter Email,Recruiter Phone,Source Website,Match Summary,Status
   ```
4. Copy your Sheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/`**`<GOOGLE_SHEET_ID>`**`/edit`
5. In n8n, open the **Sync to Google Sheets** node:
   - Connect your Google Account (OAuth2 or Service Account).
   - Enter your `GOOGLE_SHEET_ID`.

---

## 📧 Email Digest & Priority Notifications

Every scheduled run produces:
1. **HTML Email Digest**:
   - Total openings scanned across all boards.
   - High fit postings highlighted with green match badges ($\ge 80\%$).
   - Direct buttons for **"Apply Now"** and **"Direct Email HR"**.
   - Public recruiter contact cards (name, direct email, phone number).
2. **Attached Excel Spreadsheet (`.xlsx`)**:
   - Clean, professional workbook with frozen header, active hyperlinks, and auto-fitted columns.
3. **Optional Instant Priority Alerts**:
   - You can connect the Telegram node or Slack/Discord webhooks in n8n to receive instantaneous notifications the moment an $85\%+$ match is detected.

---

## 🧪 Local Testing & Diagnostics

To test the scrapers and Excel generator on your local machine:
```bash
# 1. Install dependencies
pip install -r scraper-service/requirements.txt

# 2. Run diagnostic test script
python scripts/test_scrapers.py
```

This will:
- Verify recruiter contact extraction logic.
- Perform a live scrape of **Infopark Kochi** and **Technopark Trivandrum**.
- Output a styled test Excel spreadsheet: `test_jobs_export.xlsx`.

---

## 🛠️ Troubleshooting & FAQ

### 1. JobSpy rate limiting on LinkedIn / Indeed
- JobSpy runs guest scraping. For very large runs (e.g. 100+ items per portal), increase the interval or use the pre-configured **Apify Sub-Workflow** (`workflows/apify_job_search_workflow.json`), which uses Apify's residential proxies.

### 2. Low Memory on t2.micro
- If you notice builds hanging on a free-tier `t2.micro` instance, verify swap is active:
  ```bash
  free -h
  ```
  If `Swap` shows `0B`, re-run the swap section of `scripts/setup-ec2.sh`.

---

## 🔀 Decoupled Architecture & n8n Integration

This repository hosts the **Scraper Microservice & Automation Tools** independently of n8n.

### Communication Architecture
```text
┌────────────────────────────────────────────────────────┐
│               Shared Network: n8n_net                  │
│                                                        │
│   ┌─────────────────────┐      ┌────────────────────┐  │
│   │ n8n Platform Stack  │─────▶│ Scraper Microservice│ │
│   │ (Standalone Repo)   │ HTTP │ (This Repo - Pt 8000)│ │
│   └─────────────────────┘      └────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

The scraper runs on the shared Docker bridge network `n8n_net`. Your n8n workflow communicates directly with this service using its internal DNS alias:
- **Scrape All Portals**: `http://scraper-service:8000/api/scrape/all`
- **Generate Excel Report**: `http://scraper-service:8000/api/export-excel`
- **Healthcheck**: `http://scraper-service:8000/health`

### Starting the Scraper Microservice
1. Ensure the shared Docker network exists:
   ```bash
   sudo docker network create n8n_net 2>/dev/null || true
   ```
2. Build and launch the scraper container:
   ```bash
   sudo docker compose up -d --build
   ```
3. Check status & logs:
   ```bash
   sudo docker compose ps
   sudo docker compose logs -f scraper-service
   ```
4. Verify healthcheck:
   ```bash
   curl http://localhost:8000/health
   ```



---

## 📜 License
MIT License. Free for personal and commercial automation use.
