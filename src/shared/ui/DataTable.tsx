import React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button";
import {
  InteractiveTableRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./shadcn/Table";
import { cn } from "./utils";

type DataTablePagination = {
  pageIndex: number;
  totalPages: number;
  totalElements?: number;
  onPageChange: (page: number) => void;
};

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  onRowOpen?: (row: TData) => void;
  emptyState?: React.ReactNode;
  pagination?: DataTablePagination;
  className?: string;
  tableClassName?: string;
};

const DataTable = <TData, TValue>({
  columns,
  data,
  getRowId,
  onRowOpen,
  emptyState,
  pagination,
  className,
  tableClassName,
}: DataTableProps<TData, TValue>) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  const rows = table.getRowModel().rows;

  return (
    <section className={cn("overflow-hidden rounded-2xl border border-black/[0.08] bg-white", className)}>
      <Table className={tableClassName}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} style={{ width: header.getSize() }}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? rows.map((row) => {
            const cells = row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ));

            return onRowOpen ? (
              <InteractiveTableRow key={row.id} onOpen={() => onRowOpen(row.original)}>{cells}</InteractiveTableRow>
            ) : (
              <TableRow key={row.id}>{cells}</TableRow>
            );
          }) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-40 text-center">
                {emptyState ?? <span className="text-sm text-slate-500">Нет данных</span>}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {pagination ? (
        <div className="flex flex-col gap-3 border-t border-black/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">
            Страница {pagination.pageIndex + 1} из {Math.max(pagination.totalPages, 1)}
            {typeof pagination.totalElements === "number" ? ` · ${pagination.totalElements} записей` : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pagination.pageIndex <= 0}
              onClick={() => pagination.onPageChange(pagination.pageIndex - 1)}
              aria-label="Предыдущая страница"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pagination.pageIndex + 1 >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
              aria-label="Следующая страница"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default DataTable;
