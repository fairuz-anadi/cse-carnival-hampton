import { NextResponse } from 'next/server';

/**
 * One error shape for the whole API so the dashboard can render field-level
 * messages instead of a bare 500. `error` stays a plain string for anything
 * that just prints it; `details` carries the per-field messages the forms need.
 */
export function errorResponse(err, fallbackStatus = 400) {
  const status = err?.status || fallbackStatus;
  return NextResponse.json(
    {
      error: err?.message || 'Something went wrong.',
      code: err?.code || 'BAD_REQUEST',
      ...(err?.details ? { details: err.details } : {}),
    },
    { status }
  );
}

export const notFound = (what) =>
  NextResponse.json({ error: `${what} not found.`, code: 'NOT_FOUND' }, { status: 404 });
