/**
 * Server-side validation for dashboard CRUD.
 *
 * The dashboard can only show a useful error if the server sends one, so every
 * rule lives here rather than in the form. Seeding does not go through this -
 * the seed data contains a genuine timetable clash and must load as-is.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v ?? ''));
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''));
const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const isInt = (v) => Number.isInteger(Number(v)) && String(v).trim() !== '';

export class ValidationError extends Error {
  constructor(details) {
    super(Object.values(details)[0] || 'Invalid input');
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.status = 400;
    this.details = details;
  }
}

const RULES = {
  schedules: (r, e) => {
    if (blank(r.course)) e.course = 'Course code is required.';
    if (blank(r.title)) e.title = 'Course title is required.';
    if (blank(r.day)) e.day = 'Pick a day.';
    else if (!DAYS.includes(r.day)) e.day = `The week runs Sunday to Thursday - "${r.day}" is not a class day.`;
    if (!isTime(r.start_time)) e.start_time = 'Start time must be 24-hour HH:MM.';
    if (!isTime(r.end_time)) e.end_time = 'End time must be 24-hour HH:MM.';
    if (isTime(r.start_time) && isTime(r.end_time) && r.end_time <= r.start_time) {
      e.end_time = `A class cannot end at ${r.end_time} when it starts at ${r.start_time}.`;
    }
  },

  rooms: (r, e) => {
    if (blank(r.room_number)) e.room_number = 'Room number is required.';
    if (r.type && !['classroom', 'lab', 'seminar'].includes(r.type)) e.type = 'Type must be classroom, lab or seminar.';
    if (blank(r.capacity)) e.capacity = 'Capacity is required.';
    else if (!isInt(r.capacity) || Number(r.capacity) < 1) e.capacity = 'Capacity must be a whole number of at least 1.';
    else if (Number(r.capacity) > 500) e.capacity = 'Capacity above 500 is not a real room on this campus.';
    if (!blank(r.floor) && !isInt(r.floor)) e.floor = 'Floor must be a whole number.';
    if (r.status && !['available', 'unavailable'].includes(r.status)) e.status = 'Status must be available or unavailable.';
  },

  events: (r, e) => {
    if (blank(r.name)) e.name = 'Event name is required.';
    if (!isDate(r.date)) e.date = 'Date must be YYYY-MM-DD.';
    if (!blank(r.start_time) && !isTime(r.start_time)) e.start_time = 'Start time must be 24-hour HH:MM.';
    if (!blank(r.end_time) && !isTime(r.end_time)) e.end_time = 'End time must be 24-hour HH:MM.';
    if (!blank(r.end_date)) {
      if (!isDate(r.end_date)) e.end_date = 'End date must be YYYY-MM-DD.';
      else if (isDate(r.date) && r.end_date < r.date) e.end_date = 'The event cannot end before it starts.';
    }
    // Single-day events must not run backwards. Multi-day ones legitimately can (09:00 Thu to 09:00 Fri).
    const sameDay = blank(r.end_date) || r.end_date === r.date;
    if (sameDay && isTime(r.start_time) && isTime(r.end_time) && r.end_time < r.start_time) {
      e.end_time = `The event cannot end at ${r.end_time} when it starts at ${r.start_time}.`;
    }
    if (!blank(r.capacity) && (!isInt(r.capacity) || Number(r.capacity) < 0)) {
      e.capacity = 'Capacity must be a whole number.';
    } else if (!blank(r.capacity) && Number.isInteger(r._registered) && Number(r.capacity) < r._registered) {
      e.capacity = `${r._registered} students are already registered - capacity cannot drop below that.`;
    }
    if (r.status && !['upcoming', 'ongoing', 'completed', 'cancelled', 'full'].includes(r.status)) {
      e.status = 'Unknown status.';
    }
  },

  announcements: (r, e) => {
    if (blank(r.title)) e.title = 'Title is required.';
    if (blank(r.body)) e.body = 'The notice needs a body.';
    if (!isDate(r.date)) e.date = 'Date must be YYYY-MM-DD.';
    if (r.priority && !['high', 'medium', 'low'].includes(r.priority)) e.priority = 'Priority must be high, medium or low.';
    if (!blank(r.expires)) {
      if (!isDate(r.expires)) e.expires = 'Expiry must be YYYY-MM-DD.';
      else if (isDate(r.date) && r.expires < r.date) e.expires = 'A notice cannot expire before it is posted.';
    }
  },

  assignments: (r, e) => {
    if (blank(r.course)) e.course = 'Course code is required.';
    if (blank(r.title)) e.title = 'Assignment title is required.';
    if (!isDate(r.deadline)) e.deadline = 'Deadline must be YYYY-MM-DD.';
    if (!blank(r.assigned_date)) {
      if (!isDate(r.assigned_date)) e.assigned_date = 'Assigned date must be YYYY-MM-DD.';
      else if (isDate(r.deadline) && r.deadline < r.assigned_date) e.deadline = 'The deadline is before the assignment was set.';
    }
    if (r.status && !['pending', 'submitted', 'graded', 'late'].includes(r.status)) e.status = 'Unknown status.';
    if (!blank(r.marks) && (!isInt(r.marks) || Number(r.marks) < 0)) e.marks = 'Marks must be a whole number.';
  },
};

/**
 * `record` is the full row as it would be after the write, so a PATCH that only
 * moves an end time is still checked against the start time already stored.
 */
export function validate(resource, record) {
  const rule = RULES[resource];
  if (!rule) return;
  const errors = {};
  rule(record, errors);
  if (Object.keys(errors).length) throw new ValidationError(errors);
}
