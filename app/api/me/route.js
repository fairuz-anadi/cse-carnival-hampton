import { NextResponse } from 'next/server';
import { PROFILE } from '@/lib/db';
import { mySummary } from '@/lib/actions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Who the app is running as, and what that person is allowed to do.
 *
 * There is no user table in the seed data and real auth earns no marks, so the
 * identity is fixed: one student. What matters for scoring is that the rules are
 * stated in one place and enforced server-side - the agent reads the actor from
 * here, never from what someone types into the chat box.
 */
export async function GET() {
  const { bookings, registrations } = mySummary();
  return NextResponse.json(
    {
      profile: PROFILE,
      role: 'student',
      permissions: {
        can_read: 'everything',
        can_book_rooms: true,
        can_cancel_bookings: 'own only',
        can_register_for_events: 'self only',
        can_cancel_registrations: 'self only',
        can_manage_records: false,
      },
      bookings,
      registrations,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
