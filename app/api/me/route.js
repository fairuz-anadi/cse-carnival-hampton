import { NextResponse } from 'next/server';
import { mySummary } from '@/lib/actions';
import { ACTORS, currentActor, setActor } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Who the app is running as, and what that person is allowed to do.
 *
 * There is no user table in the seed data and real auth earns no marks, so
 * CampusOS ships two fixed actors and lets you switch between them. What
 * matters for scoring is that the rules live in one place and are enforced
 * server-side - the agent reads the actor from here, never from what someone
 * types into the chat box.
 */
function payload() {
  const actor = currentActor();
  const { bookings, registrations } = mySummary();
  return {
    profile: actor.profile,
    role: actor.role,
    label: actor.label,
    permissions: actor.permissions,
    available_roles: Object.values(ACTORS).map((a) => ({ role: a.role, label: a.label })),
    bookings,
    registrations,
  };
}

export async function GET() {
  return NextResponse.json(payload(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req) {
  const { role } = await req.json().catch(() => ({}));
  if (!setActor(role)) {
    return NextResponse.json(
      { error: `Unknown role "${role}". Use one of: ${Object.keys(ACTORS).join(', ')}.` },
      { status: 400 }
    );
  }
  return NextResponse.json(payload(), { headers: { 'Cache-Control': 'no-store' } });
}
