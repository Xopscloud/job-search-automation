'use client';
import React, { useState, useEffect } from 'react';
import {
  BuildingIcon,
  PinIcon,
  MailIcon,
  PhoneIcon,
  ExternalLinkIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
} from './Icons';
import { JobPost, JobApplicationRecord } from '../types';
import {
  recordJobApplication,
  isJobApplied,
  toggleJobApplication,
  formatDate,
  formatFutureDate,
} from '../applications/trackerStorage';

interface JobCardProps {
  job: JobPost;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const score = job.match_score || 0;
  const isHighFit = score >= 80;
  const scoreColor = isHighFit ? '#10b981' : score >= 70 ? '#1a56db' : '#64748b';

  const circumference = 2 * Math.PI * 20;
  const strokeOffset = circumference - (score / 100) * circumference;

  // Default personalized email generator tailored to DevOps & candidate profile
  const generateDefaultSubject = (j: JobPost) => {
    return `Application: ${j.title} - Johnson Thomas | DevOps & Cloud Engineer`;
  };

  const generateDefaultBody = (j: JobPost) => {
    const recruiterGreeting = j.recruiter_name ? `Dear ${j.recruiter_name},` : 'Dear Hiring Team,';
    const skillsMention =
      j.required_skills && j.required_skills.length > 0
        ? `particularly with ${j.required_skills.slice(0, 4).join(', ')}`
        : 'specifically in CI/CD automation, Kubernetes, Docker, Terraform, and cloud infrastructure';

    return `${recruiterGreeting}

I hope this email finds you well.

I came across the ${j.title} opening at ${j.company} and wanted to reach out directly to express my enthusiastic interest. With 3+ years of hands-on experience as a DevOps & Cloud Engineer, my technical background ${skillsMention} aligns directly with your engineering requirements.

Key highlights of my background include:
• Designing and maintaining automated CI/CD pipelines that streamline deployments and reduce manual intervention.
• Managing containerized microservices on Kubernetes (EKS/GKE) and Docker with Infrastructure-as-Code via Terraform.
• Optimizing cloud system reliability, proactive telemetry monitoring, and DevSecOps compliance.

I have attached my comprehensive DevOps resume (Johnson_Thomas_DevOps_Resume.pdf) for your review.

I would welcome the opportunity for a brief 10-minute conversation to introduce myself and discuss how my expertise can accelerate ${j.company}'s infrastructure goals. I have also submitted my formal application through your portal.

Thank you very much for your time and consideration.

Best regards,
Johnson Thomas
DevOps & Cloud Engineer
johnsonthomas.devops@gmail.com`;
  };

  // Outreach draft state
  const [showOutreachDrawer, setShowOutreachDrawer] = useState<boolean>(false);
  const [emailSubject, setEmailSubject] = useState<string>(
    job.email_draft?.subject || generateDefaultSubject(job)
  );
  const [emailBody, setEmailBody] = useState<string>(
    job.email_draft?.body || generateDefaultBody(job)
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<boolean>(job.email_draft?.status === 'sent');
  const [sentAt, setSentAt] = useState<string | null>(job.email_draft?.sent_at || null);
  const [sendError, setSendError] = useState<string | null>(job.email_draft?.error || null);
  const [copied, setCopied] = useState<boolean>(false);

  // Track applied status reactively
  const [appliedInfo, setAppliedInfo] = useState<{ applied: boolean; record?: JobApplicationRecord }>({
    applied: false,
  });

  useEffect(() => {
    const syncStatus = () => {
      setAppliedInfo(isJobApplied(job));
    };
    syncStatus();

    if (typeof window !== 'undefined') {
      window.addEventListener('devopspulse_tracker_updated', syncStatus);
      window.addEventListener('storage', syncStatus);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devopspulse_tracker_updated', syncStatus);
        window.removeEventListener('storage', syncStatus);
      }
    };
  }, [job]);

