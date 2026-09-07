'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  BuildingIcon,
  PinIcon,
  MailIcon,
  SparklesIcon,
  CheckIcon,
  ExternalLinkIcon,
  SearchIcon,
  RefreshIcon,
  N8nIcon,
  RocketIcon,
} from '../components/Icons';
import { JobPost, SentEmailRecord } from '../types';
import {
  EmailTemplate,
  DEFAULT_TEMPLATES,
  AVAILABLE_PLACEHOLDERS,
  loadTemplatesFromStorage,
  saveTemplatesToStorage,
  resetTemplatesToDefaults,
  renderTemplate,
  ACTIVE_TEMPLATE_KEY,
} from './templates';
import { recordJobApplication, formatDate, formatFutureDate } from '../applications/trackerStorage';

// Dedicated Pipeline Self-Test Recruiter (dispatches to user's test email)
const TEST_RECRUITER_JOB: JobPost = {
  job_id: 'test_pipeline_recruiter',
  title: 'Senior DevOps Engineer',
  company: 'DevOps Pulse Cloud Team',
  company_details: 'Recruiter Outreach Pipeline Verification',
  location: 'Remote / India',
  required_skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'Prometheus', 'DevSecOps'],
  experience: '3+ years',
  salary: 'Pipeline Test',
  date_posted: 'Live Test Target',
  job_url: 'https://n8n.johnsonthomas.co.in',
  apply_method: 'Direct Recruiter Outreach',
  recruiter_name: 'Johnson Thomas',
  recruiter_email: 'johnsonthomas.contact@gmail.com',
  recruiter_phone: '+91 94970 65992',
  source_website: 'Self-Test Pipeline',
  match_score: 99,
  match_summary: 'Pipeline verification target. Sending here will deliver the formal application and attached resume directly to johnsonthomas.contact@gmail.com.',
  status: 'New',
};

const DEFAULT_SENDER_EMAIL = 'johnsonthomas.devops@gmail.com';
const SENDER_EMAIL = DEFAULT_SENDER_EMAIL;

