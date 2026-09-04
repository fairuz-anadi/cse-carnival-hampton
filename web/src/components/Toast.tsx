import { CheckCircle2, XCircle } from "lucide-react";

export type ToastState = {
  id: number;
  tone: "success" | "error";
  message: string;
};

export function Toasts({ toasts }: { toasts: ToastState[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-md border bg-white p-3 text-sm shadow-panel ${
            toast.tone === "success" ? "border-emerald-200 text-emerald-800" : "border-rose-200 text-rose-800"
          }`}
        >
          {toast.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="leading-5">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
