import { NextResponse } from 'next/server';
import { chat, activeProvider } from '@/lib/llm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ provider: activeProvider() });
}

export async function POST(req) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || !messages.length) {
      return NextResponse.json({ error: 'messages[] required' }, { status: 400 });
    }
    const { reply, trace } = await chat(messages.slice(-12));
    return NextResponse.json({ reply, trace });
  } catch (err) {
    const status = err.code === 'NO_KEY' ? 503 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
