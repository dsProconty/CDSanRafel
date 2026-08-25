import Link from "next/link";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const COLOR_BG: Record<string, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  muted: "bg-slate-700",
};

export function KpiCard({
  icon: Icon,
  color = "primary",
  label,
  value,
  hint,
  trend,
  href,
}: {
  icon: LucideIcon;
  color?: keyof typeof COLOR_BG;
  label: string;
  value: string;
  hint?: string;
  trend?: { value: number; label: string };
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "flex items-start gap-3.5 rounded-xl border border-border bg-card px-4 py-4",
        href && "transition-colors hover:border-primary/40 hover:bg-accent/40"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white",
          COLOR_BG[color]
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-foreground">{value}</p>
        {trend && (
          <p
            className={cn(
              "mt-1 inline-flex items-center gap-0.5 text-xs font-semibold",
              trend.value >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {trend.value >= 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {Math.abs(trend.value).toFixed(0)}% {trend.label}
          </p>
        )}
        {hint && !trend && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
