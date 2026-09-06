'use client';

import React, { useState, useMemo } from 'react';
import { JobCard } from './JobCard';
import { DownloadIcon, SearchIcon, RocketIcon } from './Icons';
import { JobPost } from '../types';

interface JobExplorerProps {
  jobs: JobPost[];
  searchTerm: string;
  onTriggerSearch?: () => void;
}

export const JobExplorer: React.FC<JobExplorerProps> = ({ jobs, searchTerm, onTriggerSearch }) => {
  const [selectedPortal, setSelectedPortal] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Portal filter
      if (selectedPortal !== 'all') {
        const portal = job.source_website.toLowerCase();
        if (!portal.includes(selectedPortal.toLowerCase())) {
          return false;
        }
      }

      // Score filter
      if (minScoreFilter > 0 && (job.match_score || 0) < minScoreFilter) {
        return false;
      }

      // In-page search text filter
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        const matchTitle = job.title.toLowerCase().includes(q);
        const matchCompany = job.company.toLowerCase().includes(q);
        const matchSkill = job.required_skills?.some((s) => s.toLowerCase().includes(q));
        const matchRecruiter = job.recruiter_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchCompany && !matchSkill && !matchRecruiter) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, selectedPortal, minScoreFilter, filterQuery]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: filteredJobs.length ? filteredJobs : jobs }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Job_Matches_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const portals = [
    { id: 'all', name: 'All Portals' },
    { id: 'infopark', name: 'Infopark' },
    { id: 'technopark', name: 'Technopark' },
    { id: 'linkedin', name: 'LinkedIn' },
    { id: 'indeed', name: 'Indeed' },
    { id: 'naukri', name: 'Naukri' },
    { id: 'ats', name: 'ATS' },
  ];

  return (
    <div style={{ marginTop: '32px' }}>
      {/* Header Bar */}
      <div className="results-header-bar">
        <div className="results-title-wrap">
          <h3 className="results-heading">Discovered Openings</h3>
          <span className="results-count-badge">
            {jobs.length} Verified
          </span>
        </div>

        {/* Portal Filter Pills & Search */}
        <div className="portal-filters-row">
          {portals.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`portal-filter-btn ${selectedPortal === p.id ? 'active' : ''}`}
              onClick={() => setSelectedPortal(p.id)}
            >
              {p.name}
            </button>
          ))}

          <button
            type="button"
            className={`portal-filter-btn ${minScoreFilter === 80 ? 'active' : ''}`}
            onClick={() => setMinScoreFilter(minScoreFilter === 80 ? 0 : 80)}
            title="Filter jobs matching 80% or higher"
          >
            🔥 High Fit (&ge;80%)
          </button>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search in results..."
              className="form-input"
              style={{
                paddingLeft: '32px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '0.82rem',
                minWidth: '180px',
                borderRadius: 'var(--radius-full)',
              }}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
            <span
              style={{
                position: 'absolute',
                left: '11px',
                color: 'var(--text-light)',
                pointerEvents: 'none',
              }}
            >
              <SearchIcon size={14} />
            </span>
          </div>

          <button
            type="button"
            className="portal-filter-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-subtle)' }}
            onClick={handleExport}
            disabled={isExporting || jobs.length === 0}
            id="export-results-button"
            title="Download CSV / Excel compatible format"
          >
            <DownloadIcon size={14} />
            <span>{isExporting ? 'Exporting...' : 'Export (.csv)'}</span>
          </button>
        </div>
      </div>

      {/* Discovered Job Cards or Empty State */}
      {jobs.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <RocketIcon size={28} />
          </div>
          <h4 className="empty-state-title">
            Ready to Discover Live Jobs
          </h4>
          <p className="empty-state-desc">
            No simulated data is loaded. Enter your target position in the search bar above and click{' '}
            <strong>&quot;Find it now&quot;</strong> to trigger the automated n8n multi-portal workflow.
          </p>
          {onTriggerSearch && (
            <button
              type="button"
              className="empty-state-btn"
              onClick={onTriggerSearch}
            >
              <RocketIcon size={16} />
              <span>Launch Workflow Automation</span>
            </button>
          )}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <SearchIcon size={28} />
          </div>
          <h4 className="empty-state-title">
            No Postings Match Your Filter
          </h4>
          <p className="empty-state-desc">
            Try clearing portal, text, or match score filters to browse all {jobs.length} retrieved listings.
          </p>
          <button
            type="button"
            className="portal-filter-btn"
            style={{ margin: '0 auto' }}
            onClick={() => {
              setSelectedPortal('all');
              setMinScoreFilter(0);
              setFilterQuery('');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="jobs-grid">
          {filteredJobs.map((job, idx) => (
            <JobCard key={`${job.job_id || 'job'}-${idx}`} job={job} />
          ))}
        </div>
      )}
    </div>
  );
};
