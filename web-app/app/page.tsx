'use client';

import React, { useState, useEffect } from 'react';
import { SearchHeader } from './components/SearchHeader';
import { WorkflowVisualizer } from './components/WorkflowVisualizer';
import { MetricsBar } from './components/MetricsBar';
import { JobExplorer } from './components/JobExplorer';
import { RocketIcon, N8nIcon } from './components/Icons';
import {
  JobPost,
  WorkflowConfig,
  WorkflowStage,
  WorkflowLog,
  WorkflowTriggerResponse,
} from './types';

const INITIAL_STAGES: WorkflowStage[] = [
  {
    id: 'trigger',
    name: '1. Trigger Received',
    shortName: 'Trigger',
    description: 'n8n Webhook & Candidate Profile Loaded',
    icon: 'rocket',
    status: 'pending',
  },
  {
    id: 'scraping',
    name: '2. Multi-Portal Scraping',
    shortName: 'Scraping',
    description: 'Infopark, Technopark, LinkedIn, Indeed, ATS',
    icon: 'spider',
    status: 'pending',
  },
  {
    id: 'dedup',
    name: '3. Deduplication',
    shortName: 'Deduplication',
    description: 'MD5 Hash & Cross-Portal Match',
    icon: 'filter',
    status: 'pending',
  },
  {
    id: 'ai_scoring',
    name: '4. AI Fit Scoring',
    shortName: 'AI Fit',
    description: 'Llama 3.3 / Gemini + HR Extraction',
    icon: 'brain',
    status: 'pending',
  },
  {
    id: 'ranking',
    name: '5. Rank & Analytics',
    shortName: 'Rank',
    description: 'Relevance & Fit Thresholding',
    icon: 'rank',
    status: 'pending',
  },
  {
    id: 'sheet_sync',
    name: '6. Sheet Sync & Excel',
    shortName: 'Sheets Sync',
    description: 'Google Sheets & .xlsx Report Build',
    icon: 'sheets',
    status: 'pending',
  },
  {
    id: 'email_dispatch',
    name: '7. Email Digest & Alert',
    shortName: 'Email Digest',
    description: 'HTML Summary & High-Fit Alerts',
    icon: 'mail',
    status: 'pending',
  },
];

