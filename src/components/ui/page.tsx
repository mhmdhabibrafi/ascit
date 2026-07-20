import type { HTMLAttributes, ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageStack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto grid w-full max-w-[1440px] gap-4", className)} {...props} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">{eyebrow}</div> : null}
        <h2 className="mt-1 text-xl font-semibold leading-tight tracking-normal text-slate-950">{title}</h2>
        {description ? <p className="mt-1.5 max-w-4xl text-sm leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}

export function EmptyPanel({
  title = "Belum ada data",
  description,
  icon: Icon = Inbox,
  children,
  className
}: {
  title?: string;
  description?: string;
  icon?: typeof Inbox;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 backdrop-blur-sm p-10 text-center shadow-sm transition-colors hover:bg-slate-50/80 group", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:scale-110 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all duration-300">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-4 font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{title}</div>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p> : null}
      {children ? <div className="mt-5 flex justify-center">{children}</div> : null}
    </div>
  );
}
