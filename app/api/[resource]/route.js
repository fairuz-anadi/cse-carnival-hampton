import { NextResponse } from 'next/server';
import { listAll, createRecord, RESOURCES } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req, { params }) {
  const { resource } = await params;
  if (!RESOURCES[resource]) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
  return NextResponse.json(listAll(resource), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req, { params }) {
  const { resource } = await params;
  if (!RESOURCES[resource]) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
  try {
    const body = await req.json();
    return NextResponse.json(createRecord(resource, body), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
