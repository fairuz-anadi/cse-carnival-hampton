import { NextResponse } from 'next/server';
import { currentActor, isAdmin } from './session.js';

/**
 * Creating, editing and deleting records is department-office work.
 * Students read everything, and may book rooms and take their own place at an
 * event - but the five systems themselves are managed by staff.
 *
 * Returns a 403 response when the current actor may not manage records, or
 * null when they may. Enforced here so the dashboard and the agent are governed
 * by the same rule.
 */
export function requireAdmin() {
  if (isAdmin()) return null;
  const actor = currentActor();
  return NextResponse.json(
    {
      error: `Only department staff can add, edit or delete records. You are signed in as ${actor.label}.`,
      code: 'FORBIDDEN',
      details: { role: actor.role, needed: 'admin' },
    },
    { status: 403 }
  );
}
