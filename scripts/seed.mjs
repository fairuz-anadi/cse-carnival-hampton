/**
 * Load data/*.json into SQLite.
 *   node scripts/seed.mjs           reseed the rows in place
 *   node scripts/seed.mjs --force   delete the database file first, then rebuild
 *
 * data/*.json is only ever read. Nothing is written back to it.
 */
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'campusos.db');

if (process.argv.includes('--force')) {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    fs.rmSync(`${DB_PATH}${suffix}`, { force: true });
  }
  console.log(`Removed ${path.basename(DB_PATH)} - rebuilding from scratch.`);
}

const { getDb, seed } = await import('../lib/db.js');
const db = getDb();
seed(db);

const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log(
  `Seeded: ${count('schedules')} classes, ${count('rooms')} rooms, ${count('events')} events, ` +
  `${count('announcements')} announcements, ${count('assignments')} assignments, ` +
  `${count('room_bookings')} bookings.`
);
