import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, UserPlus, X } from "lucide-react";
import { bookRoom, cancelBooking, cancelRegistration, registerForEvent } from "../api/client";
import { getUserId } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { CapacityMeter } from "../components/CapacityMeter";
import type { Column } from "../components/DataTable";
import type { FieldConfig } from "../components/Form";
import { Modal } from "../components/Modal";
import { Pill, statusTone } from "../components/Pill";
import type {
  Announcement,
  Assignment,
  Booking,
  CampusEvent,
  CollectionName,
  Registration,
  Room,
  Schedule
} from "../types";
import type { SectionConfig } from "./CrudSection";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const roomTypes = ["classroom", "lab", "seminar"];
const roomStatuses = ["available", "unavailable"];
const eventStatuses = ["upcoming", "ongoing", "completed", "cancelled", "full"];
const priorities = ["high", "medium", "low"];
const assignmentStatuses = ["pending", "submitted", "graded", "late"];

export function buildConfigs(notify: (tone: "success" | "error", message: string) => void): SectionConfig<CollectionName>[] {
  return [
    scheduleConfig,
    roomConfig(notify),
    eventConfig(notify),
    announcementConfig,
    assignmentConfig
  ] as SectionConfig<CollectionName>[];
}

const scheduleConfig: SectionConfig<"schedules"> = {
  name: "schedules",
  title: "Schedules",
  eyebrow: "Class timetable",
  emptyTitle: "No schedule records",
  sortRows: (rows) =>
    [...rows].sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || a.start_time.localeCompare(b.start_time)),
  columns: [
    {
      header: "Course",
      render: (row: Schedule) => (
        <div className="min-w-[180px]">
          <div className="font-semibold text-slate-950">{row.course}</div>
          <div className="mt-1 text-xs text-slate-500">{row.title}</div>
        </div>
      )
    },
    { header: "Day", render: (row) => <Pill tone="blue">{row.day}</Pill> },
    { header: "Time", render: (row) => `${row.start_time}-${row.end_time}` },
    { header: "Room", render: (row) => row.room },
    { header: "Instructor", render: (row) => row.instructor },
    { header: "Section", render: (row) => row.section }
  ],
  fields: [
    text("course", "Course", true),
    text("title", "Title", true),
    select("day", "Day", days, true),
    time("start_time", "Start time", true),
    time("end_time", "End time", true),
    text("room", "Room", true),
    text("instructor", "Instructor", true),
    text("section", "Section", true)
  ]
};

function roomConfig(notify: (tone: "success" | "error", message: string) => void): SectionConfig<"rooms"> {
  return {
    name: "rooms",
    title: "Rooms",
    eyebrow: "Room directory",
    emptyTitle: "No room records",
    sortRows: (rows) => [...rows].sort((a, b) => a.room_number.localeCompare(b.room_number)),
    columns: [
      {
        header: "Room",
        render: (row: Room) => (
          <div>
            <div className="font-semibold text-slate-950">{row.room_number}</div>
            <div className="mt-1 text-xs text-slate-500">Floor {row.floor}</div>
          </div>
        )
      },
      { header: "Type", render: (row) => <Pill tone="violet">{row.type}</Pill> },
      { header: "Capacity", render: (row) => row.capacity },
      {
        header: "Equipment",
        className: "min-w-[220px]",
        render: (row) => (
          <div className="flex flex-wrap gap-1.5">
            {row.equipment.map((item) => (
              <Pill key={item}>{item}</Pill>
            ))}
          </div>
        )
      },
      { header: "Status", render: (row) => <Pill tone={statusTone(row.status)}>{row.status}</Pill> },
      {
        header: "Bookings",
        render: (row) => (
          <NestedList
            count={row.bookings.length}
            items={row.bookings}
            render={(booking) => `${booking.booking_id}: ${booking.date} ${booking.start_time}-${booking.end_time}`}
          />
        )
      }
    ],
    fields: [
      text("room_number", "Room number", true),
      select("type", "Type", roomTypes, true),
      number("capacity", "Capacity", true),
      tags("equipment", "Equipment"),
      number("floor", "Floor", true),
      select("status", "Status", roomStatuses, true)
    ],
    extraPanel: (rows, refresh) => <RoomActions rooms={rows} refresh={refresh} notify={notify} />
  };
}

