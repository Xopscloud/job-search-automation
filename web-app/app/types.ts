export interface EmailDraft {
  subject: string;
  body: string;
  status: 'drafted' | 'sending' | 'sent' | 'failed';
  sent_at?: string;
  error?: string;
}

export interface SentEmailRecord {
  id: string;
  job_id: string;
  to: string;
  recruiter_name: string;
  company: string;
  job_title: string;
  subject: string;
  body: string;
  sent_at: string;
  timestamp: string;
  source_website?: string;
}

export type ApplicationStatus = 'Pending' | 'Applied' | 'Interviewing' | 'Offered' | 'Rejected';

export interface JobApplicationRecord {
  id: string;
  index?: number;
  company: string;
  role: string;
  applied_on: string;
  follow_up_date?: string;
  status: ApplicationStatus;
  source: string;
  salary_aed?: string;
  applied_through: string;
  contact_email?: string;
  follow_up_done: boolean;
  notes?: string;
  job_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobPost {
  job_id: string;
  title: string;
  company: string;
  company_details?: string;
  description?: string;
  location: string;
  required_skills: string[];
  experience: string;
  salary?: string;
  date_posted: string;
  job_url: string;
  apply_method: string;
  recruiter_name?: string | null;
  recruiter_email?: string | null;
  recruiter_phone?: string | null;
  source_website: string;
  match_score: number;
  match_summary: string;
  status: 'New' | 'Applied' | 'Interviewing' | 'Rejected' | 'Saved';
  email_draft?: EmailDraft;
}

export type StageId =
  | 'trigger'
  | 'scraping'
  | 'dedup'
  | 'ai_scoring'
  | 'ranking'
  | 'sheet_sync'
  | 'email_dispatch';

export interface WorkflowStage {
  id: StageId;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metric?: string;
  details?: string;
}

export interface WorkflowLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  source: string;
}

export interface WorkflowConfig {
  search_term: string;
  location: string;
  candidate_skills: string;
  candidate_experience_years: number;
  min_alert_score: number;
  results_per_site: number;
  recipient_email: string;
  webhook_url: string;
  sources: string[];
}

export interface WorkflowTriggerResponse {
  success: boolean;
  message: string;
  execution_id?: string;
  total_found: number;
  high_matches_count: number;
  jobs: JobPost[];
  logs?: WorkflowLog[];
  n8n_triggered?: boolean;
  n8n_status?: number;
  n8n_error?: string;
}
