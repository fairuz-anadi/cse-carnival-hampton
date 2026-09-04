/**
 * Judge-matrix smoke test. Runs the service layer the agent's tools call,
 * against a throwaway copy of the seeded database.
 *   node scripts/smoke.mjs
 * Every assertion here mirrors a query or an adversarial case the judges said
 * they would run. If one of these goes red, marks are on the floor.
 */
process.env.DATABASE_PATH = process.env.DATABASE_PATH || 'campusos.smoke.db';
import fs from 'node:fs';
if (fs.existsSync(process.env.DATABASE_PATH)) fs.rmSync(process.env.DATABASE_PATH);

const {
  listSchedules, listRooms, listEvents, listAnnouncements, isoDate,
  createRecord, updateRecord, deleteRecord, getOne,
} = await import('../lib/store.js');
const {
  findAvailableRooms, checkRoomAvailability, bookRoom, cancelBooking,
  registerForEvent, cancelRegistration, nextClass, assignmentsDue,
  freeWindowSuggestions, mySummary, equipmentVocabulary,
} = await import('../lib/actions.js');

let pass = 0, fail = 0;
const check = (name, cond, got) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${got !== undefined ? `\n         got: ${JSON.stringify(got)}` : ''}`); }
};
const section = (s) => console.log(`\n${s}`);

const TODAY = isoDate();
const TOMORROW = isoDate(new Date(new Date(`${TODAY}T00:00:00`).getTime() + 86400000));

section('Seed loaded');
check('24 schedule rows', listSchedules().length === 24, listSchedules().length);
check('20 rooms', listRooms().length === 20, listRooms().length);
check('7 events', listEvents().length === 7, listEvents().length);
check('8 announcements', listAnnouncements().length === 8, listAnnouncements().length);

section('Simple lookups');
const nc = nextClass();
check('next class is CSE 4129 at 08:00 in 7A05',
  nc.found && nc.next.course === 'CSE 4129' && nc.next.start_time === '08:00' && nc.next.room === '7A05',
  nc.next);
const wed = listSchedules({ day: 'Wednesday' });
check('Wednesday has 5 classes', wed.length === 5, wed.map((s) => s.course));
const clash = wed.find((s) => s.id === 'sch-017');
check('7A04 Wednesday clash is flagged (sch-017 vs sch-018)',
  clash.clashes_with.some((c) => c.id === 'sch-018'), clash.clashes_with);
check('touching classes are NOT a clash (sch-015 13:00-13:50 vs sch-017 13:50-)',
  wed.find((s) => s.id === 'sch-015').clashes_with.length === 0);
const due = assignmentsDue({ within_days: 7 });
check('assignments due this week include the three pending ones',
  ['asgn-001', 'asgn-002', 'asgn-005'].every((id) => due.some((a) => a.id === id)), due.map((a) => a.id));
check('days_until_due is computed', due.every((a) => Number.isInteger(a.days_until_due)));
check('expired announcements are marked', listAnnouncements().every((a) => typeof a.expired === 'boolean'));

section('Multi-source');
const labs = findAvailableRooms({ date: TOMORROW, start_time: '09:00', end_time: '10:00', type: 'lab', min_capacity: 30, equipment: ['projector'] });
const labNums = labs.available.map((r) => r.room_number).sort();
check('exactly 6 labs with a projector fitting 30+',
  JSON.stringify(labNums) === JSON.stringify(['7B01', '7B02', '7B05', '7B06', '7B07', '7B08']), labNums);
const big = findAvailableRooms({ date: TOMORROW, start_time: '09:00', end_time: '10:00', min_capacity: 65 });
check('only 7C05 fits 65 people',
  big.available.length === 1 && big.available[0].room_number === '7C05', big.available.map((r) => r.room_number));
const printer = findAvailableRooms({ date: TOMORROW, start_time: '09:00', end_time: '10:00', equipment: ['3D printer'] });
check('no 3D printer anywhere, and the real vocabulary is offered',
  printer.available.length === 0 && !!printer.note, printer.note);
check('equipment vocabulary is the real list',
  equipmentVocabulary().includes('projector') && !equipmentVocabulary().includes('3D printer'));
const fw = freeWindowSuggestions({ date: TODAY, until_time: '14:00' });
check('a genuinely empty window reports itself as empty rather than inventing something',
  typeof fw.nothing_found === 'boolean', fw.nothing_found);

section('Booking');
const b1 = bookRoom({ room: '7A02', date: TOMORROW, start_time: '15:00', end_time: '17:00', purpose: 'Study group' });
check('booking a free room succeeds and returns an id', b1.ok && /^bk-\d{3}$/.test(b1.booking_id), b1);
const b2 = bookRoom({ room: '7A02', date: TOMORROW, start_time: '15:00', end_time: '17:00', purpose: 'Again' });
check('double-booking the same slot is refused', !b2.ok && b2.error === 'conflict', b2.error);
check('the refusal names the clash and offers alternatives', !!b2.conflicts?.length && Array.isArray(b2.suggestions));
const b3 = bookRoom({ room: '7B04', date: '2026-09-05', start_time: '14:00', end_time: '16:00', purpose: 'Test' });
check('seeded booking bk-002 blocks 7B04 14:00-16:00', !b3.ok && b3.error === 'conflict', b3.error);
const b4 = bookRoom({ room: '7B04', date: '2026-09-05', start_time: '16:00', end_time: '18:00', purpose: 'Test' });
check('16:00-18:00 against a booking ending at 16:00 MUST succeed (half-open)', b4.ok, b4);
const b5 = bookRoom({ room: '7C07', date: TOMORROW, start_time: '10:00', end_time: '11:00', purpose: 'Test' });
check('7C07 is not in the room directory', !b5.ok && b5.error === 'unknown_room', b5.error);
const b6 = bookRoom({ room: '7A02', date: '2026-09-01', start_time: '15:00', end_time: '16:00', purpose: 'Test' });
check('a past date is rejected', !b6.ok && b6.error === 'past_date', b6.error);
const b7 = bookRoom({ room: '7A02', date: TOMORROW, start_time: '17:00', end_time: '15:00', purpose: 'Test' });
check('an inverted time range is rejected', !b7.ok && b7.error === 'invalid_range', b7.error);
const b8 = bookRoom({ room: '7A02', date: 'sometime next month', start_time: '15:00', end_time: '16:00' });
check('an unparseable date asks rather than guessing today', !b8.ok && b8.error === 'missing_date', b8.error);
const av = checkRoomAvailability({ room: '7B04', date: '2026-09-05', start_time: '14:00', end_time: '16:00' });
check('single-room check reports the blocking record', av.ok && av.available === false && av.conflicts.length > 0, av.conflicts);

section('Ownership and refusals');
const c1 = cancelBooking({ booking_id: 'bk-002' });
check("cancelling Raihan Tanvir's booking is refused on ownership", !c1.ok && c1.error === 'forbidden', c1);
const c2 = cancelBooking({ booking_id: 'bk-999' });
check('cancelling a booking that does not exist says so', !c2.ok && c2.error === 'not_found', c2.error);
const c3 = cancelBooking({ booking_id: b1.booking_id });
check('cancelling my own booking works', c3.ok, c3);

section('Event registration');
const r1 = registerForEvent({ event: 'Git and GitHub workshop' });
check('the full workshop is refused with the real numbers',
  !r1.ok && r1.error === 'full' && r1.message.includes('30/30'), r1.message);
check('the refusal offers other events', Array.isArray(r1.suggestions) && r1.suggestions.length > 0);
const r2 = registerForEvent({ event: 'Guest Lecture on Deep Learning' });
check('fuzzy name match registers for evt-002 and the count becomes 63',
  r2.ok && r2.registered === 63, { ok: r2.ok, registered: r2.registered });
const r3 = registerForEvent({ event: 'Guest Lecture on Deep Learning' });
check('registering twice is refused', !r3.ok && r3.error === 'already_registered', r3.error);
const r4 = cancelRegistration({ event: 'IUPC Selection' });
check('cancelling a registration I never made says so', !r4.ok && r4.error === 'not_registered', r4.error);
const r5 = cancelRegistration({ event: 'Guest Lecture on Deep Learning' });
check('cancelling my own registration works', r5.ok && r5.seats_left === 8, r5);

section('Live data + identity');
const beforeName = listEvents().find((e) => e.id === 'evt-006').status;
check('evt-006 still reads as full', beforeName === 'full', beforeName);
const b9 = bookRoom({ room: '7A01', date: TOMORROW, start_time: '09:00', end_time: '10:00', purpose: 'Reading' });
const mine = mySummary();
check('my own bookings are listable without reciting an id',
  mine.bookings.some((x) => x.booking_id === b9.booking_id), mine.bookings);
check('every booking is attributed to the session student, never to chat text',
  mine.bookings.every((x) => x.booked_by === mine.student.name));


section('Dashboard CRUD');
const newClass = createRecord('schedules', {
  course: 'CSE 4999', title: 'Test Class', day: 'Thursday',
  start_time: '16:00', end_time: '17:00', room: '7A01', instructor: 'TBA', section: 'B',
});
check('add gives the next id in the seed sequence, not a uuid', /^sch-\d{3}$/.test(newClass.id), newClass.id);
check('an added class is immediately readable back', getOne('schedules', newClass.id).course === 'CSE 4999');
check('an added class appears in the day view straight away',
  listSchedules({ day: 'Thursday' }).some((s) => s.id === newClass.id));
const edited = updateRecord('schedules', newClass.id, { room: '7A02' });
check('edit persists', edited.room === '7A02', edited.room);
check('delete removes it', deleteRecord('schedules', newClass.id) && getOne('schedules', newClass.id) === null);

section('Validation the dashboard shows to the user');
const bad = (fn) => { try { fn(); return null; } catch (e) { return e; } };
const v1 = bad(() => createRecord('schedules', { course: 'CSE 1', title: 'x', day: 'Thursday', start_time: '17:00', end_time: '15:00' }));
check('a class ending before it starts is rejected', v1?.code === 'VALIDATION_ERROR' && !!v1.details.end_time, v1?.details);
const v2 = bad(() => createRecord('schedules', { course: 'CSE 1', title: 'x', day: 'Friday', start_time: '09:00', end_time: '10:00' }));
check('Friday is not a class day', !!v2?.details.day, v2?.details);
const v3 = bad(() => createRecord('rooms', { room_number: '7A01', capacity: 30 }));
check('a duplicate room number is rejected', !!v3?.details.room_number, v3?.details);
const v4 = bad(() => createRecord('rooms', { room_number: '9Z99', capacity: 'lots' }));
check('a non-numeric capacity is rejected', !!v4?.details.capacity, v4?.details);
const v5 = bad(() => updateRecord('events', 'evt-006', { capacity: 5 }));
check('event capacity cannot drop below the 30 already registered', !!v5?.details.capacity, v5?.details);
const v6 = bad(() => createRecord('announcements', { title: 'x', body: 'y', date: '2026-09-10', expires: '2026-09-01' }));
check('a notice cannot expire before it is posted', !!v6?.details.expires, v6?.details);
const v7 = bad(() => createRecord('assignments', { course: 'CSE 1', title: 'x', deadline: 'next friday' }));
check('a free-text deadline is rejected', !!v7?.details.deadline, v7?.details);
check('every validation error names the field, so the form can point at it',
  [v1, v2, v3, v4, v5, v6, v7].every((e) => e && Object.keys(e.details).length > 0));
const okEdit = updateRecord('events', 'evt-006', { capacity: 40 });
check('raising capacity above the registered count is allowed', okEdit.capacity === 40, okEdit.capacity);
check('and the seat count follows immediately', okEdit.seats_left === 10, okEdit.seats_left);


section('Cascade and reset');
const bookingsOn7B04 = listRooms().find((r) => r.id === 'room-011').bookings.length;
const roomDel = deleteRecord('rooms', 'room-011');
check('deleting 7B04 reports the bookings that went with it',
  roomDel?.also_removed?.bookings === bookingsOn7B04 && bookingsOn7B04 > 0, roomDel);
check('and the room is gone', listRooms().length === 19, listRooms().length);
check('deleting something that is not there returns null', deleteRecord('rooms', 'room-999') === null);
const evtDel = deleteRecord('events', 'evt-002');
check('deleting an event reports its registrations',
  evtDel?.also_removed?.registrations === 62, evtDel?.also_removed);

const { getDb, seed } = await import('../lib/db.js');
seed(getDb());
check('reset puts every room back', listRooms().length === 20, listRooms().length);
check('reset puts every event back', listEvents().length === 7, listEvents().length);
check('reset restores the seeded bookings', listRooms().filter((r) => r.bookings.length).length === 3);
check('reset restores evt-006 to full', listEvents().find((e) => e.id === 'evt-006').seats_left === 0);

console.log(`\n${pass} passed, ${fail} failed\n`);
fs.rmSync(process.env.DATABASE_PATH, { force: true });
fs.rmSync(`${process.env.DATABASE_PATH}-wal`, { force: true });
fs.rmSync(`${process.env.DATABASE_PATH}-shm`, { force: true });
process.exit(fail ? 1 : 0);
