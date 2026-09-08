'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { JobCard } from './JobCard';
import { DownloadIcon, SearchIcon, RocketIcon, PinIcon } from './Icons';
import { JobPost, JobApplicationRecord } from '../types';
import { loadApplicationsFromStorage, isJobApplied, syncApplicationsFromServer } from '../applications/trackerStorage';

interface JobExplorerProps {
  jobs: JobPost[];
  searchTerm: string;
  onTriggerSearch?: () => void;
}

const DEVOPS_KEYWORDS = [
  'devops', 'sre', 'reliability', 'cloud', 'infrastructure', 'platform',
  'ci/cd', 'ci-cd', 'kubernetes', 'k8s', 'terraform', 'ansible', 'sysadmin',
  'system admin', 'systems admin', 'systems engineer', 'system engineer', 'linux',
  'devsecops', 'automation', 'aws', 'azure', 'gcp', 'docker', 'build and release', 'release engineer'
];

const NON_DEVOPS_EXCLUSIONS = [
  'digital marketing', 'seo', 'social media', 'content writer', 'copywriter',
  'sales', 'business development', 'accountant', 'visual builder', 'graphic designer',
  'ui/ux', 'telecaller', 'bpo', 'recruiter', 'talent acquisition', 'hr executive',
  'qa manual', 'manual test', 'qa tester', 'qa engineer', 'qa analyst', 'payments & integration', 'data & tracking'
];

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export const JobExplorer: React.FC<JobExplorerProps> = ({ jobs, searchTerm, onTriggerSearch }) => {
  const [selectedPortal, setSelectedPortal] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [onlyOutreachReady, setOnlyOutreachReady] = useState<boolean>(false);
  const [onlyDevopsRoles, setOnlyDevopsRoles] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Application tracker sync state
  const [applications, setApplications] = useState<JobApplicationRecord[]>([]);
  const [appliedFilter, setAppliedFilter] = useState<'all' | 'applied_only' | 'unapplied_only'>('all');

  useEffect(() => {
    const syncApplications = () => {
      setApplications(loadApplicationsFromStorage());
    };
    syncApplications();
    syncApplicationsFromServer().then((merged) => {
      if (merged && merged.length > 0) {
        setApplications(merged);
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('devopspulse_tracker_updated', syncApplications);
      window.addEventListener('storage', syncApplications);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devopspulse_tracker_updated', syncApplications);
        window.removeEventListener('storage', syncApplications);
      }
    };
  }, []);

  // Pagination state (default: 12 cards per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPortal, selectedLocation, minScoreFilter, onlyOutreachReady, onlyDevopsRoles, appliedFilter, filterQuery, pageSize]);

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

  const appliedCount = useMemo(() => {
    return jobs.filter((j) => isJobApplied(j, applications).applied).length;
  }, [jobs, applications]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Portal filter
      if (selectedPortal !== 'all') {
        const portal = (job.source_website || '').toLowerCase().replace(/[\s_-]/g, '');
        const target = selectedPortal.toLowerCase().replace(/[\s_-]/g, '');

        const isMatch =
          portal.includes(target) ||
          target.includes(portal) ||
          (selectedPortal === 'ats' && (portal.includes('career') || portal.includes('company') || portal.includes('ats'))) ||
          (selectedPortal === 'google_jobs' && portal.includes('google'));

        if (!isMatch) {
          return false;
        }
      }

      // 2. Strict DevOps Role Filter (Eliminates Digital Marketing, QA, Visual Builder, etc.)
      if (onlyDevopsRoles) {
        const titleLower = (job.title || '').toLowerCase();
        const descLower = (job.description || '').toLowerCase();
        const skillsLower = (job.required_skills || []).map((s) => s.toLowerCase()).join(' ');

        // Discard if title matches any exclusion
        if (NON_DEVOPS_EXCLUSIONS.some((neg) => titleLower.includes(neg))) {
          return false;
        }

        // Title matches DevOps keyword OR skills/description have strong DevOps tool mention
        const titleMatch = DEVOPS_KEYWORDS.some((kw) => titleLower.includes(kw));
        const skillMatch = DEVOPS_KEYWORDS.some((kw) => skillsLower.includes(kw));
        const descMatch =
          (descLower.includes('kubernetes') && descLower.includes('docker')) ||
          (descLower.includes('terraform') && descLower.includes('aws')) ||
          (descLower.includes('ci/cd') && descLower.includes('pipeline')) ||
          descLower.includes('devops');

        if (!titleMatch && !skillMatch && !descMatch) {
          return false;
        }
      }

      // 3. Location filter (Applied client-side after jobs are listed)
      if (selectedLocation !== 'all') {
        const jobLoc = (job.location || '').toLowerCase();
        const target = selectedLocation.toLowerCase();
        if (!jobLoc.includes(target)) {
          return false;
        }
      }

      // 4. Score filter
      if (minScoreFilter > 0 && (job.match_score || 0) < minScoreFilter) {
        return false;
      }

      // 5. Recruiter Email Outreach filter
      if (onlyOutreachReady && !job.recruiter_email) {
        return false;
      }

      // 6. Applied Status Filter (Show only applied or hide applied)
      if (appliedFilter === 'applied_only' && !isJobApplied(job, applications).applied) {
        return false;
      }
      if (appliedFilter === 'unapplied_only' && isJobApplied(job, applications).applied) {
        return false;
      }

      // 7. In-page search text filter
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
  }, [jobs, selectedPortal, selectedLocation, minScoreFilter, onlyOutreachReady, onlyDevopsRoles, appliedFilter, applications, filterQuery]);

  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredJobs.length / pageSize) || 1;

  const paginatedJobs = useMemo(() => {
    if (pageSize === -1) return filteredJobs;
    const start = (currentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, currentPage, pageSize]);

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
    { id: 'zip_recruiter', name: 'ZipRecruiter' },
    { id: 'google_jobs', name: 'Google Jobs' },
    { id: 'jobicy', name: 'Jobicy' },
    { id: 'remotive', name: 'Remotive' },
    { id: 'arbeitnow', name: 'Arbeitnow' },
    { id: 'ats', name: 'Company ATS' },
    { id: 'infopark', name: 'Infopark' },
    { id: 'technopark', name: 'Technopark' },
    { id: 'bayt', name: 'Bayt' },
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

  const portalCounts = useMemo(() => {
    const counts: Record<string, number> = { all: jobs.length };
    portals.forEach((p) => {
      if (p.id === 'all') return;
      const target = p.id.toLowerCase().replace(/[\s_-]/g, '');
      const count = jobs.filter((job) => {
        const portal = (job.source_website || '').toLowerCase().replace(/[\s_-]/g, '');
        return (
          portal.includes(target) ||
          target.includes(portal) ||
          (p.id === 'ats' && (portal.includes('career') || portal.includes('company') || portal.includes('ats'))) ||
          (p.id === 'google_jobs' && portal.includes('google'))
        );
      }).length;
      counts[p.id] = count;
    });
    return counts;
  }, [jobs]);

  return (
    <div style={{ marginTop: '32px' }}>
      {/* Header Bar */}
      <div className="results-header-bar">
        <div className="results-title-wrap">
          <h3 className="results-heading">Discovered Openings</h3>
          <span className="results-count-badge">
            {filteredJobs.length} of {jobs.length} Verified
          </span>
          {appliedCount > 0 && (
            <span
              className="results-count-badge"
              style={{
                background: '#dcfce7',
                color: '#15803d',
                border: '1px solid #86efac',
                fontWeight: 700,
              }}
            >
              ✓ {appliedCount} Applied
            </span>
          )}
        </div>

        {/* Portal Filter Pills & Search */}
        <div className="portal-filters-row">
          {portals.map((p) => {
            const count = portalCounts[p.id] ?? 0;
            return (
              <button
                key={p.id}
                type="button"
                className={`portal-filter-btn ${selectedPortal === p.id ? 'active' : ''}`}
                onClick={() => setSelectedPortal(p.id)}
              >
                {p.name} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}

          <button
            type="button"
            className={`portal-filter-btn ${minScoreFilter === 80 ? 'active' : ''}`}
            onClick={() => setMinScoreFilter(minScoreFilter === 80 ? 0 : 80)}
            title="Filter jobs matching 80% or higher"
          >
            🔥 High Fit (&ge;80%)
          </button>

          <button
            type="button"
            className={`portal-filter-btn ${onlyOutreachReady ? 'active' : ''}`}
            onClick={() => setOnlyOutreachReady(!onlyOutreachReady)}
            title="Filter jobs that have recruiter emails and ready-to-send cold drafts"
            style={
              onlyOutreachReady
                ? { background: 'var(--primary)', color: '#ffffff', borderColor: 'var(--primary)' }
                : {}
            }
          >
            ✉️ Recruiter Email ({jobs.filter((j) => Boolean(j.recruiter_email)).length})
          </button>

          <button
            type="button"
            className={`portal-filter-btn ${onlyDevopsRoles ? 'active' : ''}`}
            onClick={() => setOnlyDevopsRoles(!onlyDevopsRoles)}
            title="Filter strictly for DevOps, SRE, Cloud, Platform, and Infrastructure roles"
            style={
              onlyDevopsRoles
                ? { background: '#0284c7', color: '#ffffff', borderColor: '#0284c7', fontWeight: 700 }
                : {}
            }
          >
            🛡️ DevOps Only {onlyDevopsRoles ? '✓' : ''}
          </button>

          <button
            type="button"
            className={`portal-filter-btn ${appliedFilter === 'applied_only' ? 'active' : ''}`}
            onClick={() => setAppliedFilter(appliedFilter === 'applied_only' ? 'all' : 'applied_only')}
            title="Filter for jobs you have already applied to"
            style={
              appliedFilter === 'applied_only'
                ? { background: '#059669', color: '#ffffff', borderColor: '#059669', fontWeight: 700 }
                : appliedCount > 0
                ? { borderColor: '#86efac', color: '#166534', background: '#f0fdf4', fontWeight: 600 }
                : {}
            }
          >
            ✓ Applied ({appliedCount})
          </button>

          {appliedCount > 0 && (
            <button
              type="button"
              className={`portal-filter-btn ${appliedFilter === 'unapplied_only' ? 'active' : ''}`}
              onClick={() => setAppliedFilter(appliedFilter === 'unapplied_only' ? 'all' : 'unapplied_only')}
              title="Hide jobs already marked as applied"
              style={
                appliedFilter === 'unapplied_only'
                  ? { background: '#475569', color: '#ffffff', borderColor: '#475569', fontWeight: 600 }
                  : {}
              }
            >
              {appliedFilter === 'unapplied_only' ? '👁️ Showing Unapplied' : 'Hide Applied'}
            </button>
          )}

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
              setOnlyOutreachReady(false);
              setOnlyDevopsRoles(true);
              setFilterQuery('');
              setCurrentPage(1);
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="jobs-grid">
            {paginatedJobs.map((job, idx) => (
              <JobCard key={`${job.job_id || 'job'}-${idx}`} job={job} />
            ))}
          </div>

          {/* Pagination Controls */}
          {filteredJobs.length > 0 && (
            <div className="pagination-bar">
              <div className="pagination-info">
                Showing{' '}
                <strong>
                  {pageSize === -1 ? 1 : (currentPage - 1) * pageSize + 1}
                </strong>
                –
                <strong>
                  {pageSize === -1
                    ? filteredJobs.length
                    : Math.min(currentPage * pageSize, filteredJobs.length)}
                </strong>{' '}
                of <strong>{filteredJobs.length}</strong> postings
              </div>

              {pageSize !== -1 && totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    &larr; Prev
                  </button>

                  {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                    typeof p === 'number' ? (
                      <button
                        key={idx}
                        type="button"
                        className={`pagination-number-btn ${currentPage === p ? 'active' : ''}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={idx} className="pagination-ellipsis">
                        ...
                      </span>
                    )
                  )}

                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next &rarr;
                  </button>
                </div>
              )}

              <div className="pagination-size-wrap">
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Per page:</span>
                <select
                  className="pagination-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={-1}>All ({filteredJobs.length})</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
