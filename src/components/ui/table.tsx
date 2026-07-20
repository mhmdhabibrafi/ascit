import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function TableWrap({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("max-w-full overflow-x-auto rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm", className)} {...props} />;
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full min-w-[760px] border-collapse text-sm", className)} {...props} />;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 whitespace-nowrap shadow-[0_1px_0_rgba(0,0,0,0.05)]", className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-t border-slate-100/80 px-4 py-3.5 align-middle text-sm text-slate-700 transition-colors duration-150 group-hover:bg-slate-50/50", className)} {...props} />;
}
