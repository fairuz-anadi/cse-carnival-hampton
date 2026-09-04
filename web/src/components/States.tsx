import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center gap-2 rounded-lg border border-dashed border-black/15 bg-white text-sm text-black/60">
      <Loader2 className="h-4 w-4 animate-spin text-[#0075de]" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title = "No records" }: { title?: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-black/15 bg-white text-center text-black/60">
      <Inbox className="h-5 w-5 text-black/40" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-black/10 bg-white px-4 py-8 text-center text-sm text-black/65">
      <div>
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-[#fff1ef] text-[#f64932]">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-3 font-semibold text-black">Unable to load this section</p>
        <p className="mt-1 max-w-[420px] leading-5">{message}</p>
        {onRetry ? (
          <button
            type="button"
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#e6f3fe] px-4 text-sm font-semibold text-[#0075de] transition duration-200 hover:bg-[#d8ecfe]"
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
