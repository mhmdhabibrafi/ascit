"use client";

import { AlertTriangle, CheckCircle2, Database, Loader2, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";

type HealthResponse = {
  status: "ok" | "error";
  provider: string;
  database?: {
    name: string;
    schema: string;
    serverTime: string;
  };
  counts?: {
    assets: number;
    users: number;
    units: number;
    auditLogs: number;
  };
  message?: string;
};

const summaryCacheKey = "ascit:database-health-summary";
const summaryCacheTtlMs = 60_000;

function readCachedSummary() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(summaryCacheKey);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { checkedAt: string; health: HealthResponse };
    const checkedAt = new Date(cached.checkedAt);
    if (Number.isNaN(checkedAt.getTime()) || Date.now() - checkedAt.getTime() > summaryCacheTtlMs) return null;
    return { checkedAt, health: cached.health };
  } catch {
    return null;
  }
}

function writeCachedSummary(health: HealthResponse, checkedAt: Date) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(summaryCacheKey, JSON.stringify({ checkedAt: checkedAt.toISOString(), health }));
  } catch {
    // Ignore storage errors; the live status has already been loaded.
  }
}

function useDatabaseHealth({ summary = false, autoRefresh = true }: { summary?: boolean; autoRefresh?: boolean } = {}) {
  const { status } = useSession();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(autoRefresh);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") return;

    setLoading(true);
    try {
      const response = await fetch(summary ? "/api/system/health?summary=1" : "/api/system/health", { cache: "no-store" });
      const json = (await response.json()) as HealthResponse;
      const nextHealth = response.ok ? json : { ...json, status: "error" as const };
      const nextCheckedAt = new Date();
      setHealth(nextHealth);
      setCheckedAt(nextCheckedAt);
      if (summary && response.ok) writeCachedSummary(nextHealth, nextCheckedAt);
    } catch (error) {
      setHealth({
        status: "error",
        provider: "PostgreSQL",
        message: error instanceof Error ? error.message : "Tidak dapat membaca status database."
      });
      setCheckedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, [status, summary]);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    if (summary) {
      const cached = readCachedSummary();
      if (cached) {
        setHealth(cached.health);
        setCheckedAt(cached.checkedAt);
        setLoading(false);
        return;
      }
    }

    if (!autoRefresh) return;
    void refresh();
  }, [autoRefresh, refresh, status, summary]);

  return { health, loading, checkedAt, refresh };
}

export function DatabaseStatusPill({ className }: { className?: string }) {
  const { health, loading, refresh } = useDatabaseHealth({ summary: true });
  const isOnline = health?.status === "ok";
  const isError = health?.status === "error";
  const label = loading && !health ? "Memeriksa DB" : isOnline ? "DB online" : isError ? "DB offline" : "Cek DB";

  return (
    <button
      type="button"
      onClick={() => void refresh()}
      disabled={loading}
      aria-label="Cek status database"
      className={cn(
        "hidden h-8.5 items-center gap-2 rounded-lg bg-slate-100 px-3 text-left text-[11px] font-extrabold uppercase tracking-widest text-slate-650 transition hover:bg-slate-200 focus:outline-none disabled:cursor-wait md:inline-flex border-0",
        isOnline && "bg-emerald-50 text-emerald-750 hover:bg-emerald-100/80",
        isError && "bg-red-50 text-red-750 hover:bg-red-100/80",
        className
      )}
      title="Cek status database"
    >
      {loading && !health ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" /> : <Database className="h-3.5 w-3.5 shrink-0" />}
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-slate-300",
          isOnline && "bg-emerald-500 animate-pulse",
          isError && "bg-red-500",
          loading && !health && "bg-amber-400"
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
    </button>
  );
}

export function DatabaseStatusPanel() {
  const { health, loading, checkedAt, refresh } = useDatabaseHealth();
  const isOnline = health?.status === "ok";
  const isError = health?.status === "error";
  const isChecking = loading && !health;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-700" />
          Status Database
        </CardTitle>
        <Button type="button" variant="outline" className="min-h-9 px-2" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4" aria-live="polite">
        <div
          className={cn(
            "flex items-start gap-3 rounded-md border p-4",
            isChecking && "border-amber-200 bg-amber-50 text-amber-900",
            !isChecking && isOnline && "border-emerald-200 bg-emerald-50 text-emerald-900",
            !isChecking && isError && "border-red-200 bg-red-50 text-red-800",
            !isChecking && !health && "border-slate-200 bg-slate-50 text-slate-700"
          )}
        >
          {isChecking ? (
            <Loader2 className="mt-0.5 h-5 w-5 animate-spin" />
          ) : isOnline ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5" />
          )}
          <div className="min-w-0">
            <div className="font-bold">{isChecking ? "Memeriksa koneksi PostgreSQL" : isOnline ? "Terhubung ke PostgreSQL" : "Database belum tersambung"}</div>
            <div className="mt-1 text-sm">
              {isOnline
                ? `${health?.database?.name ?? "ascit_db"} / schema ${health?.database?.schema ?? "public"}`
                : health?.message ?? "Pastikan PostgreSQL berjalan dan DATABASE_URL benar."}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Aset aktif" value={health?.counts?.assets} />
          <Metric label="Pengguna" value={health?.counts?.users} />
          <Metric label="Unit" value={health?.counts?.units} />
          <Metric label="Audit log" value={health?.counts?.auditLogs} />
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Terakhir dicek: {checkedAt ? formatDateTime(checkedAt) : "-"}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value ?? "-"}</div>
    </div>
  );
}
