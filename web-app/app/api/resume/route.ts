import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const RESUME_FILENAME = 'Johnson_Thomas_DevOps_Resume.pdf';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', RESUME_FILENAME);
    const fallbackPath = path.join(process.cwd(), 'public', 'resume.pdf');

    const target = fs.existsSync(filePath) ? filePath : fs.existsSync(fallbackPath) ? fallbackPath : null;

    if (!target) {
      return NextResponse.json({
        exists: false,
        filename: RESUME_FILENAME,
        message: 'No resume found',
      });
    }

    const stats = fs.statSync(target);
    const buffer = fs.readFileSync(target);

    return NextResponse.json({
      exists: true,
      filename: RESUME_FILENAME,
      size: stats.size,
      size_formatted: `${(stats.size / 1024).toFixed(1)} KB`,
      updated_at: stats.mtime.toISOString(),
      url: `/${RESUME_FILENAME}`,
      has_base64: true,
      base64_preview: buffer.toString('base64').slice(0, 100) + '...',
    });
  } catch (error: any) {
    return NextResponse.json({ exists: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const targetPath = path.join(publicDir, RESUME_FILENAME);
    const fallbackPath = path.join(publicDir, 'resume.pdf');

    fs.writeFileSync(targetPath, buffer);
    fs.writeFileSync(fallbackPath, buffer);

    return NextResponse.json({
      success: true,
      message: 'Resume updated successfully!',
      filename: RESUME_FILENAME,
      size: buffer.length,
      size_formatted: `${(buffer.length / 1024).toFixed(1)} KB`,
      url: `/${RESUME_FILENAME}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to upload resume' }, { status: 500 });
  }
}
