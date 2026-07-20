import type { HTMLAttributes } from "react";
import { cn, humanizeEnum } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "muted";

function inferTone(value: string): Tone {
  const lower = value.toLowerCase();
  if (lower.includes("baik") || lower.includes("aktif") || lower.includes("aman") || lower.includes("disetujui")) return "success";
  if (lower.includes("hampir") || lower.includes("menunggu") || lower.includes("maintenance") || lower.includes("pantau")) return "warning";
  if (lower.includes("rusak") || lower.includes("ganti") || lower.includes("habis") || lower.includes("ditolak")) return "danger";
  if (lower.includes("upgrade") || lower.includes("admin") || lower.includes("kepala")) return "info";
  return "muted";
}

const tones: Record<Tone, string> = {
  success: "border-emerald-200/60 bg-emerald-100/50 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm",
  warning: "border-amber-200/60 bg-amber-100/50 text-amber-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm",
  danger: "border-red-200/60 bg-red-100/50 text-red-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm",
  info: "border-emerald-200/60 bg-emerald-100/50 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm",
  muted: "border-slate-200/60 bg-slate-100/50 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm"
};

export function Badge({ className, children, tone, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const text = typeof children === "string" ? humanizeEnum(children) : children;
  const resolvedTone = tone || inferTone(String(text || ""));
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-semibold leading-tight",
        "max-w-full break-words",
        tones[resolvedTone],
        className
      )}
      {...props}
    >
      {text}
    </span>
  );
}
