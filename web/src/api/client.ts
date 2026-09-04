import type {
  Announcement,
  Assignment,
  BookingInput,
  CampusEvent,
  CollectionName,
  RegistrationInput,
  Room,
  Schedule
} from "../types";

const API_ROOT = "/api";
const USER_KEY = "campusos:user-id";

type CollectionMap = {
  schedules: Schedule;
  rooms: Room;
  events: CampusEvent;
  announcements: Announcement;
  assignments: Assignment;
};

export type CollectionItem<K extends CollectionName> = CollectionMap[K];

export function getUserId() {
  try {
    return localStorage.getItem(USER_KEY) ?? "20-40532";
  } catch {
    return "20-40532";
  }
}

export function setUserId(userId: string) {
  try {
    localStorage.setItem(USER_KEY, userId);
  } catch {
    // Some privacy modes block storage; the request header still falls back safely.
  }
}

function endpoint(path: string) {
  return `${API_ROOT}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(endpoint(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": getUserId(),
      ...init?.headers
    }
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
    } catch {
      // Keep the HTTP status message when the response body is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function listCollection<K extends CollectionName>(name: K) {
  return request<CollectionItem<K>[]>(`/${name}`);
}

export function createItem<K extends CollectionName>(name: K, body: Partial<CollectionItem<K>>) {
  return request<CollectionItem<K>>(`/${name}`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function updateItem<K extends CollectionName>(name: K, id: string, body: Partial<CollectionItem<K>>) {
  return request<CollectionItem<K>>(`/${name}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

export function deleteItem(name: CollectionName, id: string) {
  return request<void>(`/${name}/${id}`, {
    method: "DELETE"
  });
}

export function bookRoom(roomId: string, body: BookingInput) {
  return request<Room>(`/rooms/${roomId}/bookings`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function cancelBooking(bookingId: string) {
  return request<void>(`/bookings/${bookingId}`, {
    method: "DELETE"
  });
}

export function registerForEvent(eventId: string, body: RegistrationInput) {
  return request<CampusEvent>(`/events/${eventId}/registrations`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function cancelRegistration(eventId: string, studentId: string) {
  return request<void>(`/events/${eventId}/registrations/${studentId}`, {
    method: "DELETE"
  });
}

export async function getHealth() {
  try {
    await request<unknown>("/health");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export function askAgent(message: string) {
  return request<{ message: string }>("/agent", {
    method: "POST",
    body: JSON.stringify({ message })
  });
}