export default function MailingPage() {
  const [realJobs, setRealJobs] = useState<JobPost[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(TEST_RECRUITER_JOB.job_id);
  const [activeTab, setActiveTab] = useState<'hub' | 'drafts' | 'sent'>('hub');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mail Templates State
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('full');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string>('full');
  const [modalTab, setModalTab] = useState<'edit' | 'preview'>('edit');
  const [editName, setEditName] = useState<string>('');
  const [editBadge, setEditBadge] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editSubject, setEditSubject] = useState<string>('');
  const [editBody, setEditBody] = useState<string>('');
  const [activeInputTarget, setActiveInputTarget] = useState<'subject' | 'body'>('body');
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Resume status
  const [resumeInfo, setResumeInfo] = useState<{
    filename: string;
    size_formatted: string;
    url: string;
  }>({
    filename: 'Johnson_Thomas_DevOps_Resume.pdf',
    size_formatted: '2.7 KB',
    url: '/Johnson_Thomas_DevOps_Resume.pdf',
  });
  const [isUploadingResume, setIsUploadingResume] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draft editing state
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Sent records history
  const [sentRecords, setSentRecords] = useState<SentEmailRecord[]>([]);

  // Modal for previewing sent email content
  const [previewSentRecord, setPreviewSentRecord] = useState<SentEmailRecord | null>(null);

  // Load REAL jobs from localStorage (populated from search section)
  const loadRealJobsFromStorage = () => {
    try {
      const stored = localStorage.getItem('devopspulse_jobs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter ONLY jobs that have recruiter emails
          const withEmail = parsed.filter((j) => Boolean(j.recruiter_email));
          setRealJobs(withEmail);
        }
      } else {
        setRealJobs([]);
      }
    } catch (err) {
      console.error('Failed to load real jobs from storage:', err);
      setRealJobs([]);
    }
  };

  useEffect(() => {
    loadRealJobsFromStorage();

    // Check resume file status
    fetch('/api/resume')
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) {
          setResumeInfo({
            filename: data.filename,
            size_formatted: data.size_formatted,
            url: data.url,
          });
        }
      })
      .catch(() => {});

    // Load templates from localStorage
    const storedTemplates = loadTemplatesFromStorage();
    setTemplates(storedTemplates);
    try {
      const activeId = localStorage.getItem(ACTIVE_TEMPLATE_KEY);
      if (activeId && storedTemplates.some((t) => t.id === activeId)) {
        setSelectedTemplateId(activeId);
        setEditingTemplateId(activeId);
      }
    } catch {
      // ignore
    }

    // Load sent email archive
    try {
      const storedSent = localStorage.getItem('devopspulse_sent_emails');
      if (storedSent) {
        const parsedSent = JSON.parse(storedSent);
        if (Array.isArray(parsedSent)) {
          setSentRecords(parsedSent);
        }
      }
    } catch (e) {
      console.error('Failed to load sent emails:', e);
    }
  }, []);

  // Combined recruiter jobs: TEST_RECRUITER_JOB is always available for testing + real discovered jobs
  const allRecruiterJobs = useMemo(() => {
    return [TEST_RECRUITER_JOB, ...realJobs];
  }, [realJobs]);

  // Set initial selected job
  useEffect(() => {
    if (!selectedJobId || !allRecruiterJobs.some((j) => j.job_id === selectedJobId)) {
      setSelectedJobId(allRecruiterJobs[0]?.job_id || TEST_RECRUITER_JOB.job_id);
    }
  }, [allRecruiterJobs, selectedJobId]);

  const selectedJob = useMemo(() => {
    return allRecruiterJobs.find((j) => j.job_id === selectedJobId) || TEST_RECRUITER_JOB;
  }, [allRecruiterJobs, selectedJobId]);

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0] || DEFAULT_TEMPLATES[0];
  }, [templates, selectedTemplateId]);

  const editingTemplate = useMemo(() => {
    return templates.find((t) => t.id === editingTemplateId) || templates[0] || DEFAULT_TEMPLATES[0];
  }, [templates, editingTemplateId]);

  // Sync editing fields whenever editingTemplateId or editingTemplate changes
  useEffect(() => {
    if (editingTemplate) {
      setEditName(editingTemplate.name);
      setEditBadge(editingTemplate.badge || '');
      setEditDescription(editingTemplate.description || '');
      setEditSubject(editingTemplate.subject);
      setEditBody(editingTemplate.body);
    }
  }, [editingTemplateId, editingTemplate]);

  // Generate pitch using template system
  const generatePitch = (job: JobPost | null, templateId?: string) => {
    const target = templateId ? templates.find((t) => t.id === templateId) || activeTemplate : activeTemplate;
    return renderTemplate(target, job, resumeInfo.filename);
  };

  // Switch active template & update composer draft
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    try {
      localStorage.setItem(ACTIVE_TEMPLATE_KEY, templateId);
    } catch {
      // ignore
    }
    const targetTemplate = templates.find((t) => t.id === templateId);
    if (targetTemplate && selectedJob) {
      const rendered = renderTemplate(targetTemplate, selectedJob, resumeInfo.filename);
      setSubject(rendered.subject);
      setBody(rendered.body);
      setSendSuccess(false);
      setSendError(null);
    }
  };

  // Insert variable token into active input in modal
  const handleInsertVariable = (token: string) => {
    if (activeInputTarget === 'subject') {
      const el = subjectInputRef.current;
      if (el) {
        const start = el.selectionStart ?? editSubject.length;
        const end = el.selectionEnd ?? editSubject.length;
        const next = editSubject.slice(0, start) + token + editSubject.slice(end);
        setEditSubject(next);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + token.length, start + token.length);
        }, 0);
      } else {
        setEditSubject((prev) => prev + token);
      }
    } else {
      const el = bodyTextareaRef.current;
      if (el) {
        const start = el.selectionStart ?? editBody.length;
        const end = el.selectionEnd ?? editBody.length;
        const next = editBody.slice(0, start) + token + editBody.slice(end);
        setEditBody(next);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + token.length, start + token.length);
        }, 0);
      } else {
        setEditBody((prev) => prev + token);
      }
    }
  };

  // Save template edits to local storage
  const handleSaveTemplateChanges = () => {
    if (!editName.trim() || !editSubject.trim() || !editBody.trim()) {
      alert('Template Name, Subject, and Body cannot be empty.');
      return;
    }

    const updated = templates.map((t) => {
      if (t.id === editingTemplateId) {
        return {
          ...t,
          name: editName.trim(),
          badge: editBadge.trim() || (t.isBuiltIn ? 'Customized' : 'Custom'),
          description: editDescription.trim(),
          subject: editSubject,
          body: editBody,
        };
      }
      return t;
    });

    setTemplates(updated);
    saveTemplatesToStorage(updated);
    alert('Template saved successfully!');
  };

  // Apply template directly to composer and close modal
  const handleApplyTemplateToDraft = () => {
    if (!editName.trim() || !editSubject.trim() || !editBody.trim()) {
      alert('Template Name, Subject, and Body cannot be empty.');
      return;
    }

    const updatedTemplate: EmailTemplate = {
      ...(editingTemplate || DEFAULT_TEMPLATES[0]),
      id: editingTemplateId,
      name: editName.trim(),
      badge: editBadge.trim() || (editingTemplate?.isBuiltIn ? 'Customized' : 'Custom'),
      description: editDescription.trim(),
      subject: editSubject,
      body: editBody,
    };

    const updated = templates.map((t) => (t.id === editingTemplateId ? updatedTemplate : t));
    setTemplates(updated);
    saveTemplatesToStorage(updated);

    setSelectedTemplateId(editingTemplateId);
    try {
      localStorage.setItem(ACTIVE_TEMPLATE_KEY, editingTemplateId);
    } catch {}

    if (selectedJob) {
      const rendered = renderTemplate(updatedTemplate, selectedJob, resumeInfo.filename);
      setSubject(rendered.subject);
      setBody(rendered.body);
      setSendSuccess(false);
      setSendError(null);

      try {
        const stored = localStorage.getItem('devopspulse_custom_drafts') || '{}';
        const parsed = JSON.parse(stored);
        parsed[selectedJob.job_id] = { subject: rendered.subject, body: rendered.body };
        localStorage.setItem('devopspulse_custom_drafts', JSON.stringify(parsed));
      } catch {}
    }

    setIsTemplateModalOpen(false);
  };

  // Create brand new custom template
  const handleCreateNewTemplate = () => {
    const newId = `custom_${Date.now()}`;
    const newTemplate: EmailTemplate = {
      id: newId,
      name: 'Custom Outreach Pitch',
      badge: 'Custom',
      icon: '✨',
      description: 'Personalized custom template for tailored outreach.',
      subject: 'Application for {job_title} - {sender_name}',
      body: `{recruiter_greeting}

I hope this message finds you well.

I am reaching out regarding the {job_title} role at {company}. With my background in {skills}, I am confident I can contribute to your team's engineering goals.

I have attached my resume ({resume_filename}) for your review.

I would love to schedule a brief conversation to discuss how my experience can support {company}.

Sincerely,
{sender_name}
Phone: {sender_phone}
Email: {sender_email}`,
      isBuiltIn: false,
    };

    const nextTemplates = [...templates, newTemplate];
    setTemplates(nextTemplates);
    saveTemplatesToStorage(nextTemplates);
    setEditingTemplateId(newId);
    setModalTab('edit');
  };

  // Delete custom template
  const handleDeleteTemplate = (id: string) => {
    const t = templates.find((item) => item.id === id);
    if (!t) return;
    if (t.isBuiltIn) {
      alert('Built-in system templates cannot be deleted, but you can reset them to default.');
      return;
    }
    if (!confirm(`Are you sure you want to delete template "${t.name}"?`)) return;

    const remaining = templates.filter((item) => item.id !== id);
    setTemplates(remaining);
    saveTemplatesToStorage(remaining);

    const fallbackId = remaining[0]?.id || 'full';
    setEditingTemplateId(fallbackId);
    if (selectedTemplateId === id) {
      setSelectedTemplateId(fallbackId);
    }
  };

  // Reset single template to factory default
  const handleResetSingleTemplate = (id: string) => {
    const def = DEFAULT_TEMPLATES.find((item) => item.id === id);
    if (!def) {
      alert('This is a custom template. To reset, edit its content or delete it.');
      return;
    }
    if (confirm(`Reset "${def.name}" back to its factory default content?`)) {
      const updated = templates.map((t) => (t.id === id ? { ...def } : t));
      setTemplates(updated);
      saveTemplatesToStorage(updated);
      setEditName(def.name);
      setEditBadge(def.badge);
      setEditDescription(def.description);
      setEditSubject(def.subject);
      setEditBody(def.body);
    }
  };

  // Reset all templates to defaults
  const handleResetAllDefaults = () => {
    if (confirm('Are you sure you want to reset ALL templates back to factory presets? Any custom templates will be removed.')) {
      const defs = resetTemplatesToDefaults();
      setTemplates(defs);
      setSelectedTemplateId('full');
      setEditingTemplateId('full');
      if (selectedJob) {
        const rendered = renderTemplate(defs[0], selectedJob, resumeInfo.filename);
        setSubject(rendered.subject);
        setBody(rendered.body);
      }
    }
  };

  // Real-time preview within modal
  const previewTemplateObject: EmailTemplate = useMemo(() => {
    return {
      id: editingTemplateId,
      name: editName,
      badge: editBadge,
      description: editDescription,
      subject: editSubject,
      body: editBody,
    };
  }, [editingTemplateId, editName, editBadge, editDescription, editSubject, editBody]);

  const modalRenderedPreview = useMemo(() => {
    return renderTemplate(previewTemplateObject, selectedJob, resumeInfo.filename);
  }, [previewTemplateObject, selectedJob, resumeInfo.filename]);

  // Update composer when selected job or template changes
  useEffect(() => {
    if (selectedJob) {
      try {
        const storedCustomDrafts = localStorage.getItem('devopspulse_custom_drafts');
        if (storedCustomDrafts) {
          const parsed = JSON.parse(storedCustomDrafts);
          if (parsed[selectedJob.job_id]) {
            setSubject(parsed[selectedJob.job_id].subject);
            setBody(parsed[selectedJob.job_id].body);
            setSendSuccess(false);
            setSendError(null);
            return;
          }
        }
      } catch {
        // ignore
      }

      const generated = generatePitch(selectedJob, selectedTemplateId);
      setSubject(generated.subject);
      setBody(generated.body);
      setSendSuccess(false);
      setSendError(null);
    }
  }, [selectedJob, selectedTemplateId, templates, resumeInfo.filename]);

  // Check if active job has already been sent
  const activeJobIsSent = useMemo(() => {
    if (!selectedJob) return false;
    return sentRecords.some((rec) => rec.job_id === selectedJob.job_id);
  }, [selectedJob, sentRecords]);

  // Handle resume file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResume(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/resume', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResumeInfo({
          filename: data.filename,
          size_formatted: data.size_formatted,
          url: data.url,
        });
        alert(`Resume updated successfully: ${file.name} (${data.size_formatted})`);
      } else {
        alert(data.error || 'Failed to upload resume');
      }
    } catch (err: any) {
      alert(`Upload error: ${err?.message}`);
    } finally {
      setIsUploadingResume(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Send via Gmail through n8n webhook API
  const handleSendViaGmail = async () => {
    if (!selectedJob || !selectedJob.recruiter_email || isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedJob.recruiter_email,
          subject: subject.trim(),
          body: body.trim(),
          recruiter_name: selectedJob.recruiter_name,
          company: selectedJob.company,
          job_title: selectedJob.title,
          job_id: selectedJob.job_id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const formattedTime =
          data.sent_at ||
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setSendSuccess(true);
        setSentAt(formattedTime);

        // Record into sent archive
        const newRecord: SentEmailRecord = {
          id: `sent_${Date.now()}`,
          job_id: selectedJob.job_id,
          to: selectedJob.recruiter_email,
          recruiter_name: selectedJob.recruiter_name || 'Hiring Team',
          company: selectedJob.company,
          job_title: selectedJob.title,
          subject: subject.trim(),
          body: body.trim(),
          sent_at: formattedTime,
          timestamp: new Date().toISOString(),
          source_website: selectedJob.source_website,
        };

        const updatedSent = [newRecord, ...sentRecords];
        setSentRecords(updatedSent);
        try {
          localStorage.setItem('devopspulse_sent_emails', JSON.stringify(updatedSent));
        } catch (e) {
          console.error('Failed to update sent emails in localStorage', e);
        }

        // Automatically sync to Job Application Tracking Sheet
        recordJobApplication({
          company: selectedJob.company,
          role: selectedJob.title,
          applied_on: formatDate(new Date()),
          follow_up_date: formatFutureDate(5),
          status: 'Pending',
          source: selectedJob.source_website || 'Direct Outreach',
          salary_aed: selectedJob.salary || '',
          applied_through: 'mail',
          contact_email: selectedJob.recruiter_email || '',
          notes: `Sent outreach via Gmail with attached resume (${resumeInfo.filename})`,
          job_id: selectedJob.job_id,
        });
      } else {
        setSendError(data.error || 'Failed to dispatch email via n8n.');
      }
    } catch (err: any) {
      setSendError(err?.message || 'Network error while reaching email dispatcher.');
    } finally {
      setIsSending(false);
    }
  };

  // Save current custom draft to localStorage
  const handleSaveDraft = () => {
    if (!selectedJob) return;
    try {
      const stored = localStorage.getItem('devopspulse_custom_drafts') || '{}';
      const parsed = JSON.parse(stored);
      parsed[selectedJob.job_id] = { subject, body };
      localStorage.setItem('devopspulse_custom_drafts', JSON.stringify(parsed));
      alert('Draft saved locally! Your edits will be remembered for this recruiter.');
    } catch (e) {
      console.error('Failed to save draft:', e);
    }
  };

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetDraft = () => {
    if (!selectedJob) return;
    try {
      const stored = localStorage.getItem('devopspulse_custom_drafts') || '{}';
      const parsed = JSON.parse(stored);
      delete parsed[selectedJob.job_id];
      localStorage.setItem('devopspulse_custom_drafts', JSON.stringify(parsed));
    } catch {
      // ignore
    }
    const fresh = generatePitch(selectedJob, selectedTemplateId);
    setSubject(fresh.subject);
    setBody(fresh.body);
  };

  const handleClearSentHistory = () => {
    if (confirm('Are you sure you want to clear your sent emails history?')) {
      setSentRecords([]);
      localStorage.removeItem('devopspulse_sent_emails');
    }
  };

  // Filtered jobs in left pane
  const filteredRecruiterJobs = useMemo(() => {
    return allRecruiterJobs.filter((j) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchCompany = j.company.toLowerCase().includes(q);
      const matchTitle = j.title.toLowerCase().includes(q);
      const matchRec = (j.recruiter_name || '').toLowerCase().includes(q);
      const matchEmail = (j.recruiter_email || '').toLowerCase().includes(q);
      return matchCompany || matchTitle || matchRec || matchEmail;
    });
  }, [allRecruiterJobs, searchQuery]);

  // Drafted pitches count (all recruiter jobs not yet sent)
  const unsentDrafts = useMemo(() => {
    const sentIds = new Set(sentRecords.map((r) => r.job_id));
    return allRecruiterJobs.filter((j) => !sentIds.has(j.job_id));
  }, [allRecruiterJobs, sentRecords]);

  const getGmailComposeUrl = (toEmail: string, emailSubject: string, emailBody: string) => {
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: toEmail,
      su: emailSubject,
      body: emailBody,
      authuser: SENDER_EMAIL,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  };

  const activeGmailComposeUrl = selectedJob?.recruiter_email
    ? getGmailComposeUrl(selectedJob.recruiter_email, subject, body)
    : null;

  const mailtoFallback = selectedJob?.recruiter_email
    ? `mailto:${selectedJob.recruiter_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;

  return (
    <div>
      {/* Top Navbar */}
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
            <Link href="/mailing" className="nav-link active" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>Recruiter Outreach</span>
              <span
                style={{
                  background: 'var(--primary)',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 800,
                }}
              >
                {allRecruiterJobs.length}
              </span>
            </Link>
          </li>
          <li>
            <Link href="/applications" className="nav-link">
              Job Status
            </Link>
          </li>
          <li>
            <Link href="/#pipeline" className="nav-link">
              Pipeline
            </Link>
          </li>
          <li>
            <Link href="/#stats" className="nav-link">
              Analytics
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
            <span>n8n Outreach Ready</span>
          </div>

          <a
            href="https://n8n.johnsonthomas.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="n8n-studio-link"
            title="Open n8n Workflow Studio"
          >
            <N8nIcon size={14} />
            <span>Open Studio</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="container" style={{ paddingBottom: '60px' }}>
        {/* Hero Header */}
        <div style={{ marginTop: '28px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.8rem' }}>✉️</span>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Recruiter Outreach Studio
              </h1>
              <span
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                Recruiter.so Mode
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-outreach-toggle"
                onClick={() => {
                  loadRealJobsFromStorage();
                  alert(`Synced with live jobs search! Found ${realJobs.length} openings with recruiter email.`);
                }}
                title="Reload discovered jobs from the search section"
              >
                <RefreshIcon size={13} />
                <span>Sync with Search ({realJobs.length} Live Found)</span>
              </button>

              <button
                type="button"
                className="btn-apply-primary"
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                onClick={() => {
                  setSelectedJobId(TEST_RECRUITER_JOB.job_id);
                  setActiveTab('hub');
                }}
                title="Immediately select the test recruiter to verify email delivery"
              >
                <span>🧪 Test Recruiter</span>
              </button>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '820px', margin: 0, lineHeight: 1.5 }}>
            Automate personalized cold emails for DevOps vacancies with verified recruiter contacts. Drafts are automatically prepared from real search findings, your resume is attached, and pitches dispatch directly through your Gmail account (<strong>{SENDER_EMAIL}</strong>) via n8n.
          </p>
        </div>

        {/* Global Auto-Attached Resume Banner */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 18px',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>📎</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Auto-Attached Resume:</strong>
                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.86rem' }}>
                  {resumeInfo.filename}
                </span>
                <span style={{ fontSize: '0.74rem', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px' }}>
                  {resumeInfo.size_formatted}
                </span>
                <span style={{ background: '#ecfdf5', color: '#047857', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                  ✓ Ready &amp; Attached to All Outbound Emails
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Stored locally in webapp public assets and automatically dispatched as a PDF attachment to recruiters.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={resumeInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="outreach-btn-subtle"
              style={{ textDecoration: 'none' }}
              title="Open resume PDF in new browser tab"
            >
              👁️ Preview Resume
            </a>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
            />

            <button
              type="button"
              className="outreach-btn-subtle"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingResume}
              title="Replace current resume with your own custom PDF"
            >
              {isUploadingResume ? 'Uploading...' : '⬆️ Upload / Replace CV'}
            </button>
          </div>
        </div>

        {/* Outreach Metrics Bar */}
        <div className="metrics-row" style={{ marginTop: '0', marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-icon-box" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <MailIcon size={20} />
            </div>
            <div>
              <div className="metric-value">{allRecruiterJobs.length}</div>
              <div className="metric-title">Recruiter Contacts ({realJobs.length} Live + 1 Test)</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-box" style={{ background: '#fef3c7', color: '#b45309' }}>
              <SparklesIcon size={20} />
            </div>
            <div>
              <div className="metric-value">{unsentDrafts.length}</div>
              <div className="metric-title">Drafts Ready to Send</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-box" style={{ background: '#ecfdf5', color: '#047857' }}>
              <CheckIcon size={20} />
            </div>
            <div>
              <div className="metric-value">{sentRecords.length}</div>
              <div className="metric-title">Dispatched via Gmail</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-box" style={{ background: '#f1f5f9', color: '#475569' }}>
              <RocketIcon size={20} />
            </div>
            <div>
              <div className="metric-value" style={{ fontSize: '0.88rem', wordBreak: 'break-all' }}>
                {SENDER_EMAIL}
              </div>
              <div className="metric-title">Connected Sender (Gmail)</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="outreach-tab-nav">
          <button
            type="button"
            className={`outreach-tab-btn ${activeTab === 'hub' ? 'active' : ''}`}
            onClick={() => setActiveTab('hub')}
          >
            <span>🎯 Draft &amp; Send Hub</span>
            <span className="outreach-tab-badge">{allRecruiterJobs.length}</span>
          </button>

          <button
            type="button"
            className={`outreach-tab-btn ${activeTab === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveTab('drafts')}
          >
            <span>📝 Drafted Pitches</span>
            <span className="outreach-tab-badge">{unsentDrafts.length}</span>
          </button>

          <button
            type="button"
            className={`outreach-tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            <span>🚀 Sent Archive</span>
            <span className="outreach-tab-badge">{sentRecords.length}</span>
          </button>
        </div>

        {/* Notice if no real recruiter jobs found in search yet */}
        {realJobs.length === 0 && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              marginBottom: '20px',
              fontSize: '0.84rem',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <strong>ℹ️ Real Search Info:</strong> No live postings with recruiter emails have been captured in the local search buffer yet. Use the <strong>Test Recruiter</strong> below to test your pipeline right now, or trigger a search on the{' '}
              <Link href="/" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}>
                Jobs Search Page
              </Link>{' '}
              to collect live vacancies from LinkedIn, Indeed, Naukri, and ATS portals.
            </div>
            <Link
              href="/"
              className="btn-outreach-toggle"
              style={{ textDecoration: 'none' }}
            >
              Go to Jobs Search ↗
            </Link>
          </div>
        )}

        {/* TAB 1: DRAFT & SEND HUB (Split View) */}
        {activeTab === 'hub' && (
          <div className="mailing-split-layout">
            {/* Left Sidebar: Recruiter Contacts List */}
            <div className="mailing-sidebar">
              <div className="mailing-sidebar-search">
                <input
                  type="text"
                  placeholder="Filter recruiters or roles..."
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.84rem', paddingLeft: '32px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-light)', pointerEvents: 'none' }}>
                  <SearchIcon size={14} />
                </span>
              </div>

              <div className="mailing-recruiter-list">
                {filteredRecruiterJobs.map((job) => {
                  const isSelected = selectedJob?.job_id === job.job_id;
                  const isSent = sentRecords.some((r) => r.job_id === job.job_id);
                  const isTest = job.job_id === TEST_RECRUITER_JOB.job_id;

                  return (
                    <div
                      key={job.job_id}
                      onClick={() => setSelectedJobId(job.job_id)}
                      className={`mailing-recruiter-item ${isSelected ? 'selected' : ''}`}
                      style={isTest ? { background: isSelected ? '#eff6ff' : '#f8fafc', borderBottom: '2px solid #cbd5e1' } : {}}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong className="recruiter-item-company">{job.company}</strong>
                          {isTest && (
                            <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.64rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                              🧪 TEST
                            </span>
                          )}
                        </div>
                        {isSent ? (
                          <span className="status-pill-sent">✓ Sent</span>
                        ) : (
                          <span className="status-pill-ready">Draft</span>
                        )}
                      </div>

                      <div className="recruiter-item-title">{job.title}</div>

                      <div className="recruiter-item-contact">
                        <span>👤 {job.recruiter_name || 'Hiring Team'}</span>
                        <span style={{ color: '#166534', fontWeight: 600 }}>&bull; {job.recruiter_email}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>🌐 {job.source_website}</span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Fit: {job.match_score}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Pitch Composer */}
            {selectedJob ? (
              <div className="mailing-composer-pane">
                {/* Header Context Card */}
                <div className="composer-job-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 className="composer-job-title">{selectedJob.title}</h3>
                      <span className="portal-source-tag">{selectedJob.source_website}</span>
                      {selectedJob.job_id === TEST_RECRUITER_JOB.job_id && (
                        <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #fde68a' }}>
                          🧪 Workflow Self-Test Recruiter
                        </span>
                      )}
                      {activeJobIsSent && (
                        <span className="outreach-badge-sent">
                          <CheckIcon size={13} color="#059669" />
                          <span>Email Dispatched</span>
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <BuildingIcon size={14} color="var(--primary)" />
                        {selectedJob.company}
                      </span>
                      <span>&bull;</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <PinIcon size={13} color="var(--text-muted)" />
                        {selectedJob.location || 'India'}
                      </span>
                      {selectedJob.salary && (
                        <>
                          <span>&bull;</span>
                          <span style={{ color: '#059669', fontWeight: 600 }}>💰 {selectedJob.salary}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <a
                    href={selectedJob.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="composer-link-portal"
                    title="View original posting on external portal"
                  >
                    <span>View Portal Link</span>
                    <ExternalLinkIcon size={12} />
                  </a>
                </div>

                {/* Recruiter Details Strip */}
                <div className="composer-recruiter-bar">
                  <div>
                    <span style={{ fontWeight: 700, color: '#166534' }}>Recruiter:</span>{' '}
                    <strong>{selectedJob.recruiter_name || 'Hiring Team'}</strong> &bull;{' '}
                    <span style={{ color: '#166534', fontWeight: 700 }}>{selectedJob.recruiter_email}</span>
                    {selectedJob.recruiter_phone && (
                      <span style={{ marginLeft: '8px', color: '#166534' }}>📞 {selectedJob.recruiter_phone}</span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                    From: <strong>{SENDER_EMAIL}</strong>
                  </div>
                </div>

                {/* Resume Attachment Verification Badge */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    margin: '10px 0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📎</span>
                    <span>Attached Document:</span>
                    <strong>{resumeInfo.filename}</strong>
                    <span style={{ color: '#059669', fontWeight: 700 }}>✓ Attached automatically to this email</span>
                  </div>

                  <a
                    href={resumeInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Preview PDF ↗
                  </a>
                </div>

                {/* Mail Template Quick Selectors & Change Template Launcher */}
                <div className="template-selector-strip">
                  <div className="template-bar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        📧 Outreach Template:
                      </span>
                      <span style={{ fontSize: '0.74rem', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                        {activeTemplate.icon || '📄'} {activeTemplate.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn-manage-templates"
                      onClick={() => {
                        setEditingTemplateId(selectedTemplateId);
                        setModalTab('edit');
                        setIsTemplateModalOpen(true);
                      }}
                      title="Open Template Manager to customize or create templates"
                    >
                      <span>⚙️ Change / Edit Templates</span>
                    </button>
                  </div>

                  <div className="template-chips-row">
                    {templates.map((t) => {
                      const isSelected = t.id === selectedTemplateId;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`template-chip ${isSelected ? 'active' : ''}`}
                          onClick={() => handleSelectTemplate(t.id)}
                          title={t.description}
                        >
                          <span>{t.icon || '📄'}</span>
                          <span>{t.name}</span>
                          {t.badge && <span className="template-chip-pill">{t.badge}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject Line Input */}
                <div className="outreach-field-group">
                  <label className="outreach-label">Subject Line:</label>
                  <input
                    type="text"
                    className="outreach-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject..."
                  />
                </div>

                {/* Body Message Textarea */}
                <div className="outreach-field-group" style={{ flex: 1 }}>
                  <label className="outreach-label">Personalized Outreach Body:</label>
                  <textarea
                    rows={13}
                    className="outreach-textarea"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Draft your message here..."
                  />
                </div>

                {/* Feedback Alerts */}
                {sendSuccess && (
                  <div className="outreach-alert-success">
                    <CheckIcon size={16} color="#047857" />
                    <span>
                      <strong>Dispatched via Gmail!</strong> Successfully sent to {selectedJob.recruiter_email} from {SENDER_EMAIL} at {sentAt || 'now'} with attached resume ({resumeInfo.filename}).
                    </span>
                  </div>
                )}

                {sendError && (
                  <div className="outreach-alert-error">
                    <span>⚠️ {sendError}</span>
                  </div>
                )}

                {/* Bottom Action Toolbar */}
                <div className="composer-actions-bar">
                  <button
                    type="button"
                    className={`btn-send-gmail ${isSending ? 'sending' : ''} ${sendSuccess ? 'sent' : ''}`}
                    onClick={handleSendViaGmail}
                    disabled={isSending || !subject.trim() || !body.trim()}
                    id="composer-send-btn"
                  >
                    {isSending ? (
                      <>
                        <span className="spinner-dots" />
                        <span>Dispatching via Gmail...</span>
                      </>
                    ) : sendSuccess ? (
                      <>
                        <CheckIcon size={16} color="#ffffff" />
                        <span>Sent via Gmail (Resend)</span>
                      </>
                    ) : (
                      <>
                        <MailIcon size={16} color="#ffffff" />
                        <span>🚀 Send via Gmail</span>
                      </>
                    )}
                  </button>

                  {/* Open in Gmail Web App (Opens drafted mail in sender Gmail & logs to sheet) */}
                  {activeGmailComposeUrl && (
                    <a
                      href={activeGmailComposeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-open-gmail"
                      title={`Open prefilled draft in sender Gmail (${SENDER_EMAIL}) & record in tracking sheet`}
                      onClick={() => {
                        if (selectedJob) {
                          recordJobApplication({
                            company: selectedJob.company,
                            role: selectedJob.title,
                            applied_on: formatDate(new Date()),
                            follow_up_date: formatFutureDate(5),
                            status: 'Pending',
                            source: selectedJob.source_website || 'Direct Outreach',
                            salary_aed: selectedJob.salary || '',
                            applied_through: 'mail',
                            contact_email: selectedJob.recruiter_email || '',
                            notes: `Draft opened in Gmail composer with resume (${resumeInfo.filename})`,
                            job_id: selectedJob.job_id,
                          });
                        }
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="#EA4335"/>
                      </svg>
                      <span>Open in Gmail</span>
                      <ExternalLinkIcon size={12} />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="outreach-btn-subtle"
                    title="Save current custom draft to local storage"
                  >
                    💾 Save Draft
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPitch}
                    className="outreach-btn-subtle"
                    title="Copy formatted pitch to clipboard"
                  >
                    {copied ? '✓ Copied' : '📋 Copy Pitch'}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDraft}
                    className="outreach-btn-subtle"
                    title="Reset back to default template"
                  >
                    🔄 Reset Template
                  </button>

                  {mailtoFallback && (
                    <a
                      href={mailtoFallback}
                      className="btn-mailto-fallback"
                      title="Open in desktop mail client"
                    >
                      <span>Open Mail Client</span>
                      <ExternalLinkIcon size={13} />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="mailing-composer-pane" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Select a recruiter from the list on the left to start drafting.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DRAFTED PITCHES (Cards List) */}
        {activeTab === 'drafts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Pending Review ({unsentDrafts.length} Ready to Dispatch)
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                Review each candidate pitch before sending. Click &quot;Open in Hub&quot; to customize and send.
              </p>
            </div>

            {unsentDrafts.length === 0 ? (
              <div className="empty-state-card">
                <CheckIcon size={32} color="var(--success)" />
                <h4 className="empty-state-title" style={{ marginTop: '12px' }}>All Recruiter Pitches Dispatched!</h4>
                <p className="empty-state-desc">You have sent personalized cold outreach emails to all discovered recruiter contacts.</p>
                <button
                  type="button"
                  className="empty-state-btn"
                  onClick={() => setActiveTab('sent')}
                >
                  View Sent History
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
                {unsentDrafts.map((job) => {
                  const previewDraft = generatePitch(job, selectedTemplateId);
                  const isTest = job.job_id === TEST_RECRUITER_JOB.job_id;

                  return (
                    <div key={job.job_id} className="draft-card" style={isTest ? { border: '1px solid #fde68a', background: '#fffdf5' } : {}}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                              {job.title}
                            </h4>
                          </div>
                          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                            {job.company} &bull; {job.location}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {isTest && (
                            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>
                              🧪 TEST TARGET
                            </span>
                          )}
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '12px' }}>
                            {job.match_score}% Fit
                          </span>
                        </div>
                      </div>

                      <div className="draft-recipient-strip">
                        <span>👤 Recruiter: <strong>{job.recruiter_name || 'Hiring Team'}</strong></span>
                        <span style={{ color: '#166534', fontWeight: 600 }}>&bull; {job.recruiter_email}</span>
                      </div>

                      <div style={{ fontSize: '0.76rem', color: '#166534', marginBottom: '6px', fontWeight: 600 }}>
                        📎 Attached: {resumeInfo.filename}
                      </div>

                      <div className="draft-subject-preview">
                        <strong>Subject:</strong> {previewDraft.subject}
                      </div>

                      <div className="draft-body-preview">
                        {previewDraft.body.slice(0, 160)}...
                      </div>

                      <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-apply-primary"
                          style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                          onClick={() => {
                            setSelectedJobId(job.job_id);
                            setActiveTab('hub');
                          }}
                        >
                          <span>Review &amp; Edit</span>
                        </button>

                        {job.recruiter_email && (
                          <a
                            href={getGmailComposeUrl(job.recruiter_email, previewDraft.subject, previewDraft.body)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-open-gmail"
                            style={{ padding: '7px 12px', fontSize: '0.78rem' }}
                            title={`Open this pitch in sender Gmail (${SENDER_EMAIL})`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="#EA4335"/>
                            </svg>
                            <span>Open in Gmail ↗</span>
                          </a>
                        )}

                        <button
                          type="button"
                          className="btn-outreach-toggle"
                          style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                          onClick={() => {
                            setSelectedJobId(job.job_id);
                            setActiveTab('hub');
                          }}
                        >
                          <span>Open in Hub ↗</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SENT MAILS ARCHIVE */}
        {activeTab === 'sent' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Dispatched Cold Outreach ({sentRecords.length} Emails)
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                  Permanent log of all cold pitches dispatched directly via Gmail and recorded in n8n.
                </p>
              </div>

              {sentRecords.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSentHistory}
                  className="outreach-btn-subtle"
                  style={{ color: '#b91c1c' }}
                >
                  Clear History
                </button>
              )}
            </div>

            {sentRecords.length === 0 ? (
              <div className="empty-state-card">
                <MailIcon size={32} color="var(--primary)" />
                <h4 className="empty-state-title" style={{ marginTop: '12px' }}>No Sent Emails Yet</h4>
                <p className="empty-state-desc">You haven&apos;t sent any cold outreach pitches yet. Select the Test Recruiter from the Draft Hub to send your first verification email.</p>
                <button
                  type="button"
                  className="empty-state-btn"
                  onClick={() => {
                    setSelectedJobId(TEST_RECRUITER_JOB.job_id);
                    setActiveTab('hub');
                  }}
                >
                  🧪 Test with Self-Test Recruiter
                </button>
              </div>
            ) : (
              <div className="sent-table-container">
                <table className="sent-table">
                  <thead>
                    <tr>
                      <th>Recipient &amp; Company</th>
                      <th>Job Position</th>
                      <th>Subject Line</th>
                      <th>Sent At</th>
                      <th>Resume Attached</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentRecords.map((rec) => (
                      <tr key={rec.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rec.recruiter_name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>{rec.to}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.company}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{rec.job_title}</div>
                        </td>
                        <td>
                          <div style={{ maxWidth: '260px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {rec.subject}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rec.sent_at}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.76rem', color: '#166534', fontWeight: 600 }}>
                            📎 {resumeInfo.filename}
                          </span>
                        </td>
                        <td>
                          <span className="outreach-badge-sent">
                            <CheckIcon size={12} color="#059669" />
                            <span>Sent via Gmail</span>
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="outreach-btn-subtle"
                            onClick={() => setPreviewSentRecord(rec)}
                          >
                            View Pitch
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: View Sent Email Content */}
        {previewSentRecord && (
          <div className="sent-modal-backdrop" onClick={() => setPreviewSentRecord(null)}>
            <div className="sent-modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Sent Pitch to {previewSentRecord.recruiter_name}
                </h4>
                <button
                  type="button"
                  onClick={() => setPreviewSentRecord(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>

              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                <div><strong>To:</strong> {previewSentRecord.to} ({previewSentRecord.company})</div>
                <div><strong>Subject:</strong> {previewSentRecord.subject}</div>
                <div><strong>Dispatched:</strong> {previewSentRecord.sent_at} (from {SENDER_EMAIL})</div>
                <div><strong>Attachment:</strong> 📎 {resumeInfo.filename}</div>
              </div>

              <pre style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                maxHeight: '380px',
                overflowY: 'auto'
              }}>
                {previewSentRecord.body}
              </pre>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={getGmailComposeUrl(previewSentRecord.to, `Re: ${previewSentRecord.subject}`, `\n\n--- Dispatched from ${SENDER_EMAIL} on ${previewSentRecord.sent_at} ---\n${previewSentRecord.body}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-open-gmail"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  title={`Open follow-up thread in sender Gmail (${SENDER_EMAIL})`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="#EA4335"/>
                  </svg>
                  <span>Follow Up in Gmail ↗</span>
                </a>
                <button
                  type="button"
                  className="outreach-btn-subtle"
                  onClick={() => {
                    navigator.clipboard.writeText(previewSentRecord.body);
                    alert('Copied message to clipboard!');
                  }}
                >
                  Copy Message
                </button>
                <button
                  type="button"
                  className="btn-apply-primary"
                  onClick={() => setPreviewSentRecord(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal: Mail Template Manager */}
        {isTemplateModalOpen && (
          <div className="template-modal-backdrop" onClick={() => setIsTemplateModalOpen(false)}>
            <div className="template-modal-window" onClick={(e) => e.stopPropagation()}>
              <div className="template-modal-header">
                <div>
                  <h3 className="template-modal-title">
                    <span>🎨 Mail Template Manager</span>
                  </h3>
                  <p className="template-modal-subtitle">
                    Customize your cold outreach templates with dynamic placeholders and preview them live.
                  </p>
                </div>
                <button
                  type="button"
                  className="template-modal-close"
                  onClick={() => setIsTemplateModalOpen(false)}
                  title="Close modal"
                >
                  &times;
                </button>
              </div>

              <div className="template-modal-body">
                {/* Left: Template List Sidebar */}
                <div className="template-modal-sidebar">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Templates ({templates.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleResetAllDefaults}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                      title="Reset all templates to initial built-in defaults"
                    >
                      Restore Defaults
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-new-template"
                    onClick={handleCreateNewTemplate}
                  >
                    <span>➕ New Custom Template</span>
                  </button>

                  <div className="template-list">
                    {templates.map((t) => {
                      const isSelected = t.id === editingTemplateId;
                      const isActive = t.id === selectedTemplateId;
                      return (
                        <div
                          key={t.id}
                          className={`template-item-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setEditingTemplateId(t.id);
                          }}
                        >
                          <div className="template-item-top">
                            <div className="template-item-name">
                              <span>{t.icon || '📄'}</span>
                              <span>{t.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {isActive && <span className="template-item-badge badge-active">Active</span>}
                              {t.isBuiltIn ? (
                                <span className="template-item-badge badge-builtin">Built-in</span>
                              ) : (
                                <span className="template-item-badge badge-custom">Custom</span>
                              )}
                            </div>
                          </div>
                          {t.description && <div className="template-item-desc">{t.description}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Template Editor & Live Preview */}
                <div className="template-modal-main">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div className="template-mode-switch">
                      <button
                        type="button"
                        className={`template-mode-btn ${modalTab === 'edit' ? 'active' : ''}`}
                        onClick={() => setModalTab('edit')}
                      >
                        ✏️ Edit Template
                      </button>
                      <button
                        type="button"
                        className={`template-mode-btn ${modalTab === 'preview' ? 'active' : ''}`}
                        onClick={() => setModalTab('preview')}
                      >
                        👁️ Live Preview ({selectedJob.company})
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {editingTemplate?.isBuiltIn ? (
                        <button
                          type="button"
                          className="btn-template-reset-single"
                          onClick={() => handleResetSingleTemplate(editingTemplateId)}
                          title="Reset this built-in template to its factory default content"
                        >
                          🔄 Reset to Default
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-template-delete"
                          onClick={() => handleDeleteTemplate(editingTemplateId)}
                          title="Delete this custom template"
                        >
                          🗑️ Delete Template
                        </button>
                      )}
                    </div>
                  </div>

                  {modalTab === 'edit' ? (
                    <>
                      {/* Template Metadata Fields */}
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                        <div className="outreach-field-group" style={{ margin: 0 }}>
                          <label className="outreach-label">Template Name:</label>
                          <input
                            type="text"
                            className="outreach-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. SRE & Cloud Architect"
                          />
                        </div>
                        <div className="outreach-field-group" style={{ margin: 0 }}>
                          <label className="outreach-label">Badge / Pill:</label>
                          <input
                            type="text"
                            className="outreach-input"
                            value={editBadge}
                            onChange={(e) => setEditBadge(e.target.value)}
                            placeholder="e.g. 30s Read"
                          />
                        </div>
                      </div>

                      <div className="outreach-field-group" style={{ margin: 0 }}>
                        <label className="outreach-label">Description / Angle:</label>
                        <input
                          type="text"
                          className="outreach-input"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Brief note about when to use this outreach template"
                        />
                      </div>

                      {/* Clickable Variable Tags Palette */}
                      <div className="template-vars-container">
                        <div className="template-vars-header">
                          <span className="template-vars-title">Click to Insert Dynamic Placeholders:</span>
                          <span className="template-vars-help">Inserts into {activeInputTarget === 'subject' ? 'Subject' : 'Body'}</span>
                        </div>
                        <div className="template-var-chips">
                          {AVAILABLE_PLACEHOLDERS.map((v) => (
                            <button
                              key={v.key}
                              type="button"
                              className="template-var-tag"
                              onClick={() => handleInsertVariable(v.token)}
                              title={`${v.description} (e.g. ${v.example})`}
                            >
                              <span>{v.token}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Subject Line Template */}
                      <div className="outreach-field-group" style={{ margin: 0 }}>
                        <label className="outreach-label">Subject Line Template:</label>
                        <input
                          ref={subjectInputRef}
                          type="text"
                          className="outreach-input"
                          value={editSubject}
                          onFocus={() => setActiveInputTarget('subject')}
                          onChange={(e) => setEditSubject(e.target.value)}
                          placeholder="Application for {job_title} - {sender_name}"
                        />
                      </div>

                      {/* Body Message Template */}
                      <div className="outreach-field-group" style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <label className="outreach-label">Email Body Template:</label>
                        <textarea
                          ref={bodyTextareaRef}
                          rows={11}
                          className="outreach-textarea"
                          value={editBody}
                          onFocus={() => setActiveInputTarget('body')}
                          onChange={(e) => setEditBody(e.target.value)}
                          placeholder="Write your email template using {placeholders}..."
                          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', flex: 1 }}
                        />
                      </div>
                    </>
                  ) : (
                    /* Live Preview with currently selected job */
                    <div className="template-live-preview">
                      <div className="template-preview-header">
                        <div><strong>Target Company:</strong> {selectedJob.company}</div>
                        <div><strong>Position:</strong> {selectedJob.title}</div>
                        <div><strong>Recipient:</strong> {selectedJob.recruiter_name || 'Hiring Team'} ({selectedJob.recruiter_email})</div>
                        <div><strong>Attachment:</strong> 📎 {resumeInfo.filename}</div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Rendered Subject:</span>
                        <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', fontWeight: 700, marginTop: '4px', fontSize: '0.88rem' }}>
                          {modalRenderedPreview.subject}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Rendered Email Body:</span>
                        <div className="template-preview-body" style={{ marginTop: '4px' }}>
                          {modalRenderedPreview.body}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="template-modal-footer">
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Changes are saved to browser local storage.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="outreach-btn-subtle"
                    onClick={() => setIsTemplateModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-template-save"
                    onClick={handleSaveTemplateChanges}
                  >
                    💾 Save Changes
                  </button>
                  <button
                    type="button"
                    className="btn-template-apply"
                    onClick={handleApplyTemplateToDraft}
                  >
                    🚀 Apply to Current Draft &amp; Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
