import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoJob Pulse | Automated Job Search & Application Tracking System',
  description: 'Automated multi-portal job aggregator, AI candidate fit evaluator, recruiter contact extractor, and n8n workflow cockpit.',
  keywords: ['Job Search Automation', 'n8n Workflow', 'Infopark Jobs', 'Technopark Jobs', 'LinkedIn Scraper', 'AI Job Matcher'],
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
