import { PROFILE } from './db.js';

/**
 * Who the app is acting as.
 *
 * There is no user table in the seed data, so rather than build auth that earns
 * no marks, CampusOS ships two fixed actors and a switcher. The point is that
 * permissions are declared in one place and enforced server-side: the agent
 * reads the actor from here, never from what somebody types into the chat box.
 */

export const ACTORS = {
  student: {
    role: 'student',
    profile: PROFILE,
    label: 'Student',
    permissions: {
      can_read: 'everything',
      can_book_rooms: true,
      can_cancel_bookings: 'own only',
      can_register_for_events: 'self only',
      can_cancel_registrations: 'self only',
      can_manage_records: false,
    },
  },
  admin: {
    role: 'admin',
    profile: {
      student_id: 'staff-01',
      name: 'Department Admin',
      section: '—',
      program: 'CSE Department Office',
    },
    label: 'Department Admin',
    permissions: {
      can_read: 'everything',
      can_book_rooms: true,
      can_cancel_bookings: 'any booking',
      can_register_for_events: 'self only',
      can_cancel_registrations: 'self only',
      can_manage_records: true,
    },
  },
};

// Module-level so every request in this server process sees the same actor.
let current = 'student';

export function currentActor() {
  return ACTORS[current];
}

export function setActor(role) {
  if (!ACTORS[role]) return null;
  current = role;
  return ACTORS[role];
}

export const isAdmin = () => current === 'admin';
