import { NextResponse } from 'next/server';
import { getOne, updateRecord, deleteRecord, RESOURCES } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req, { params }) {
  const { resource, id } = await params;
  if (!RESOURCES[resource]) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
  const row = getOne(resource, id);
  return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PATCH(req, { params }) {
  const { resource, id } = await params;
  if (!RESOURCES[resource]) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
  try {
    const row = updateRecord(resource, id, await req.json());
    return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(_req, { params }) {
  const { resource, id } = await params;
  if (!RESOURCES[resource]) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
  return deleteRecord(resource, id)
    ? NextResponse.json({ ok: true, id })
    : NextResponse.json({ error: 'Not found' }, { status: 404 });
}
