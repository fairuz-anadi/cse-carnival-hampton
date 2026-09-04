import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
};

export function CrudSection<K extends CollectionName>({ config, notify }: Props<K>) {
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
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-sky-700">{config.eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{config.title}</h2>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={query.error instanceof Error ? query.error.message : "Unable to load records"} />
      ) : rows.length === 0 ? (
        <EmptyState title={config.emptyTitle} />
      ) : (
        <DataTable rows={rows} columns={config.columns} onEdit={openEdit} onDelete={setDeleting} />
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
