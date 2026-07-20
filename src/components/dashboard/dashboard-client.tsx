"use client";

import {
  Activity,
  AlertTriangle,
  Bot,
  Boxes,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Gauge,
  RefreshCw,
  ShieldAlert,
  Wrench
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  LabelList,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate, humanizeEnum } from "@/lib/utils";

type DashboardStats = {
  totalAssets: number;
  activeAssets: number;
  brokenAssets: number;
  repairingAssets: number;
  replaceAssets: number;
  warrantySoon: number;
  maintenanceThisMonth: number;
  totalUnits: number;
  criticalAssets?: number;
  upgradeRecommendedAssets?: number;
};

type ChartDatum = {
  name: string;
  total: number;
};

type DashboardAssetRow = {
  id: string;
  assetCode: string;
  assetName: string;
  warrantyEndDate?: string | null;
  conditionStatus?: string | null;
  lifecycleStatus?: string | null;
  unit?: {
    name?: string | null;
  } | null;
};

type MaintenanceRow = {
  id: string;
  scheduledDate: string;
  status: string;
  asset?: {
    assetName?: string | null;
  } | null;
};

type AiPriorityRow = {
  asset: {
    id: string;
    assetCode: string;
    assetName: string;
  };
  score: {
    score: number;
    scoreStatus: string;
  };
};

type DashboardData = {
  stats: DashboardStats;
  charts: {
    byCategory: ChartDatum[];
    byCondition: ChartDatum[];
    byUnit: ChartDatum[];
    repairTrend: ChartDatum[];
    treemapData: Array<{ name: string; children: Array<{ name: string; size: number }> }>;
  };
  tables: {
    warrantySoon: DashboardAssetRow[];
    problemAssets: DashboardAssetRow[];
    upcomingMaintenance: MaintenanceRow[];
    aiPriority: AiPriorityRow[];
  };
};

const conditionColorMap: Record<string, string> = {
  "Baik": "#0f7680",            // Teal (Main)
  "Rusak ringan": "#14b8a6",    // Teal 500
  "Rusak berat": "#ef4444",     // Red 500 (Alert)
  "Layak ganti": "#f87171",     // Red 400 (Alert)
  "Dalam perbaikan": "#5eead4", // Teal 300
  "Maintenance": "#99f6e4"      // Teal 200
};

const featureMap = [
  { label: "Inventaris Aset", icon: Boxes, description: "Data aset, lokasi, spesifikasi, QR, vendor, dan garansi." },
  { label: "Lifecycle", icon: RefreshCw, description: "Mutasi, maintenance, perbaikan, dan perubahan status aset." },
  { label: "Monitoring", icon: Gauge, description: "Umur aset, garansi, kondisi, dan prioritas tindakan." },
  { label: "AI & Laporan", icon: Bot, description: "Skoring risiko, rekomendasi upgrade, CSV, print, dan audit log." }
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const isMaintenance = data.name === "Pemeliharaan" || (data.dataKey === "total" && data.stroke === "#0284c7");
    const unit = isMaintenance ? "Tindakan" : "Aset";
    const nameLabel = label || data.name;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: data.color || data.payload?.fill || data.fill || "#2563eb" }} />
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider truncate max-w-[140px]">{nameLabel}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-sm font-black text-slate-900 leading-none">{data.value}</span>
          <span className="text-[11px] font-bold text-slate-400 leading-none">{unit}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Dashboard belum dapat dimuat.");
      }

      setData(json as DashboardData);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Dashboard belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="mx-auto grid w-full max-w-[1440px] gap-5">
        <div className="grid gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="p-4">
              <div className="h-24 animate-pulse rounded-md bg-slate-100" />
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="text-sm font-semibold text-slate-600">Memuat dashboard ASCIT...</CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.stats || error) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <div>
              <div className="font-black">Dashboard belum dapat dimuat.</div>
              <div className="mt-1 text-sm text-red-600">{error ?? "Periksa koneksi database PostgreSQL."}</div>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadDashboard()}>
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <DashboardContent data={data} />;
}

