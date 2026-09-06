import { NextResponse } from 'next/server';
import { JobPost } from '@/app/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { jobs = [] } = (await request.json()) as { jobs: JobPost[] };

    const headers = [
      'Match Score',
      'Job Title',
      'Company Name',
      'Company Details',
      'Location',
      'Required Skills',
      'Experience',
      'Salary',
      'Date Posted',
      'Job URL',
      'Apply Method',
      'Recruiter Name',
      'Recruiter Email',
      'Recruiter Phone',
      'Source Website',
      'Match Summary',
      'Status',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [
      headers.join(','),
      ...jobs.map((job) =>
        [
          escapeCsv(`${job.match_score}%`),
          escapeCsv(job.title),
          escapeCsv(job.company),
          escapeCsv(job.company_details || ''),
          escapeCsv(job.location || ''),
          escapeCsv(job.required_skills?.join(', ') || ''),
          escapeCsv(job.experience || ''),
          escapeCsv(job.salary || 'Not Disclosed'),
          escapeCsv(job.date_posted || ''),
          escapeCsv(job.job_url || ''),
          escapeCsv(job.apply_method || ''),
          escapeCsv(job.recruiter_name || ''),
          escapeCsv(job.recruiter_email || ''),
          escapeCsv(job.recruiter_phone || ''),
          escapeCsv(job.source_website || ''),
          escapeCsv(job.match_summary || ''),
          escapeCsv(job.status || 'New'),
        ].join(',')
      ),
    ];

    const csvContent = csvRows.join('\r\n');
    const filename = `Job_Search_Export_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Export failed' }, { status: 500 });
  }
}
