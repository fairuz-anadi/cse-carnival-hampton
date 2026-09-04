/**
 * Agent-layer smoke test. Exercises the tool surface the model actually calls —
 * schemas, dispatch, and what each tool hands back — without spending an API key.
 *   node scripts/agent-smoke.mjs
 * scripts/smoke.mjs covers the services underneath; this covers the layer between
 * those services and the LLM, which is where a wrong schema or a missing tool hides.
 */
process.env.DATABASE_PATH = process.env.DATABASE_PATH || 'campusos.agent.db';
import fs from 'node:fs';
if (fs.existsSync(process.env.DATABASE_PATH)) fs.rmSync(process.env.DATABASE_PATH);

const { TOOLS, TOOL_MAP, runTool, systemPrompt } = await import('../lib/agent-tools.js');
const { isoDate } = await import('../lib/store.js');

let pass = 0, fail = 0;
const check = (name, cond, got) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${got !== undefined ? `\n         got: ${JSON.stringify(got)}` : ''}`); }
};
const section = (s) => console.log(`\n${s}`);

const WRITE_TOOLS = ['book_room', 'cancel_room_booking', 'register_for_event', 'cancel_event_registration'];

section('Tool inventory');
check('every tool has a name, description and object schema',
  TOOLS.every((t) => t.name && t.description && t.parameters?.type === 'object'));
check('no duplicate tool names', new Set(TOOLS.map((t) => t.name)).size === TOOLS.length);
check('every tool is runnable', TOOLS.every((t) => typeof t.run === 'function'));
check('required params are all declared in properties',
  TOOLS.every((t) => (t.parameters.required || []).every((r) => t.parameters.properties?.[r])),
  TOOLS.filter((t) => (t.parameters.required || []).some((r) => !t.parameters.properties?.[r])).map((t) => t.name));
check('the four write tools are present', WRITE_TOOLS.every((n) => TOOL_MAP[n]));
check('no tool can edit schedules, rooms, events, announcements or assignments',
  !TOOLS.some((t) => /^(create|update|delete|edit|add|remove)_/.test(t.name)),
  TOOLS.map((t) => t.name).filter((n) => /^(create|update|delete|edit|add|remove)_/.test(n)));

section('Clock — no guessing what day it is');
const clock = runTool('get_current_datetime', {});
check('get_current_datetime exists and returns today', clock.date === isoDate(), clock);
check('it reports the weekday and the timezone', !!clock.day && clock.timezone === 'Asia/Dhaka', clock);
check("it resolves tomorrow rather than leaving it to the model", /^\d{4}-\d{2}-\d{2}$/.test(clock.tomorrow_date || ''), clock);
check('the prompt and the tools agree on the date',
  systemPrompt().includes(clock.date) && systemPrompt().includes(clock.day), clock.date);

section('Reads reach live data');
check('get_class_schedule returns the timetable', runTool('get_class_schedule', {}).length === 24);
check('a day filter narrows it', runTool('get_class_schedule', { day: 'Wednesday' }).length === 5);
check('get_announcements hides expired notices by default',
  runTool('get_announcements', {}).every((a) => !a.expires || a.expires >= isoDate()));
check('include_expired brings them back', runTool('get_announcements', { include_expired: true }).length === 8);
check('get_rooms filters on capacity and equipment together',
  runTool('get_rooms', { type: 'lab', min_capacity: 30, equipment: ['projector'] }).length === 6,
  runTool('get_rooms', { type: 'lab', min_capacity: 30, equipment: ['projector'] }).map((r) => r.room_number));
check('get_next_class carries the announcements that could override it',
  Array.isArray(runTool('get_next_class', {}).related_announcements));
check('whats_on reads classes and events together',
  'classes_that_day' in runTool('whats_on', { date: 'today' }) && 'events_that_day' in runTool('whats_on', { date: 'today' }));

section('Checking a room does not book it');
const before = runTool('get_rooms', {}).flatMap((r) => r.bookings).length;
const avail = runTool('check_room_availability', { room: '7B04', date: '2026-09-05', start_time: '14:00', end_time: '16:00' });
check('check_room_availability exists and reports the blocker',
  avail.ok && avail.available === false && avail.conflicts.length > 0, avail.conflicts);
check('an unknown room is named as unknown, not invented',
  runTool('check_room_availability', { room: '7C07', date: 'tomorrow', start_time: '10:00', end_time: '11:00' }).error === 'unknown_room');
check('checking wrote nothing', runTool('get_rooms', {}).flatMap((r) => r.bookings).length === before);

section('"My" records resolve without reciting an id');
const mine0 = runTool('get_my_bookings_and_registrations', {});
check('get_my_bookings_and_registrations exists', !!mine0 && Array.isArray(mine0.bookings), mine0);
const booked = runTool('book_room', { room: '7A01', date: 'tomorrow', start_time: '09:00', end_time: '10:00', purpose: 'Reading' });
check('booking through the tool layer succeeds', booked.ok, booked);
const mine1 = runTool('get_my_bookings_and_registrations', {});
check('the new booking shows up as mine', mine1.bookings.some((b) => b.booking_id === booked.booking_id));
check('it carries the room number, not just a room id',
  mine1.bookings.every((b) => /^\d[A-C]\d\d$/.test(b.room_number)), mine1.bookings.map((b) => b.room_number));
check('cancelling by that id works', runTool('cancel_room_booking', { booking_id: booked.booking_id }).ok);

section('Refusals travel back as data, never as a crash');
const full = runTool('register_for_event', { event: 'Git and GitHub workshop' });
check('a full event is refused with real numbers', full.ok === false && full.error === 'full' && full.message.includes('30/30'), full.message);
check('an unknown tool name is reported, not thrown', runTool('no_such_tool', {}).error?.includes('Unknown tool'));
check('a tool called with no arguments does not throw', typeof runTool('get_events', undefined) === 'object');
check('a bad date on a write refuses instead of guessing',
  runTool('book_room', { room: '7A02', date: 'sometime next week', start_time: '15:00', end_time: '16:00' }).error === 'missing_date');

section('System prompt carries rules, not campus data');
const p = systemPrompt();
check('no room list is baked into the prompt', !/7A0\d.*7A0\d/s.test(p));
check('no course codes are baked in', !/CSE 41\d\d/.test(p));
check('it tells the model to re-read rather than remember', /never answer .* from memory/i.test(p));
check('it tells the model to ask when a request is vague', /clarifying question/i.test(p));

console.log(`\n${pass} passed, ${fail} failed\n`);
try {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${process.env.DATABASE_PATH}${suffix}`, { force: true });
  }
} catch {
  // Windows keeps a handle on the sqlite file until the process exits; the
  // leftover is gitignored, so a failed cleanup must not fail the run.
}
process.exit(fail ? 1 : 0);
