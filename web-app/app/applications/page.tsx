'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  SearchIcon,
  CheckIcon,
  ExternalLinkIcon,
  MailIcon,
  RefreshIcon,
  BuildingIcon,
} from '../components/Icons';
import { JobApplicationRecord, ApplicationStatus } from '../types';
import {
  loadApplicationsFromStorage,
  saveApplicationsToStorage,
  exportApplicationsToCSV,
  formatDate,
  formatFutureDate,
  SEED_APPLICATIONS,
} from './trackerStorage';

const SENDER_EMAIL = 'johnsonthomas.devops@gmail.com';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<JobApplicationRecord[]>(SEED_APPLICATIONS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingApp, setEditingApp] = useState<JobApplicationRecord | null>(null);

  // Form state
  const [formCompany, setFormCompany] = useState<string>('');
  const [formRole, setFormRole] = useState<string>('Devops Engineer');
  const [formAppliedOn, setFormAppliedOn] = useState<string>('');
  const [formFollowUpDate, setFormFollowUpDate] = useState<string>('');
  const [formStatus, setFormStatus] = useState<ApplicationStatus>('Pending');
  const [formSource, setFormSource] = useState<string>('Indeed');
  const [formSalary, setFormSalary] = useState<string>('');
  const [formAppliedThrough, setFormAppliedThrough] = useState<string>('mail');
  const [formContactEmail, setFormContactEmail] = useState<string>('');
  const [formFollowUpDone, setFormFollowUpDone] = useState<boolean>(false);
  const [formNotes, setFormNotes] = useState<string>('');

  // Initial load & listener for cross-tab or cross-component additions
  useEffect(() => {
    const loaded = loadApplicationsFromStorage();
    setApplications(loaded);

    const handleUpdate = () => {
      setApplications(loadApplicationsFromStorage());
    };
    window.addEventListener('devopspulse_tracker_updated', handleUpdate);
    return () => {
      window.removeEventListener('devopspulse_tracker_updated', handleUpdate);
    };
  }, []);

  // Compute KPI counts matching user's spreadsheet top bar
  const kpiStats = useMemo(() => {
    const total = applications.length;
    let pending = 0;
    let interviewing = 0;
    let followUpDue = 0;
    let offered = 0;
    let rejected = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const app of applications) {
      if (app.status === 'Pending') pending++;
      else if (app.status === 'Interviewing') interviewing++;
      else if (app.status === 'Offered') offered++;
      else if (app.status === 'Rejected') rejected++;

      // Check if follow-up is due or past due and not marked as done
      if (!app.follow_up_done && app.follow_up_date) {
        const parsedDate = new Date(app.follow_up_date);
        if (!isNaN(parsedDate.getTime()) && parsedDate <= today) {
          followUpDue++;
        }
      }
    }

    return { total, pending, interviewing, followUpDue, offered, rejected };
  }, [applications]);

  // Unique sources for filter dropdown
  const uniqueSources = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      if (a.source) set.add(a.source.trim());
    });
    return Array.from(set).sort();
  }, [applications]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (selectedStatus !== 'all' && app.status !== selectedStatus) {
        return false;
      }
      // Source filter
      if (selectedSource !== 'all' && app.source !== selectedSource) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCompany = app.company.toLowerCase().includes(q);
        const matchRole = app.role.toLowerCase().includes(q);
        const matchEmail = (app.contact_email || '').toLowerCase().includes(q);
        const matchNotes = (app.notes || '').toLowerCase().includes(q);
        return matchCompany || matchRole || matchEmail || matchNotes;
      }
      return true;
    });
  }, [applications, selectedStatus, selectedSource, searchQuery]);

  // Quick inline status change
  const handleStatusChange = (id: string, newStatus: ApplicationStatus) => {
    const updated = applications.map((app) => {
      if (app.id === id) {
        return {
          ...app,
          status: newStatus,
          updated_at: new Date().toISOString(),
        };
      }
      return app;
    });
    setApplications(updated);
    saveApplicationsToStorage(updated);
  };

  // Quick toggle for Follow-up Done
  const handleToggleFollowUp = (id: string) => {
    const updated = applications.map((app) => {
      if (app.id === id) {
        return {
          ...app,
          follow_up_done: !app.follow_up_done,
          updated_at: new Date().toISOString(),
        };
      }
      return app;
    });
    setApplications(updated);
    saveApplicationsToStorage(updated);
  };

  // Open modal for new application
  const handleOpenAddModal = () => {
    setEditingApp(null);
    setFormCompany('');
    setFormRole('Devops Engineer');
    setFormAppliedOn(formatDate(new Date()));
    setFormFollowUpDate(formatFutureDate(5));
    setFormStatus('Pending');
    setFormSource('Indeed');
    setFormSalary('');
    setFormAppliedThrough('mail');
    setFormContactEmail('');
    setFormFollowUpDone(false);
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open modal for editing application
  const handleOpenEditModal = (app: JobApplicationRecord) => {
    setEditingApp(app);
    setFormCompany(app.company);
    setFormRole(app.role);
    setFormAppliedOn(app.applied_on);
    setFormFollowUpDate(app.follow_up_date || '');
    setFormStatus(app.status);
    setFormSource(app.source);
    setFormSalary(app.salary_aed || '');
    setFormAppliedThrough(app.applied_through);
    setFormContactEmail(app.contact_email || '');
    setFormFollowUpDone(app.follow_up_done);
    setFormNotes(app.notes || '');
    setIsModalOpen(true);
  };

  // Save form submission
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim() || !formRole.trim()) {
      alert('Company Name and Role / Position are required.');
      return;
    }

    if (editingApp) {
      // Update existing
      const updated = applications.map((app) => {
        if (app.id === editingApp.id) {
          return {
            ...app,
            company: formCompany.trim(),
            role: formRole.trim(),
            applied_on: formAppliedOn.trim(),
            follow_up_date: formFollowUpDate.trim(),
            status: formStatus,
            source: formSource.trim(),
            salary_aed: formSalary.trim(),
            applied_through: formAppliedThrough.trim(),
            contact_email: formContactEmail.trim(),
            follow_up_done: formFollowUpDone,
            notes: formNotes.trim(),
            updated_at: new Date().toISOString(),
          };
        }
        return app;
      });
      setApplications(updated);
      saveApplicationsToStorage(updated);
    } else {
      // Add new
      const newApp: JobApplicationRecord = {
        id: `app_${Date.now()}`,
        index: applications.length + 1,
        company: formCompany.trim(),
        role: formRole.trim(),
        applied_on: formAppliedOn.trim() || formatDate(new Date()),
        follow_up_date: formFollowUpDate.trim() || formatFutureDate(5),
        status: formStatus,
        source: formSource.trim() || 'Direct',
        salary_aed: formSalary.trim(),
        applied_through: formAppliedThrough.trim() || 'mail',
        contact_email: formContactEmail.trim(),
        follow_up_done: formFollowUpDone,
        notes: formNotes.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [newApp, ...applications];
      setApplications(updated);
      saveApplicationsToStorage(updated);
    }

    setIsModalOpen(false);
  };

  // Delete an application
  const handleDelete = (id: string, company: string) => {
    if (confirm(`Remove application for "${company}" from the tracker?`)) {
      const remaining = applications.filter((app) => app.id !== id);
      setApplications(remaining);
      saveApplicationsToStorage(remaining);
    }
  };

  // Reset to seed data
  const handleRestoreDefaults = () => {
    if (confirm('Reset tracking sheet back to initial seed data from your Google Sheet? Any custom additions will be cleared.')) {
      setApplications(SEED_APPLICATIONS);
      saveApplicationsToStorage(SEED_APPLICATIONS);
    }
  };

  // Build Gmail compose URL for direct follow-up
  const buildFollowUpGmailUrl = (app: JobApplicationRecord) => {
    if (!app.contact_email) return null;
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: app.contact_email,
      su: `Following up on ${app.role} Application - Johnson Thomas`,
      body: `Dear Hiring Team,\n\nI hope you are having a wonderful week.\n\nI wanted to follow up on my application for the ${app.role} position at ${app.company} submitted on ${app.applied_on}.\n\nI remain very enthusiastic about contributing to ${app.company}'s cloud engineering initiatives. Please let me know if you require any additional information.\n\nSincerely,\nJohnson Thomas\nDevOps & Site Reliability Engineer\n+91 94970 65992\n${SENDER_EMAIL}`,
      authuser: SENDER_EMAIL,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  };

  return (
    <div>
      {/* Top SaaS Navbar */}
      <header className="top-nav">
        <Link href="/" className="brand-badge">
          <div className="brand-title-wrap">
            <span className="brand-logo-text">
              DevOps<span className="brand-logo-accent">Pulse</span>
            </span>
          </div>
        </Link>

        <ul className="nav-links">
          <li>
            <Link href="/" className="nav-link">
              Jobs
            </Link>
          </li>
          <li>
            <Link href="/mailing" className="nav-link">
              Recruiter Outreach
            </Link>
          </li>
          <li>
            <Link href="/applications" className="nav-link active" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>Job Status</span>
              <span
                style={{
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 800,
                }}
              >
                {applications.length}
              </span>
            </Link>
          </li>
          <li>
            <a href="https://n8n.johnsonthomas.co.in" target="_blank" rel="noopener noreferrer" className="nav-link">
              n8n Cloud
            </a>
          </li>
        </ul>

        <div className="nav-actions">
          <div className="status-pill">
            <span className="pulse-dot" />
            <span>Google Sheets Connected</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                📊 Job Application Status Tracker
              </h1>
              <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                Live Tracking Sheet
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0' }}>
              Tracks all your submitted applications, outreach notes, and follow-up schedules. Automatically updated when you apply or dispatch emails.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn-export-csv"
              onClick={() => exportApplicationsToCSV(applications)}
              title="Export tracking sheet to CSV file"
            >
              <span>📥 Export to CSV</span>
            </button>
            <button
              type="button"
              className="btn-add-application"
              onClick={handleOpenAddModal}
            >
              <span>➕ Add Application</span>
            </button>
          </div>
        </div>

        {/* Top Colored KPI Counters (Matches user's spreadsheet screenshot) */}
        <div className="tracker-kpi-grid">
          <div className="tracker-kpi-card kpi-total">
            <div className="tracker-kpi-header" />
            <div className="tracker-kpi-body">
              <div className="tracker-kpi-value">{kpiStats.total}</div>
              <div className="tracker-kpi-label">Total Applied</div>
            </div>
          </div>

          <div className="tracker-kpi-card kpi-pending">
            <div className="tracker-kpi-header" />
            <div className="tracker-kpi-body">
              <div className="tracker-kpi-value">{kpiStats.pending}</div>
              <div className="tracker-kpi-label">Pending Review</div>
            </div>
          </div>

          <div className="tracker-kpi-card kpi-followup">
            <div className="tracker-kpi-header" />
            <div className="tracker-kpi-body">
              <div className="tracker-kpi-value">{kpiStats.followUpDue}</div>
              <div className="tracker-kpi-label">Follow-up Due</div>
            </div>
          </div>

          <div className="tracker-kpi-card kpi-interviewing">
            <div className="tracker-kpi-header" />
            <div className="tracker-kpi-body">
              <div className="tracker-kpi-value">{kpiStats.interviewing}</div>
              <div className="tracker-kpi-label">Interviewing</div>
            </div>
          </div>

          <div className="tracker-kpi-card kpi-offered">
            <div className="tracker-kpi-header" />
            <div className="tracker-kpi-body">
              <div className="tracker-kpi-value">{kpiStats.offered}</div>
              <div className="tracker-kpi-label">Offers Received</div>
            </div>
          </div>

          <div className="tracker-kpi-card kpi-rejected">
            <div className="tracker-kpi-header" />
            <div className="tracker-kpi-body">
              <div className="tracker-kpi-value">{kpiStats.rejected}</div>
              <div className="tracker-kpi-label">Rejected</div>
            </div>
          </div>
        </div>

        {/* Tracker Filter & Action Toolbar */}
        <div className="tracker-toolbar">
          <div className="tracker-search-box">
            <span className="tracker-search-icon">
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              className="tracker-search-input"
              placeholder="Search company, role, email, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tracker-filter-group">
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px' }}>
              Status:
            </span>
            {(['all', 'Pending', 'Interviewing', 'Offered', 'Rejected'] as const).map((st) => (
              <button
                key={st}
                type="button"
                className={`tracker-filter-btn ${selectedStatus === st ? 'active' : ''}`}
                onClick={() => setSelectedStatus(st)}
              >
                {st === 'all' ? 'All Status' : st}
              </button>
            ))}
          </div>

          {uniqueSources.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Source:
              </span>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-sm)',
                  padding: '5px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="all">All Sources ({uniqueSources.length})</option>
                {uniqueSources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Interactive Spreadsheet Table Card */}
        <div className="tracker-sheet-card">
          <div className="tracker-sheet-titlebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BuildingIcon size={16} color="var(--primary)" />
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Application Pipeline ({filteredApplications.length} records)
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Showing {filteredApplications.length} of {applications.length} applications
              </span>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                title="Reset sheet back to default seed entries from your spreadsheet"
              >
                Restore Initial Sheet
              </button>
            </div>
          </div>

          <div className="tracker-table-scroll">
            <table className="tracker-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>Company</th>
                  <th>Role / Position</th>
                  <th>Applied On</th>
                  <th>Follow-up Date</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Salary (AED)</th>
                  <th>Applied through</th>
                  <th>Contact Email</th>
                  <th>Follow-up Done?</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                      No job applications match your filters. Click &quot;➕ Add Application&quot; to log a new one.
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app, idx) => {
                    const gmailFollowUpUrl = buildFollowUpGmailUrl(app);
                    const isOverdue =
                      !app.follow_up_done &&
                      app.follow_up_date &&
                      new Date(app.follow_up_date) <= new Date();

                    return (
                      <tr key={app.id}>
                        {/* # */}
                        <td className="tracker-row-index">{app.index || idx + 1}</td>

                        {/* Company */}
                        <td className="tracker-cell-company">{app.company}</td>

                        {/* Role / Position */}
                        <td className="tracker-cell-role">{app.role}</td>

                        {/* Applied On */}
                        <td>{app.applied_on}</td>

                        {/* Follow-up Date */}
                        <td>
                          {app.follow_up_date ? (
                            <span className={`followup-chip ${isOverdue ? 'followup-due' : 'followup-normal'}`}>
                              {isOverdue && '⚠️ '}
                              {app.follow_up_date}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-light)' }}>-</span>
                          )}
                        </td>

                        {/* Status (Interactive dropdown selector) */}
                        <td>
                          <select
                            className={`status-dropdown-select status-${app.status.toLowerCase()}`}
                            value={app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                            title="Click to update application status"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Interviewing">Interviewing</option>
                            <option value="Offered">Offered</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Applied">Applied</option>
                          </select>
                        </td>

                        {/* Source */}
                        <td>
                          <span className="tracker-cell-source">{app.source || 'Direct'}</span>
                        </td>

                        {/* Salary (AED) */}
                        <td>{app.salary_aed || <span style={{ color: 'var(--text-light)' }}>-</span>}</td>

                        {/* Applied through */}
                        <td>
                          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                            {app.applied_through}
                          </span>
                        </td>

                        {/* Contact Email */}
                        <td>
                          {app.contact_email ? (
                            <a
                              href={`mailto:${app.contact_email}`}
                              style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: '0.78rem' }}
                              title={`Send email to ${app.contact_email}`}
                            >
                              {app.contact_email}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-light)' }}>-</span>
                          )}
                        </td>

                        {/* Follow-up Done? Toggle */}
                        <td>
                          <button
                            type="button"
                            className={`tracker-check-btn ${app.follow_up_done ? 'done' : 'not-done'}`}
                            onClick={() => handleToggleFollowUp(app.id)}
                            title="Toggle follow-up status"
                          >
                            <span>{app.follow_up_done ? '✓ Done' : '⏳ Pending'}</span>
                          </button>
                        </td>

                        {/* Notes */}
                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {app.notes || <span style={{ color: 'var(--text-light)' }}>-</span>}
                        </td>

                        {/* Actions */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            {gmailFollowUpUrl && (
                              <a
                                href={gmailFollowUpUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-open-gmail"
                                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                title="Open follow-up email draft in Gmail"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="#EA4335"/>
                                </svg>
                                <span>Gmail</span>
                              </a>
                            )}

                            <button
                              type="button"
                              className="outreach-btn-subtle"
                              onClick={() => handleOpenEditModal(app)}
                              title="Edit application details"
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              className="outreach-btn-subtle"
                              onClick={() => handleDelete(app.id, app.company)}
                              style={{ color: '#b91c1c' }}
                              title="Delete this application"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add or Edit Application */}
        {isModalOpen && (
          <div className="template-modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="tracker-modal-window" onClick={(e) => e.stopPropagation()}>
              <div className="template-modal-header">
                <div>
                  <h3 className="template-modal-title">
                    <span>{editingApp ? '✏️ Edit Job Application' : '➕ Add Job Application'}</span>
                  </h3>
                  <p className="template-modal-subtitle">
                    Record updates to your job tracking sheet.
                  </p>
                </div>
                <button
                  type="button"
                  className="template-modal-close"
                  onClick={() => setIsModalOpen(false)}
                  title="Close modal"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveModal}>
                <div className="tracker-form-grid">
                  <div className="outreach-field-group">
                    <label className="outreach-label">Company Name *</label>
                    <input
                      type="text"
                      className="outreach-input"
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      placeholder="e.g. Litmus7"
                      required
                    />
                  </div>

                  <div className="outreach-field-group">
                    <label className="outreach-label">Role / Position *</label>
                    <input
                      type="text"
                      className="outreach-input"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      placeholder="e.g. Devops Engineer"
                      required
                    />
                  </div>

                  <div className="outreach-field-group">
                    <label className="outreach-label">Applied On Date</label>
                    <input
                      type="text"
                      className="outreach-input"
                      value={formAppliedOn}
                      onChange={(e) => setFormAppliedOn(e.target.value)}
                      placeholder="e.g. Sep 1, 2026"
                    />
                  </div>

                  <div className="outreach-field-group">
                    <label className="outreach-label">Follow-up Date</label>
                    <input
                      type="text"
                      className="outreach-input"
                      value={formFollowUpDate}
                      onChange={(e) => setFormFollowUpDate(e.target.value)}
                      placeholder="e.g. Sep 6, 2026"
                    />
                  </div>

                  <div className="outreach-field-group">
                    <label className="outreach-label">Status</label>
                    <select
                      className="outreach-input"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as ApplicationStatus)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Interviewing">Interviewing</option>
                      <option value="Offered">Offered</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Applied">Applied</option>
                    </select>
                  </div>

                  <div className="outreach-field-group">
                    <label className="outreach-label">Source</label>
                    <input
                      type="text"
                      className="outreach-input"
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value)}
                      placeholder="e.g. Indeed, Technopark, Infopark"
                    />
                  </div>

                  <div className="outreach-field-group">
                    <label className="outreach-label">Salary (AED)</label>
                    <input
                      type="text"
                      className="outreach-input"
                      value={formSalary}
                      onChange={(e) => setFormSalary(e.target.value)}
                      placeholder="e.g. 15,000"
                    />
                  </div>

                  <div className="outreach-field-group">
                    <label className="outreach-label">Applied Through</label>
                    <input
                      type="text"
                      className="outreach-input"
                      value={formAppliedThrough}
                      onChange={(e) => setFormAppliedThrough(e.target.value)}
                      placeholder="e.g. mail, site, Indeed"
                    />
                  </div>

                  <div className="outreach-field-group" style={{ gridColumn: 'span 2' }}>
                    <label className="outreach-label">Contact / Recruiter Email</label>
                    <input
                      type="email"
                      className="outreach-input"
                      value={formContactEmail}
                      onChange={(e) => setFormContactEmail(e.target.value)}
                      placeholder="e.g. careers@company.com"
                    />
                  </div>

                  <div className="outreach-field-group" style={{ gridColumn: 'span 2' }}>
                    <label className="outreach-label">Notes</label>
                    <textarea
                      rows={2}
                      className="outreach-textarea"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="e.g. Followed up on LinkedIn, submitted portfolio..."
                    />
                  </div>

                  <div className="outreach-field-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={formFollowUpDone}
                        onChange={(e) => setFormFollowUpDone(e.target.checked)}
                      />
                      <span>Mark Follow-up as Completed</span>
                    </label>
                  </div>
                </div>

                <div className="template-modal-footer">
                  <button
                    type="button"
                    className="outreach-btn-subtle"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-template-apply"
                  >
                    💾 {editingApp ? 'Save Changes' : 'Add to Sheet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
