'use client';

import React from 'react';
import {
  BuildingIcon,
  PinIcon,
  MailIcon,
  PhoneIcon,
  ExternalLinkIcon,
} from './Icons';
import { JobPost } from '../types';

interface JobCardProps {
  job: JobPost;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const score = job.match_score || 0;
  const isHighFit = score >= 80;
  const scoreColor = isHighFit ? '#10b981' : score >= 70 ? '#1a56db' : '#64748b';

  const circumference = 2 * Math.PI * 20;
  const strokeOffset = circumference - (score / 100) * circumference;

  const mailtoUrl = job.recruiter_email
    ? `mailto:${job.recruiter_email}?subject=${encodeURIComponent(
        `Application: ${job.title} - Candidate Profile`
      )}&body=${encodeURIComponent(
        `Dear ${job.recruiter_name || 'Hiring Team'},\n\nI am writing to express my strong interest in the ${job.title} role at ${job.company}.\n\nWith hands-on experience in ${job.required_skills?.slice(0, 3).join(', ') || 'modern software engineering'}, I am eager to contribute to your team.\n\nLooking forward to hearing from you.\n\nBest regards,`
      )}`
    : null;

  return (
    <div className="job-card" id={`job-card-${job.job_id}`}>
      <div>
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

        {/* Recruiter Contact Information Drawer */}
        {job.recruiter_email && (
          <div className="recruiter-box">
            <div>
              <span style={{ fontWeight: 700 }}>Recruiter:</span>{' '}
              {job.recruiter_name || 'Hiring Team'} &bull;{' '}
              <a
                href={mailtoUrl!}
                className="recruiter-email-link"
                title="Click to draft direct application email"
              >
                {job.recruiter_email}
              </a>
              {job.recruiter_phone && (
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#166534', marginTop: '2px' }}>
                  📞 {job.recruiter_phone}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534' }}>
              HR Contact
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="job-card-actions">
        <a
          href={job.job_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-apply-primary"
          id={`apply-link-${job.job_id}`}
        >
          <span>Apply on Portal</span>
          <ExternalLinkIcon size={14} />
        </a>

        {mailtoUrl && (
          <a
            href={mailtoUrl}
            className="btn-email-hr"
            title="Draft email directly to recruiter"
            id={`email-hr-${job.job_id}`}
          >
            <MailIcon size={14} />
            <span>Email HR</span>
          </a>
        )}
      </div>
    </div>
  );
};
