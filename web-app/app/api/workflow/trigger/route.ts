import { NextResponse } from 'next/server';
import { JobPost, WorkflowLog, WorkflowTriggerResponse } from '@/app/types';

export const runtime = 'nodejs';
export const maxDuration = 120; // Allow up to 120s for n8n scraping + LLM scoring to complete

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      search_term = 'DevOps Engineer',
      location = 'Remote, India',
      candidate_skills = 'AWS, Azure, GCP, Kubernetes, Docker, Terraform, Ansible, CI/CD, Linux, Python, Bash, Helm, Prometheus, Grafana, DevSecOps',
      candidate_experience_years = 3,
      min_alert_score = 80,
      results_per_site = 25,
      recipient_email = 'johnsonthomas.contact@gmail.com',
      webhook_url = process.env.N8N_WEBHOOK_URL || 'https://n8n.johnsonthomas.co.in/webhook/7d7ac056-7ec6-468d-9ff0-fd08f99cad4b',
      sources = ['infopark', 'technopark', 'linkedin', 'indeed', 'naukri', 'ats'],
    } = body;

    const logs: WorkflowLog[] = [];
    const now = () => new Date().toISOString().split('T')[1].slice(0, 8);
    const uid = (name: string) => `${name}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    logs.push({
      id: uid('log-received'),
      timestamp: now(),
      level: 'info',
      source: 'Cockpit API',
      message: `Received job search trigger: "${search_term}" in "${location}"`,
    });

    let n8nTriggered = false;
    let n8nStatus: number | undefined = undefined;
    let n8nError: string | undefined = undefined;
    let n8nResponseData: any = null;

    // 1. Dispatch Webhook to n8n if URL is provided
    if (webhook_url) {
      try {
        logs.push({
          id: uid('log-forward'),
          timestamp: now(),
          level: 'info',
          source: 'n8n Webhook',
          message: `Forwarding trigger payload to n8n Webhook at: ${webhook_url}`,
        });

        const n8nController = new AbortController();
        // Allow up to 90s for n8n multi-portal scraping and Groq AI scoring
        const timeoutId = setTimeout(() => n8nController.abort(), 90000);

        const n8nRes = await fetch(webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'JobSearch-Cockpit/1.0',
          },
          body: JSON.stringify({
            search_term,
            location,
            candidate_skills,
            candidate_experience_years,
            min_alert_score,
            results_per_site,
            recipient_email,
            sources,
            triggered_at: new Date().toISOString(),
          }),
          signal: n8nController.signal,
        });

        clearTimeout(timeoutId);
        n8nStatus = n8nRes.status;

        if (n8nRes.ok) {
          n8nTriggered = true;
          try {
            n8nResponseData = await n8nRes.json();
          } catch {
            n8nResponseData = { status: 'Workflow execution received' };
          }
          logs.push({
            id: uid('log-n8n-success'),
            timestamp: now(),
            level: 'success',
            source: 'n8n Webhook',
            message: `Successfully triggered n8n workflow execution (HTTP ${n8nRes.status})!`,
          });
        } else if (n8nRes.status === 404) {
          n8nError = `n8n returned 404 Not Found at ${webhook_url}. The Webhook node is not present in your n8n workflow, or the workflow has not been Published yet in n8n.`;
          logs.push({
            id: uid('log-n8n-404'),
            timestamp: now(),
            level: 'error',
            source: 'n8n Webhook',
            message: `[n8n 404] Webhook route not found! Please import the updated workflow with Webhook Trigger node and click 'Publish' in n8n.`,
          });
        } else {
          n8nError = `n8n webhook returned status ${n8nRes.status}`;
          logs.push({
            id: uid('log-n8n-warn'),
            timestamp: now(),
            level: 'warn',
            source: 'n8n Webhook',
            message: `n8n webhook responded with status ${n8nRes.status}.`,
          });
        }
      } catch (err: any) {
        n8nError = err?.message || 'Connection offline';
        logs.push({
          id: uid('log-n8n-err'),
          timestamp: now(),
          level: 'error',
          source: 'n8n Webhook',
          message: `Could not reach n8n webhook (${n8nError}). Check network or domain status.`,
        });
      }
    }

    // 2. Extract jobs returned directly from n8n
    let jobs: JobPost[] = [];
    if (n8nResponseData) {
      const n8nJobs = extractJobsFromN8n(n8nResponseData);
      if (n8nJobs.length > 0) {
        jobs = n8nJobs;
        logs.push({
          id: uid('log-n8n-jobs'),
          timestamp: now(),
          level: 'success',
          source: 'n8n Pipeline',
          message: `Received ${jobs.length} enriched job postings directly from n8n execution!`,
        });
      }
    }

    // 3. Query Scraper Microservice (FastAPI on localhost:8000) if n8n didn't return direct payload
    if (!jobs.length) {
      try {
        logs.push({
          id: uid('log-scraper-check'),
          timestamp: now(),
          level: 'info',
          source: 'Scraper Engine',
          message: `Checking local microservice at http://127.0.0.1:8000/api/scrape/all...`,
        });

        const scraperController = new AbortController();
        const scraperTimeout = setTimeout(() => scraperController.abort(), 6000);

        const scraperRes = await fetch('http://127.0.0.1:8000/api/scrape/all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            search_term,
            location,
            results_per_site: results_per_site || 20,
            sources: sources.length ? sources : ['infopark', 'technopark', 'linkedin'],
          }),
          signal: scraperController.signal,
        });

        clearTimeout(scraperTimeout);

        if (scraperRes.ok) {
          const data = await scraperRes.json();
          if (data && Array.isArray(data.jobs) && data.jobs.length > 0) {
            jobs = data.jobs;
            logs.push({
              id: uid('log-scraper-jobs'),
              timestamp: now(),
              level: 'success',
              source: 'Scraper Engine',
              message: `Retrieved ${jobs.length} live job listings directly from scraper microservice!`,
            });
          }
        }
      } catch {
        // Microservice not running locally
      }
    }

    if (jobs.length > 0) {
      const highMatches = jobs.filter((j) => (j.match_score || 0) >= min_alert_score);
      logs.push({
        id: uid('log-score-eval'),
        timestamp: now(),
        level: 'success',
        source: 'AI Fit Evaluator',
        message: `Scored ${jobs.length} positions: Identified ${highMatches.length} high matches (>=${min_alert_score}%).`,
      });
    } else if (n8nTriggered) {
      logs.push({
        id: uid('log-n8n-async-notice'),
        timestamp: now(),
        level: 'info',
        source: 'n8n Engine',
        message: `n8n workflow was successfully triggered in the cloud! Note: In n8n Webhook node, set "Respond" to "When Last Node Finishes" (or add a 'Respond to Webhook' node) so n8n returns the final jobs directly back to this screen.`,
      });
    }

    const highMatchesCount = jobs.filter((j) => (j.match_score || 0) >= min_alert_score).length;

    const response: WorkflowTriggerResponse = {
      success: true,
      message: n8nTriggered
        ? 'n8n workflow triggered and executed successfully!'
        : 'Automated workflow request processed.',
      execution_id: `exec_${Date.now().toString(36)}`,
      total_found: jobs.length,
      high_matches_count: highMatchesCount,
      jobs,
      logs,
      n8n_triggered: n8nTriggered,
      n8n_status: n8nStatus,
      n8n_error: n8nError,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: `Workflow trigger failed: ${error?.message || 'Unknown error'}`,
        total_found: 0,
        high_matches_count: 0,
        jobs: [],
      },
      { status: 500 }
    );
  }
}

