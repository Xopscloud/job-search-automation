import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { JobApplicationRecord } from '../../types';

export const runtime = 'nodejs';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'applied_jobs.json');

function ensureDataFile(): JobApplicationRecord[] {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading applied_jobs.json:', err);
  }
  return [];
}

function saveDataFile(records: JobApplicationRecord[]): void {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing applied_jobs.json:', err);
  }
}

export async function GET() {
  const records = ensureDataFile();
  return NextResponse.json({ success: true, count: records.length, data: records });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company, role } = body;

    if (!company || !role) {
      return NextResponse.json(
        { success: false, error: 'Company and role are required fields.' },
        { status: 400 }
      );
    }

    const records = ensureDataFile();
    const normalizedCompany = company.trim().toLowerCase();
    const normalizedRole = role.trim().toLowerCase();

    const existingIndex = records.findIndex(
      (r) =>
        (body.job_id && r.job_id === body.job_id) ||
        (r.company.trim().toLowerCase() === normalizedCompany &&
          r.role.trim().toLowerCase() === normalizedRole)
    );

    let savedRecord: JobApplicationRecord;

    if (existingIndex !== -1) {
      records[existingIndex] = {
        ...records[existingIndex],
        ...body,
        updated_at: new Date().toISOString(),
      };
      savedRecord = records[existingIndex];
    } else {
      savedRecord = {
        id: body.id || `app_${Date.now()}`,
        index: records.length + 1,
        company: company.trim(),
        role: role.trim(),
        applied_on: body.applied_on || new Date().toLocaleDateString(),
        follow_up_date: body.follow_up_date || '',
        status: body.status || 'Pending',
        source: body.source || 'Direct',
        salary_aed: body.salary_aed || '',
        applied_through: body.applied_through || 'mail',
        contact_email: body.contact_email || '',
        follow_up_done: Boolean(body.follow_up_done),
        notes: body.notes || '',
        job_id: body.job_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      records.unshift(savedRecord);
    }

    saveDataFile(records);

    return NextResponse.json({
      success: true,
      message: 'Application recorded successfully in tracking database.',
      record: savedRecord,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process request.' },
      { status: 500 }
    );
  }
}
