import type { ReactNode } from "react";

const tones = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-sky-200 bg-sky-50 text-sky-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700"
};

export type Tone = keyof typeof tones;

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex h-6 max-w-full items-center rounded-full border px-2 text-xs font-medium ${tones[tone]}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function statusTone(value?: string): Tone {
  switch (value) {
    case "available":
    case "upcoming":
    case "submitted":
    case "graded":
      return "green";
    case "ongoing":
    case "medium":
      return "blue";
    case "pending":
    case "low":
      return "amber";
    case "full":
    case "cancelled":
    case "unavailable":
    case "late":
    case "high":
      return "red";
    default:
      return "neutral";
  }
}
