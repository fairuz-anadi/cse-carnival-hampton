import { getDb, seed } from '../lib/db.js';
const db = getDb();
seed(db);
const n = db.prepare('SELECT COUNT(*) AS n FROM schedules').get().n;
console.log(`Database reseeded from data/*.json — ${n} schedule rows.`);
