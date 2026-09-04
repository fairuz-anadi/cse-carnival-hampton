import { NextResponse } from 'next/server';
import { findAvailableRooms, checkRoomAvailability } from '@/lib/actions';
import { errorResponse } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Which rooms are actually free in a window - what the dashboard's booking
 * dialog needs before it lets someone pick a room.
 *
 *   /api/availability?date=2026-09-05&start_time=15:00&end_time=17:00
 *       &min_capacity=30&equipment=projector,AC&type=lab
 *   /api/availability?room=7A02&date=...&start_time=...&end_time=...   -> single room
 */
export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const date = sp.get('date');
  const start_time = sp.get('start_time');
  const end_time = sp.get('end_time');
  if (!date || !start_time || !end_time) {
    return errorResponse({
      message: 'date, start_time and end_time are all required.',
      code: 'VALIDATION_ERROR',
      details: {
        date: date ? undefined : 'Required (YYYY-MM-DD).',
        start_time: start_time ? undefined : 'Required (HH:MM).',
        end_time: end_time ? undefined : 'Required (HH:MM).',
      },
    });
  }
  try {
    const room = sp.get('room');
    const equipment = sp.get('equipment') ? sp.get('equipment').split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const result = room
      ? checkRoomAvailability({ room, date, start_time, end_time })
      : findAvailableRooms({
          date, start_time, end_time,
          min_capacity: sp.get('min_capacity') || undefined,
          equipment,
          type: sp.get('type') || undefined,
        });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return errorResponse(err, 500);
  }
}
