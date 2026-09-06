'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  RocketIcon,
  SpiderIcon,
  FilterIcon,
  BrainIcon,
  SheetsIcon,
  MailIcon,
  CheckIcon,
  TerminalIcon,
} from './Icons';
import { WorkflowStage, WorkflowLog } from '../types';

interface WorkflowVisualizerProps {
  stages: WorkflowStage[];
  logs: WorkflowLog[];
  isRunning: boolean;
  progressPercent: number;
}

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  stages,
  logs,
  isRunning,
  progressPercent,
}) => {
  const [showLogs, setShowLogs] = useState(true);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const renderIcon = (id: string, status: string) => {
    if (status === 'completed') {
      return <CheckIcon size={18} color="#ffffff" />;
    }
    switch (id) {
      case 'trigger':
      case 'stage-1':
        return <RocketIcon size={16} />;
      case 'scraping':
      case 'stage-2':
        return <SpiderIcon size={16} />;
      case 'dedup':
      case 'stage-3':
        return <FilterIcon size={16} />;
      case 'ai_scoring':
      case 'stage-4':
        return <BrainIcon size={16} />;
      case 'ranking':
      case 'stage-5':
        return <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>#1</span>;
      case 'sheet_sync':
      case 'stage-6':
        return <SheetsIcon size={16} />;
      case 'email_dispatch':
      case 'stage-7':
        return <MailIcon size={16} />;
      default:
        return <RocketIcon size={16} />;
    }
  };

  return (
    <div className="pipeline-card">
      <div className="pipeline-header">
        <div className="pipeline-title-group">
          <div className="pipeline-icon-badge">
            <RocketIcon size={18} />
          </div>
          <div>
            <h3 className="pipeline-title">Automated Execution Pipeline</h3>
            <div className="pipeline-subtitle">
              {isRunning
                ? `n8n automation in progress (${Math.round(progressPercent)}%)...`
                : 'Real-time orchestration across scraping, AI evaluation, and notifications'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isRunning && (
            <span className="status-pill">
              <span className="pulse-dot" />
              Live Execution
            </span>
          )}
          <button
            type="button"
            className="terminal-toggle-btn"
            onClick={() => setShowLogs(!showLogs)}
            title="Toggle terminal logs"
          >
            <TerminalIcon size={14} />
            <span>{showLogs ? 'Hide Logs' : 'View Logs'}</span>
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="pipeline-progress-track">
        <div
          className="pipeline-progress-bar"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 7-Stage Node Grid */}
      <div className="stages-grid">
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            className={`stage-node-card ${stage.status}`}
            id={`stage-card-${stage.id}`}
          >
            <div className="stage-icon-circle">
              {renderIcon(stage.id, stage.status)}
            </div>
            <div className="stage-name">{stage.name}</div>
            <div className="stage-desc">{stage.description}</div>
            <span className="stage-metric-pill">
              {stage.status === 'running'
                ? 'Active'
                : stage.status === 'completed'
                ? stage.metric || 'Done'
                : 'Queued'}
            </span>
          </div>
        ))}
      </div>

      {/* Real-time Telemetry Terminal */}
      {showLogs && (
        <div className="terminal-logs-wrapper">
          <div className="terminal-logs-header">
            <div className="terminal-dots">
              <span className="terminal-dot" style={{ background: '#ef4444' }} />
              <span className="terminal-dot" style={{ background: '#f59e0b' }} />
              <span className="terminal-dot" style={{ background: '#10b981' }} />
              <span style={{ marginLeft: '8px', color: '#94a3b8' }}>
                n8n Workflow Telemetry Stream
              </span>
            </div>
            <span>{logs.length} events logged</span>
          </div>

          <div className="terminal-logs-body" ref={logsContainerRef}>
            {logs.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                Awaiting search trigger. Enter a job title above and click &quot;Find it now&quot; to initiate n8n automation.
              </div>
            ) : (
              logs.map((log, idx) => (
                <div key={`${log.id}-${idx}-${log.timestamp}`} className="log-entry">
                  <span className="log-time">[{log.timestamp}]</span>
                  <span className="log-source">[{log.source}]</span>
                  <span className={`log-msg-${log.level}`}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
