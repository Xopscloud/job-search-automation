import { JobApplicationRecord, ApplicationStatus } from '../types';

export const TRACKER_STORAGE_KEY = 'devopspulse_applied_jobs';

/**
 * Historical applications seeded directly from the user's Google Sheet tracking sheet.
 */
export const SEED_APPLICATIONS: JobApplicationRecord[] = [
  {
    id: 'app_seed_1',
    index: 1,
    company: 'Litmus7',
    role: 'Devops Engineer',
    applied_on: 'Sep 1, 2026',
    follow_up_date: 'Sep 6, 2026',
    status: 'Pending',
    source: 'Indeed',
    salary_aed: '',
    applied_through: 'mail',
    contact_email: 'careers@litmus7.com',
    follow_up_done: false,
    notes: 'Through mail',
    created_at: '2026-09-01T09:00:00Z',
  },
  {
    id: 'app_seed_2',
    index: 2,
    company: 'UROLIME',
    role: 'Devops Engineer',
    applied_on: 'Aug 27, 2026',
    follow_up_date: 'Sep 2, 2026',
    status: 'Rejected',
    source: 'infopark website',
    salary_aed: '',
    applied_through: 'mail',
    contact_email: 'hr@urolime.com',
    follow_up_done: true,
    notes: '',
    created_at: '2026-08-27T10:30:00Z',
  },
  {
    id: 'app_seed_3',
    index: 3,
    company: 'Enfin Technologies',
    role: 'Devops Engineer',
    applied_on: 'Sep 1, 2026',
    follow_up_date: 'Sep 6, 2026',
    status: 'Pending',
    source: 'Technopark',
    salary_aed: '',
    applied_through: 'mail',
    contact_email: 'jobs@enfintechnologies.com',
    follow_up_done: false,
    notes: '',
    created_at: '2026-09-01T11:15:00Z',
  },
  {
    id: 'app_seed_4',
    index: 4,
    company: 'Seqato',
    role: 'Devops Engineer',
    applied_on: 'Sep 2, 2026',
    follow_up_date: 'Sep 7, 2026',
    status: 'Pending',
    source: 'Technopark',
    salary_aed: '',
    applied_through: 'mail',
    contact_email: 'talent@seqato.com',
    follow_up_done: false,
    notes: '',
    created_at: '2026-09-02T08:45:00Z',
  },
  {
    id: 'app_seed_5',
    index: 5,
    company: 'reizend.ai',
    role: 'Devops Engineer',
    applied_on: 'Sep 2, 2026',
    follow_up_date: 'Sep 7, 2026',
    status: 'Pending',
    source: 'Technopark',
    salary_aed: '',
    applied_through: 'mail',
    contact_email: 'recruiting@reizend.ai',
    follow_up_done: false,
    notes: '',
    created_at: '2026-09-02T13:20:00Z',
  },
  {
    id: 'app_seed_6',
    index: 6,
    company: 'IGDS Technologie',
    role: 'Devops Engineer',
    applied_on: 'Sep 2, 2026',
    follow_up_date: 'Sep 7, 2026',
    status: 'Pending',
    source: 'naukri',
    salary_aed: '',
    applied_through: 'mail,site',
    contact_email: 'careers@igdstechnologie.com',
    follow_up_done: false,
    notes: '',
    created_at: '2026-09-02T14:10:00Z',
  },
  {
    id: 'app_seed_7',
    index: 7,
    company: 'Nestsoft TechnoMaster',
    role: 'Devops Engineer',
    applied_on: 'Sep 3, 2026',
    follow_up_date: 'Sep 8, 2026',
    status: 'Pending',
    source: 'infopark website',
    salary_aed: '',
    applied_through: 'mail',
    contact_email: 'hiring@nestsoft.com',
    follow_up_done: false,
    notes: '',
    created_at: '2026-09-03T09:30:00Z',
  },
  {
    id: 'app_seed_8',
    index: 8,
    company: 'MADARIZ IMPEX',
    role: 'Devops Engineer',
    applied_on: 'Sep 4, 2026',
    follow_up_date: 'Sep 9, 2026',
    status: 'Pending',
    source: 'Indeed',
    salary_aed: '',
    applied_through: 'Indeed',
    contact_email: 'jobs@madarizimpex.com',
    follow_up_done: false,
    notes: '',
    created_at: '2026-09-04T10:00:00Z',
  },
  {
    id: 'app_seed_9',
    index: 9,
    company: 'VGreenTek',
    role: 'Devops Engineer',
    applied_on: 'Sep 4, 2026',
    follow_up_date: 'Sep 9, 2026',
    status: 'Pending',
    source: 'Indeed',
    salary_aed: '',
    applied_through: 'Indeed',
    contact_email: 'talent@vgreentek.com',
    follow_up_done: false,
    notes: '',
    created_at: '2026-09-04T11:40:00Z',
  },
  {
    id: 'app_seed_10',
    index: 10,
    company: 'Adfolks',
    role: 'Devops Engineer',
    applied_on: 'Sep 4, 2026',
    follow_up_date: 'Sep 9, 2026',
    status: 'Pending',
    source: 'Indeed',
    salary_aed: '',
    applied_through: 'Indeed',
    contact_email: 'careers@adfolks.com',
    follow_up_done: false,
    notes: '',
    created_at: '2026-09-04T12:00:00Z',
  },
];

