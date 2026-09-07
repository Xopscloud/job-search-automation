import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      to,
      subject,
      body: emailContent,
      recruiter_name,
      company,
      job_title,
      job_id,
    } = body;

    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid recipient email address is required.' },
        { status: 400 }
      );
    }

    if (!subject || !emailContent) {
      return NextResponse.json(
        { success: false, error: 'Email subject and body cannot be empty.' },
        { status: 400 }
      );
    }

    const n8nWebhookUrl =
      process.env.N8N_SEND_EMAIL_WEBHOOK_URL ||
      'https://n8n.johnsonthomas.co.in/webhook/send-recruiter-email';

    // Auto-attach stored resume from public directory
    let attachments: Array<{ filename: string; content: string; type: string; size: number }> = [];
    try {
      const resumePath = path.join(process.cwd(), 'public', 'Johnson_Thomas_DevOps_Resume.pdf');
      const fallbackPath = path.join(process.cwd(), 'public', 'resume.pdf');
      const targetPath = fs.existsSync(resumePath)
        ? resumePath
        : fs.existsSync(fallbackPath)
        ? fallbackPath
        : null;

      if (targetPath) {
        const fileBuffer = fs.readFileSync(targetPath);
        attachments.push({
          filename: 'Johnson_Thomas_DevOps_Resume.pdf',
          content: fileBuffer.toString('base64'),
          type: 'application/pdf',
          size: fileBuffer.length,
        });
      }
    } catch (attachErr) {
      console.warn('Could not read resume file to attach:', attachErr);
    }

    // Convert plain text to clean professional HTML email (greatly improves inbox deliverability)
    const formattedHtml = emailContent
      .trim()
      .split('\n\n')
      .map((paragraph: string) => {
        const lines = paragraph.split('\n');
        if (lines.length > 1 && lines.every((l: string) => l.trim().startsWith('•') || l.trim().startsWith('-'))) {
          const items = lines
            .map((l: string) => `<li style="margin-bottom: 6px; color: #1e293b;">${l.replace(/^[•\-]\s*/, '')}</li>`)
            .join('');
          return `<ul style="margin: 12px 0 16px 20px; padding-left: 0;">${items}</ul>`;
        }
        return `<p style="margin: 0 0 14px 0; color: #1e293b; line-height: 1.6; font-size: 15px;">${paragraph.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; background-color: #ffffff; margin: 0; padding: 16px 0;">
  <div style="max-width: 600px; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    ${formattedHtml}
  </div>
</body>
</html>`;

    // Payload dispatched to n8n email sender webhook
    const payload = {
      to: to.trim(),
      subject: subject.trim(),
      body: emailContent.trim(),
      html,
      from_name: 'Johnson Thomas',
      recruiter_name: recruiter_name || 'Hiring Team',
      company: company || '',
      job_title: job_title || '',
      job_id: job_id || '',
      sent_via: 'DevOpsPulse Recruiter Outreach Engine',
      sent_at: new Date().toISOString(),
      attachments,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const n8nRes = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DevOpsPulse-Outreach/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (n8nRes.ok) {
        let responseData: any = {};
        try {
          responseData = await n8nRes.json();
        } catch {
          responseData = { message: 'Dispatched successfully' };
        }

        return NextResponse.json({
          success: true,
          message: `Email successfully dispatched to ${to} via Gmail!`,
          sent_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          details: responseData,
        });
      } else {
        const errorText = await n8nRes.text();
        return NextResponse.json(
          {
            success: false,
            error: `n8n webhook responded with status ${n8nRes.status}: ${errorText.slice(0, 200)}`,
          },
          { status: n8nRes.status }
        );
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const isTimeout = fetchErr?.name === 'AbortError';
      return NextResponse.json(
        {
          success: false,
          error: isTimeout
            ? 'n8n email dispatch timed out after 30s.'
            : `Could not reach n8n email webhook at ${n8nWebhookUrl}: ${fetchErr?.message}`,
        },
        { status: 502 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
