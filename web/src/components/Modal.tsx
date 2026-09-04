import type { ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, open, onClose, children }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg border border-black/10 bg-white shadow-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="text-base font-semibold text-black">{title}</h2>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/60 transition duration-200 hover:bg-[#f6f5f4]"
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-70px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