export function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatFutureDate(daysAhead = 5): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return formatDate(d);
}

/**
 * Load all tracked job applications from localStorage.
 */
export function loadApplicationsFromStorage(): JobApplicationRecord[] {
  if (typeof window === 'undefined') return SEED_APPLICATIONS;
  try {
    const raw = localStorage.getItem(TRACKER_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(SEED_APPLICATIONS));
      return SEED_APPLICATIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_APPLICATIONS;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load tracked applications from storage:', err);
    return SEED_APPLICATIONS;
  }
}

/**
 * Save applications list to localStorage.
 */
export function saveApplicationsToStorage(records: JobApplicationRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save tracked applications to storage:', err);
  }
}

/**
 * Record a job application. If the company + role already exists, updates it.
 * Otherwise creates a new entry at the top.
 */
export function recordJobApplication(data: {
  company: string;
  role: string;
  status?: ApplicationStatus;
  source?: string;
  salary_aed?: string;
  applied_through?: string;
  contact_email?: string;
  notes?: string;
  job_id?: string;
  applied_on?: string;
  follow_up_date?: string;
}): JobApplicationRecord {
  const existing = loadApplicationsFromStorage();
  const normalizedCompany = data.company.trim().toLowerCase();
  const normalizedRole = data.role.trim().toLowerCase();

  const foundIndex = existing.findIndex(
    (app) =>
      (data.job_id && app.job_id === data.job_id) ||
      (app.company.trim().toLowerCase() === normalizedCompany &&
        app.role.trim().toLowerCase() === normalizedRole)
  );

  const todayStr = data.applied_on || formatDate(new Date());
  const followUpStr = data.follow_up_date || formatFutureDate(5);

  if (foundIndex !== -1) {
    // Update existing record
    const updatedRecord: JobApplicationRecord = {
      ...existing[foundIndex],
      applied_on: todayStr,
      follow_up_date: followUpStr,
      status: data.status || 'Pending',
      source: data.source || existing[foundIndex].source,
      applied_through: data.applied_through || existing[foundIndex].applied_through,
      contact_email: data.contact_email || existing[foundIndex].contact_email,
      notes: data.notes || existing[foundIndex].notes,
      updated_at: new Date().toISOString(),
    };
    // Also sync to server API asynchronously
    if (typeof window !== 'undefined') {
      fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord),
      }).catch(() => {});
    }

    return updatedRecord;
  }

  // Insert new record at beginning
  const newRecord: JobApplicationRecord = {
    id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    index: existing.length + 1,
    company: data.company.trim(),
    role: data.role.trim(),
    applied_on: todayStr,
    follow_up_date: followUpStr,
    status: data.status || 'Pending',
    source: data.source || 'Direct Outreach',
    salary_aed: data.salary_aed || '',
    applied_through: data.applied_through || 'mail',
    contact_email: data.contact_email || '',
    follow_up_done: false,
    notes: data.notes || '',
    job_id: data.job_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const nextList = [newRecord, ...existing];
  saveApplicationsToStorage(nextList);
  notifyTrackerChange();

  // Also sync to server API asynchronously
  if (typeof window !== 'undefined') {
    fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    }).catch(() => {});
  }

  return newRecord;
}

/**
 * Normalizes company strings by stripping common legal entities, punctuation and whitespace.
 */
