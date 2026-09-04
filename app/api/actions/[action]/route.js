import { NextResponse } from 'next/server';
import { bookRoom, cancelBooking, registerForEvent, cancelRegistration } from '@/lib/actions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HANDLERS = {
  'book-room': bookRoom,
  'cancel-booking': cancelBooking,
  'register-event': registerForEvent,
  'cancel-registration': cancelRegistration,
};

export async function POST(req, { params }) {
  const { action } = await params;
  const handler = HANDLERS[action];
  if (!handler) return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
  try {
    const result = handler(await req.json());
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
