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
  { title: 'UX Researcher', location: 'Bucharest, Romania' },
  { title: 'Full Stack Developer', location: 'Kochi, Kerala, India' },
  { title: 'UI/UX Designer', location: 'Remote' },
  { title: 'AI / LLM Engineer', location: 'Bangalore, India' },
  { title: 'DevOps Engineer', location: 'Remote' },
];

const AVAILABLE_SOURCES = [
  { id: 'infopark', name: 'Infopark Kochi' },
  { id: 'technopark', name: 'Technopark Trivandrum' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'indeed', name: 'Indeed' },
  { id: 'naukri', name: 'Naukri' },
  { id: 'ats', name: 'Company ATS' },
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

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeConfig({ ...config, location: e.target.value });
  };

  const handlePostingClick = (item: { title: string; location: string }) => {
    onChangeConfig({
      ...config,
      search_term: item.title,
      location: item.location,
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
            career on autopilot
          </h2>
          <p className="hero-subtitle">
            Autonomous multi-portal job aggregator, AI candidate fit evaluator, and recruiter outreach engine connected with n8n.
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
          {/* Job Title Input */}
          <div className="capsule-input-group">
            <span className="capsule-icon">
              <SearchIcon size={20} color="var(--primary)" />
            </span>
            <input
              id="job-title-search-input"
              type="text"
              className="capsule-input"
              placeholder="Job Title or Keywords"
              value={config.search_term}
              onChange={handleTitleChange}
              disabled={isLoading}
            />
          </div>

          <div className="capsule-divider" />

          {/* Location Input */}
          <div className="capsule-input-group location-group">
            <span className="capsule-icon">
              <PinIcon size={18} color="var(--primary)" />
            </span>
            <input
              id="job-location-input"
              type="text"
              className="capsule-input"
              placeholder="Location (e.g., Kochi, Bucharest, Remote)"
              value={config.location}
              onChange={handleLocationChange}
              disabled={isLoading}
            />
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
              <span>Config</span>
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
                  <span>Processing...</span>
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

      {/* Latest Postings Carousel (Matching reference design) */}
      <div className="latest-postings-section">
        <div className="postings-header-row">
          <span className="postings-label">Latest Postings:</span>
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
                <span className="posting-location">{item.location}</span>
              </button>
            );
          })}
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
                placeholder="Python, FastAPI, React, PostgreSQL, Docker..."
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
            <span className="form-label">Active Job Portals to Scrape:</span>
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