export function cleanCompanyName(company: string): string {
  return (company || '')
    .toLowerCase()
    .replace(/\b(private|pvt|ltd|limited|llp|inc|incorporated|corp|corporation|technologies|tech|solutions|services|group|india)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Normalizes role strings by removing punctuation and whitespace.
 */
export function cleanRoleName(role: string): string {
  return (role || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Checks if a given job matches an existing application record in storage.
 */
export function isJobApplied(
  job: { job_id?: string; company?: string; title?: string; role?: string },
  applications?: JobApplicationRecord[]
): { applied: boolean; record?: JobApplicationRecord } {
  const list = applications || loadApplicationsFromStorage();
  if (!list || list.length === 0) return { applied: false };

  const targetJobId = (job.job_id || '').trim();
  const rawCompany = (job.company || '').trim();
  const rawTitle = (job.title || job.role || '').trim();

  const normCompany = cleanCompanyName(rawCompany);
  const normTitle = cleanRoleName(rawTitle);

  const found = list.find((app) => {
    // 1. Direct Job ID Match
    if (targetJobId && app.job_id && app.job_id === targetJobId) {
      return true;
    }

    // 2. Company Match
    const appNormCompany = cleanCompanyName(app.company);
    if (!appNormCompany || !normCompany) return false;

    const companyMatches =
      appNormCompany === normCompany ||
      appNormCompany.includes(normCompany) ||
      normCompany.includes(appNormCompany);

    if (!companyMatches) return false;

    // 3. Role / Title Match
    const appNormRole = cleanRoleName(app.role);
    if (!appNormRole && !normTitle) return true;

    // Direct role equality or containment
    if (
      appNormRole === normTitle ||
      appNormRole.includes(normTitle) ||
      normTitle.includes(appNormRole)
    ) {
      return true;
    }

    // Both are DevOps/SRE/Cloud roles at the same company
    const isBothDevOps =
      (appNormRole.includes('devops') || appNormRole.includes('sre') || appNormRole.includes('cloud')) &&
      (normTitle.includes('devops') || normTitle.includes('sre') || normTitle.includes('cloud'));

    return isBothDevOps;
  });

  return { applied: Boolean(found), record: found };
}

/**
 * Toggles applied status for a job.
 * If already applied, unmarks it. If not applied, records it as Applied.
 */
export function toggleJobApplication(
  job: {
    job_id: string;
    company: string;
    title: string;
    source_website?: string;
    salary?: string;
    recruiter_email?: string | null;
  }
): { applied: boolean; record?: JobApplicationRecord } {
  const existing = loadApplicationsFromStorage();
  const { applied, record } = isJobApplied(job, existing);

  if (applied && record) {
    // Remove record from tracking storage
    const nextList = existing.filter((r) => r.id !== record.id);
    saveApplicationsToStorage(nextList);
    notifyTrackerChange();
    return { applied: false };
  } else {
    // Mark as applied
    const newRecord = recordJobApplication({
      company: job.company,
      role: job.title,
      applied_on: formatDate(new Date()),
      follow_up_date: formatFutureDate(5),
      status: 'Applied',
      source: job.source_website || 'Direct',
      salary_aed: job.salary || '',
      applied_through: 'site',
      contact_email: job.recruiter_email || '',
      notes: 'Marked as applied from job card',
      job_id: job.job_id,
    });
    return { applied: true, record: newRecord };
  }
}

function notifyTrackerChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('devopspulse_tracker_updated'));
  }
}

/**
 * Export applications to CSV matching Google Sheets columns.
 */
export function exportApplicationsToCSV(records: JobApplicationRecord[]): void {
  const headers = [
    '#',
    'Company',
    'Role / Position',
    'Applied On',
    'Follow-up Date',
    'Status',
    'Source',
    'Salary (AED)',
    'Applied through',
    'Contact Email',
    'Follow-up Done?',
    'Notes',
  ];

  const rows = records.map((rec, idx) => [
    rec.index || idx + 1,
    escapeCSV(rec.company),
    escapeCSV(rec.role),
    escapeCSV(rec.applied_on),
    escapeCSV(rec.follow_up_date || ''),
    escapeCSV(rec.status),
    escapeCSV(rec.source),
    escapeCSV(rec.salary_aed || ''),
    escapeCSV(rec.applied_through),
    escapeCSV(rec.contact_email || ''),
    rec.follow_up_done ? 'Yes' : 'No',
    escapeCSV(rec.notes || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Job_Application_Tracker_${formatDate(new Date()).replace(/[\s,]+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeCSV(val: string | number): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
