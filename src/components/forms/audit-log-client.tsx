"use client";

import { Activity, Clock3, FileClock, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineMetric } from "@/components/ui/metric-card";
import { EmptyPanel, PageHeader, PageStack } from "@/components/ui/page";
import { SearchBar, SearchFilter } from "@/components/ui/search-bar";
import { MetricSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime, humanizeEnum } from "@/lib/utils";

type AuditUser = {
  name?: string | null;
  email?: string | null;
};

type AuditRow = {
  id: string;
  module?: string | null;
  action?: string | null;
  description?: string | null;
  ipAddress?: string | null;
  targetModel?: string | null;
  targetId?: string | null;
  diff?: any;
  createdAt?: string | null;
  user?: AuditUser | null;
};

type DisplayAuditRow = AuditRow & {
  count: number;
};

export function AuditLogClient() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  async function load({ silent = false } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setVisibleCount(10);

    try {
      const response = await fetch("/api/audit-log");
      const json = await response.json();
      setRows(json.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setVisibleCount(10);
  }, [search, moduleFilter, userFilter]);

  const moduleOptions = useMemo(() => uniqueValues(rows.map((row) => row.module)), [rows]);
  const userOptions = useMemo(() => uniqueValues(rows.map((row) => row.user?.name || row.user?.email || "Sistem")), [rows]);

  const stats = useMemo(() => {
    const latest = rows[0]?.createdAt ? compactDateTime(rows[0].createdAt) : "-";
    return {
      total: rows.length,
      modules: moduleOptions.length,
      users: userOptions.length,
      latest
    };
  }, [moduleOptions.length, rows, userOptions.length]);

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    return rows.filter((row) => {
      const userName = row.user?.name || row.user?.email || "Sistem";
      const matchesModule = moduleFilter === "all" || row.module === moduleFilter;
      const matchesUser = userFilter === "all" || userName === userFilter;
      const matchesSearch =
        !keyword ||
        [row.module, row.action, row.description, row.ipAddress, row.user?.name, row.user?.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      return matchesModule && matchesUser && matchesSearch;
    });
  }, [moduleFilter, rows, search, userFilter]);

  const displayRows = useMemo(() => groupSimilarLogs(filteredRows), [filteredRows]);

  return (
    <PageStack className="gap-4">
      <PageHeader
        eyebrow="Administrasi"
        title="Audit Log"
        description="Pelacakan aktivitas sistem untuk login, laporan, perubahan data, dan tindakan operasional."
        actions={
          <Button type="button" variant="outline" onClick={() => void load({ silent: true })} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {loading ? (
        <MetricSkeleton />
      ) : (
        <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel sm:grid-cols-2 xl:grid-cols-4">
          <InlineMetric icon={Activity} label="Total Log" value={stats.total} hint="Aktivitas tercatat" />
          <InlineMetric icon={ShieldCheck} label="Modul" value={stats.modules} hint="Area sistem" />
          <InlineMetric icon={UserRound} label="Pengguna" value={stats.users} hint="Aktor tercatat" />
          <InlineMetric icon={Clock3} label="Terakhir" value={stats.latest} compact hint="Aktivitas terbaru" />
        </section>
      )}

      <section className="overflow-hidden rounded-md border bg-white shadow-panel">
        <div className="border-b px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <FileClock className="h-4 w-4 text-emerald-700" />
                <h3 className="text-base font-black text-slate-950">Riwayat Aktivitas</h3>
                <Badge tone="info">{displayRows.length} baris</Badge>
                {displayRows.length !== filteredRows.length ? <Badge tone="muted">{filteredRows.length} log asli</Badge> : null}
              </div>
              <p className="mt-1 max-w-3xl text-justify text-sm leading-6 text-muted-foreground">
                Log serupa pada menit yang sama digabung agar daftar tetap ringkas.
              </p>
            </div>
          </div>

          <SearchBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Cari aktivitas..."
            onReset={() => { setSearch(""); setModuleFilter("all"); setUserFilter("all"); }}
            filters={
              <>
                <SearchFilter
                  value={moduleFilter}
                  onChange={setModuleFilter}
                  options={[{ value: "all", label: "Semua modul" }, ...moduleOptions.map((item) => ({ value: item, label: humanizeEnum(item) }))]}
                  className="w-[150px] h-9"
                />
                <SearchFilter
                  value={userFilter}
                  onChange={setUserFilter}
                  options={[{ value: "all", label: "Semua user" }, ...userOptions.map((item) => ({ value: item, label: item }))]}
                  className="w-[180px] h-9"
                />
              </>
            }
          />
        </div>

        <div>
          {loading ? <TableSkeleton /> : null}
          {!loading && !displayRows.length ? <EmptyPanel className="m-5" title="Tidak ada log sesuai filter" description="Ubah filter atau kata kunci pencarian." /> : null}
          {!loading && displayRows.length ? (
            <>
              <AuditList rows={displayRows.slice(0, visibleCount)} />
              {visibleCount < displayRows.length ? (
                <div className="mt-4 flex justify-center pb-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setVisibleCount((prev) => prev + 15)}
                  >
                    Tampilkan Lebih Banyak ({displayRows.length - visibleCount} item tersisa)
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </PageStack>
  );
}


function AuditList({ rows }: { rows: DisplayAuditRow[] }) {
  return (
    <div className="divide-y">
      {rows.map((row) => (
        <AuditItem key={row.id} row={row} />
      ))}
    </div>
  );
}

function AuditItem({ row }: { row: DisplayAuditRow }) {
  const time = splitDateTime(row.createdAt);
  return (
    <article className="grid gap-3 px-4 py-3 hover:bg-slate-50 lg:grid-cols-[124px_minmax(160px,0.7fr)_minmax(0,1.4fr)_96px] lg:items-start">
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-500">{time.date}</div>
        <div className="mt-1 text-sm font-semibold text-slate-950">{time.time}</div>
      </div>

      <div className="min-w-0">
        <div className="break-words text-sm font-semibold leading-5 text-slate-950">{row.user?.name || "Sistem"}</div>
        {row.user?.email ? <div className="mt-1 break-words text-xs leading-5 text-muted-foreground">{row.user.email}</div> : null}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">{humanizeEnum(row.module)}</Badge>
          <Badge tone="muted">{auditActionLabel(row.action)}</Badge>
          {row.targetModel ? <Badge tone="warning">{row.targetModel} {row.targetId ? `(${row.targetId})` : ''}</Badge> : null}
          {row.count > 1 ? <Badge tone="warning">{row.count} kali</Badge> : null}
        </div>
        <p className="mt-2 break-words text-sm leading-6 text-slate-700">{row.description || "-"}</p>
        {row.diff && Object.keys(row.diff).length > 0 && (
          <pre className="mt-2 max-w-full overflow-x-auto rounded-md bg-slate-100 p-3 text-[11px] leading-relaxed text-slate-700">
            {JSON.stringify(row.diff, null, 2)}
          </pre>
        )}
      </div>

      <div className="break-words text-xs font-bold leading-5 text-slate-500 lg:text-right">{row.ipAddress || "-"}</div>
    </article>
  );
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean).map(String))).sort((a, b) => a.localeCompare(b));
}

function groupSimilarLogs(rows: AuditRow[]): DisplayAuditRow[] {
  const grouped: DisplayAuditRow[] = [];
  const indexByKey = new Map<string, number>();

  for (const row of rows) {
    const minute = row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 16) : "";
    const key = [minute, row.user?.email || row.user?.name || "Sistem", row.module || "", row.action || "", row.description || "", row.ipAddress || ""].join("|");
    const existingIndex = indexByKey.get(key);

    if (existingIndex !== undefined) {
      grouped[existingIndex].count += 1;
      continue;
    }

    indexByKey.set(key, grouped.length);
    grouped.push({ ...row, count: 1 });
  }

  return grouped;
}

