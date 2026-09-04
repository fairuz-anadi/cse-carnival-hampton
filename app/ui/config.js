const day = { name: 'day', label: 'Day', type: 'select', options: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] };
const priority = { name: 'priority', label: 'Priority', type: 'select', options: ['high', 'medium', 'low'] };

export const SECTIONS = {
  schedules: {
    label: 'Schedule',
    singular: 'class',
    blurb: 'Weekly class routine — Sunday to Thursday.',
    fields: [
      { name: 'course', label: 'Course code', required: true },
      { name: 'title', label: 'Course title', required: true },
      day,
      { name: 'start_time', label: 'Start', type: 'time', required: true },
      { name: 'end_time', label: 'End', type: 'time', required: true },
      { name: 'room', label: 'Room' },
      { name: 'instructor', label: 'Instructor' },
      { name: 'section', label: 'Section' },
    ],
    columns: [
      { key: 'course', header: 'Course', mono: true, sub: (r) => r.title },
      { key: 'day', header: 'Day' },
      { key: 'time', header: 'Time', mono: true, value: (r) => `${r.start_time}–${r.end_time}` },
      { key: 'room', header: 'Room', mono: true },
      { key: 'instructor', header: 'Instructor', sub: (r) => `Section ${r.section}` },
    ],
  },
  rooms: {
    label: 'Rooms',
    singular: 'room',
    blurb: 'Capacity, equipment and every booking held against each room.',
    fields: [
      { name: 'room_number', label: 'Room number', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['classroom', 'lab', 'seminar'] },
      { name: 'capacity', label: 'Capacity', type: 'number', required: true },
      { name: 'equipment', label: 'Equipment (comma separated)', list: true },
      { name: 'floor', label: 'Floor', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['available', 'unavailable'] },
    ],
    columns: [
      { key: 'room_number', header: 'Room', mono: true, sub: (r) => r.type },
      { key: 'capacity', header: 'Seats', mono: true },
      { key: 'equipment', header: 'Equipment', value: (r) => (r.equipment || []).join(', ') || '—' },
      { key: 'floor', header: 'Floor', mono: true },
      { key: 'status', header: 'Status', pill: (r) => r.status },
      {
        key: 'bookings', header: 'Bookings', mono: true,
        value: (r) => (r.bookings?.length ? `${r.bookings.length} booked` : 'free'),
        sub: (r) => r.bookings?.map((b) => `${b.date} ${b.start_time}–${b.end_time} · ${b.booked_by}`).join('\n') || null,
      },
    ],
  },
  events: {
    label: 'Events',
    singular: 'event',
    blurb: 'Campus events, capacity and live registration counts.',
    fields: [
      { name: 'name', label: 'Event name', required: true },
      { name: 'description', label: 'Description', type: 'textarea', full: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'start_time', label: 'Start', type: 'time' },
      { name: 'end_time', label: 'End', type: 'time' },
      { name: 'end_date', label: 'End date', type: 'date' },
      { name: 'venue', label: 'Venue' },
      { name: 'organizer', label: 'Organizer' },
      { name: 'capacity', label: 'Capacity', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['upcoming', 'ongoing', 'completed', 'cancelled', 'full'] },
    ],
    columns: [
      { key: 'name', header: 'Event', sub: (r) => r.organizer },
      { key: 'date', header: 'When', mono: true, value: (r) => r.date, sub: (r) => `${r.start_time}–${r.end_time}` },
      { key: 'venue', header: 'Venue', mono: true },
      { key: 'seats', header: 'Seats', mono: true, value: (r) => `${r.registered}/${r.capacity}`, sub: (r) => `${r.seats_left} left` },
      { key: 'status', header: 'Status', pill: (r) => r.status },
    ],
  },
  announcements: {
    label: 'Announcements',
    singular: 'announcement',
    blurb: 'Notices from departments and faculty. High priority first.',
    fields: [
      { name: 'title', label: 'Title', required: true, full: true },
      { name: 'body', label: 'Body', type: 'textarea', full: true, required: true },
      { name: 'date', label: 'Posted', type: 'date', required: true },
      priority,
      { name: 'posted_by', label: 'Posted by' },
      { name: 'expires', label: 'Expires', type: 'date' },
    ],
    columns: [
      { key: 'title', header: 'Announcement', wide: true, sub: (r) => r.body },
      { key: 'priority', header: 'Priority', pill: (r) => r.priority },
      { key: 'date', header: 'Posted', mono: true, sub: (r) => (r.expires ? `expires ${r.expires}` : null) },
      { key: 'posted_by', header: 'By' },
    ],
  },
  assignments: {
    label: 'Assignments',
    singular: 'assignment',
    blurb: 'Deadlines, submission platforms and marks.',
    fields: [
      { name: 'course', label: 'Course code', required: true },
      { name: 'course_title', label: 'Course title' },
      { name: 'title', label: 'Assignment title', required: true, full: true },
      { name: 'description', label: 'Description', type: 'textarea', full: true },
      { name: 'assigned_date', label: 'Assigned', type: 'date' },
      { name: 'deadline', label: 'Deadline', type: 'date', required: true },
      { name: 'submission_platform', label: 'Submit on' },
      { name: 'status', label: 'Status', type: 'select', options: ['pending', 'submitted', 'graded', 'late'] },
      { name: 'marks', label: 'Marks', type: 'number' },
    ],
    columns: [
      { key: 'title', header: 'Assignment', wide: true, sub: (r) => `${r.course} · ${r.course_title || ''}` },
      { key: 'deadline', header: 'Deadline', mono: true, sub: (r) => (r.submission_platform ? r.submission_platform : null) },
      { key: 'status', header: 'Status', pill: (r) => r.status },
      { key: 'marks', header: 'Marks', mono: true },
    ],
  },
};

export const ORDER = ['schedules', 'rooms', 'events', 'announcements', 'assignments'];
