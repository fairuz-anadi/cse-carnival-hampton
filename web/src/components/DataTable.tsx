import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";

export type Column<T> = {
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T extends { id: string }> = {
  rows: T[];
  columns: Column<T>[];
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
};

export function DataTable<T extends { id: string }>({ rows, columns, onEdit, onDelete }: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-slate-500 ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
              <th className="w-[92px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.header} className={`px-4 py-3 align-top text-sm text-slate-700 ${column.className ?? ""}`}>
                    {column.render(row)}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                      onClick={() => onEdit(row)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => onDelete(row)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
