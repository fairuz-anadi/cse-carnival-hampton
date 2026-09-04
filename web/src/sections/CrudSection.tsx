import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { createItem, deleteItem, listCollection, updateItem, type CollectionItem } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable, type Column } from "../components/DataTable";
import { ResourceForm, type FieldConfig } from "../components/Form";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Modal } from "../components/Modal";
import type { CollectionName } from "../types";

export type SectionConfig<K extends CollectionName> = {
  name: K;
  title: string;
  eyebrow: string;
  emptyTitle: string;
  columns: Column<CollectionItem<K>>[];
  fields: FieldConfig[];
  sortRows?: (rows: CollectionItem<K>[]) => CollectionItem<K>[];
  prepareSubmit?: (values: Record<string, unknown>, editing: CollectionItem<K> | null) => Partial<CollectionItem<K>>;
  extraPanel?: (rows: CollectionItem<K>[], refresh: () => void) => JSX.Element | null;
};

type Props<K extends CollectionName> = {
  config: SectionConfig<K>;
  notify: (tone: "success" | "error", message: string) => void;
  searchTerm: string;
};

export function CrudSection<K extends CollectionName>({ config, notify, searchTerm }: Props<K>) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CollectionItem<K> | null>(null);
  const [deleting, setDeleting] = useState<CollectionItem<K> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const query = useQuery({
    queryKey: queryKeys[config.name],
    queryFn: () => listCollection(config.name)
  });

  const rows = useMemo(() => {
    const data = query.data ?? [];
    return config.sortRows ? config.sortRows(data) : data;
  }, [config, query.data]);

  const filteredRows = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return rows;
    }

    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(normalized));
  }, [rows, searchTerm]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys[config.name] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = config.prepareSubmit ? config.prepareSubmit(values, editing) : (values as Partial<CollectionItem<K>>);
      if (editing) {
        return updateItem(config.name, editing.id, body);
      }
      return createItem(config.name, body);
    },
    onSuccess: () => {
      invalidate();
      notify("success", `${config.title} saved`);
      closeForm();
    },
    onError: (error) => notify("error", error instanceof Error ? error.message : "Save failed")
  });

  const deleteMutation = useMutation({
    mutationFn: (row: CollectionItem<K>) => deleteItem(config.name, row.id),
    onSuccess: () => {
      invalidate();
      notify("success", `${config.title} deleted`);
      setDeleting(null);
    },
    onError: (error) => notify("error", error instanceof Error ? error.message : "Delete failed")
  });

  function openCreate() {
    setEditing(null);
    setValues(buildInitialValues(config.fields, null));
    setFormOpen(true);
  }

  function openEdit(row: CollectionItem<K>) {
    setEditing(row);
    setValues(buildInitialValues(config.fields, row));
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setValues({});
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-black/45">{config.eyebrow}</p>
          <h2 className="mt-1 text-[40px] font-semibold leading-tight tracking-normal text-black">{config.title}</h2>
        </div>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0075de] px-5 text-sm font-semibold text-white transition duration-200 hover:bg-[#0063bd]"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>
      </div>

      <SummaryCards name={config.name} rows={rows} />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={query.error instanceof Error ? query.error.message : "Unable to load records"}
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState title={config.emptyTitle} />
      ) : filteredRows.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-black/10 bg-white text-center text-black/60">
          <Search className="h-5 w-5" aria-hidden="true" />
          <p className="text-sm font-medium">No matches</p>
        </div>
      ) : (
        <DataTable rows={filteredRows} columns={config.columns} onEdit={openEdit} onDelete={setDeleting} />
      )}

      {config.extraPanel?.(rows, invalidate)}

      <Modal title={editing ? `Edit ${config.title}` : `Add ${config.title}`} open={formOpen} onClose={closeForm}>
        <ResourceForm
          fields={config.fields}
          values={values}
          busy={saveMutation.isPending}
          submitLabel={editing ? "Save changes" : "Create"}
          onCancel={closeForm}
          onSubmit={() => saveMutation.mutate()}
          onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${config.title}`}
        body={deleting ? `Delete ${deleting.id}? This action will be saved in the backend.` : ""}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </section>
  );
}

function SummaryCards<K extends CollectionName>({ name, rows }: { name: K; rows: CollectionItem<K>[] }) {
  const summaries = buildSummaries(name, rows);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {summaries.map((summary) => (
        <div key={summary.label} className={`min-h-[112px] rounded-lg p-4 ${summary.className}`}>
          <p className="text-xs font-semibold uppercase tracking-normal opacity-60">{summary.label}</p>
          <p className="mt-3 text-3xl font-semibold leading-none tracking-normal">{summary.value}</p>
          <p className="mt-3 text-sm leading-5 opacity-70">{summary.detail}</p>
        </div>
      ))}
    </div>
  );
}

function buildSummaries<K extends CollectionName>(name: K, rows: CollectionItem<K>[]) {
  if (name === "schedules") {
    const typed = rows as CollectionItem<"schedules">[];
    return [
      card("Records", typed.length, "classes in view", "border border-black/10 bg-white text-black"),
      card("Days", new Set(typed.map((row) => row.day)).size, "teaching days covered", "bg-[#ffb110] text-black"),
      card("Rooms", new Set(typed.map((row) => row.room)).size, "unique room labels", "bg-[#02093a] text-white")
    ];
  }

  if (name === "rooms") {
    const typed = rows as CollectionItem<"rooms">[];
    return [
      card("Rooms", typed.length, "directory entries", "border border-black/10 bg-white text-black"),
      card("Labs", typed.filter((row) => row.type === "lab").length, "computer lab spaces", "bg-[#62aef0] text-black"),
      card("Bookings", typed.reduce((total, row) => total + row.bookings.length, 0), "visible reservations", "bg-[#02093a] text-white")
    ];
  }

  if (name === "events") {
    const typed = rows as CollectionItem<"events">[];
    return [
      card("Events", typed.length, "campus programs", "border border-black/10 bg-white text-black"),
      card("Full", typed.filter((row) => row.status === "full").length, "capacity alerts", "bg-[#f64932] text-white"),
      card("Seats", typed.reduce((total, row) => total + row.registered, 0), "registered count", "bg-[#e6f3fe] text-black")
    ];
  }

  if (name === "announcements") {
    const typed = rows as CollectionItem<"announcements">[];
    return [
      card("Notices", typed.length, "published items", "border border-black/10 bg-white text-black"),
      card("High", typed.filter((row) => row.priority === "high").length, "priority updates", "bg-[#f64932] text-white"),
      card("Active", typed.filter((row) => row.expires >= todayIso()).length, "not expired", "bg-[#ffb110] text-black")
    ];
  }

  const typed = rows as CollectionItem<"assignments">[];
  return [
    card("Assignments", typed.length, "course tasks", "border border-black/10 bg-white text-black"),
    card("Pending", typed.filter((row) => row.status === "pending").length, "still open", "bg-[#ffb110] text-black"),
    card("Marks", typed.reduce((total, row) => total + row.marks, 0), "total available", "bg-[#02093a] text-white")
  ];
}

function card(label: string, value: number | string, detail: string, className: string) {
  return { label, value, detail, className };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildInitialValues(fields: FieldConfig[], source: Record<string, unknown> | null) {
  return fields.reduce<Record<string, unknown>>((next, field) => {
    if (source && field.name in source) {
      next[field.name] = source[field.name];
    } else if (field.type === "number") {
      next[field.name] = "";
    } else if (field.type === "tags") {
      next[field.name] = [];
    } else {
      next[field.name] = "";
    }
    return next;
  }, {});
}
