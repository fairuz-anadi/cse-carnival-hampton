import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, CalendarDays, CheckCircle2, CircleAlert, ClipboardList, Megaphone, School, Users } from "lucide-react";
import { getHealth, setUserId } from "./api/client";
import { queryKeys } from "./api/queryKeys";
import { Pill } from "./components/Pill";
import { Toasts, type ToastState } from "./components/Toast";
import { CrudSection } from "./sections/CrudSection";
import { buildConfigs } from "./sections/configs";
import type { CollectionName, Identity } from "./types";

const identities: Identity[] = [
  { id: "20-40532", name: "Sakibul Hassan", role: "student" },
  { id: "21-41205", name: "Rafi Hossain", role: "student" },
  { id: "admin-cse", name: "CSE Admin", role: "admin" }
];

const nav: { key: CollectionName; label: string; icon: typeof CalendarDays }[] = [
  { key: "schedules", label: "Schedules", icon: CalendarDays },
  { key: "rooms", label: "Rooms", icon: School },
  { key: "events", label: "Events", icon: Users },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "assignments", label: "Assignments", icon: ClipboardList }
];

export function App() {
  const [active, setActive] = useState<CollectionName>("schedules");
  const [identity, setIdentity] = useState<Identity>(identities[0]);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const health = useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
    refetchInterval: 30_000
  });

  const notify = (tone: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  };

  const configs = useMemo(() => buildConfigs(notify), []);
  const activeConfig = configs.find((config) => config.name === active) ?? configs[0];
  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date());

  function changeIdentity(id: string) {
    const next = identities.find((item) => item.id === id) ?? identities[0];
    setIdentity(next);
    setUserId(next.id);
    notify("success", `Identity set to ${next.name}`);
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">
              <School className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal">CampusOS</h1>
              <p className="text-sm text-slate-500">{today}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              {health.data?.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              ) : (
                <CircleAlert className="h-4 w-4 text-rose-600" aria-hidden="true" />
              )}
              <span className={health.data?.ok ? "text-emerald-700" : "text-rose-700"}>{health.data?.ok ? "API online" : "API offline"}</span>
            </div>

            <label className="text-sm font-medium text-slate-700">
              <span className="sr-only">Identity</span>
              <select
                className="h-10 min-w-[220px] rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={identity.id}
                onChange={(event) => changeIdentity(event.target.value)}
              >
                {identities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.role})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)_360px] lg:px-6">
        <nav className="rounded-md border border-slate-200 bg-white p-2 shadow-panel lg:sticky lg:top-4 lg:h-[calc(100vh-112px)]">
          <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const selected = active === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`flex h-11 items-center gap-2 rounded-md px-3 text-left text-sm font-medium ${
                    selected ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  onClick={() => setActive(item.key)}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <main className="min-w-0 rounded-md border border-slate-200 bg-white/65 p-4 shadow-panel">
          <CrudSection config={activeConfig} notify={notify} />
        </main>

        <aside className="rounded-md border border-slate-200 bg-white p-4 shadow-panel lg:sticky lg:top-4 lg:h-[calc(100vh-112px)]">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-sky-700" aria-hidden="true" />
                <h2 className="text-base font-semibold">Campus agent</h2>
              </div>
              <Pill tone={identity.role === "admin" ? "violet" : "blue"}>{identity.role}</Pill>
            </div>
            <div className="flex flex-1 items-center justify-center text-center">
              <div className="max-w-[240px]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                  <Bot className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-800">Agent panel</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Chat messages and tool traces fit here beside the dashboard.</p>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span>{identity.name}</span>
                <span>{identity.id}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Toasts toasts={toasts} />
    </div>
  );
}
