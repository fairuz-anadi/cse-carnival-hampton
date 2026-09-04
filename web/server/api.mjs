import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const seedDir = join(repoRoot, "data");
const dbDir = join(repoRoot, ".campusos-db");
const dbPath = join(dbDir, "campusos.json");

const collections = ["schedules", "rooms", "events", "announcements", "assignments"];
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const idPrefixes = {
  schedules: "sch",
  rooms: "room",
  events: "evt",
  announcements: "ann",
  assignments: "asgn"
};

let cache;
let writeQueue = Promise.resolve();

export function createApiMiddleware() {
  return async function campusApi(req, res, next) {
    if (!req.url?.startsWith("/api")) {
      next?.();
      return;
    }

    try {
      const result = await route(req);
      sendJson(res, result.status ?? 200, result.body);
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      sendJson(res, status, {
        error: {
          code: error.code ?? (status >= 500 ? "server_error" : "bad_request"),
          message: error.message ?? "Something went wrong"
        }
      });
    }
  };
}

async function route(req) {
  const url = new URL(req.url, "http://localhost");
  const segments = decodeURIComponent(url.pathname)
    .replace(/^\/api\/?/, "")
    .split("/")
    .filter(Boolean);

  if (segments.length === 1 && segments[0] === "health" && req.method === "GET") {
    const data = await readDb();
    return {
      body: {
        ok: true,
        collections: collections.reduce((counts, name) => ({ ...counts, [name]: data[name].length }), {})
      }
    };
  }

  if (segments[0] === "bookings" && segments.length === 2 && req.method === "DELETE") {
    return deleteBooking(segments[1]);
  }

  if (segments[0] === "agent" && segments.length === 1 && req.method === "POST") {
    const body = await readBody(req);
    return handleAgent(req, body);
  }

  const [collection, id, child, childId] = segments;
  if (!collections.includes(collection)) {
    throw httpError(404, "not_found", "API route not found");
  }

  if (segments.length === 1 && req.method === "GET") {
    const data = await readDb();
    return { body: data[collection] };
  }

  if (segments.length === 1 && req.method === "POST") {
    const body = await readBody(req);
    return createItem(collection, body);
  }

  if (segments.length === 2 && req.method === "PUT") {
    const body = await readBody(req);
    return updateItem(collection, id, body);
  }

  if (segments.length === 2 && req.method === "DELETE") {
    return deleteItem(collection, id);
  }

  if (collection === "rooms" && child === "bookings" && segments.length === 3 && req.method === "POST") {
    const body = await readBody(req);
    return createBooking(id, body);
  }

  if (collection === "events" && child === "registrations" && segments.length === 3 && req.method === "POST") {
    const body = await readBody(req);
    return createRegistration(id, body);
  }

  if (collection === "events" && child === "registrations" && segments.length === 4 && req.method === "DELETE") {
    return deleteRegistration(id, childId);
  }

  throw httpError(404, "not_found", "API route not found");
}

async function readDb() {
  if (cache) {
    return cache;
  }

  try {
    const contents = await readFile(dbPath, "utf8");
    cache = normalizeDb(JSON.parse(contents));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    cache = await loadSeedData();
    await persistDb(cache);
  }

  return cache;
}

async function loadSeedData() {
  const entries = await Promise.all(
    collections.map(async (name) => {
      const contents = await readFile(join(seedDir, `${name}.json`), "utf8");
      return [name, JSON.parse(contents)];
    })
  );
  return normalizeDb(Object.fromEntries(entries));
}

function normalizeDb(source) {
  return collections.reduce((next, name) => {
    next[name] = Array.isArray(source?.[name]) ? source[name].map((item) => normalizeItem(name, item)) : [];
    return next;
  }, {});
}

function normalizeItem(collection, item) {
  if (collection === "rooms") {
    return { ...item, equipment: arrayOfStrings(item.equipment), bookings: Array.isArray(item.bookings) ? item.bookings : [] };
  }

  if (collection === "events") {
    return {
      ...item,
      registrations: Array.isArray(item.registrations) ? item.registrations : [],
      registered: Number.isFinite(Number(item.registered)) ? Number(item.registered) : 0
    };
  }

  return { ...item };
}

async function mutateDb(mutator) {
  const data = await readDb();
  const result = mutator(data);
  writeQueue = writeQueue.then(() => persistDb(data));
  await writeQueue;
  return result;
}

