import { JobPost } from '../types';

export interface EmailTemplate {
  id: string;
  name: string;
  badge: string;
  icon?: string;
  description: string;
  subject: string;
  body: string;
  isBuiltIn?: boolean;
  isDefault?: boolean;
}

export interface PlaceholderVariable {
  key: string;
  token: string;
  label: string;
  description: string;
  example: string;
}

export const AVAILABLE_PLACEHOLDERS: PlaceholderVariable[] = [
  {
    key: 'recruiter_greeting',
    token: '{recruiter_greeting}',
    label: 'Recruiter Greeting',
    description: 'Formatted greeting (Dear Recruiter Name, or Dear Hiring Team,)',
    example: 'Dear Johnson Thomas,',
  },
  {
    key: 'recruiter_name',
    token: '{recruiter_name}',
    label: 'Recruiter Name',
    description: 'Recruiter name or Hiring Team',
    example: 'Johnson Thomas',
  },
  {
    key: 'company',
    token: '{company}',
    label: 'Company Name',
    description: 'Target hiring company name',
    example: 'DevOps Pulse Cloud Team',
  },
  {
    key: 'job_title',
    token: '{job_title}',
    label: 'Job Title',
    description: 'Clean job title from posting',
    example: 'Senior DevOps Engineer',
  },
  {
    key: 'skills',
    token: '{skills}',
    label: 'Required Skills',
    description: 'Matched key technical skills',
    example: 'AWS, Kubernetes, Terraform, Docker',
  },
  {
    key: 'location',
    token: '{location}',
    label: 'Job Location',
    description: 'Job location or Remote',
    example: 'Remote / India',
  },
  {
    key: 'salary',
    token: '{salary}',
    label: 'Salary Range',
    description: 'Compensation details if present',
    example: 'Market Standard',
  },
  {
    key: 'resume_filename',
    token: '{resume_filename}',
    label: 'Resume Filename',
    description: 'Attached CV file name',
    example: 'Johnson_Thomas_DevOps_Resume.pdf',
  },
  {
    key: 'sender_name',
    token: '{sender_name}',
    label: 'Candidate Name',
    description: 'Your full candidate name',
    example: 'Johnson Thomas',
  },
  {
    key: 'sender_title',
    token: '{sender_title}',
    label: 'Candidate Title',
    description: 'Your professional title',
    example: 'DevOps & Site Reliability Engineer',
  },
  {
    key: 'sender_email',
    token: '{sender_email}',
    label: 'Sender Email',
    description: 'Your connected sender email address',
    example: 'johnsonthomas.devops@gmail.com',
  },
  {
    key: 'sender_phone',
    token: '{sender_phone}',
    label: 'Candidate Phone',
    description: 'Your contact phone number',
    example: '+91 94970 65992',
  },
];

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'full',
    name: 'Full-Stack DevOps',
    badge: 'Comprehensive',
    icon: '🌟',
    description: 'General high-impact pitch showcasing CI/CD, Kubernetes, Terraform, and cloud reliability.',
    isBuiltIn: true,
    isDefault: true,
    subject: 'Application for {job_title} - {sender_name}',
    body: `{recruiter_greeting}

I hope this email finds you well.

I am writing to express my strong interest in the {job_title} opening at {company}. With 3+ years of hands-on experience as a DevOps & Cloud Engineer, my background specializing in {skills} aligns directly with your engineering requirements.

Key highlights of my background include:
• Designing and maintaining automated CI/CD pipelines that accelerate deployment frequency and eliminate release friction.
• Managing containerized microservices on Kubernetes (EKS/GKE) and Docker with Infrastructure-as-Code via Terraform.
• Optimizing cloud system reliability, proactive telemetry monitoring, and DevSecOps best practices.

I have attached my resume ({resume_filename}) for your review.

Given {company}'s engineering roadmap, I am confident I can make an immediate positive impact on your delivery velocity and infrastructure stability.

I would welcome the opportunity for a brief conversation to discuss how my expertise aligns with your team's goals.

Thank you very much for your time and consideration.

Sincerely,
{sender_name}
{sender_title}
Phone: {sender_phone}
Email: {sender_email}`,
  },
  {
    id: 'sre',
    name: 'SRE & Reliability',
    badge: 'Uptime & Scale',
    icon: '⚡',
    description: 'Tailored for Site Reliability Engineering, distributed observability, MTTR, and SLOs.',
    isBuiltIn: true,
    subject: 'Application for {job_title} - {sender_name}',
    body: `{recruiter_greeting}

I hope this email finds you well.

I am writing to express my strong interest in the {job_title} position at {company}. Having followed {company}'s engineering initiatives, I am eager to contribute to your team's system resilience and infrastructure scaling.

With 3+ years of hands-on experience specializing in Site Reliability Engineering, distributed observability (Prometheus, Grafana), and container orchestration (Kubernetes & Docker), my focus centers on minimizing MTTR, eliminating operational toil, and automating reliable infrastructure.

Key contributions from my recent engagements include:
• Architecting resilient Kubernetes clusters on AWS/GCP with automated horizontal scaling and multi-zone failover.
• Establishing SLO/SLI telemetry metrics and proactive alerting, significantly reducing production incident recurrence.
• Hardening CI/CD pipelines with automated rollback gates and Infrastructure as Code via Terraform.

I have attached my comprehensive DevOps resume ({resume_filename}) for your review.

I would welcome the opportunity for a brief conversation to discuss how my reliability-first approach can support {company}'s infrastructure velocity.

Thank you very much for your time and consideration.

Sincerely,
{sender_name}
Site Reliability Engineer
Phone: {sender_phone}
Email: {sender_email}`,
  },
  {
    id: 'devsecops',
    name: 'DevSecOps Automation',
    badge: 'Security & IaC',
    icon: '🔒',
    description: 'Emphasizes shift-left security, container vulnerability scanning, and IAM compliance.',
    isBuiltIn: true,
    subject: 'Application for {job_title} - {sender_name}',
    body: `{recruiter_greeting}

I hope you are having a productive week.

I am reaching out regarding the {job_title} role at {company}. With enterprise applications requiring security integrated directly from commit to production, my hands-on background in DevSecOps automation, vulnerability scanning, and secure cloud infrastructure ({skills}) matches your team's objectives.

Throughout my 3+ years in DevOps & Cloud Engineering, I have:
• Implemented automated container vulnerability scanning and policy enforcement within CI/CD release cycles.
• Built and governed Terraform IaC with strict least-privilege IAM policies and compliance guardrails.
• Optimized Kubernetes cluster security, secrets management, and ingress controls across cloud environments.

I have attached my resume ({resume_filename}) detailing my cloud security and pipeline automation projects.

I would appreciate the chance to connect for a quick conversation to discuss how I can contribute to {company}'s security posture and release efficiency.

Sincerely,
{sender_name}
DevSecOps & Cloud Engineer
Phone: {sender_phone}
Email: {sender_email}`,
  },
  {
    id: 'quick',
    name: 'Short & Punchy',
    badge: '30s Quick Read',
    icon: '👋',
    description: 'Concise, high-conversion cold pitch for busy recruiters and hiring managers.',
    isBuiltIn: true,
    subject: 'Regarding the {job_title} Role - {sender_name}',
    body: `{recruiter_greeting}

I noticed the {job_title} opening at {company} and wanted to reach out directly.

I bring 3+ years of production DevOps and Cloud experience specializing in {skills}. In my recent roles, I have automated end-to-end CI/CD pipelines, managed Kubernetes clusters at scale, and provisioned multi-cloud infrastructure with Terraform.

I have attached my resume ({resume_filename}) for your review.

I would welcome a brief 5-minute conversation to see if my background matches your team's immediate milestones.

Thank you for your time!

Sincerely,
{sender_name}
DevOps & Cloud Engineer
Phone: {sender_phone}
Email: {sender_email}`,
  },
  {
    id: 'referral',
    name: 'Referral & Networking',
    badge: 'Warm Connect',
    icon: '🤝',
    description: 'Collaborative networking pitch connecting with hiring managers or engineering leads.',
    isBuiltIn: true,
    subject: 'Exploring {job_title} opportunities at {company} - {sender_name}',
    body: `{recruiter_greeting}

I hope you're having a great week!

I came across your profile while exploring engineering opportunities at {company}. I have been deeply impressed by {company}'s tech footprint and wanted to introduce myself.

I am a DevOps & Cloud Engineer with 3+ years of experience building resilient cloud systems with {skills}. I noticed the {job_title} role on your engineering roster and believe my hands-on background in scalable infrastructure could be an excellent fit.

I have attached my resume ({resume_filename}) for quick reference.

If you have a quick 10 minutes sometime this week, I'd love to connect and learn more about {company}'s upcoming infrastructure initiatives.

Best regards,
{sender_name}
Phone: {sender_phone}
Email: {sender_email}`,
  },
  {
    id: 'followup',
    name: 'Application Follow-Up',
    badge: 'Gentle Check-in',
    icon: '🔄',
    description: 'Polite, professional follow-up on a previously dispatched application or cold note.',
    isBuiltIn: true,
    subject: 'Following up on {job_title} application - {sender_name}',
    body: `{recruiter_greeting}

I hope all is well with you.

I wanted to quickly follow up on my recent application for the {job_title} role at {company}.

I remain very excited about the possibility of contributing to {company}'s cloud architecture and DevOps velocity using my hands-on expertise in {skills}. 

For your convenience, I have re-attached my updated resume ({resume_filename}).

Please feel free to let me know if there are any questions or additional details I can provide. Looking forward to hearing from you!

Sincerely,
{sender_name}
DevOps Engineer
Phone: {sender_phone}
Email: {sender_email}`,
  },
];