function auditActionLabel(action?: string | null) {
  const labels: Record<string, string> = {
    VIEW_REPORT: "Buka Laporan",
    EXPORT_REPORT: "Export Laporan",
    LOGIN: "Login",
    LOGOUT: "Logout",
    CREATE_MASTER_DATA: "Tambah Master Data",
    UPDATE_MASTER_DATA: "Edit Master Data",
    DELETE_MASTER_DATA: "Hapus Master Data",
    ENSURE_MASTER_DATA: "Lengkapi Master Data",
    CREATE_USER: "Tambah User",
    UPDATE_USER: "Edit User",
    CREATE_ASSET: "Tambah Aset",
    UPDATE_ASSET: "Edit Aset",
    DELETE_ASSET: "Hapus Aset",
    AI_ANALYSIS: "Analisis AI"
  };

  if (!action) return "-";
  return labels[action] || humanizeEnum(action);
}

function splitDateTime(value?: string | null) {
  if (!value) return { date: "-", time: "-" };
  const formatted = formatDateTime(value);
  const parts = formatted.split(" ");
  if (parts.length >= 4) {
    return {
      date: `${parts[0]} ${parts[1]} ${parts[2]}`,
      time: parts[3]
    };
  }
  return { date: formatted, time: "" };
}

function compactDateTime(value?: string | null) {
  const { date, time } = splitDateTime(value);
  return time ? `${date}, ${time}` : date;
}
