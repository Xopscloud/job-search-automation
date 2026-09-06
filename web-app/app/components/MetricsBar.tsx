'use client';

import React from 'react';
import { SearchIcon, SparklesIcon, MailIcon, BrainIcon } from './Icons';

interface MetricsBarProps {
  totalJobs: number;
  highMatches: number;
  recruiterContacts: number;
  averageScore: number;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  totalJobs,
  highMatches,
  recruiterContacts,
  averageScore,
}) => {
  return (
    <div className="metrics-row">
      <div className="metric-card">
        <div
          className="metric-icon-box"
          style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}
        >
          <SearchIcon size={22} />
        </div>
        <div>
          <div className="metric-value">{totalJobs}</div>
          <div className="metric-title">Aggregated Openings</div>
        </div>
      </div>

      <div className="metric-card">
        <div
          className="metric-icon-box"
          style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}
        >
          <SparklesIcon size={22} />
        </div>
        <div>
          <div className="metric-value" style={{ color: '#34d399' }}>
            {highMatches}
          </div>
          <div className="metric-title">High Fits (&ge;80% Match)</div>
        </div>
      </div>

      <div className="metric-card">
        <div
          className="metric-icon-box"
          style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}
        >
          <MailIcon size={22} />
        </div>
        <div>
          <div className="metric-value" style={{ color: '#22d3ee' }}>
            {recruiterContacts}
          </div>
          <div className="metric-title">Direct HR Contacts</div>
        </div>
      </div>

      <div className="metric-card">
        <div
          className="metric-icon-box"
          style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}
        >
          <BrainIcon size={22} />
        </div>
        <div>
          <div className="metric-value" style={{ color: '#fbbf24' }}>
            {averageScore ? `${averageScore}%` : '--'}
          </div>
          <div className="metric-title">Avg. AI Fit Score</div>
        </div>
      </div>
    </div>
  );
};
