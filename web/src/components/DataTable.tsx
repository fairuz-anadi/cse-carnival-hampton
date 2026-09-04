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
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-black/10">
          <thead className="bg-[#f6f5f4]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-black/45 ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
              <th className="w-[92px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-black/45">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row) => (
              <tr key={row.id} className="transition duration-200 hover:bg-[#f6f5f4]">
                {columns.map((column) => (
                  <td key={column.header} className={`px-4 py-3 align-top text-sm text-black/70 ${column.className ?? ""}`}>
                    {column.render(row)}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-black/60 transition duration-200 hover:bg-[#e6f3fe] hover:text-[#0075de]"
                      onClick={() => onEdit(row)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-black/60 transition duration-200 hover:bg-[#fff1ef] hover:text-[#f64932]"
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
