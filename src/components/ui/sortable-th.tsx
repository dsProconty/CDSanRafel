"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";
export type SortState<K extends string> = { key: K; dir: SortDir };

export function proximoSort<K extends string>(
  actual: SortState<K>,
  key: K
): SortState<K> {
  if (actual.key !== key) return { key, dir: "asc" };
  return { key, dir: actual.dir === "asc" ? "desc" : "asc" };
}

export function SortableTh<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const activo = sort.key === sortKey;
  const Icon = activo ? (sort.dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        <Icon
          className={cn("h-3.5 w-3.5", activo ? "text-foreground" : "text-muted-foreground/50")}
        />
      </button>
    </th>
  );
}