function DashboardContent({ data }: { data: DashboardData }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const attentionAssets = data.stats.brokenAssets + data.stats.repairingAssets + data.stats.replaceAssets;
  const healthyRate = data.stats.totalAssets ? Math.round((data.stats.activeAssets / data.stats.totalAssets) * 100) : 0;
  const conditionData = data.charts.byCondition.map((item) => {
    const name = humanizeEnum(item.name);
    return {
      ...item,
      name,
      fill: conditionColorMap[name] || "#64748b"
    };
  });

  const unitData = [...data.charts.byUnit].sort((a, b) => a.total - b.total);
  const categoryData = [...data.charts.byCategory].sort((a, b) => a.total - b.total);

  const stackedConditionData = (data.charts.treemapData || []).map(category => {
    const obj: any = { name: category.name };
    let total = 0;
    category.children.forEach(cond => {
      const condName = humanizeEnum(cond.name);
      obj[condName] = cond.size;
      total += cond.size;
    });
    obj.total = total;
    return obj;
  }).sort((a, b) => b.total - a.total);

  const primaryStats = [
    {
      label: "Total Aset",
      value: data.stats.totalAssets,
      icon: Boxes,
      tone: "bg-slate-50 text-slate-700",
      description: `Dari ${data.stats.totalUnits} unit kerja`
    },
    {
      label: "Aset Kritis",
      value: data.stats.criticalAssets || 0,
      icon: ShieldAlert,
      tone: (data.stats.criticalAssets || 0) > 0 ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600",
      description: "Prioritas penggantian"
    },
    {
      label: "Rekomendasi Upgrade",
      value: data.stats.upgradeRecommendedAssets || 0,
      icon: Activity,
      tone: (data.stats.upgradeRecommendedAssets || 0) > 0 ? "bg-amber-50 text-amber-600" : "bg-teal-50 text-teal-600",
      description: "Perlu upgrade spesifikasi"
    },
    {
      label: "Aset Aktif",
      value: data.stats.activeAssets,
      icon: CheckCircle2,
      tone: "bg-teal-50 text-teal-600",
      description: `${healthyRate}% beroperasi normal`
    }
  ];

  const insightItems = [
    {
      icon: Activity,
      label: "Garansi hampir habis",
      value: data.stats.warrantySoon,
      tone: data.stats.warrantySoon ? "danger" : "neutral",
      description: "Aset perlu dicek sebelum masa klaim berakhir."
    },
    {
      icon: Wrench,
      label: "Dalam perbaikan",
      value: data.stats.repairingAssets,
      tone: data.stats.repairingAssets ? "warning" : "neutral",
      description: "Pantau SLA teknisi dan status pengembalian aset."
    },
    {
      icon: AlertTriangle,
      label: "Aset rusak",
      value: data.stats.brokenAssets,
      tone: data.stats.brokenAssets ? "danger" : "neutral",
      description: "Masuk daftar evaluasi kondisi dan tindakan korektif."
    }
  ] as const;

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-6">
      
      {/* Top Section: KPIs & Alerts */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: 2x2 KPI Grid */}
        <div className="lg:col-span-8 grid gap-4 sm:grid-cols-2">
          {primaryStats.map(({ label, value, icon: Icon, tone, description }) => (
            <Card key={label} className="group overflow-hidden shadow-sm hover:shadow-lg hover:shadow-emerald-500/5 border border-slate-200/60 p-5 flex flex-col justify-between bg-white relative transition-all duration-300 hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/50 to-slate-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500/10 to-transparent blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-[12px] font-extrabold text-slate-500 tracking-wider uppercase group-hover:text-slate-700 transition-colors">{label}</div>
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", tone)}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="relative z-10 mt-4">
                <div className="text-3xl font-black text-slate-800 tracking-tight">{value}</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-400 leading-snug">{description}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Right Side: Stacked Alerts */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="mb-0.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Status Operasional</div>
          {insightItems.map(({ icon: Icon, label, value, tone, description }) => (
            <Card key={label} className="group flex items-center gap-4 p-4 shadow-sm hover:shadow-md border border-slate-200/60 bg-white transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div
                className={cn(
                  "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3",
                  tone === "danger" && "bg-red-50 text-red-600",
                  tone === "warning" && "bg-amber-50 text-amber-600",
                  tone === "neutral" && "bg-slate-50 text-slate-400"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="block text-xs font-extrabold text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
                  <span className={cn("text-lg font-black leading-none", tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-slate-700")}>{value}</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-400 truncate">{description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Aligned 3-Column Chart Layout */}
      <section className="grid gap-6 xl:grid-cols-3">
        {/* Card 1: Ringkasan Kondisi Aset */}
        <Card className="flex flex-col shadow-sm hover:shadow-md border border-slate-200/60 p-0 overflow-hidden bg-white transition-shadow duration-300">
          <div className="bg-gradient-to-r from-slate-50/80 to-white px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Kondisi Aset</span>
          </div>
          <CardContent className="flex-1 flex flex-col justify-center min-h-[220px] p-4">
            <div className="h-[200px] w-full">
              {isMounted && conditionData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conditionData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      {conditionData.map((entry, index) => (
                        <linearGradient key={`grad-${index}`} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                          <stop offset="100%" stopColor={entry.fill} stopOpacity={0.4} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={25}>
                      {conditionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#grad-${index})`} />
                      ))}
                      <LabelList dataKey="total" position="top" style={{ fontSize: 10, fontWeight: 800, fill: "#475569" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Penyebaran Unit Kerja */}
        <Card className="flex flex-col shadow-sm hover:shadow-md border border-slate-200/60 p-0 overflow-hidden bg-white transition-shadow duration-300">
          <div className="bg-gradient-to-r from-slate-50/80 to-white px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-teal-600" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Sebaran Unit</span>
          </div>
          <CardContent className="flex-1 flex flex-col justify-center min-h-[220px] p-4">
            <div className="h-[200px] w-full">
              {isMounted && unitData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={unitData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} width={85} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(241, 245, 249, 0.4)", radius: 4 }} />
                    <Bar dataKey="total" name="Total Aset" fill="#0f7680" radius={[0, 4, 4, 0]} barSize={12}>
                      <LabelList dataKey="total" position="right" style={{ fontSize: 9, fontWeight: 800, fill: "#475569" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Kategori Perangkat */}
        <Card className="flex flex-col shadow-sm hover:shadow-md border border-slate-200/60 p-0 overflow-hidden bg-white transition-shadow duration-300">
          <div className="bg-gradient-to-r from-slate-50/80 to-white px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Boxes className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Kategori</span>
          </div>
          <CardContent className="flex-1 flex flex-col justify-center min-h-[220px] p-4">
            <div className="h-[200px] w-full">
              {isMounted && categoryData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={categoryData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} width={85} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(241, 245, 249, 0.4)", radius: 4 }} />
                    <Bar dataKey="total" name="Total Aset" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={12}>
                      <LabelList dataKey="total" position="right" style={{ fontSize: 9, fontWeight: 800, fill: "#475569" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Treemap Visualization */}
      <section className="grid gap-6">
        <Card className="flex flex-col shadow-sm hover:shadow-md border border-slate-200/60 p-0 overflow-hidden bg-white transition-shadow duration-300">
          <div className="bg-gradient-to-r from-slate-50/80 to-white px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Boxes className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Korelasi Kategori & Kondisi Aset</span>
          </div>
          <CardContent className="flex-1 flex flex-col justify-center min-h-[300px] p-4">
            <div className="h-[280px] w-full">
              {isMounted && stackedConditionData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stackedConditionData} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(241, 245, 249, 0.4)" }} />
                    {Object.keys(conditionColorMap).map((key) => (
                      <Bar key={key} dataKey={key} name={key} stackId="a" fill={conditionColorMap[key]} barSize={24} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <TableCard
          title="Garansi Hampir Habis"
          rows={data.tables.warrantySoon}
          columns={[
            { key: "assetCode", label: "Kode" },
            { key: "assetName", label: "Nama Aset" },
            { key: "unit.name", label: "Unit" },
            { key: "warrantyEndDate", label: "Akhir Garansi", type: "date" }
          ]}
        />
        <TableCard
          title="Aset Bermasalah"
          rows={data.tables.problemAssets}
          columns={[
            { key: "assetCode", label: "Kode" },
            { key: "assetName", label: "Nama Aset" },
            { key: "conditionStatus", label: "Kondisi", type: "status" },
            { key: "lifecycleStatus", label: "Lifecycle", type: "status" }
          ]}
        />
        <MaintenanceTable rows={data.tables.upcomingMaintenance} />
        <AiPriorityTable rows={data.tables.aiPriority} />
      </section>
    </div>
  );
}



function valueByPath(row: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, row);
}

function TableCard({
  title,
  rows,
  columns
}: {
  title: string;
  rows: DashboardAssetRow[];
  columns: Array<{ key: string; label: string; type?: "date" | "status" }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows?.length ? (
          rows.map((row) => {
            const titleValue = valueByPath(row as unknown as Record<string, unknown>, columns[1]?.key || columns[0].key);
            const codeValue = valueByPath(row as unknown as Record<string, unknown>, columns[0].key);
            return (
              <article key={row.id} className="rounded-md border bg-white p-4 shadow-panel">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-950">{String(titleValue ?? "-")}</div>
                    <div className="mt-1 text-xs font-bold text-emerald-700">{String(codeValue ?? "-")}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {columns.slice(2).map((column) => {
                    const value = valueByPath(row as unknown as Record<string, unknown>, column.key);
                    return (
                      <div key={column.key} className="rounded-md bg-slate-50 px-3 py-2">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{column.label}</div>
                        <div className="mt-1 text-sm font-bold text-slate-800">
                          {column.type === "status" ? <Badge>{String(value)}</Badge> : column.type === "date" ? formatDate(value as string | null | undefined) : String(value ?? "-")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}

function MaintenanceTable({ rows }: { rows: MaintenanceRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Terdekat</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows?.length ? (
          rows.map((row) => (
            <article key={row.id} className="flex flex-col gap-2 rounded-md border bg-white p-4 shadow-panel sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-slate-950">{row.asset?.assetName || "-"}</div>
                <div className="mt-1 text-xs font-bold text-muted-foreground">{formatDate(row.scheduledDate)}</div>
              </div>
              <Badge>{row.status}</Badge>
            </article>
          ))
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}

function AiPriorityTable({ rows }: { rows: AiPriorityRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aset Prioritas AI</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows?.length ? (
          rows.map((row) => (
            <article key={row.asset.id} className="grid gap-3 rounded-md border bg-white p-4 shadow-panel sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-slate-950">{row.asset.assetName}</div>
                <div className="mt-1 text-xs font-bold text-emerald-700">{row.asset.assetCode}</div>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <Badge>{humanizeEnum(row.score.scoreStatus)}</Badge>
                <span className="rounded-md bg-red-50 px-2 py-1 text-sm font-black text-red-700">{row.score.score}</span>
              </div>
            </article>
          ))
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-md border bg-slate-50 p-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Boxes className="h-5 w-5" />
      </div>
      <div className="text-sm font-semibold text-slate-600">Belum ada data</div>
      <div className="text-[11px] text-muted-foreground">Tidak ada data untuk ditampilkan saat ini.</div>
    </div>
  );
}
