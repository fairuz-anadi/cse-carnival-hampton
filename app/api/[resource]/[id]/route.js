import { NextResponse } from 'next/server';
import { getOne, updateRecord, deleteRecord, RESOURCES } from '@/lib/store';
import { errorResponse, notFound } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req, { params }) {
  const { resource, id } = await params;
  if (!RESOURCES[resource]) return notFound('Resource');
  const row = getOne(resource, id);
  return row ? NextResponse.json(row, { headers: { 'Cache-Control': 'no-store' } }) : notFound(id);
}

async function patch(req, params) {
  const { resource, id } = await params;
  if (!RESOURCES[resource]) return notFound('Resource');
  try {
    const row = updateRecord(resource, id, await req.json());
    return row ? NextResponse.json(row) : notFound(id);
  } catch (err) {
    return errorResponse(err);
  }
}

export const PATCH = (req, ctx) => patch(req, ctx.params);
/** Accept PUT as well - a form that sends the whole record shouldn't 405. */
export const PUT = (req, ctx) => patch(req, ctx.params);

export async function DELETE(_req, { params }) {
  const { resource, id } = await params;
  if (!RESOURCES[resource]) return notFound('Resource');
  const result = deleteRecord(resource, id);
  return result ? NextResponse.json({ ok: true, ...result }) : notFound(id);
}
