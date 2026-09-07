'use client';

import React, { useState, useMemo } from 'react';
import { JobCard } from './JobCard';
import { DownloadIcon, SearchIcon, RocketIcon, PinIcon } from './Icons';
import { JobPost } from '../types';

interface JobExplorerProps {
  jobs: JobPost[];
  searchTerm: string;
  onTriggerSearch?: () => void;
}

export const JobExplorer: React.FC<JobExplorerProps> = ({ jobs, searchTerm, onTriggerSearch }) => {
  const [selectedPortal, setSelectedPortal] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Extract unique locations dynamically from all retrieved jobs
  const availableLocations = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((job) => {
      const loc = (job.location || '').trim();
      if (loc) {
        counts[loc] = (counts[loc] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Portal filter
      if (selectedPortal !== 'all') {
        const portal = (job.source_website || '').toLowerCase();
        if (!portal.includes(selectedPortal.toLowerCase())) {
          return false;
        }
      }

      // 2. Location filter (Applied client-side after jobs are listed)
      if (selectedLocation !== 'all') {
        const jobLoc = (job.location || '').toLowerCase();
        const target = selectedLocation.toLowerCase();
        if (!jobLoc.includes(target)) {
          return false;
        }
      }

      // 3. Score filter
      if (minScoreFilter > 0 && (job.match_score || 0) < minScoreFilter) {
        return false;
      }

      // 4. In-page search text filter
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        const matchTitle = (job.title || '').toLowerCase().includes(q);
        const matchCompany = (job.company || '').toLowerCase().includes(q);
        const matchSkill = job.required_skills?.some((s) => s.toLowerCase().includes(q));
        const matchRecruiter = (job.recruiter_name || '').toLowerCase().includes(q);
        const matchLoc = (job.location || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCompany && !matchSkill && !matchRecruiter && !matchLoc) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, selectedPortal, selectedLocation, minScoreFilter, filterQuery]);

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
        a.download = `DevOps_Jobs_${new Date().toISOString().split('T')[0]}.csv`;
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
    { id: 'remoteok', name: 'RemoteOK' },
    { id: 'weworkremotely', name: 'WeWorkRemotely' },
    { id: 'linkedin', name: 'LinkedIn' },
    { id: 'indeed', name: 'Indeed' },
    { id: 'naukri', name: 'Naukri' },
    { id: 'glassdoor', name: 'Glassdoor' },
    { id: 'jobicy', name: 'Jobicy' },
    { id: 'ats', name: 'Company ATS' },
    { id: 'infopark', name: 'Infopark' },
    { id: 'technopark', name: 'Technopark' },
  ];

  const locationPresets = [
    { id: 'all', label: `All Locations (${jobs.length})` },
    { id: 'remote', label: '🌐 Remote' },
    { id: 'bangalore', label: 'Bangalore' },
    { id: 'kochi', label: 'Kochi' },
    { id: 'hyderabad', label: 'Hyderabad' },
    { id: 'trivandrum', label: 'Trivandrum' },
    { id: 'pune', label: 'Pune' },
  ];

  return (
    <div style={{ marginTop: '32px' }}>
      {/* Header Bar */}
      <div className="results-header-bar">
        <div className="results-title-wrap">
          <h3 className="results-heading">Discovered Openings</h3>
          <span className="results-count-badge">
            {filteredJobs.length} of {jobs.length} Verified
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
              placeholder="Search title, skill, company..."
              className="form-input"
              style={{
                paddingLeft: '32px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '0.82rem',
                minWidth: '190px',
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

        {/* Location Filter Bar (Post-Search Filtering) */}
        {jobs.length > 0 && (
          <div className="location-filters-row">
            <div className="location-filter-label">
              <PinIcon size={15} color="var(--primary)" />
              <span>Location:</span>
            </div>

            <div className="location-chips-group">
              {locationPresets.map((loc) => {
                const isActive = selectedLocation.toLowerCase() === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    className={`location-chip ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedLocation(loc.id)}
                  >
                    {loc.label}
                  </button>
                );
              })}
            </div>

            {availableLocations.length > 0 && (
              <select
                className="location-select"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                title="Select specific discovered location"
              >
                <option value="all">More Locations ({availableLocations.length})...</option>
                {availableLocations.map((loc) => (
                  <option key={loc.name} value={loc.name}>
                    {loc.name} ({loc.count})
                  </option>
                ))}
              </select>
            )}

            {selectedLocation !== 'all' && (
              <button
                type="button"
                className="location-clear-btn"
                onClick={() => setSelectedLocation('all')}
                title="Clear location filter"
              >
                &times; Reset Location
              </button>
            )}
          </div>
        )}
      </div>

      {/* Discovered Job Cards or Empty State */}
      {jobs.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <RocketIcon size={28} />
          </div>
          <h4 className="empty-state-title">
            Ready to Discover Live DevOps Jobs
          </h4>
          <p className="empty-state-desc">
            No simulated data is loaded. Enter your target DevOps role in the search bar above and click{' '}
            <strong>&quot;Find it now&quot;</strong> to scrape all online portals without location restrictions.
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
            No Postings Match Your Current Filter
          </h4>
          <p className="empty-state-desc">
            Try clearing portal, location, or match score filters to browse all {jobs.length} retrieved listings.
          </p>
          <button
            type="button"
            className="portal-filter-btn"
            style={{ margin: '0 auto' }}
            onClick={() => {
              setSelectedPortal('all');
              setSelectedLocation('all');
              setMinScoreFilter(0);
              setFilterQuery('');
            }}
          >
            Reset All Filters
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
