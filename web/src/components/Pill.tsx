import type { ReactNode } from "react";

const tones = {
  neutral: "border-black/10 bg-[#f6f5f4] text-black/70",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-[#0075de]/20 bg-[#e6f3fe] text-[#0075de]",
  amber: "border-[#ffb110]/30 bg-[#fff4d7] text-black",
  red: "border-[#f64932]/20 bg-[#fff1ef] text-[#f64932]",
  violet: "border-[#02093a]/20 bg-[#02093a] text-white"
};

export type Tone = keyof typeof tones;

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex h-6 max-w-full items-center rounded-full border px-2.5 text-xs font-medium ${tones[tone]}`}>
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
