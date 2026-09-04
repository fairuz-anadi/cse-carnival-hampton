import type { CollectionName } from "../types";

export const queryKeys: Record<CollectionName | "me" | "health", readonly string[]> = {
  schedules: ["schedules"],
  rooms: ["rooms"],
  events: ["events"],
  announcements: ["announcements"],
  assignments: ["assignments"],
  me: ["me"],
  health: ["health"]
};
