import * as React from "react";
import {
  TableHead,
} from "@/components/ui/table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ────────────── public API ──────────────
export interface UseSortOptions<T = unknown> {
  sortCol?: string | null;
  sortDir?: "asc" | "desc" | null;
  onSort: (col: string) => void;
}

export function useSortedData<T>(
  data: readonly T[],
  { sortCol, sortDir, onSort }: UseSortOptions<T>
): T[] {
  if (!sortCol || !sortDir) return [...data];

  return [...data].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortCol!];
    const bv = (b as Record<string, unknown>)[sortCol!];
    const cmp = compare(av, bv);
    return sortDir === "asc" ? cmp : -cmp;
  });
}

// ────────────── indicator helper ──────────────
function SortIndicator({
  col,
  direction,
}: {
  col: string | null;
  direction: "asc" | "desc" | null;
}) {
  if (col !== null && direction) {
    return direction === "asc"
      ? <ChevronUp className="ml-1 h-3.5 w-3.5 inline" />
      : <ChevronDown className="ml-1 h-3.5 w-3.5 inline" />;
  }
  return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-40 inline" />;
}

export type SortState = { col: string | null; dir: "asc" | "desc" | null };

// ────────────── SortableHead component ──────────────
interface SortableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string;
  sortState: SortState;
  setSortState: (fn: (prev: SortState) => SortState) => void;
  align?: "left" | "right" | "center" | "justify";
  children?: React.ReactNode;
}

export function SortableHead({
  sortKey,
  sortState,
  setSortState,
  align,
  children,
  className,
  ...props
}: SortableHeadProps) {
  const active = sortState.col === sortKey;

  const handleClick = () => {
    setSortState((prev) => ({
      col: sortKey,
      dir: prev.col === sortKey && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  return (
    <TableHead
      style={{ textAlign: align }}
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        active && "bg-muted text-foreground font-semibold",
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      aria-sort={
        active
          ? sortState.dir === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      {...props}
    >
      {children ?? sortKey}
      <span className="ml-1">
        <SortIndicator col={sortState.col} direction={sortState.dir} />
      </span>
    </TableHead>
  );
}

// ────────────── CSS ──────────────
if (typeof window !== "undefined") {
  const id = "sortable-head-css";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    // eslint-disable-next-line @stylistic/js/quotes -- template literal for convenience
    style.textContent = `[data-sorting="asc"] [data-dir="up"],
[data-sorting="desc"] [data-dir="down"] { color: inherit; }`;
    document.head.appendChild(style);
  }
}

// ────────────── small comparator ──────────────
function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  // Fallback: coerce to string for comparison
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}