export const TEMPLATES_STORAGE_KEY = 'devopspulse_email_templates';
export const ACTIVE_TEMPLATE_KEY = 'devopspulse_active_template_id';

/**
 * Load templates from LocalStorage with fallback to DEFAULT_TEMPLATES.
 */
export function loadTemplatesFromStorage(): EmailTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return DEFAULT_TEMPLATES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TEMPLATES;

    // Ensure all default built-ins exist in case older storage lacked new templates
    const storedIds = new Set(parsed.map((t: EmailTemplate) => t.id));
    const merged: EmailTemplate[] = [...parsed];

    for (const def of DEFAULT_TEMPLATES) {
      if (!storedIds.has(def.id)) {
        merged.push(def);
      }
    }

    return merged;
  } catch (err) {
    console.error('Failed to load templates from localStorage:', err);
    return DEFAULT_TEMPLATES;
  }
}

/**
 * Save templates to LocalStorage.
 */
export function saveTemplatesToStorage(templates: EmailTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to save templates to localStorage:', err);
  }
}

/**
 * Reset all templates to defaults.
 */
export function resetTemplatesToDefaults(): EmailTemplate[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    } catch (err) {
      console.error('Failed to reset templates:', err);
    }
  }
  return DEFAULT_TEMPLATES;
}