async function persistDb(data) {
  await mkdir(dbDir, { recursive: true });
  await writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function createItem(collection, body) {
  if (!isObject(body)) {
    throw httpError(400, "invalid_body", "Request body must be an object");
  }

  return mutateDb((data) => {
    const item = normalizeItem(collection, {
      ...body,
      id: body.id || nextId(data[collection], idPrefixes[collection])
    });
    data[collection].push(item);
    return { status: 201, body: item };
  });
}

async function updateItem(collection, id, body) {
  if (!isObject(body)) {
    throw httpError(400, "invalid_body", "Request body must be an object");
  }

  return mutateDb((data) => {
    const index = data[collection].findIndex((item) => item.id === id);
    if (index === -1) {
      throw httpError(404, "not_found", `${label(collection)} record not found`);
    }

    const updated = normalizeItem(collection, { ...data[collection][index], ...body, id });
    data[collection][index] = updated;
    return { body: updated };
  });
}

async function deleteItem(collection, id) {
  return mutateDb((data) => {
    const before = data[collection].length;
    data[collection] = data[collection].filter((item) => item.id !== id);
    if (data[collection].length === before) {
      throw httpError(404, "not_found", `${label(collection)} record not found`);
    }
    return { status: 204, body: null };
  });
}

async function createBooking(roomId, body) {
  requireFields(body, ["booked_by", "date", "start_time", "end_time", "purpose"]);
  if (body.start_time >= body.end_time) {
    throw httpError(400, "invalid_time", "Booking start time must be before end time");
  }

  return mutateDb((data) => {
    const room = data.rooms.find((item) => item.id === roomId);
    if (!room) {
      throw httpError(404, "not_found", "Room not found");
    }
    if (room.status === "unavailable") {
      throw httpError(409, "room_unavailable", `${room.room_number} is unavailable`);
    }
    const conflict = room.bookings.some(
      (booking) =>
        booking.date === body.date &&
        body.start_time < booking.end_time &&
        body.end_time > booking.start_time
    );
    if (conflict) {
      throw httpError(409, "booking_conflict", `${room.room_number} is already booked for that time`);
    }

    const booking = {
      booking_id: nextBookingId(data.rooms),
      booked_by: body.booked_by,
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      purpose: body.purpose
    };
    room.bookings.push(booking);
    return { status: 201, body: room };
  });
}

async function deleteBooking(bookingId) {
  return mutateDb((data) => {
    for (const room of data.rooms) {
      const before = room.bookings.length;
      room.bookings = room.bookings.filter((booking) => booking.booking_id !== bookingId);
      if (room.bookings.length !== before) {
        return { status: 204, body: null };
      }
    }
    throw httpError(404, "not_found", "Booking not found");
  });
}

async function createRegistration(eventId, body) {
  requireFields(body, ["student_id", "name"]);

  return mutateDb((data) => {
    const event = data.events.find((item) => item.id === eventId);
    if (!event) {
      throw httpError(404, "not_found", "Event not found");
    }
    if (event.registrations.some((registration) => registration.student_id === body.student_id)) {
      throw httpError(409, "already_registered", "This student is already registered");
    }
    if (event.registered >= event.capacity || event.status === "full") {
      throw httpError(409, "event_full", `${event.name} is full`);
    }

    event.registrations.push({ student_id: body.student_id, name: body.name });
    event.registered += 1;
    if (event.registered >= event.capacity) {
      event.status = "full";
    }
    return { status: 201, body: event };
  });
}

async function deleteRegistration(eventId, studentId) {
  return mutateDb((data) => {
    const event = data.events.find((item) => item.id === eventId);
    if (!event) {
      throw httpError(404, "not_found", "Event not found");
    }

    const before = event.registrations.length;
    event.registrations = event.registrations.filter((registration) => registration.student_id !== studentId);
    if (event.registrations.length === before) {
      throw httpError(404, "not_found", "Registration not found");
    }

    event.registered = Math.max(0, event.registered - 1);
    if (event.status === "full" && event.registered < event.capacity) {
      event.status = "upcoming";
    }
    return { status: 204, body: null };
  });
}

async function handleAgent(req, body) {
  if (!isObject(body) || typeof body.message !== "string" || !body.message.trim()) {
    throw httpError(400, "invalid_body", "Message is required");
  }

  const message = body.message.trim();
  const text = message.toLowerCase();
  const userId = req.headers["x-user-id"] || "20-40532";
  const data = await readDb();

  if (text.includes("next class")) {
    return { body: agentReply(nextClassAnswer(data.schedules)) };
  }

  const requestedDay = weekDays.find((day) => text.includes(day.toLowerCase()));
  if (requestedDay && (text.includes("class") || text.includes("classes"))) {
    const classes = data.schedules
      .filter((schedule) => schedule.day === requestedDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return { body: agentReply(formatList(classes, (item) => `${item.start_time}-${item.end_time}: ${item.course} in ${item.room} with ${item.instructor}`) || `No classes found for ${requestedDay}.`) };
  }

  if (text.includes("assignment") || text.includes("due")) {
    const due = data.assignments
      .filter((assignment) => assignment.deadline >= todayIsoLocal() && assignment.deadline <= daysFromNow(7))
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
    return { body: agentReply(formatList(due, (item) => `${item.deadline}: ${item.course} - ${item.title} (${item.status})`) || "No assignments are due in the next 7 days.") };
  }

  if (text.includes("high priority") || (text.includes("announcement") && text.includes("high"))) {
    const announcements = data.announcements
      .filter((announcement) => announcement.priority === "high")
      .sort((a, b) => b.date.localeCompare(a.date));
    return { body: agentReply(formatList(announcements, (item) => `${item.date}: ${item.title} - ${item.body}`) || "No high priority announcements are active.") };
  }

  if (text.includes("lab") && text.includes("projector")) {
    const minCapacity = numberAfter(text, "at least") ?? numberAfter(text, "fit") ?? 0;
    const labs = data.rooms
      .filter((room) => room.type === "lab" && room.capacity >= minCapacity && room.equipment.map((item) => item.toLowerCase()).includes("projector"))
      .sort((a, b) => a.room_number.localeCompare(b.room_number));
    return { body: agentReply(formatList(labs, (item) => `${item.room_number}: capacity ${item.capacity}, ${item.equipment.join(", ")}`) || "No matching labs found.") };
  }

  if (text.includes("free until") || text.includes("drop into")) {
    const cutoff = parseSingleTime(text) ?? "14:00";
    const events = data.events
      .filter((event) => event.date === todayIsoLocal() && event.start_time < cutoff && !["cancelled", "completed"].includes(event.status))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return { body: agentReply(formatList(events, (item) => `${item.start_time}-${item.end_time}: ${item.name} at ${item.venue}`) || `Nothing is scheduled before ${cutoff} today.`) };
  }

  if (text.includes("register")) {
    const event = findEvent(data.events, text);
    if (!event) {
      return { body: agentReply("I could not find a matching event. Try the event name, for example: Register me for Guest Lecture.") };
    }
    if (event.registrations.some((registration) => registration.student_id === String(userId))) {
      return { body: agentReply(`${studentName(String(userId))} is already registered for ${event.name}.`) };
    }
    if (event.registered >= event.capacity || event.status === "full") {
      return { body: agentReply(`${event.name} is already full.`) };
    }
    const result = await createRegistration(event.id, {
      student_id: String(userId),
      name: studentName(String(userId))
    });
    return { body: agentReply(`Registered ${studentName(String(userId))} for ${result.body.name}.`) };
  }

  if (text.includes("book") || text.includes("need a room")) {
    const timeRange = parseTimeRange(text);
    if (!timeRange) {
      return { body: agentReply("Please include a clear start and end time before I book a room.") };
    }

    const date = text.includes("tomorrow") ? daysFromNow(1) : todayIsoLocal();
    const roomNumber = matchRoomNumber(text);
    const minCapacity = numberAfter(text, "for") ?? 1;
    const wantsProjector = text.includes("projector");
    const room = roomNumber
      ? data.rooms.find((item) => item.room_number.toLowerCase() === roomNumber.toLowerCase())
      : data.rooms.find((item) => roomMatchesRequest(item, minCapacity, wantsProjector, date, timeRange));

    if (!room) {
      return { body: agentReply("I could not find an available matching room for that time.") };
    }
    if (!roomMatchesRequest(room, minCapacity, wantsProjector, date, timeRange)) {
      return { body: agentReply(`${room.room_number} is not available for ${date}, ${timeRange.start}-${timeRange.end}.`) };
    }

    const result = await createBooking(room.id, {
      booked_by: studentName(String(userId)),
      date,
      start_time: timeRange.start,
      end_time: timeRange.end,
      purpose: "Campus agent booking"
    });
    return {
      body: agentReply(`Booked ${result.body.room_number} on ${date}, ${timeRange.start}-${timeRange.end}.`)
    };
  }

  return {
    body: agentReply("I can check classes, assignments, announcements, rooms, events, and can book rooms or register you for events.")
  };
}

function nextClassAnswer(schedules) {
  const now = new Date();
  const currentDay = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const currentIndex = weekDays.indexOf(currentDay);

  for (let offset = 0; offset < weekDays.length + 1; offset += 1) {
    const day = weekDays[(Math.max(currentIndex, 0) + offset) % weekDays.length];
    const isToday = currentIndex !== -1 && offset === 0;
    const classes = schedules
      .filter((schedule) => schedule.day === day && (!isToday || schedule.start_time >= currentTime))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (classes[0]) {
      const item = classes[0];
      return `Your next class is ${item.course} (${item.title}) on ${item.day}, ${item.start_time}-${item.end_time}, in ${item.room} with ${item.instructor}.`;
    }
  }

  return "I could not find any upcoming classes.";
}

function roomMatchesRequest(room, minCapacity, wantsProjector, date, timeRange) {
  if (room.status !== "available" || room.capacity < minCapacity) {
    return false;
  }
  if (wantsProjector && !room.equipment.map((item) => item.toLowerCase()).includes("projector")) {
    return false;
  }
  return !room.bookings.some(
    (booking) =>
      booking.date === date &&
      timeRange.start < booking.end_time &&
      timeRange.end > booking.start_time
  );
}

function parseTimeRange(text) {
  const normalized = text.replace(/\./g, "").toLowerCase();
  const match =
    normalized.match(/(?:from|between)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|and|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/) ||
    normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(?:to|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (!match) {
    return null;
  }

  let startSuffix = match[3] || match[6] || "";
  let endSuffix = match[6] || startSuffix;
  if (!startSuffix && !endSuffix && Number(match[1]) < 8 && Number(match[4]) <= 8) {
    startSuffix = "pm";
    endSuffix = "pm";
  }
  return {
    start: toTime(match[1], match[2], startSuffix),
    end: toTime(match[4], match[5], endSuffix)
  };
}

function parseSingleTime(text) {
  const match = text.toLowerCase().match(/until\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  return match ? toTime(match[1], match[2], match[3] || "pm") : null;
}

function toTime(hourValue, minuteValue = "00", suffix = "") {
  let hour = Number(hourValue);
  if (suffix === "pm" && hour < 12) {
    hour += 12;
  }
  if (suffix === "am" && hour === 12) {
    hour = 0;
  }
  return `${String(hour).padStart(2, "0")}:${String(Number(minuteValue ?? "00")).padStart(2, "0")}`;
}

function findEvent(events, text) {
  const normalized = text.toLowerCase();
  return events.find((event) => normalized.includes(event.name.toLowerCase())) ??
    events.find((event) => event.name.toLowerCase().split(/[\s:&-]+/).some((part) => part.length > 5 && normalized.includes(part)));
}

function matchRoomNumber(text) {
  return text.match(/\b\d[A-Z]\d{2}\b/i)?.[0] ?? null;
}

function numberAfter(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escaped}\\s+(\\d+)`));
  return match ? Number(match[1]) : null;
}

function formatList(items, formatter) {
  return items.map(formatter).join("\n");
}

function agentReply(message) {
  return { message };
}

function studentName(userId) {
  if (userId === "21-41205") {
    return "Rafi Hossain";
  }
  if (userId === "admin-cse") {
    return "CSE Admin";
  }
  return "Sakibul Hassan";
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function todayIsoLocal() {
  return formatDate(new Date());
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw httpError(400, "invalid_json", "Request body must be valid JSON");
  }
}

function requireFields(body, fields) {
  if (!isObject(body)) {
    throw httpError(400, "invalid_body", "Request body must be an object");
  }

  const missing = fields.filter((field) => body[field] == null || body[field] === "");
  if (missing.length > 0) {
    throw httpError(400, "missing_fields", `Missing required fields: ${missing.join(", ")}`);
  }
}

function nextId(items, prefix) {
  const max = items.reduce((highest, item) => {
    const match = String(item.id ?? "").match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function nextBookingId(rooms) {
  const bookings = rooms.flatMap((room) => room.bookings ?? []);
  const max = bookings.reduce((highest, booking) => {
    const match = String(booking.booking_id ?? "").match(/^bk-(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `bk-${String(max + 1).padStart(3, "0")}`;
}

function arrayOfStrings(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function label(collection) {
  return collection.slice(0, -1);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (status === 204) {
    res.end();
    return;
  }

  res.end(JSON.stringify(body));
}
