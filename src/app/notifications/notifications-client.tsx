"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Circle, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyPanel, PageHeader, PageStack } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  module: string;
  action: string;
  description: string;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
  user?: { name: string } | null;
};

type Meta = { page: number; total: number; totalPages: number; unreadCount: number };

const filters = [
  { value: "all", label: "Semua" },
  { value: "unread", label: "Belum dibaca" },
  { value: "read", label: "Sudah dibaca" }
] as const;

export default function NotificationsClient() {
  const toast = useToast();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, total: 0, totalPages: 1, unreadCount: 0 });
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/notifications?page=${page}&limit=20&status=${filter}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal memuat notifikasi.");
      setRows(json.data || []);
      setMeta(json.meta);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal memuat notifikasi.", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, page, toast]);

  useEffect(() => { void load(); }, [load]);

  async function updateRead(id: string, read: boolean) {
    setUpdating(id);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read })
      });
      if (!response.ok) throw new Error("Gagal memperbarui notifikasi.");
      window.dispatchEvent(new Event("ascit:notifications-changed"));
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal memperbarui notifikasi.", "error");
    } finally {
      setUpdating(null);
    }
  }

  async function markAllRead() {
    setUpdating("all");
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true })
      });
      if (!response.ok) throw new Error("Gagal menandai semua notifikasi.");
      toast.push("Semua notifikasi sudah ditandai dibaca.", "success");
      window.dispatchEvent(new Event("ascit:notifications-changed"));
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal menandai semua notifikasi.", "error");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow="Aktivitas"
        title="Notifikasi Sistem"
        description="Pantau seluruh aktivitas penting ASCIT dan kelola status notifikasi Anda."
        actions={
          <Button variant="outline" onClick={markAllRead} disabled={!meta.unreadCount || updating === "all"}>
            <CheckCheck className="h-4 w-4" /> Tandai semua dibaca
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => { setFilter(item.value); setPage(1); }}
              className={cn(
                "rounded-md px-3 py-2 text-xs font-semibold transition",
                filter === item.value ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {item.label}{item.value === "unread" && meta.unreadCount > 0 ? ` (${meta.unreadCount})` : ""}
            </button>
          ))}
        </div>
        <div className="text-xs font-medium text-slate-500">{meta.total} notifikasi</div>
      </div>

      <Card accent="none" className="overflow-hidden">
        {loading ? (
          <div className="grid gap-3 p-4">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : rows.length ? (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <article key={row.id} className={cn("flex gap-3 p-4 transition hover:bg-slate-50", !row.isRead && "bg-emerald-50/50")}>
                <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", row.isRead ? "bg-slate-100 text-slate-400" : "bg-emerald-100 text-emerald-700")}>
                  {row.isRead ? <MailOpen className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">{row.module || "Sistem"}</h3>
                    {!row.isRead && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Baru</span>}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{row.description}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 text-[11px] font-medium text-slate-400">
                    <time>{new Date(row.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</time>
                    {row.user?.name && <span>oleh {row.user.name}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateRead(row.id, !row.isRead)}
                  disabled={updating === row.id}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-emerald-700 disabled:opacity-50"
                  title={row.isRead ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                >
                  {row.isRead ? <Circle className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel className="m-4" icon={Bell} title="Tidak ada notifikasi" description="Belum ada notifikasi untuk filter yang dipilih." />
        )}
      </Card>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
          <Button variant="outline" onClick={() => setPage((value) => value - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button>
          <span className="text-xs font-semibold text-slate-500">Halaman {meta.page} dari {meta.totalPages}</span>
          <Button variant="outline" onClick={() => setPage((value) => value + 1)} disabled={page >= meta.totalPages}>Berikutnya <ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
    </PageStack>
  );
}
