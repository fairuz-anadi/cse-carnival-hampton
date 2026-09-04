import { NextResponse } from 'next/server';
import { PROFILE } from '@/lib/db';
import { activeProvider } from '@/lib/llm';
import { listSchedules, listRooms, listEvents, listAnnouncements, listAssignments, isoDate } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    profile: PROFILE,
    provider: activeProvider(),
    today: isoDate(),
    counts: {
      schedules: listSchedules().length,
      rooms: listRooms().length,
      events: listEvents().length,
      announcements: listAnnouncements().length,
      assignments: listAssignments().length,
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