  const handleToggleApplied = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = toggleJobApplication({
      job_id: job.job_id,
      company: job.company,
      title: job.title,
      source_website: job.source_website,
      salary: job.salary,
      recruiter_email: job.recruiter_email,
    });
    setAppliedInfo(res);
  };

  const handleSendViaGmail = async () => {
    if (!job.recruiter_email || isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: job.recruiter_email,
          subject: emailSubject,
          body: emailBody,
          recruiter_name: job.recruiter_name,
          company: job.company,
          job_title: job.title,
          job_id: job.job_id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSendSuccess(true);
        setSentAt(data.sent_at || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        // Automatically log into tracking sheet as Applied
        const rec = recordJobApplication({
          company: job.company,
          role: job.title,
          applied_on: formatDate(new Date()),
          follow_up_date: formatFutureDate(5),
          status: 'Applied',
          source: job.source_website,
          salary_aed: job.salary || '',
          applied_through: 'mail',
          contact_email: job.recruiter_email || '',
          notes: 'Outreach email dispatched via Gmail',
          job_id: job.job_id,
        });
        setAppliedInfo({ applied: true, record: rec });
      } else {
        setSendError(data.error || 'Failed to dispatch email via n8n webhook.');
      }
    } catch (err: any) {
      setSendError(err?.message || 'Network error while communicating with email dispatch service.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetDraft = () => {
    setEmailSubject(generateDefaultSubject(job));
    setEmailBody(generateDefaultBody(job));
  };

  const mailtoUrl = job.recruiter_email
    ? `mailto:${job.recruiter_email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : null;

  return (
    <div
      className={`job-card ${appliedInfo.applied ? 'job-card-applied' : ''}`}
      id={`job-card-${job.job_id}`}
    >
      <div>
        {/* Applied Ribbon Banner when Job is marked as Applied */}
        {appliedInfo.applied && (
          <div className="job-applied-banner">
            <div className="job-applied-banner-left">
              <span className="job-applied-pill">
                <CheckIcon size={13} color="#ffffff" />
                <span>Already Applied</span>
              </span>
              {appliedInfo.record?.applied_on && (
                <span className="job-applied-meta">
                  Applied on <strong>{appliedInfo.record.applied_on}</strong>
                </span>
              )}
              {appliedInfo.record?.applied_through && (
                <span className="job-applied-channel">
                  via {appliedInfo.record.applied_through}
                </span>
              )}
              {appliedInfo.record?.status && (
                <span className={`job-applied-status-pill status-${appliedInfo.record.status.toLowerCase()}`}>
                  {appliedInfo.record.status}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn-unmark-applied"
              onClick={handleToggleApplied}
              title="Click to unmark as applied"
            >
              ✕ Unmark
            </button>
          </div>
        )}

        {/* Top Header: Title, Company, Score Gauge */}
        <div className="job-card-header">
          <div className="job-title-company">
            <h3 className="job-title">{job.title}</h3>
            <div className="company-name">
              <BuildingIcon size={14} color="var(--primary)" />
              <span>{job.company}</span>
              {job.company_details && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>
                  &bull; {job.company_details}
                </span>
              )}
            </div>
          </div>

          {/* Clean SVG Score Gauge */}
          <div
            style={{
              position: 'relative',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title={`AI Match Fit: ${score}%`}
          >
            <svg viewBox="0 0 48 48" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle
                cx="24"
                cy="24"
                r="20"
                strokeWidth="4"
                stroke="#e2e8f0"
                fill="none"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                strokeWidth="4"
                stroke={scoreColor}
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                fill="none"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <span
              style={{
                position: 'absolute',
                fontSize: '0.72rem',
                fontWeight: 800,
                color: scoreColor,
              }}
            >
              {score}%
            </span>
          </div>
        </div>

        {/* Metadata Chips: Portal, Location, Experience, Salary */}
        <div className="job-meta-row">
          <span className="portal-source-tag">
            {job.source_website}
          </span>
          <span className="meta-item">
            <PinIcon size={13} color="var(--text-muted)" />
            <span>{job.location || 'India'}</span>
          </span>
          {job.experience && (
            <span className="meta-item">
              <span>💼 {job.experience}</span>
            </span>
          )}
          {job.salary && (
            <span className="meta-item" style={{ color: '#059669', fontWeight: 600 }}>
              <span>💰 {job.salary}</span>
            </span>
          )}
          {job.date_posted && (
            <span className="meta-item">
              <span>📅 {job.date_posted}</span>
            </span>
          )}
        </div>

        {/* Required Skills Badges */}
        {job.required_skills && job.required_skills.length > 0 && (
          <div className="skills-box">
            {job.required_skills.map((skill, idx) => (
              <span key={idx} className="skill-badge">
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* AI Match Summary */}
        {job.match_summary && (
          <div className="ai-summary-box">
            &ldquo;{job.match_summary}&rdquo;
          </div>
        )}

        {/* Recruiter Contact & Outreach Strip */}
        {job.recruiter_email && (
          <div className="recruiter-box">
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#166534' }}>Recruiter:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{job.recruiter_name || 'Hiring Team'}</span>
                <span style={{ color: '#94a3b8' }}>&bull;</span>
                <span style={{ color: '#166534', fontWeight: 600 }}>{job.recruiter_email}</span>
                {job.recruiter_phone && (
                  <span style={{ color: '#166534', fontSize: '0.75rem' }}>📞 {job.recruiter_phone}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {sendSuccess ? (
                <span className="outreach-badge-sent">
                  <CheckIcon size={13} color="#059669" />
                  <span>Sent {sentAt || 'via Gmail'}</span>
                </span>
              ) : (
                <span className="outreach-badge-ready">
                  <SparklesIcon size={13} color="#1d4ed8" />
                  <span>Outreach Ready</span>
                </span>
              )}

              <button
                type="button"
                className="btn-outreach-toggle"
                onClick={() => setShowOutreachDrawer((prev) => !prev)}
                title="Review and customize the cold outreach draft"
              >
                <span>{showOutreachDrawer ? 'Close Draft' : sendSuccess ? 'View Email' : 'Review Draft'}</span>
                {showOutreachDrawer ? <ChevronUpIcon size={13} /> : <ChevronDownIcon size={13} />}
              </button>
            </div>
          </div>
        )}

        {/* Recruiter.so Style Personalized Cold Email Drawer */}
        {job.recruiter_email && showOutreachDrawer && (
          <div className="outreach-drawer" id={`outreach-drawer-${job.job_id}`}>
            <div className="outreach-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="outreach-ai-icon">
                  <SparklesIcon size={15} color="#ffffff" />
                </div>
                <div>
                  <h4 className="outreach-drawer-title">
                    Personalized Recruiter Cold Email
                  </h4>
                  <p className="outreach-drawer-subtitle">
                    Sending to <strong>{job.recruiter_name || 'Hiring Team'}</strong> ({job.recruiter_email}) from <strong>johnsonthomas.devops@gmail.com</strong>
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleCopyPitch}
                  className="outreach-btn-subtle"
                  title="Copy pitch to clipboard"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleResetDraft}
                  className="outreach-btn-subtle"
                  title="Reset to default template"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Resume Auto-Attachment Indicator */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📎</span>
                <span>Auto-Attached: <strong>Johnson_Thomas_DevOps_Resume.pdf</strong></span>
                <span style={{ color: '#059669', fontWeight: 700 }}>✓ Attached</span>
              </div>
              <a
                href="/Johnson_Thomas_DevOps_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
              >
                Preview ↗
              </a>
            </div>

            {/* Editable Subject */}
            <div className="outreach-field-group">
              <label className="outreach-label">
                Subject Line:
              </label>
              <input
                type="text"
                className="outreach-input"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject of application..."
              />
            </div>

            {/* Editable Body */}
            <div className="outreach-field-group">
              <label className="outreach-label">
                Message Body (Personalized to {job.company} &amp; DevOps fit):
              </label>
              <textarea
                rows={11}
                className="outreach-textarea"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Write your message here..."
              />
            </div>

            {/* Send Feedback Alerts */}
            {sendSuccess && (
              <div className="outreach-alert-success">
                <CheckIcon size={16} color="#047857" />
                <span>
                  <strong>Dispatched successfully!</strong> Sent directly from your Gmail account (johnsonthomas.devops@gmail.com) via n8n at {sentAt || 'now'}.
                </span>
              </div>
            )}

            {sendError && (
              <div className="outreach-alert-error">
                <span>⚠️ {sendError}</span>
              </div>
            )}

            {/* Dispatch Action Toolbar */}
            <div className="outreach-actions-bar">
              <button
                type="button"
                className={`btn-send-gmail ${isSending ? 'sending' : ''} ${sendSuccess ? 'sent' : ''}`}
                onClick={handleSendViaGmail}
                disabled={isSending || !emailSubject.trim() || !emailBody.trim()}
                id={`btn-send-gmail-${job.job_id}`}
              >
                {isSending ? (
                  <>
                    <span className="spinner-dots" />
                    <span>Sending via Gmail...</span>
                  </>
                ) : sendSuccess ? (
                  <>
                    <CheckIcon size={16} color="#ffffff" />
                    <span>Sent via Gmail (Send Again)</span>
                  </>
                ) : (
                  <>
                    <MailIcon size={16} color="#ffffff" />
                    <span>🚀 Send via Gmail</span>
                  </>
                )}
              </button>

              {mailtoUrl && (
                <a
                  href={mailtoUrl}
                  className="btn-mailto-fallback"
                  title="Open locally in your default email client"
                >
                  <span>Open in Mail App</span>
                  <ExternalLinkIcon size={13} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="job-card-actions">
        <a
          href={job.job_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn-apply-primary ${appliedInfo.applied ? 'is-applied' : ''}`}
          id={`apply-link-${job.job_id}`}
          onClick={() => {
            if (!appliedInfo.applied) {
              const res = recordJobApplication({
                company: job.company,
                role: job.title,
                applied_on: formatDate(new Date()),
                follow_up_date: formatFutureDate(5),
                status: 'Applied',
                source: job.source_website,
                salary_aed: job.salary || '',
                applied_through: 'site',
                contact_email: job.recruiter_email || '',
                notes: 'Applied via external portal link',
                job_id: job.job_id,
              });
              setAppliedInfo({ applied: true, record: res });
            }
          }}
        >
          <span>{appliedInfo.applied ? '✓ Applied • Portal ↗' : 'Apply on Portal'}</span>
          <ExternalLinkIcon size={14} />
        </a>

        {/* 1-Click Manual Mark as Applied Toggle */}
        <button
          type="button"
          className={`btn-toggle-applied ${appliedInfo.applied ? 'applied' : ''}`}
          onClick={handleToggleApplied}
          title={appliedInfo.applied ? 'Click to unmark as applied' : 'Click to mark as applied in your tracking sheet'}
        >
          {appliedInfo.applied ? (
            <>
              <CheckIcon size={13} color="#15803d" />
              <span>Marked as Applied</span>
            </>
          ) : (
            <>
              <span>+ Mark as Applied</span>
            </>
          )}
        </button>

        {job.recruiter_email && (
          <button
            type="button"
            className={`btn-email-hr ${sendSuccess ? 'sent-active' : ''}`}
            onClick={() => setShowOutreachDrawer((prev) => !prev)}
            title="Review & Send Cold Email via Gmail"
            id={`email-hr-${job.job_id}`}
          >
            <MailIcon size={14} />
            <span>{sendSuccess ? '✓ Email Sent' : 'Review & Send Email'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
