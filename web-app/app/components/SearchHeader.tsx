'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  SearchIcon,
  RocketIcon,
  SettingsIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  N8nIcon,
  PinIcon,
} from './Icons';
import { WorkflowConfig } from '../types';

interface SearchHeaderProps {
  config: WorkflowConfig;
  onChangeConfig: (newConfig: WorkflowConfig) => void;
  onTriggerWorkflow: () => void;
  isLoading: boolean;
}

const FEATURED_POSTINGS = [
  { title: 'DevOps Engineer', roleTag: 'CI/CD • Kubernetes • Terraform' },
  { title: 'Site Reliability Engineer (SRE)', roleTag: 'Observability • Cloud • Linux' },
  { title: 'DevSecOps Engineer', roleTag: 'Security • Compliance • CI/CD' },
  { title: 'Cloud Engineer', roleTag: 'AWS • Azure • GCP Infrastructure' },
  { title: 'Solution Architect', roleTag: 'Enterprise Cloud Architecture' },
  { title: 'Platform Engineer', roleTag: 'Internal Developer Platforms' },
];

const AVAILABLE_SOURCES = [
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'indeed', name: 'Indeed' },
  { id: 'naukri', name: 'Naukri' },
  { id: 'glassdoor', name: 'Glassdoor' },
  { id: 'zip_recruiter', name: 'ZipRecruiter' },
  { id: 'remoteok', name: 'RemoteOK' },
  { id: 'weworkremotely', name: 'WeWorkRemotely' },
  { id: 'jobicy', name: 'Jobicy (Remote Tech)' },
  { id: 'ats', name: 'Company ATS (Greenhouse, Lever, Ashby, Workday)' },
  { id: 'infopark', name: 'Infopark Kochi' },
  { id: 'technopark', name: 'Technopark Trivandrum' },
  { id: 'google_jobs', name: 'Google Jobs Search' },
  { id: 'bayt', name: 'Bayt (Middle East / UAE / Gulf)' },
];

