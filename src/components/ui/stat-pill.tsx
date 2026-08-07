import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const DOT_COLOR = {
  default: "bg-foreground",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
} as const;

type StatPillProps = {
  label: string;
  value: number | string;
  color?: keyof typeof DOT_COLOR;
  href?: string;
  className?: string;
};

export function StatPill({ label, value, color = "default", href, className }: StatPillProps) {
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm",
        href && "transition-colors hover:border-primary/40 hover:bg-accent",
        className
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_COLOR[color])} />
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
