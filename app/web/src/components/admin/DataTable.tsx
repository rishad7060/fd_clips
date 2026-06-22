"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ListParams, Paged } from "@/lib/adminTypes";
import { Input } from "@/components/ui/shadcn/input";
import { Button } from "@/components/ui/shadcn/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";
import { Skeleton } from "@/components/ui/shadcn/skeleton";

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  title,
  columns,
  fetcher,
  extraParams,
  refreshKey = 0,
  pageSize = 12,
  searchable = true,
  emptyText = "No results.",
}: {
  title?: string;
  columns: Column<T>[];
  fetcher: (params: ListParams) => Promise<Paged<T>>;
  extraParams?: ListParams;
  refreshKey?: number;
  pageSize?: number;
  searchable?: boolean;
  emptyText?: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const extraKey = JSON.stringify(extraParams ?? {});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher({ ...extraParams, search: search || undefined, page, pageSize });
      setData(res);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, extraKey, search, page, pageSize, refreshKey]);

  // Reset to page 1 when the search term or external filters change.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, extraKey]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="text-sm font-semibold text-foreground">
          {title}
          {data ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {data.total} total
            </span>
          ) : null}
        </div>
        {searchable ? (
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8"
            />
          </div>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c, i) => (
              <TableHead key={i} className={c.className}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && !data ? (
            Array.from({ length: 5 }).map((_, r) => (
              <TableRow key={r}>
                {columns.map((_, c) => (
                  <TableCell key={c}>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data && data.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            data?.rows.map((row) => (
              <TableRow key={row.id} className={cn(loading && "opacity-60")}>
                {columns.map((c, i) => (
                  <TableCell key={i} className={c.className}>
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-2 border-t border-border p-3">
        <div className="text-xs text-muted-foreground">
          Page {data?.page ?? 1} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
