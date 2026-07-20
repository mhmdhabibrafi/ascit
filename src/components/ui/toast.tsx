"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Toast = {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
};

const ToastContext = createContext<{ push: (message: string, type?: Toast["type"]) => void } | null>(null);

const toastStyles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-emerald-200 bg-emerald-50 text-emerald-800"
};

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setToasts([]);
  }, [pathname]);

  const push = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] grid w-[min(400px,calc(100vw-32px))] gap-2" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.type || "info"];
          return (
            <div
              key={toast.id}
              role={toast.type === "error" ? "alert" : "status"}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium shadow-lg backdrop-blur-sm",
                "animate-toast-in",
                toastStyles[toast.type || "info"]
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 leading-snug">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="mt-0.5 shrink-0 rounded-md p-0.5 opacity-60 transition hover:opacity-100"
                aria-label="Tutup notifikasi"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
