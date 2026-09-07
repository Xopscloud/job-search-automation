import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DevOps Pulse | Automated DevOps, SRE & Cloud Job Search Cockpit',
  description: 'Autonomous multi-portal job aggregator, AI candidate fit evaluator, and recruiter outreach engine dedicated to DevOps Engineers, SREs, DevSecOps, Cloud Engineers, and Solution Architects.',
  keywords: [
    'DevOps Engineer',
    'Site Reliability Engineer',
    'SRE',
    'DevSecOps Engineer',
    'Cloud Engineer',
    'Solution Architect',
    'Kubernetes',
    'Terraform',
    'AWS DevOps',
    'n8n Workflow',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