export interface CandidateProfile {
  name: string;
  title: string;
  email: string;
  phone: string;
}

export const DEFAULT_CANDIDATE_PROFILE: CandidateProfile = {
  name: 'Johnson Thomas',
  title: 'DevOps & Site Reliability Engineer',
  email: 'johnsonthomas.devops@gmail.com',
  phone: '+91 94970 65992',
};

/**
 * Interpolate dynamic placeholders in template strings using job and candidate data.
 */
export function renderTemplate(
  template: EmailTemplate,
  job: JobPost | null,
  resumeFilename = 'Johnson_Thomas_DevOps_Resume.pdf',
  candidate: CandidateProfile = DEFAULT_CANDIDATE_PROFILE
): { subject: string; body: string } {
  if (!job) {
    return { subject: template.subject, body: template.body };
  }

  const cleanTitle = job.title.replace(/\(.*\)/g, '').trim() || job.title;
  const topSkills =
    job.required_skills && job.required_skills.length > 0
      ? job.required_skills.slice(0, 4).join(', ')
      : 'AWS, Kubernetes, Terraform, Docker, CI/CD';

  const recruiterGreeting = job.recruiter_name ? `Dear ${job.recruiter_name},` : 'Dear Hiring Team,';

  const replacements: Record<string, string> = {
    '{recruiter_greeting}': recruiterGreeting,
    '{recruiter_name}': job.recruiter_name || 'Hiring Team',
    '{company}': job.company || 'the company',
    '{job_title}': cleanTitle,
    '{skills}': topSkills,
    '{location}': job.location || 'Remote',
    '{salary}': job.salary || 'Competitive',
    '{resume_filename}': resumeFilename,
    '{sender_name}': candidate.name,
    '{sender_title}': candidate.title,
    '{sender_email}': candidate.email,
    '{sender_phone}': candidate.phone,
  };

  let renderedSubject = template.subject;
  let renderedBody = template.body;

  for (const [token, value] of Object.entries(replacements)) {
    renderedSubject = renderedSubject.split(token).join(value);
    renderedBody = renderedBody.split(token).join(value);
  }

  return {
    subject: renderedSubject,
    body: renderedBody,
  };
}
