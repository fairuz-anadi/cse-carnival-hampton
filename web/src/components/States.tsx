import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white text-sm text-slate-600">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title = "No records" }: { title?: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white text-center text-slate-600">
      <Inbox className="h-5 w-5" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm text-rose-700">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
