import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Accent = "primary" | "warning" | "danger" | "success" | "info" | "none";

const accents: Record<Accent, string> = {
  primary: "border-t-[3px] border-t-emerald-700",
  warning: "border-t-[3px] border-t-amber-500",
  danger: "border-t-[3px] border-t-red-600",
  success: "border-t-[3px] border-t-emerald-650",
  info: "border-t-[3px] border-t-indigo-600",
  none: ""
};

export function Card({ className, accent = "primary", ...props }: HTMLAttributes<HTMLDivElement> & { accent?: Accent }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300/80",
        accents[accent],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-slate-100 px-4 py-3 flex items-center justify-between min-h-[44px]", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-xs font-black uppercase tracking-wider text-slate-800", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
