import { NextResponse } from 'next/server';
import { getDb, seed } from '@/lib/db';
import { errorResponse } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Put the database back to the shipped seed state.
 *
 *   curl -X POST localhost:3000/api/admin/reset
 *
 * Every booking and registration made during a demo is dropped and data/*.json
 * is read again. Useful when a walkthrough goes sideways mid-judging - and the
 * judges can use it too, so they always start from a known state.
 */
export async function POST() {
  try {
    const db = getDb();
    seed(db);
    const counts = {
      schedules: db.prepare('SELECT COUNT(*) AS n FROM schedules').get().n,
      rooms: db.prepare('SELECT COUNT(*) AS n FROM rooms').get().n,
      events: db.prepare('SELECT COUNT(*) AS n FROM events').get().n,
      announcements: db.prepare('SELECT COUNT(*) AS n FROM announcements').get().n,
      assignments: db.prepare('SELECT COUNT(*) AS n FROM assignments').get().n,
      room_bookings: db.prepare('SELECT COUNT(*) AS n FROM room_bookings').get().n,
    };
    return NextResponse.json({ ok: true, message: 'Database reseeded from data/*.json.', counts });
  } catch (err) {
    return errorResponse(err, 500);
  }
}
