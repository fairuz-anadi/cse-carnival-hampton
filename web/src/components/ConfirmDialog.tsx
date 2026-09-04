import { Trash2 } from "lucide-react";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ open, title, body, loading, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <Modal title={title} open={open} onClose={onCancel}>
      <p className="text-sm leading-6 text-black/65">{body}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-black/70 hover:bg-[#f6f5f4]"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-[#f64932] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d83b27] disabled:opacity-60"
          onClick={onConfirm}
          disabled={loading}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </button>
      </div>
    </Modal>
  );
}