function eventConfig(notify: (tone: "success" | "error", message: string) => void): SectionConfig<"events"> {
  return {
    name: "events",
    title: "Events",
    eyebrow: "Campus events",
    emptyTitle: "No event records",
    sortRows: (rows) => [...rows].sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`)),
    columns: [
      {
        header: "Event",
        className: "min-w-[240px]",
        render: (row: CampusEvent) => (
          <div>
            <div className="font-semibold text-slate-950">{row.name}</div>
            <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{row.description}</div>
          </div>
        )
      },
      { header: "Date", render: (row) => `${row.date}${row.end_date !== row.date ? ` to ${row.end_date}` : ""}` },
      { header: "Time", render: (row) => `${row.start_time}-${row.end_time}` },
      { header: "Venue", render: (row) => row.venue },
      { header: "Organizer", render: (row) => row.organizer },
      { header: "Capacity", render: (row) => <CapacityMeter registered={row.registered} capacity={row.capacity} /> },
      { header: "Status", render: (row) => <Pill tone={statusTone(row.status)}>{row.status}</Pill> },
      {
        header: "Registrations",
        render: (row) => (
          <NestedList
            count={row.registrations.length}
            items={row.registrations}
            render={(registration) => `${registration.student_id}: ${registration.name}`}
          />
        )
      }
    ],
    fields: [
      text("name", "Name", true),
      text("organizer", "Organizer", true),
      date("date", "Start date", true),
      date("end_date", "End date", true),
      time("start_time", "Start time", true),
      time("end_time", "End time", true),
      text("venue", "Venue", true),
      number("capacity", "Capacity", true),
      number("registered", "Registered", true),
      select("status", "Status", eventStatuses, true),
      textarea("description", "Description", true)
    ],
    extraPanel: (rows, refresh) => <EventActions events={rows} refresh={refresh} notify={notify} />
  };
}

const announcementConfig: SectionConfig<"announcements"> = {
  name: "announcements",
  title: "Announcements",
  eyebrow: "Priority board",
  emptyTitle: "No announcement records",
  sortRows: (rows) =>
    [...rows].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || b.date.localeCompare(a.date)),
  columns: [
    {
      header: "Announcement",
      className: "min-w-[280px]",
      render: (row: Announcement) => (
        <div>
          <div className="font-semibold text-slate-950">{row.title}</div>
          <div className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">{row.body}</div>
        </div>
      )
    },
    { header: "Priority", render: (row) => <Pill tone={statusTone(row.priority)}>{row.priority}</Pill> },
    { header: "Posted", render: (row) => row.date },
    { header: "Expires", render: (row) => row.expires },
    { header: "Posted by", render: (row) => row.posted_by }
  ],
  fields: [
    text("title", "Title", true),
    select("priority", "Priority", priorities, true),
    date("date", "Posted date", true),
    date("expires", "Expires", true),
    text("posted_by", "Posted by", true),
    textarea("body", "Body", true)
  ]
};

const assignmentConfig: SectionConfig<"assignments"> = {
  name: "assignments",
  title: "Assignments",
  eyebrow: "Coursework",
  emptyTitle: "No assignment records",
  sortRows: (rows) => [...rows].sort((a, b) => a.deadline.localeCompare(b.deadline)),
  columns: [
    {
      header: "Assignment",
      className: "min-w-[260px]",
      render: (row: Assignment) => (
        <div>
          <div className="font-semibold text-slate-950">{row.title}</div>
          <div className="mt-1 text-xs text-slate-500">{row.course} - {row.course_title}</div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{row.description}</div>
        </div>
      )
    },
    { header: "Assigned", render: (row) => row.assigned_date },
    {
      header: "Deadline",
      render: (row) => (
        <span className={isPast(row.deadline) && row.status === "pending" ? "font-semibold text-rose-700" : ""}>{row.deadline}</span>
      )
    },
    { header: "Platform", render: (row) => row.submission_platform },
    { header: "Marks", render: (row) => row.marks },
    { header: "Status", render: (row) => <Pill tone={statusTone(row.status)}>{row.status}</Pill> }
  ],
  fields: [
    text("course", "Course", true),
    text("course_title", "Course title", true),
    text("title", "Title", true),
    date("assigned_date", "Assigned date", true),
    date("deadline", "Deadline", true),
    text("submission_platform", "Submission platform", true),
    number("marks", "Marks", true),
    select("status", "Status", assignmentStatuses, true),
    textarea("description", "Description", true)
  ]
};

function RoomActions({
  rooms,
  refresh,
  notify
}: {
  rooms: Room[];
  refresh: () => void;
  notify: (tone: "success" | "error", message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [bookingId, setBookingId] = useState("");
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    booked_by: "Sakibul Hassan",
    date: "",
    start_time: "",
    end_time: "",
    purpose: ""
  });

  const createMutation = useMutation({
    mutationFn: () => bookRoom(roomId, values),
    onSuccess: () => {
      refresh();
      notify("success", "Room booking saved");
      setOpen(false);
    },
    onError: (error) => notify("error", error instanceof Error ? error.message : "Booking failed")
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      notify("success", "Booking cancelled");
      setBookingId("");
    },
    onError: (error) => notify("error", error instanceof Error ? error.message : "Cancellation failed")
  });

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Room booking</h3>
          <p className="mt-1 text-xs text-slate-500">Bookings use the same room endpoint as the agent.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800"
            onClick={() => setOpen(true)}
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Book
          </button>
          <input
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="bk-001"
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
          />
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            disabled={!bookingId || cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel
          </button>
        </div>
      </div>
      <Modal title="Book a room" open={open} onClose={() => setOpen(false)}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <label className="text-sm font-medium text-slate-700">
            Room
            <select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={roomId} onChange={(event) => setRoomId(event.target.value)}>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_number}
                </option>
              ))}
            </select>
          </label>
          {(["booked_by", "date", "start_time", "end_time", "purpose"] as const).map((key) => (
            <label key={key} className={`text-sm font-medium text-slate-700 ${key === "purpose" ? "sm:col-span-2" : ""}`}>
              {labelize(key)}
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                type={key === "date" ? "date" : key.includes("time") ? "time" : "text"}
                value={values[key]}
                required
                onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
              />
            </label>
          ))}
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" disabled={createMutation.isPending}>
              Save booking
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function EventActions({
  events,
  refresh,
  notify
}: {
  events: CampusEvent[];
  refresh: () => void;
  notify: (tone: "success" | "error", message: string) => void;
}) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [studentId, setStudentId] = useState(getUserId());
  const [name, setName] = useState("Sakibul Hassan");

  const registerMutation = useMutation({
    mutationFn: () => registerForEvent(eventId, { student_id: studentId, name }),
    onSuccess: () => {
      refresh();
      notify("success", "Registration saved");
    },
    onError: (error) => notify("error", error instanceof Error ? error.message : "Registration failed")
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelRegistration(eventId, studentId),
    onSuccess: () => {
      refresh();
      notify("success", "Registration cancelled");
    },
    onError: (error) => notify("error", error instanceof Error ? error.message : "Cancellation failed")
  });

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr_auto_auto] lg:items-end">
        <label className="text-sm font-medium text-slate-700">
          Event
          <select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={eventId} onChange={(event) => setEventId(event.target.value)}>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Student ID
          <input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={studentId} onChange={(event) => setStudentId(event.target.value)} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Name
          <input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
          disabled={!eventId || !studentId || !name || registerMutation.isPending}
          onClick={() => registerMutation.mutate()}
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Register
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50"
          disabled={!eventId || !studentId || cancelMutation.isPending}
          onClick={() => cancelMutation.mutate()}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Cancel
        </button>
      </div>
    </div>
  );
}

function NestedList<T>({ count, items, render }: { count: number; items: T[]; render: (item: T) => string }) {
  if (count === 0) {
    return <span className="text-xs text-slate-500">0</span>;
  }

  return (
    <details className="min-w-[150px]">
      <summary className="cursor-pointer text-sm font-medium text-slate-700">{count}</summary>
      <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
        {items.map((item, index) => (
          <div key={index}>{render(item)}</div>
        ))}
      </div>
    </details>
  );
}

function text(name: string, label: string, required = false): FieldConfig {
  return { name, label, required, type: "text" };
}

function textarea(name: string, label: string, required = false): FieldConfig {
  return { name, label, required, type: "textarea" };
}

function number(name: string, label: string, required = false): FieldConfig {
  return { name, label, required, type: "number" };
}

function date(name: string, label: string, required = false): FieldConfig {
  return { name, label, required, type: "date" };
}

function time(name: string, label: string, required = false): FieldConfig {
  return { name, label, required, type: "time" };
}

function select(name: string, label: string, options: string[], required = false): FieldConfig {
  return { name, label, required, options, type: "select" };
}

function tags(name: string, label: string): FieldConfig {
  return { name, label, type: "tags", placeholder: "projector, AC, whiteboard" };
}

function priorityRank(priority: string) {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
}

function isPast(dateValue: string) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  return dateValue < todayIso;
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}
