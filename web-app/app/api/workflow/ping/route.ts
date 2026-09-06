import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { webhook_url } = await request.json();

    if (!webhook_url) {
      return NextResponse.json({ ok: false, error: 'No webhook URL provided' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'JobSearch-Cockpit-Ping/1.0',
        },
        body: JSON.stringify({ ping: true, test: 'connection_check' }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 404) {
        return NextResponse.json({
          ok: false,
          status: 404,
          message: 'n8n responded with 404 Not Found. Make sure the workflow has the Webhook node AND is Published (Active) in n8n.',
        });
      }

      return NextResponse.json({
        ok: res.ok,
        status: res.status,
        message: res.ok
          ? 'n8n Webhook is ACTIVE and responding!'
          : `n8n responded with status ${res.status}`,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      return NextResponse.json({
        ok: false,
        status: 0,
        message: `Could not reach n8n server: ${err?.message || 'Network error'}`,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Ping failed' }, { status: 500 });
  }
}
