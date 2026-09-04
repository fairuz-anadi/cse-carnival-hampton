import { NextResponse } from 'next/server';
import { listAll, createRecord, RESOURCES, isoDate } from '@/lib/store';
import { errorResponse, notFound } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Filters the dashboard's filter bar uses. Everything unrecognised is ignored. */
function applyFilters(resource, rows, sp) {
  const eq = (key) => {
    const v = sp.get(key);
    return v ? rows.filter((r) => String(r[key] ?? '').toLowerCase() === v.toLowerCase()) : rows;
  };
  if (resource === 'schedules') rows = eq('day');
  if (resource === 'rooms') {
    rows = eq('type');
    const min = sp.get('min_capacity');
    if (min) rows = rows.filter((r) => Number(r.capacity) >= Number(min));
  }
  if (resource === 'events') rows = eq('status');
  if (resource === 'announcements') {
    rows = eq('priority');
    if (sp.get('active') === 'true') rows = rows.filter((r) => !r.expired);
  }
  if (resource === 'assignments') {
    rows = eq('status');
    const before = sp.get('due_before');
    if (before) rows = rows.filter((r) => r.deadline <= before);
  }
  return rows;
}

export async function GET(req, { params }) {
  const { resource } = await params;
  if (!RESOURCES[resource]) return notFound('Resource');
  const rows = applyFilters(resource, listAll(resource), new URL(req.url).searchParams);
  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 'no-store', 'X-As-Of': isoDate() },
  });
}

export async function POST(req, { params }) {
  const { resource } = await params;
  if (!RESOURCES[resource]) return notFound('Resource');
  try {
    return NextResponse.json(createRecord(resource, await req.json()), { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
