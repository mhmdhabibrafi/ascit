import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, required, children }: { label: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="group grid gap-1.5 text-[13px] font-medium text-slate-700 transition-colors focus-within:text-emerald-700">
      <span>
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-[3px] focus:ring-emerald-500/20 focus:shadow-md disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 hover:border-slate-300 focus:hover:border-emerald-500",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full appearance-none rounded-md border border-slate-200 bg-white px-3.5 pr-9 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-all duration-300 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%2364748b%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.65rem_center] bg-[size:1.1rem_1.1rem] bg-no-repeat focus:border-emerald-500 focus:ring-[3px] focus:ring-emerald-500/20 focus:shadow-md disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 hover:border-slate-300 focus:hover:border-emerald-500",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[96px] w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-[3px] focus:ring-emerald-500/20 focus:shadow-md disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 hover:border-slate-300 focus:hover:border-emerald-500",
        className
      )}
      {...props}
    />
  );
}