export const INDIAN_IT_CITIES = [
  { label: 'All India', value: 'India', badge: 'Nationwide' },
  { label: 'Kochi / Ernakulam', value: 'Kochi, Kerala, India', badge: 'Infopark' },
  { label: 'Trivandrum', value: 'Trivandrum, Kerala, India', badge: 'Technopark' },
  { label: 'Bangalore (Bengaluru)', value: 'Bangalore, Karnataka, India', badge: 'Top IT Hub' },
  { label: 'Hyderabad', value: 'Hyderabad, Telangana, India', badge: 'Cyberabad' },
  { label: 'Pune', value: 'Pune, Maharashtra, India', badge: 'IT Corridor' },
  { label: 'Chennai', value: 'Chennai, Tamil Nadu, India', badge: 'OMR' },
  { label: 'Mumbai / Navi Mumbai', value: 'Mumbai, Maharashtra, India', badge: 'Finance & Cloud' },
  { label: 'Delhi NCR (Noida / Gurgaon)', value: 'Gurgaon, Delhi NCR, India', badge: 'Tech Zone' },
  { label: 'Coimbatore', value: 'Coimbatore, Tamil Nadu, India', badge: 'Emerging IT' },
  { label: '🌐 Remote (Work from Anywhere)', value: 'Remote', badge: 'Remote' },
];

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  config,
  onChangeConfig,
  onTriggerWorkflow,
  isLoading,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [pingStatus, setPingStatus] = useState<{ loading: boolean; message?: string; ok?: boolean } | null>(null);

  const testWebhookPing = async () => {
    setPingStatus({ loading: true });
    try {
      const res = await fetch('/api/workflow/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: config.webhook_url }),
      });
      const data = await res.json();
      setPingStatus({ loading: false, ok: data.ok, message: data.message });
    } catch (err: any) {
      setPingStatus({ loading: false, ok: false, message: err?.message || 'Connection failed' });
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeConfig({ ...config, search_term: e.target.value });
  };

  const handlePostingClick = (item: { title: string; roleTag: string }) => {
    onChangeConfig({
      ...config,
      search_term: item.title,
    });
  };

  const toggleSource = (sourceId: string) => {
    const exists = config.sources.includes(sourceId);
    const updated = exists
      ? config.sources.filter((s) => s !== sourceId)
      : [...config.sources, sourceId];
    onChangeConfig({ ...config, sources: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && config.search_term.trim()) {
      onTriggerWorkflow();
    }
  };

  return (
    <div className="hero-wrapper">
      {/* Top Hero Section: Headline on Left, Animated Pen Rocket on Right */}
      <div className="hero-grid">
        <div className="hero-content">
          <h2 className="hero-headline">
            Find your dream <br />
            DevOps &amp; Cloud role
          </h2>
          <p className="hero-subtitle">
            Autonomous multi-portal job aggregator, AI match evaluator, and recruiter outreach engine dedicated to DevOps, SRE, DevSecOps, and Cloud professionals.
          </p>
        </div>

        {/* Hero Animated Illustration Frame */}
        <div className="hero-illustration-col">
          <div className="hero-illustration-card">
            <Image
              src="/hero-rocket.jpg"
              alt="Rocket pen ascending in clouds"
              width={400}
              height={300}
              className="hero-img"
              priority
            />
          </div>
          <div className="particle particle-1" />
          <div className="particle particle-2" />
        </div>
      </div>

      {/* Floating Capsule Search Bar */}
      <div className="search-capsule-card">
        <form onSubmit={handleSubmit} className="search-capsule-form">
          {/* 1. Job Title / Role Search Input */}
          <div className="capsule-input-group" style={{ flex: 1.3 }}>
            <span className="capsule-icon">
              <SearchIcon size={19} color="var(--primary)" />
            </span>
            <input
              id="job-title-search-input"
              type="text"
              className="capsule-input"
              placeholder="DevOps role (e.g. DevOps Engineer, SRE, Cloud, Platform)..."
              value={config.search_term}
              onChange={handleTitleChange}
              disabled={isLoading}
            />
          </div>

          <div className="capsule-divider" />

          {/* 2. Indian IT City & Location Input with Dropdown */}
          <div className="capsule-input-group location-group" style={{ flex: 1.1 }}>
            <span className="capsule-icon">
              <PinIcon size={18} color="var(--primary)" />
            </span>
            <input
              id="job-location-search-input"
              type="text"
              className="capsule-input"
              placeholder="Indian IT City (e.g. Kochi, Bangalore)..."
              value={config.location}
              onChange={(e) => onChangeConfig({ ...config, location: e.target.value })}
              disabled={isLoading}
            />
            <select
              id="city-select-dropdown"
              className="capsule-city-select"
              value={
                INDIAN_IT_CITIES.some((c) => c.value.toLowerCase() === (config.location || '').toLowerCase())
                  ? config.location
                  : ''
              }
              onChange={(e) => {
                if (e.target.value) {
                  onChangeConfig({ ...config, location: e.target.value });
                }
              }}
              disabled={isLoading}
              title="Select Indian IT City"
            >
              <option value="" disabled>Select IT City...</option>
              {INDIAN_IT_CITIES.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions: Settings Toggle & Find It Now Button */}
          <div className="capsule-actions">
            <button
              type="button"
              className="btn-config-toggle"
              onClick={() => setShowSettings(!showSettings)}
              title="Workflow Config"
            >
              <SettingsIcon size={16} />
              <span>Sources ({config.sources.length})</span>
              {showSettings ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
            </button>

            <button
              id="trigger-workflow-button"
              type="submit"
              className="btn-find-now"
              disabled={isLoading || !config.search_term.trim()}
            >
              {isLoading ? (
                <>
                  <div className="btn-spinner" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <RocketIcon size={18} />
                  <span>Find it now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Latest Postings & Quick Indian IT Hubs */}
      <div className="latest-postings-section">
        <div className="postings-header-row">
          <span className="postings-label">Target DevOps Roles:</span>
        </div>
        <div className="postings-cards-row">
          {FEATURED_POSTINGS.map((item) => {
            const isActive =
              config.search_term.toLowerCase() === item.title.toLowerCase();
            return (
              <button
                key={item.title}
                type="button"
                className={`posting-card ${isActive ? 'active' : ''}`}
                onClick={() => handlePostingClick(item)}
                disabled={isLoading}
              >
                <span className="posting-title">{item.title}</span>
                <span className="posting-location">{item.roleTag}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Indian IT Hubs Filter Chips */}
        <div className="location-chips-row" style={{ marginTop: '14px' }}>
          <span className="location-chips-label">📍 Indian IT Hubs:</span>
          <div className="location-chips-wrap">
            {INDIAN_IT_CITIES.map((city) => {
              const isSelected =
                (config.location || '').toLowerCase() === city.value.toLowerCase() ||
                (city.value !== 'India' &&
                  (config.location || '').toLowerCase().includes(city.label.split(' ')[0].toLowerCase()));
              return (
                <button
                  key={city.value}
                  type="button"
                  className={`location-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => onChangeConfig({ ...config, location: city.value })}
                  disabled={isLoading}
                >
                  <span>{city.label}</span>
                  <span className="location-chip-badge">{city.badge}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Advanced Settings Drawer */}
      {showSettings && (
        <div className="config-drawer">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            ⚙️ Automation Engine & Candidate Configuration
          </h3>

          <div className="config-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="config-skills">
                Candidate Skills (AI Fit Evaluation)
              </label>
              <input
                id="config-skills"
                type="text"
                className="form-input"
                value={config.candidate_skills}
                onChange={(e) => onChangeConfig({ ...config, candidate_skills: e.target.value })}
                placeholder="AWS, Azure, Kubernetes, Docker, Terraform, CI/CD, Linux, Python, Helm..."
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="config-exp">
                Experience Years: <strong>{config.candidate_experience_years} yrs</strong>
              </label>
              <input
                id="config-exp"
                type="number"
                min="0"
                max="25"
                className="form-input"
                value={config.candidate_experience_years}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    candidate_experience_years: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="config-min-score">
                Min Match Score for Email Alert: <strong>{config.min_alert_score}%</strong>
              </label>
              <input
                id="config-min-score"
                type="range"
                min="50"
                max="95"
                step="5"
                value={config.min_alert_score}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    min_alert_score: parseInt(e.target.value),
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="config-email">
                Recipient Email for Daily Digest
              </label>
              <input
                id="config-email"
                type="email"
                className="form-input"
                value={config.recipient_email}
                onChange={(e) => onChangeConfig({ ...config, recipient_email: e.target.value })}
                placeholder="johnsonthomas.contact@gmail.com"
              />
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="form-label" style={{ marginBottom: 0 }}>Active Job Portals to Scrape ({config.sources.length}/{AVAILABLE_SOURCES.length}):</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="location-clear-btn"
                  style={{ fontSize: '0.74rem', padding: '2px 8px' }}
                  onClick={() => onChangeConfig({ ...config, sources: AVAILABLE_SOURCES.map((s) => s.id) })}
                >
                  ✓ Select All ({AVAILABLE_SOURCES.length})
                </button>
                <button
                  type="button"
                  className="location-clear-btn"
                  style={{ fontSize: '0.74rem', padding: '2px 8px' }}
                  onClick={() => onChangeConfig({ ...config, sources: [] })}
                >
                  ✕ Clear All
                </button>
              </div>
            </div>
            <div className="sources-checkbox-grid">
              {AVAILABLE_SOURCES.map((source) => {
                const isChecked = config.sources.includes(source.id);
                return (
                  <label key={source.id} className="source-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSource(source.id)}
                    />
                    <span>{source.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={testWebhookPing}
                disabled={pingStatus?.loading}
                className="btn-config-toggle"
                style={{ fontSize: '0.8rem' }}
              >
                <N8nIcon size={14} />
                <span>{pingStatus?.loading ? 'Pinging n8n...' : 'Test n8n Webhook Connection'}</span>
              </button>
              {pingStatus && (
                <span style={{ fontSize: '0.78rem', color: pingStatus.ok ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 600 }}>
                  {pingStatus.message}
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Webhook Endpoint: <code style={{ color: 'var(--primary)', fontWeight: 600 }}>https://n8n.johnsonthomas.co.in/webhook/7d7ac...</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