function extractJobsFromN8n(data: any): JobPost[] {
  if (!data) return [];
  let rawList: any[] = [];

  if (Array.isArray(data)) {
    rawList = data;
  } else if (Array.isArray(data.jobs)) {
    rawList = data.jobs;
  } else if (Array.isArray(data.data)) {
    rawList = data.data;
  } else if (typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key]) && data[key].length > 0 && (data[key][0]?.title || data[key][0]?.json?.title)) {
        rawList = data[key];
        break;
      }
    }
  }

  return rawList
    .map((item: any, idx: number): JobPost => {
      const j = item.json ? item.json : item;
      return {
        job_id: String(j.job_id || j.id || `job_${idx}_${Date.now()}`),
        title: String(j.title || j.job_title || 'Open Position'),
        company: String(j.company || j.company_name || 'Hiring Company'),
        company_details: j.company_details ? String(j.company_details) : undefined,
        description: j.description ? String(j.description) : '',
        location: String(j.location || 'India'),
        required_skills: Array.isArray(j.required_skills)
          ? j.required_skills.map((s: any) => String(s))
          : typeof j.required_skills === 'string'
          ? j.required_skills.split(',').map((s: string) => s.trim())
          : [],
        experience: j.experience ? String(j.experience) : 'Not specified',
        salary: j.salary ? String(j.salary) : undefined,
        date_posted: String(j.date_posted || new Date().toISOString().split('T')[0]),
        job_url: String(j.job_url || j.url || '#'),
        apply_method: String(j.apply_method || 'Direct Link'),
        recruiter_name: j.recruiter_name ? String(j.recruiter_name) : null,
        recruiter_email: j.recruiter_email ? String(j.recruiter_email) : null,
        recruiter_phone: j.recruiter_phone ? String(j.recruiter_phone) : null,
        source_website: String(j.source_website || 'n8n Discovered'),
        match_score: typeof j.match_score === 'number' ? j.match_score : parseInt(j.match_score) || 75,
        match_summary: String(j.match_summary || 'Evaluated via automated scoring pipeline.'),
        status: 'New',
      };
    })
    .filter((j) => Boolean(j.title && j.company));
}
