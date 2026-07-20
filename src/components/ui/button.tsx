import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "border border-transparent bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-emerald-500 hover:to-emerald-600 active:from-emerald-700 active:to-emerald-800",
  secondary: "border border-transparent bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-emerald-400 hover:to-emerald-500 active:from-emerald-600 active:to-emerald-700",
  outline: "border border-slate-200/80 bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 shadow-sm",
  ghost: "text-slate-700 hover:bg-slate-100/80 active:bg-slate-200",
  danger: "border border-transparent bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-red-400 hover:to-red-500 active:from-red-600 active:to-red-700"
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  function Button({ className, variant = "primary", type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex max-w-full min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold leading-snug transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] shadow-sm hover:shadow",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