export default function HomePage() {
  const [config, setConfig] = useState<WorkflowConfig>({
    search_term: 'Full Stack Developer',
    location: 'Kochi, Kerala, India',
    candidate_skills: 'Python, FastAPI, React, PostgreSQL, Docker, AWS, REST APIs',
    candidate_experience_years: 3,
    min_alert_score: 80,
    results_per_site: 25,
    recipient_email: 'johnsonthomas.contact@gmail.com',
    webhook_url: 'https://n8n.johnsonthomas.co.in/webhook/7d7ac056-7ec6-468d-9ff0-fd08f99cad4b',
    sources: ['infopark', 'technopark', 'linkedin', 'indeed', 'naukri', 'ats'],
  });

  const [stages, setStages] = useState<WorkflowStage[]>(INITIAL_STAGES);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [n8nAlert, setN8nAlert] = useState<{
    type: 'error' | 'success' | 'warn';
    title: string;
    message: string;
    actionHint?: string;
  } | null>(null);

  const triggerAutomation = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setProgressPercent(12);
    setN8nAlert(null);

    const now = () => new Date().toISOString().split('T')[1].slice(0, 8);

    // Reset stages to pending
    setStages((prev) =>
      prev.map((s, idx) => ({
        ...s,
        status: idx === 0 ? 'running' : 'pending',
        metric: undefined,
      }))
    );

    const newLog: WorkflowLog = {
      id: `trigger_${Date.now()}`,
      timestamp: now(),
      level: 'info',
      source: 'Cockpit Trigger',
      message: `User triggered search for "${config.search_term}" in "${config.location}". Calling n8n webhook...`,
    };
    setLogs((prev) => [...prev, newLog]);

    // Track active timers to animate stages progressively during n8n execution
    const activeTimers: NodeJS.Timeout[] = [];

    activeTimers.push(
      setTimeout(() => {
        setProgressPercent(28);
        setStages((prev) => {
          const next = [...prev];
          next[0] = { ...next[0], status: 'completed', metric: 'Webhook Connected' };
          next[1] = { ...next[1], status: 'running' };
          return next;
        });
      }, 2500)
    );

    activeTimers.push(
      setTimeout(() => {
        setProgressPercent(48);
        setStages((prev) => {
          const next = [...prev];
          next[1] = { ...next[1], status: 'completed', metric: `${config.sources.length} Portals Scraped` };
          next[2] = { ...next[2], status: 'running' };
          return next;
        });
      }, 9000)
    );

    activeTimers.push(
      setTimeout(() => {
        setProgressPercent(65);
        setStages((prev) => {
          const next = [...prev];
          next[2] = { ...next[2], status: 'completed', metric: 'Cleaned' };
          next[3] = { ...next[3], status: 'running' };
          return next;
        });
      }, 15000)
    );

    activeTimers.push(
      setTimeout(() => {
        setProgressPercent(82);
        setStages((prev) => {
          const next = [...prev];
          next[3] = { ...next[3], status: 'completed', metric: 'Groq / LLM Fit' };
          next[4] = { ...next[4], status: 'running' };
          return next;
        });
      }, 24000)
    );

    activeTimers.push(
      setTimeout(() => {
        setProgressPercent(90);
        setStages((prev) => {
          const next = [...prev];
          next[4] = { ...next[4], status: 'completed', metric: 'Top Fit' };
          next[5] = { ...next[5], status: 'running' };
          return next;
        });
      }, 31000)
    );

    try {
      // Call backend API which contacts n8n webhook
      const res = await fetch('/api/workflow/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data: WorkflowTriggerResponse = await res.json();

      // Clear progressive timers once the API returns
      activeTimers.forEach(clearTimeout);

      if (data.logs && data.logs.length > 0) {
        setLogs((prev) => [...prev, ...data.logs!]);
      }

      setProgressPercent(100);

      if (data.n8n_triggered) {
        // Mark all 7 stages as completed
        setStages((prev) => [
          { ...prev[0], status: 'completed', metric: `n8n HTTP ${data.n8n_status || 200}` },
          { ...prev[1], status: 'completed', metric: `${config.sources.length} Portals` },
          { ...prev[2], status: 'completed', metric: 'Cleaned' },
          { ...prev[3], status: 'completed', metric: 'Groq LLM' },
          { ...prev[4], status: 'completed', metric: 'Top Fit' },
          { ...prev[5], status: 'completed', metric: 'Sheets Sync' },
          { ...prev[6], status: 'completed', metric: 'Alerts Sent' },
        ]);

        if (data.jobs && data.jobs.length > 0) {
          setJobs(data.jobs);
          setN8nAlert({
            type: 'success',
            title: `Pipeline Finished: Discovered ${data.jobs.length} Verified Jobs!`,
            message: `n8n executed the full automation, ranked positions using AI, and returned ${data.jobs.length} listings. Email digest was also sent to ${config.recipient_email}.`,
          });
        } else {
          setN8nAlert({
            type: 'warn',
            title: 'n8n Workflow Executed Successfully & Email Sent! (0 Jobs Returned to Web App)',
            message: `n8n successfully executed all nodes in the cloud and sent the email digest. However, no job cards are showing in this web app because your n8n Webhook node is currently set to respond "Immediately" (HTTP 200: "Workflow was started") instead of returning the final jobs list.`,
            actionHint: `To display all 30 jobs directly on this screen:\n1. Open your n8n workflow canvas.\n2. In your Webhook node, change "Respond" to: "Using 'Respond to Webhook' Node".\n3. Add a "Respond to Webhook" node connected after "Merge & Rank Jobs by Score" (set Respond With: "All Incoming Items").\n4. Click Save & Publish in n8n! (Or re-import the updated workflows/master_job_search_workflow.json).`,
          });
        }
      } else {
        setN8nAlert({
          type: 'error',
          title: 'n8n Webhook Failed to Trigger',
          message: data.n8n_error || 'Could not connect to n8n instance.',
          actionHint: `Check whether your n8n instance at https://n8n.johnsonthomas.co.in is running and the workflow is Published.`,
        });

        setStages((prev) => {
          const next = [...prev];
          next[0] = { ...next[0], status: 'failed', metric: 'Trigger Failed' };
          return next;
        });
      }

      setIsRunning(false);
    } catch (err: any) {
      console.error('Trigger request error:', err);
      activeTimers.forEach(clearTimeout);
      setIsRunning(false);
      setProgressPercent(100);
      setN8nAlert({
        type: 'error',
        title: 'Connection Error',
        message: err?.message || 'Failed to communicate with workflow server.',
      });
    }
  };

  const highMatches = jobs.filter((j) => (j.match_score || 0) >= config.min_alert_score).length;
  const recruiterCount = jobs.filter((j) => Boolean(j.recruiter_email)).length;
  const avgScore = jobs.length
    ? Math.round(jobs.reduce((acc, j) => acc + (j.match_score || 0), 0) / jobs.length)
    : 0;

  return (
    <div>
      {/* Top Modern SaaS Navbar (Matches Dribbble reference) */}
      <header className="top-nav">
        <a href="#" className="brand-badge">
          <div className="brand-title-wrap">
            <span className="brand-logo-text">Job<span className="brand-logo-accent">Search</span></span>
          </div>
        </a>

        <ul className="nav-links">
          <li><a href="#" className="nav-link active">Jobs</a></li>
          <li><a href="#pipeline" className="nav-link">Pipeline</a></li>
          <li><a href="#stats" className="nav-link">Analytics</a></li>
          <li><a href="https://n8n.johnsonthomas.co.in" target="_blank" rel="noopener noreferrer" className="nav-link">n8n Cloud</a></li>
        </ul>

        <div className="nav-actions">
          <div className="status-pill">
            <span className="pulse-dot" />
            <span>n8n Engine Connected</span>
          </div>

          <a
            href="https://n8n.johnsonthomas.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="n8n-studio-link"
            title="Open n8n Workflow Studio"
          >
            <N8nIcon size={14} />
            <span>Open Studio</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="container">
        {/* Search Header (Hero headline, animated rocket pen illustration, capsule search & Latest Postings) */}
        <SearchHeader
          config={config}
          onChangeConfig={setConfig}
          onTriggerWorkflow={triggerAutomation}
          isLoading={isRunning}
        />

        {/* n8n Status Alert Banner (Clean Light SaaS Card) */}
        {n8nAlert && (
          <div
            style={{
              padding: '18px 24px',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '28px',
              background:
                n8nAlert.type === 'success'
                  ? '#ecfdf5'
                  : n8nAlert.type === 'error'
                  ? '#fef2f2'
                  : '#fffbeb',
              border: `1px solid ${
                n8nAlert.type === 'success'
                  ? '#a7f3d0'
                  : n8nAlert.type === 'error'
                  ? '#fecaca'
                  : '#fde68a'
              }`,
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>
                {n8nAlert.type === 'success' ? '✅' : '⚠️'}
              </span>
              <strong
                style={{
                  fontSize: '0.96rem',
                  fontWeight: 700,
                  color:
                    n8nAlert.type === 'success'
                      ? '#047857'
                      : n8nAlert.type === 'error'
                      ? '#b91c1c'
                      : '#b45309',
                }}
              >
                {n8nAlert.title}
              </strong>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>
              {n8nAlert.message}
            </p>
            {n8nAlert.actionHint && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '10px 14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  color: '#475569',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-line',
                }}
              >
                💡 <strong>How to set up:</strong> {n8nAlert.actionHint}
              </div>
            )}
          </div>
        )}

        {/* Animated Workflow Execution Visualizer */}
        <div id="pipeline">
          <WorkflowVisualizer
            stages={stages}
            logs={logs}
            isRunning={isRunning}
            progressPercent={progressPercent}
          />
        </div>

        {/* Summary KPI Counters */}
        <div id="stats">
          <MetricsBar
            totalJobs={jobs.length}
            highMatches={highMatches}
            recruiterContacts={recruiterCount}
            averageScore={avgScore}
          />
        </div>

        {/* Results Explorer with Filters, Score Gauges, and Email HR Buttons */}
        <JobExplorer
          jobs={jobs}
          searchTerm={config.search_term}
          onTriggerSearch={triggerAutomation}
        />
      </main>
    </div>
  );
}
