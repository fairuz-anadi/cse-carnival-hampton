import type { FormEvent } from "react";

export type FieldConfig = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "time" | "textarea" | "select" | "tags";
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

type FormProps = {
  fields: FieldConfig[];
  values: Record<string, unknown>;
  busy?: boolean;
  submitLabel: string;
  onChange: (name: string, value: unknown) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function ResourceForm({ fields, values, busy, submitLabel, onChange, onSubmit, onCancel }: FormProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <FormField key={field.name} field={field} value={values[field.name]} onChange={onChange} />
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          disabled={busy}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function FormField({
  field,
  value,
  onChange
}: {
  field: FieldConfig;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}) {
  const stringValue = Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
  const baseClass =
    "mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
  const wide = field.type === "textarea" || field.type === "tags" ? "sm:col-span-2" : "";

  return (
    <label className={`block text-sm font-medium text-slate-700 ${wide}`}>
      {field.label}
      {field.type === "textarea" ? (
        <textarea
          className={`${baseClass} min-h-[112px] resize-y`}
          value={stringValue}
          required={field.required}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      ) : field.type === "select" ? (
        <select
          className={baseClass}
          value={stringValue}
          required={field.required}
          onChange={(event) => onChange(field.name, event.target.value)}
        >
          <option value="">Select</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={baseClass}
          type={field.type === "tags" ? "text" : field.type ?? "text"}
          value={stringValue}
          required={field.required}
          placeholder={field.placeholder}
          onChange={(event) => {
            const raw = event.target.value;
            if (field.type === "number") {
              onChange(field.name, raw === "" ? "" : Number(raw));
            } else if (field.type === "tags") {
              onChange(
                field.name,
                raw
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              );
            } else {
              onChange(field.name, raw);
            }
          }}
        />
      )}
    </label>
  );
}
