import { getDb, PROFILE } from './db.js';
import { currentActor, isAdmin } from './session.js';
import {
  listRooms, listEvents, listSchedules, listAnnouncements,
  resolveDate, overlaps, isoDate, addDays, today, normCourse,
} from './store.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayOfIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return DAYS[new Date(y, m - 1, d).getDay()];
}

const isTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t ?? ''));
const isIsoDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d ?? ''));

/**
 * Strict date resolution for anything that writes. `resolveDate` in store.js
 * falls back to today when it cannot parse — fine for a read, dangerous for a
 * booking, so a write refuses rather than guessing which day was meant.
 */
function resolveDateStrict(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (s === 'yesterday') return isoDate(addDays(today(), -1));
  if (['today', 'tomorrow'].includes(s) || isIsoDate(s)) return resolveDate(s);
  if (DAYS.some((d) => d.toLowerCase() === s)) return resolveDate(s);
  return null;
}

function nextBookingId() {
  const rows = getDb().prepare('SELECT booking_id FROM room_bookings').all();
  let max = 0;
  for (const r of rows) {
    const m = String(r.booking_id).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `bk-${String(max + 1).padStart(3, '0')}`;
}

function findRoom(ref) {
  if (!ref) return null;
  const needle = String(ref).trim().toLowerCase().replace(/^room\s*/, '').replace(/\s+/g, '');
  const rooms = listRooms();
  return (
    rooms.find((r) => r.id.toLowerCase() === needle) ||
    rooms.find((r) => r.room_number.toLowerCase() === needle) ||
    rooms.find((r) => r.room_number.toLowerCase().replace(/\s+/g, '') === needle) ||
    null
  );
}

/** Every distinct piece of equipment that actually exists, for honest "we don't have that" answers. */
export function equipmentVocabulary() {
  const set = new Set();
  for (const r of listRooms()) for (const e of r.equipment || []) set.add(e);
  return [...set].sort();
}

/** Everything blocking a room at a given date+window: bookings, timetabled classes, and events held there. */
export function roomConflicts(room, date, start, end) {
  const out = [];
  for (const b of room.bookings || []) {
    if (b.date === date && overlaps(start, end, b.start_time, b.end_time)) {
      out.push({
        kind: 'booking',
        detail: `${b.booked_by} - ${b.purpose} (${b.start_time}-${b.end_time})`,
        booking_id: b.booking_id,
        booked_by: b.booked_by,
      });
    }
  }
  const day = dayOfIso(date);
  for (const s of listSchedules({ day })) {
    if (s.room === room.room_number && overlaps(start, end, s.start_time, s.end_time)) {
      out.push({ kind: 'class', detail: `${s.course} ${s.title} (${s.start_time}-${s.end_time}, section ${s.section})` });
    }
  }
  for (const e of listEvents()) {
    if (e.status === 'cancelled' || e.venue !== room.room_number) continue;
    const first = e.date;
    const last = e.end_date || e.date;
    if (date < first || date > last) continue;
    // Multi-day events hold the venue for the whole of any middle day.
    const sameDay = first === last;
    if (!sameDay || overlaps(start, end, e.start_time, e.end_time)) {
      out.push({ kind: 'event', detail: `${e.name} (${e.start_time}-${e.end_time})`, event_id: e.id });
    }
  }
  return out;
}

const roomCard = (r, extra = {}) => ({
  id: r.id,
  room_number: r.room_number,
  type: r.type,
  capacity: r.capacity,
  equipment: r.equipment,
  floor: r.floor,
  ...extra,
});

export function findAvailableRooms({ date, start_time, end_time, min_capacity, equipment, type } = {}) {
  const iso = resolveDate(date);
  const start = start_time || '00:00';
  const end = end_time || '23:59';
  const want = (equipment || []).map((e) => String(e).toLowerCase());
  const vocab = equipmentVocabulary();
  const unknownEquipment = want.filter(
    (w) => !vocab.some((v) => v.toLowerCase().includes(w))
  );

  const matching = listRooms()
    .filter((r) => r.status === 'available')
    .filter((r) => (type ? r.type === type : true))
    .filter((r) => (min_capacity ? r.capacity >= Number(min_capacity) : true))
    .filter((r) => want.every((w) => r.equipment.some((e) => e.toLowerCase().includes(w))));

  const available = [];
  const unavailable = [];
  for (const r of matching) {
    const conflicts = roomConflicts(r, iso, start, end);
    if (conflicts.length) unavailable.push(roomCard(r, { reason: conflicts.map((c) => c.detail).join('; ') }));
    else available.push(roomCard(r, { free_on: iso, window: `${start}-${end}` }));
  }
  // Smallest suitable room first - don't hand someone a 70-seat hall for five people.
  available.sort((a, b) => a.capacity - b.capacity);

  return {
    date: iso,
    window: `${start}-${end}`,
    criteria: { min_capacity: min_capacity ?? null, equipment: equipment ?? [], type: type ?? null },
    available_count: available.length,
    available,
    unavailable,
    ...(unknownEquipment.length
      ? {
          unknown_equipment: unknownEquipment,
          note: `No room has ${unknownEquipment.join(', ')}. Equipment that exists on campus: ${vocab.join(', ')}.`,
        }
      : {}),
  };
}

/** Single-room yes/no, with whatever is blocking it attached. */
export function checkRoomAvailability({ room, date, start_time, end_time }) {
  const target = findRoom(room);
  if (!target) {
    return {
      ok: false,
      error: 'unknown_room',
      message: `${room} is not in the room directory - CampusOS only knows rooms 7A01-7A07, 7B01-7B08 and 7C01-7C05.`,
    };
  }
  const iso = resolveDateStrict(date);
  if (!iso) return { ok: false, error: 'missing_date', message: 'Which date? Give a date such as tomorrow or 2026-09-07.' };
  if (!isTime(start_time) || !isTime(end_time)) {
    return { ok: false, error: 'bad_time', message: 'I need a start and end time in 24-hour HH:MM form.' };
  }
  const conflicts = roomConflicts(target, iso, start_time, end_time);
  return {
    ok: true,
    room: roomCard(target),
    date: iso,
    window: `${start_time}-${end_time}`,
    available: conflicts.length === 0 && target.status === 'available',
    conflicts,
  };
}

export function bookRoom({ room, date, start_time, end_time, purpose }) {
  if (!room) return { ok: false, error: 'missing_room', message: 'Which room? Give a room number such as 7A02.' };
  if (!start_time || !end_time) return { ok: false, error: 'missing_time', message: 'I need a start and end time before I can book anything.' };
  if (!isTime(start_time) || !isTime(end_time)) {
    return { ok: false, error: 'bad_time', message: `Times must be 24-hour HH:MM. I got "${start_time}" and "${end_time}".` };
  }
  if (end_time <= start_time) {
    return { ok: false, error: 'invalid_range', message: `The end time (${end_time}) has to be after the start time (${start_time}).` };
  }

  const iso = resolveDateStrict(date);
  if (!iso) return { ok: false, error: 'missing_date', message: 'Which date? Give a date such as tomorrow or 2026-09-07.' };
  const todayIso = isoDate();
  if (iso < todayIso) return { ok: false, error: 'past_date', message: `${iso} has already passed - I can only book from ${todayIso} onwards.` };

  const target = findRoom(room);
  if (!target) {
    return {
      ok: false,
      error: 'unknown_room',
      message: `${room} is not in the room directory, so I can't book it. CampusOS knows rooms 7A01-7A07, 7B01-7B08 and 7C01-7C05.`,
    };
  }
  if (target.status !== 'available') return { ok: false, error: 'room_unavailable', message: `Room ${target.room_number} is marked unavailable.` };

  const db = getDb();
  const booking = {
    booking_id: nextBookingId(),
    room_id: target.id,
    // Identity comes from the session, never from what the user typed.
    booked_by: currentActor().profile.name,
    date: iso,
    start_time,
    end_time,
    purpose: purpose || 'Reserved via CampusOS',
  };

  // Re-check and insert in one transaction so two overlapping bookings can't slip between them.
  const commit = db.transaction(() => {
    const fresh = findRoom(target.room_number);
    const conflicts = roomConflicts(fresh, iso, start_time, end_time);
    if (conflicts.length) return { conflicts };
    db.prepare(
      'INSERT INTO room_bookings VALUES (@booking_id,@room_id,@booked_by,@date,@start_time,@end_time,@purpose)'
    ).run(booking);
    return { conflicts: [] };
  });

  const { conflicts } = commit();
  if (conflicts.length) {
    const alternatives = findAvailableRooms({
      date: iso, start_time, end_time, type: target.type, min_capacity: target.capacity,
    }).available.slice(0, 3);
    return {
      ok: false,
      error: 'conflict',
      message: `Room ${target.room_number} is not free on ${iso} from ${start_time} to ${end_time}.`,
      conflicts,
      suggestions: alternatives,
    };
  }

  return {
    ok: true,
    message: `Room ${target.room_number} booked on ${iso}, ${start_time}-${end_time}.`,
    booking,
    booking_id: booking.booking_id,
    room_number: target.room_number,
  };
}

export function cancelBooking({ booking_id }) {
  if (!booking_id) return { ok: false, error: 'missing_id', message: 'Which booking? I need the booking id.' };
  const db = getDb();
  const row = db.prepare('SELECT * FROM room_bookings WHERE booking_id = ?').get(booking_id);
  if (!row) return { ok: false, error: 'not_found', message: `No booking with id ${booking_id}.` };
  // A student may only cancel a booking they made themselves.
  if (row.booked_by !== currentActor().profile.name && !isAdmin()) {
    return {
      ok: false,
      error: 'forbidden',
      message: `Booking ${booking_id} was made by ${row.booked_by}, not by you - it isn't yours to cancel.`,
    };
  }
  db.prepare('DELETE FROM room_bookings WHERE booking_id = ?').run(booking_id);
  return { ok: true, message: `Booking ${booking_id} cancelled.`, cancelled: row };
}

function findEvent(ref) {
  if (!ref) return null;
  const clean = (s) => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const needle = clean(ref);
  const events = listEvents();
  const byId = events.find((e) => e.id.toLowerCase() === String(ref).trim().toLowerCase());
  if (byId) return byId;
  const exact = events.find((e) => clean(e.name) === needle);
  if (exact) return exact;
  const substring = events.find((e) => clean(e.name).includes(needle));
  if (substring) return substring;
  // Fall back to word overlap so "the Deep Learning lecture" still resolves.
  const words = needle.split(' ').filter((w) => w.length > 3);
  if (!words.length) return null;
  const scored = events
    .map((e) => ({ e, hits: words.filter((w) => clean(e.name).includes(w)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  if (!scored.length) return null;
  // Ambiguous when two events match equally well - better to ask than to guess.
  if (scored.length > 1 && scored[0].hits === scored[1].hits) return null;
  return scored[0].e;
}

/** Keep the stored status honest after a registration changes the count. */
function syncEventStatus(db, eventId) {
  const e = listEvents().find((x) => x.id === eventId);
  if (!e) return;
  if (e.is_full && e.status === 'upcoming') db.prepare("UPDATE events SET status='full' WHERE id=?").run(eventId);
  if (!e.is_full && e.status === 'full') db.prepare("UPDATE events SET status='upcoming' WHERE id=?").run(eventId);
}

export function registerForEvent({ event }) {
  if (!event) return { ok: false, error: 'missing_event', message: 'Which event should I register you for?' };
  const target = findEvent(event);
  if (!target) return { ok: false, error: 'not_found', message: `I can't find an event matching "${event}".` };
  if (target.status === 'cancelled') return { ok: false, error: 'cancelled', message: `${target.name} has been cancelled.` };
  if (target.status === 'completed') return { ok: false, error: 'completed', message: `${target.name} is already over.` };

  // Always the session's own student. A student cannot register anybody else.
  const sid = currentActor().profile.student_id;
  if (target.registrations.some((r) => r.student_id === sid)) {
    return { ok: false, error: 'already_registered', message: `You're already registered for ${target.name}.` };
  }
  if (target.seats_left <= 0) {
    const alternatives = listEvents()
      .filter((e) => e.id !== target.id && e.status === 'upcoming' && e.seats_left > 0 && e.date >= isoDate())
      .slice(0, 3)
      .map((e) => ({ id: e.id, name: e.name, date: e.date, seats_left: e.seats_left }));
    return {
      ok: false,
      error: 'full',
      message: `${target.name} is full - ${target.registered}/${target.capacity} places are taken.`,
      suggestions: alternatives,
    };
  }

  const db = getDb();
  db.transaction(() => {
    db.prepare('INSERT INTO event_registrations (event_id, student_id, name) VALUES (?,?,?)')
      .run(target.id, sid, currentActor().profile.name);
    syncEventStatus(db, target.id);
  })();

  const after = listEvents().find((e) => e.id === target.id);
  return {
    ok: true,
    message: `Registered for ${target.name} on ${target.date} at ${target.start_time}, venue ${target.venue}.`,
    event: { id: after.id, name: after.name, date: after.date, start_time: after.start_time, venue: after.venue },
    registered: after.registered,
    capacity: after.capacity,
    seats_left: after.seats_left,
  };
}

export function cancelRegistration({ event }) {
  if (!event) return { ok: false, error: 'missing_event', message: 'Which event?' };
  const target = findEvent(event);
  if (!target) return { ok: false, error: 'not_found', message: `I can't find an event matching "${event}".` };
  const sid = currentActor().profile.student_id;
  const db = getDb();
  const info = db.prepare('DELETE FROM event_registrations WHERE event_id = ? AND student_id = ?').run(target.id, sid);
  if (!info.changes) {
    return { ok: false, error: 'not_registered', message: `You aren't registered for ${target.name}, so there's nothing to cancel.` };
  }
  syncEventStatus(db, target.id);
  const after = listEvents().find((e) => e.id === target.id);
  return { ok: true, message: `Registration for ${target.name} cancelled.`, seats_left: after.seats_left };
}

/* ---- derived reads the agent leans on ---- */

/** Active announcements that mention a course - the timetable is not the last word. */
export function noticesFor(course) {
  const c = normCourse(course);
  return listAnnouncements().filter((a) => !a.expired && (normCourse(a.title).includes(c) || normCourse(a.body).includes(c)));
}

export function nextClass({ from } = {}) {
  const now = from ? new Date(from) : today();
  const all = listSchedules();
  for (let offset = 0; offset < 8; offset++) {
    const d = addDays(now, offset);
    const day = DAYS[d.getDay()];
    const iso = isoDate(d);
    const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todays = all
      .filter((s) => s.day === day)
      .filter((s) => (offset === 0 ? s.start_time > cur : true))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (todays.length) {
      const next = todays[0];
      return {
        found: true,
        date: iso,
        day,
        classes: todays,
        next,
        // A notice can move or cancel this class. Surface it rather than making the agent go looking.
        related_announcements: noticesFor(next.course),
        announcements_for_that_day: todays.flatMap((s) => noticesFor(s.course)),
      };
    }
  }
  return { found: false, message: 'No classes found in the next 7 days.' };
}

export function assignmentsDue({ within_days = 7 } = {}) {
  const start = isoDate();
  const end = isoDate(addDays(today(), Number(within_days)));
  return getDb()
    .prepare('SELECT * FROM assignments WHERE deadline BETWEEN ? AND ? ORDER BY deadline')
    .all(start, end)
    .map((a) => ({
      ...a,
      days_until_due: Math.round((new Date(`${a.deadline}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / 86400000),
      window: `${start} to ${end}`,
    }));
}

export function freeWindowSuggestions({ date, until_time } = {}) {
  const iso = resolveDate(date);
  const day = dayOfIso(iso);
  const events = listEvents().filter((e) => e.date <= iso && (e.end_date || e.date) >= iso && e.status !== 'cancelled');
  const classes = listSchedules({ day });
  return {
    date: iso,
    day,
    is_weekend: !['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(day),
    window_until: until_time || null,
    classes_that_day: classes,
    events_that_day: events.filter((e) => (until_time ? e.start_time <= until_time : true)),
    all_events_that_day: events,
    nothing_found:
      classes.length === 0 && events.filter((e) => (until_time ? e.start_time <= until_time : true)).length === 0,
  };
}

/** Lets the agent resolve "my booking" to an id without asking the student to recite bk-004. */
export function mySummary() {
  const bookings = getDb()
    .prepare('SELECT * FROM room_bookings WHERE booked_by = ? ORDER BY date, start_time')
    .all(currentActor().profile.name)
    .map((b) => {
      const room = listRooms().find((r) => r.id === b.room_id);
      return { ...b, room_number: room ? room.room_number : b.room_id };
    });
  const registrations = listEvents()
    .filter((e) => e.registrations.some((r) => r.student_id === currentActor().profile.student_id))
    .map((e) => ({ id: e.id, name: e.name, date: e.date, start_time: e.start_time, venue: e.venue }));
  return { student: currentActor().profile, role: currentActor().role, bookings, registrations };
}
