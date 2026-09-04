import { getDb, PROFILE } from './db.js';
import { validate, ValidationError } from './validation.js';

export { ValidationError };

/* ---------------- helpers ---------------- */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * "Now" on campus. Returns a Date whose local fields read as Asia/Dhaka wall-clock,
 * so every helper below is correct no matter what timezone the judges' laptop is in.
 */
export function today() {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date()).reduce((a, x) => ((a[x.type] = x.value), a), {});
  return new Date(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
}
export function isoDate(d = today()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dayName(d = today()) {
  return DAYS[d.getDay()];
}
export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function hhmm(d = today()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
/** Resolve "today" / "tomorrow" / "2026-09-07" to an ISO date. */
export function resolveDate(input) {
  if (!input) return isoDate();
  const s = String(input).trim().toLowerCase();
  if (s === 'today') return isoDate();
  if (s === 'tomorrow') return isoDate(addDays(today(), 1));
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const idx = DAYS.findIndex((d) => d.toLowerCase() === s);
  if (idx >= 0) {
    for (let i = 1; i <= 7; i++) {
      const cand = addDays(today(), i);
      if (cand.getDay() === idx) return isoDate(cand);
    }
  }
  return isoDate();
}
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
function nextId(table, prefix) {
  const db = getDb();
  const rows = db.prepare(`SELECT id FROM ${table}`).all();
  let max = 0;
  for (const r of rows) {
    const m = String(r.id).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

/* ---------------- resource config ---------------- */

export const RESOURCES = {
  schedules: {
    table: 'schedules',
    prefix: 'sch',
    fields: ['course', 'title', 'day', 'start_time', 'end_time', 'room', 'instructor', 'section'],
    order: `CASE day WHEN 'Sunday' THEN 0 WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 ELSE 5 END, start_time`,
  },
  rooms: {
    table: 'rooms',
    prefix: 'room',
    fields: ['room_number', 'type', 'capacity', 'equipment', 'floor', 'status'],
    order: 'room_number',
  },
  events: {
    table: 'events',
    prefix: 'evt',
    fields: ['name', 'description', 'date', 'start_time', 'end_time', 'end_date', 'venue', 'organizer', 'capacity', 'status'],
    order: 'date, start_time',
  },
  announcements: {
    table: 'announcements',
    prefix: 'ann',
    fields: ['title', 'body', 'date', 'priority', 'posted_by', 'expires'],
    order: `CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, date DESC`,
  },
  assignments: {
    table: 'assignments',
    prefix: 'asgn',
    fields: ['course', 'course_title', 'title', 'description', 'assigned_date', 'deadline', 'submission_platform', 'status', 'marks'],
    order: 'deadline',
  },
};

/* ---------------- reads ---------------- */

/** "CSE4113" and "cse 4113" are the same course. */
export const normCourse = (c) => String(c || '').toUpperCase().replace(/\s+/g, '');

/**
 * The seed timetable contains a genuine double-booking (7A04 on Wednesday).
 * Rather than hide it, every row carries the rows it collides with, so the
 * agent can report both classes and flag the clash instead of picking one.
 */
function flagClashes(rows) {
  return rows.map((r) => ({
    ...r,
    clashes_with: rows
      .filter(
        (o) =>
          o.id !== r.id &&
          o.day === r.day &&
          o.room === r.room &&
          overlaps(r.start_time, r.end_time, o.start_time, o.end_time)
      )
      .map((o) => ({ id: o.id, course: o.course, start_time: o.start_time, end_time: o.end_time, section: o.section })),
  }));
}

export function listSchedules({ day, course, section } = {}) {
  const db = getDb();
  const cfg = RESOURCES.schedules;
  let rows = day
    ? db.prepare(`SELECT * FROM schedules WHERE lower(day) = lower(?) ORDER BY start_time`).all(day)
    : db.prepare(`SELECT * FROM schedules ORDER BY ${cfg.order}`).all();
  if (course) {
    const c = normCourse(course);
    rows = rows.filter((r) => normCourse(r.course) === c);
  }
  if (section) {
    const sec = String(section).toLowerCase();
    rows = rows.filter((r) => String(r.section || '').toLowerCase().includes(sec));
  }
  return flagClashes(rows);
}

export function listRooms() {
  const db = getDb();
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY room_number').all();
  const bookings = db.prepare('SELECT * FROM room_bookings ORDER BY date, start_time').all();
  return rooms.map((r) => ({
    ...r,
    equipment: safeParse(r.equipment),
    bookings: bookings.filter((b) => b.room_id === r.id),
  }));
}

export function listEvents() {
  const db = getDb();
  const events = db.prepare('SELECT * FROM events ORDER BY date, start_time').all();
  const regs = db.prepare('SELECT * FROM event_registrations').all();
  return events.map((e) => {
    const mine = regs.filter((r) => r.event_id === e.id);
    return {
      ...e,
      registered: mine.length,
      registrations: mine.map(({ student_id, name }) => ({ student_id, name })),
      seats_left: Math.max(0, (e.capacity || 0) - mine.length),
      is_full: mine.length >= (e.capacity || 0),
    };
  });
}

export function listAnnouncements() {
  const now = isoDate();
  return getDb()
    .prepare(`SELECT * FROM announcements ORDER BY ${RESOURCES.announcements.order}`)
    .all()
    .map((a) => ({ ...a, expired: !!a.expires && a.expires < now }));
}

export function listAssignments() {
  return getDb().prepare('SELECT * FROM assignments ORDER BY deadline').all();
}

export function listAll(resource) {
  switch (resource) {
    case 'schedules': return listSchedules();
    case 'rooms': return listRooms();
    case 'events': return listEvents();
    case 'announcements': return listAnnouncements();
    case 'assignments': return listAssignments();
    default: throw new Error(`Unknown resource: ${resource}`);
  }
}

function safeParse(v) {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v || '[]'); } catch { return []; }
}

/* ---------------- writes ---------------- */

/** Everything the write would produce, so cross-field rules see the whole row. */
function checkWrite(resource, body, existing = null) {
  const merged = { ...(existing || {}), ...body };
  if (resource === 'events') {
    // Capacity may never be edited below the number of people already registered.
    merged._registered = existing
      ? getDb().prepare('SELECT COUNT(*) AS n FROM event_registrations WHERE event_id = ?').get(existing.id).n
      : 0;
  }
  validate(resource, merged);
  if (resource === 'rooms' && body.room_number !== undefined) {
    const clash = getDb()
      .prepare('SELECT id FROM rooms WHERE lower(room_number) = lower(?) AND id != ?')
      .get(String(body.room_number), existing ? existing.id : '');
    if (clash) throw new ValidationError({ room_number: `Room ${body.room_number} already exists.` });
  }
}

export function createRecord(resource, body) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw new Error(`Unknown resource: ${resource}`);
  checkWrite(resource, body);
  const db = getDb();
  const id = body.id || nextId(cfg.table, cfg.prefix);
  const row = { id };
  for (const f of cfg.fields) {
    let v = body[f];
    if (f === 'equipment') v = JSON.stringify(Array.isArray(v) ? v : safeParse(v));
    row[f] = v === undefined ? null : v;
  }
  const cols = ['id', ...cfg.fields];
  db.prepare(
    `INSERT INTO ${cfg.table} (${cols.join(',')}) VALUES (${cols.map((c) => '@' + c).join(',')})`
  ).run(row);
  return getOne(resource, id);
}

export function updateRecord(resource, id, body) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw new Error(`Unknown resource: ${resource}`);
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(id);
  if (!existing) return null;
  checkWrite(resource, body, existing);
  const patch = {};
  for (const f of cfg.fields) {
    if (body[f] === undefined) continue;
    patch[f] = f === 'equipment'
      ? JSON.stringify(Array.isArray(body[f]) ? body[f] : safeParse(body[f]))
      : body[f];
  }
  const keys = Object.keys(patch);
  if (keys.length) {
    db.prepare(
      `UPDATE ${cfg.table} SET ${keys.map((k) => `${k} = @${k}`).join(', ')} WHERE id = @id`
    ).run({ ...patch, id });
  }
  return getOne(resource, id);
}

export function deleteRecord(resource, id) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw new Error(`Unknown resource: ${resource}`);
  const info = getDb().prepare(`DELETE FROM ${cfg.table} WHERE id = ?`).run(id);
  return info.changes > 0;
}

export function getOne(resource, id) {
  return listAll(resource).find((r) => r.id === id) || null;
}
