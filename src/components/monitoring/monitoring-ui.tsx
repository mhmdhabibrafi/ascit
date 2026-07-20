import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger" | "muted";

const toneClasses: Record<Tone, string> = {
  info: "border-emerald-200 bg-emerald-50 text-emerald-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  muted: "border-slate-200 bg-slate-50 text-slate-600"
};

export function MonitoringMetric({
  icon: Icon,
  label,
  value,
  hint,
  tone = "info",
  compact
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  tone?: Tone;
  compact?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-[112px] flex-col items-center justify-center gap-1.5 p-4 text-center">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", toneClasses[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-xs font-semibold leading-5 text-slate-500">{label}</div>
        <div className={cn("max-w-full break-words font-bold leading-tight text-slate-950", compact ? "text-base" : "text-2xl")}>{value}</div>
        {hint ? <div className="max-w-[190px] text-[11px] leading-4 text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export function MonitoringRow({
  code,
  title,
  subtitle,
  badges,
  score,
  scoreLabel = "Skor",
  scoreTone = "info",
  children,
  action
}: {
  code: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  score?: number | string;
  scoreLabel?: string;
  scoreTone?: Tone;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <article className="grid max-w-full gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-panel transition-all hover:shadow-md">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700">{code}</span>
            {badges}
          </div>
          <h3 className="mt-2 break-words text-sm font-semibold leading-snug text-slate-950">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{subtitle}</p> : null}
        </div>
        {score !== undefined ? (
          <div className={cn("flex min-h-[62px] shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-2 text-center lg:min-w-[108px]", toneClasses[scoreTone])}>
            <div className="w-full text-center text-[11px] font-bold uppercase leading-none tracking-[0.08em]">{scoreLabel}</div>
            <div className={cn("mt-1.5 w-full text-center font-bold tabular-nums leading-none", typeof score === "number" ? "text-2xl" : "text-sm")}>{score}</div>
          </div>
        ) : null}
      </div>
      {children}
      {action ? <div className="flex justify-start pt-1">{action}</div> : null}
    </article>
  );
}

export function MonitoringInfoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 lg:grid-cols-2", className)}>{children}</div>;
}

export function MonitoringInfoBlock({
  label,
  value,
  children,
  icon: Icon,
  className
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4", className)}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {Icon ? <Icon className="h-4 w-4 text-emerald-700" /> : null}
        {label}
      </div>
      {value ? <div className="mt-2.5 break-words text-sm font-semibold leading-6 text-slate-800">{value}</div> : null}
      {children}
    </div>
  );
}

export function MonitoringStatusBadge({ value, tone }: { value?: string | null; tone?: Tone }) {
  return <Badge tone={tone}>{value || "-"}</Badge>;
}
