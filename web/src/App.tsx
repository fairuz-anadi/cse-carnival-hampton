import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  LogOut,
  Megaphone,
  Search,
  School,
  Settings,
  Users
} from "lucide-react";
import { getHealth, getUserId, setUserId } from "./api/client";
import { queryKeys } from "./api/queryKeys";
import { AgentChat } from "./components/AgentChat";
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
  const [identity, setIdentity] = useState<Identity>(() => identities.find((item) => item.id === getUserId()) ?? identities[0]);
  const [searchTerm, setSearchTerm] = useState("");
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
    <div className="min-h-screen bg-[#f6f5f4] p-3 text-black sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1440px] overflow-hidden rounded-[28px] border border-black/10 bg-white lg:min-h-[calc(100vh-48px)] lg:grid-cols-[84px_minmax(0,1fr)_340px]">
        <nav className="flex items-center gap-2 bg-[#050505] p-3 text-white lg:flex-col lg:py-6">
          <div className="mb-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-black lg:mb-8" title="CampusOS">
            <School className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="flex flex-1 gap-2 overflow-x-auto lg:w-full lg:flex-col lg:items-center lg:overflow-visible">
            {nav.map((item) => {
              const Icon = item.icon;
              const selected = active === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition duration-200 ${
                    selected ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => {
                    setActive(item.key);
                    setSearchTerm("");
                  }}
                  title={item.label}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <div className="hidden gap-2 lg:flex lg:flex-col">
            <button className="flex h-11 w-11 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" type="button" title="Settings">
              <Settings className="h-5 w-5" aria-hidden="true" />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" type="button" title="Sign out">
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </nav>

        <div className="min-w-0 bg-[#f6f5f4]">
          <header className="border-b border-black/10 bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-black/45">Campus operations</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-normal text-black">Good day, {identity.name.split(" ")[0]}</h1>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label className="relative min-w-0 md:w-[320px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" aria-hidden="true" />
                  <span className="sr-only">Search dashboard</span>
                  <input
                    className="h-11 w-full rounded-lg border border-black/10 bg-[#f6f5f4] pl-10 pr-3 text-sm text-black outline-none transition duration-200 placeholder:text-black/35 focus:border-[#0075de]"
                    placeholder={`Search ${activeConfig.title.toLowerCase()}`}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>

                <div className="inline-flex h-11 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm">
                  {health.data?.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="h-4 w-4 text-[#f64932]" aria-hidden="true" />
                  )}
                  <span className={health.data?.ok ? "text-emerald-700" : "text-[#f64932]"}>{health.data?.ok ? "API online" : "API offline"}</span>
                </div>

                <button className="hidden h-11 w-11 items-center justify-center rounded-lg border border-black/10 bg-white text-black/70 md:flex" type="button" title="Notifications">
                  <Bell className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </header>

          <main className="min-w-0 px-4 py-5 sm:px-6">
            <CrudSection config={activeConfig} notify={notify} searchTerm={searchTerm} />
          </main>
        </div>

        <aside className="border-l border-black/10 bg-white p-5">
          <div className="flex h-full flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#0075de]" aria-hidden="true" />
                <h2 className="text-base font-semibold text-black">Campus agent</h2>
              </div>
              <Pill tone={identity.role === "admin" ? "violet" : "blue"}>{identity.role}</Pill>
            </div>

            <div className="rounded-lg border border-black/10 bg-[#e6f3fe] p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-black/45">Today</p>
              <p className="mt-2 text-2xl font-semibold text-black">{today}</p>
            </div>

            <AgentChat identity={identity} />

            <label className="block text-sm font-medium text-black/70">
              Identity
              <select
                className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-[#f6f5f4] px-3 text-sm text-black outline-none focus:border-[#0075de]"
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

            <div className="grid gap-3">
              <div className="rounded-lg border border-black/10 bg-white p-4">
                <p className="text-xs font-medium text-black/45">Active section</p>
                <p className="mt-2 text-xl font-semibold text-black">{activeConfig.title}</p>
              </div>
              <div className="rounded-lg bg-[#02093a] p-4 text-white">
                <p className="text-xs font-medium text-white/55">Session</p>
                <p className="mt-2 text-lg font-semibold">{identity.id}</p>
              </div>
            </div>

            <div className="mt-auto border-t border-black/10 pt-4 text-xs text-black/45">
              <div className="flex items-center justify-between">
                <span>{identity.name}</span>
                <span>CampusOS</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Toasts toasts={toasts} />
    </div>
  );
}
