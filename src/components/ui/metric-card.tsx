import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricTone = "info" | "success" | "warning" | "danger";

const toneClasses: Record<MetricTone, string> = {
  info: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700"
};

const valueColors: Record<MetricTone, string> = {
  info: "text-slate-950",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700"
};

const accentClasses: Record<MetricTone, string> = {
  info: "border-t-[3px] border-t-slate-500",
  success: "border-t-[3px] border-t-emerald-600",
  warning: "border-t-[3px] border-t-amber-500",
  danger: "border-t-[3px] border-t-red-600"
};

/**
 * Reusable metric/stat card used across all CRUD pages.
 * Supports two layouts: "centered" (default) and "horizontal".
 */
export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "info",
  compact = false,
  layout = "centered",
  className
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: MetricTone;
  compact?: boolean;
  layout?: "centered" | "horizontal";
  className?: string;
}) {
  if (layout === "horizontal") {
    return (
      <div className={cn("rounded-md border border-slate-200 bg-white shadow-panel", accentClasses[tone], className)}>
        <div className="flex min-h-[96px] items-center gap-3.5 p-4">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-500">{label}</div>
            <div className={cn("mt-1 max-w-full break-words font-bold leading-none", compact ? "text-base" : "text-2xl", valueColors[tone])}>{value}</div>
            {hint ? <div className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{hint}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border border-slate-200 bg-white shadow-panel", accentClasses[tone], className)}>
      <div className="flex min-h-[112px] flex-col items-center justify-center gap-1.5 p-4 text-center">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="text-xs font-semibold leading-5 text-slate-500">{label}</div>
        <div className={cn("max-w-full break-words font-bold leading-none", compact ? "text-base" : "text-2xl", valueColors[tone])}>{value}</div>
        {hint ? <div className="mt-0.5 max-w-[200px] text-[11px] leading-4 text-muted-foreground">{hint}</div> : null}
      </div>
    </div>
  );
}

/**
 * Inline metric used in headers with a divider-based layout (e.g. Audit Log).
 */
export function InlineMetric({
  icon: Icon,
  label,
  value,
  hint,
  compact = false
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div className="border-b p-4 xl:border-b-0 xl:border-r xl:last:border-r-0">
      <div className="flex min-h-[72px] items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase text-slate-500">{label}</div>
          <div className={cn("mt-1 truncate font-bold leading-tight text-slate-950", compact ? "text-base" : "text-xl")}>{value}</div>
          {hint ? <div className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}
