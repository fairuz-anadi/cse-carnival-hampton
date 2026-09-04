export type DayOfWeek = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday";
export type Priority = "high" | "medium" | "low";
export type RoomType = "classroom" | "lab" | "seminar";
export type RoomStatus = "available" | "unavailable";
export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled" | "full";
export type AssignmentStatus = "pending" | "submitted" | "graded" | "late";

export type Schedule = {
  id: string;
  course: string;
  title: string;
  day: DayOfWeek;
  start_time: string;
  end_time: string;
  room: string;
  instructor: string;
  section: string;
};

export type Booking = {
  booking_id: string;
  booked_by: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
};

export type Room = {
  id: string;
  room_number: string;
  type: RoomType;
  capacity: number;
  equipment: string[];
  floor: number;
  status: RoomStatus;
  bookings: Booking[];
};

export type Registration = {
  student_id: string;
  name: string;
};

export type CampusEvent = {
  id: string;
  name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date: string;
  venue: string;
  organizer: string;
  capacity: number;
  registered: number;
  registrations: Registration[];
  status: EventStatus;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
  priority: Priority;
  posted_by: string;
  expires: string;
};

export type Assignment = {
  id: string;
  course: string;
  course_title: string;
  title: string;
  description: string;
  assigned_date: string;
  deadline: string;
  submission_platform: string;
  status: AssignmentStatus;
  marks: number;
};

export type CollectionName = "schedules" | "rooms" | "events" | "announcements" | "assignments";

export type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export type Identity = {
  id: string;
  name: string;
  role: "student" | "admin";
};

export type BookingInput = {
  booked_by: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
};

export type RegistrationInput = {
  student_id: string;
  name: string;
};
