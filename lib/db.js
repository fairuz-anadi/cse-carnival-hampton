import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DB_PATH = process.env.DATABASE_PATH || path.join(ROOT, 'campusos.db');

let _db = null;

/** The student CampusOS is running for. Used for "my" questions and registrations. */
export const PROFILE = {
  student_id: '22-46512',
  name: 'Anadi Fairuz',
  section: 'B',
  program: 'B.Sc. in CSE — Level 4, Term 1',
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY, course TEXT, title TEXT, day TEXT,
  start_time TEXT, end_time TEXT, room TEXT, instructor TEXT, section TEXT
);
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY, room_number TEXT, type TEXT, capacity INTEGER,
  equipment TEXT, floor INTEGER, status TEXT
);
CREATE TABLE IF NOT EXISTS room_bookings (
  booking_id TEXT PRIMARY KEY, room_id TEXT NOT NULL, booked_by TEXT,
  date TEXT, start_time TEXT, end_time TEXT, purpose TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, name TEXT, description TEXT, date TEXT,
  start_time TEXT, end_time TEXT, end_date TEXT, venue TEXT,
  organizer TEXT, capacity INTEGER, status TEXT
);
CREATE TABLE IF NOT EXISTS event_registrations (
  reg_id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL,
  student_id TEXT, name TEXT,
  UNIQUE (event_id, student_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY, title TEXT, body TEXT, date TEXT,
  priority TEXT, posted_by TEXT, expires TEXT
);
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY, course TEXT, course_title TEXT, title TEXT,
  description TEXT, assigned_date TEXT, deadline TEXT,
  submission_platform TEXT, status TEXT, marks INTEGER
);
`;

function readSeed(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', `${name}.json`), 'utf8'));
}

function seedIfEmpty(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM schedules').get().n;
  if (count > 0) return;
  seed(db);
}

export function seed(db) {
  const tx = db.transaction(() => {
    db.exec(`DELETE FROM event_registrations; DELETE FROM room_bookings;
             DELETE FROM schedules; DELETE FROM rooms; DELETE FROM events;
             DELETE FROM announcements; DELETE FROM assignments;`);

    const sch = db.prepare(`INSERT INTO schedules VALUES (@id,@course,@title,@day,@start_time,@end_time,@room,@instructor,@section)`);
    for (const r of readSeed('schedules')) sch.run(r);

    const room = db.prepare(`INSERT INTO rooms VALUES (@id,@room_number,@type,@capacity,@equipment,@floor,@status)`);
    const bk = db.prepare(`INSERT INTO room_bookings VALUES (@booking_id,@room_id,@booked_by,@date,@start_time,@end_time,@purpose)`);
    for (const r of readSeed('rooms')) {
      room.run({ ...r, equipment: JSON.stringify(r.equipment || []) });
      for (const b of r.bookings || []) bk.run({ ...b, room_id: r.id });
    }

    const ev = db.prepare(`INSERT INTO events VALUES (@id,@name,@description,@date,@start_time,@end_time,@end_date,@venue,@organizer,@capacity,@status)`);
    const reg = db.prepare(`INSERT OR IGNORE INTO event_registrations (event_id,student_id,name) VALUES (?,?,?)`);
    for (const e of readSeed('events')) {
      ev.run(e);
      for (const r of e.registrations || []) reg.run(e.id, r.student_id, r.name);
      // seed data carries a headline count larger than the named list; keep the count honest
      const named = (e.registrations || []).length;
      for (let i = named; i < (e.registered || 0); i++) {
        reg.run(e.id, `anon-${e.id}-${i}`, 'Registered student');
      }
    }

    const ann = db.prepare(`INSERT INTO announcements VALUES (@id,@title,@body,@date,@priority,@posted_by,@expires)`);
    for (const a of readSeed('announcements')) ann.run(a);

    const asg = db.prepare(`INSERT INTO assignments VALUES (@id,@course,@course_title,@title,@description,@assigned_date,@deadline,@submission_platform,@status,@marks)`);
    for (const a of readSeed('assignments')) asg.run(a);
  });
  tx();
}

export function getDb() {
  if (_db) return _db;
  const db = new Database(DB_PATH);
  // WAL is the right default, but some sandboxed / network filesystems refuse to
  // delete the -wal and -shm sidecar files. Fall back rather than crash.
  try {
    db.pragma('journal_mode = WAL');
  } catch {
    try { db.pragma('journal_mode = MEMORY'); } catch {}
  }
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  seedIfEmpty(db);
  _db = db;
  return db;
}
