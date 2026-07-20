"use client";

import {
  Activity,
  AlertTriangle,
  Lightbulb,
  Bot,
  CheckCircle2,
  Cpu,
  Download,
  ExternalLink,
  Gauge,
  HardDrive,
  HelpCircle,
  Loader2,
  MemoryStick,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Wrench,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  LabelList,
  PieChart,
  Pie,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyPanel, PageHeader, PageStack } from "@/components/ui/page";
import { Field, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { MetricCard } from "@/components/ui/metric-card";
import { hospitalBrand, systemBrand } from "@/lib/branding";
import { cn, formatDateTime, humanizeEnum, humanizeSystemText } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

// ==========================================
// Types
// ==========================================

type RecommendationRow = {
  id: string;
  score: number;
  status: string;
  recommendationTypes?: string[];
  reason?: string | null;
  source?: string | null;
  year?: number | null;
  isApproved?: boolean;
  createdAt?: string;
  asset: {
    id: string;
    assetCode: string;
    assetName: string;
    processor?: string | null;
    ram?: string | null;
    storage?: string | null;
    operatingSystem?: string | null;
    unit?: { name?: string | null } | null;
    room?: { name?: string | null } | null;
    category?: { name?: string | null } | null;
    brand?: { name?: string | null } | null;
  };
};

type MasterData = {
  units?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  vendors?: Array<{ id: string; name: string }>;
};

type AiRecommendationDetail = {
  id?: string;
  factor: string;
  scoreImpact: number;
  message: string;
};

type AiRecommendation = {
  id: string;
  score: number;
  scoreStatus: string;
  recommendationTypes: string[];
  priority?: string;
  recommendation: string;
  reason: string;
  nextYearPlan?: string | null;
  openModelSucceeded: boolean;
  openModelErrorMessage?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  details?: AiRecommendationDetail[];
  asset: {
    id: string;
    assetCode: string;
    assetName: string;
    processor?: string | null;
    ram?: string | null;
    storage?: string | null;
    operatingSystem?: string | null;
    serviceRecords?: unknown[];
    unit?: { name?: string | null } | null;
    category?: { name?: string | null } | null;
  };
};

type AiRun = {
  runCode: string;
  createdAt: string;
  model?: string | null;
  totalAssets?: number;
  summary?: string | null;
  recommendations: AiRecommendation[];
};

type AiFilters = {
  year: string;
  unitId: string;
  categoryId: string;
};

// ==========================================
// Constants & Configs
// ==========================================

const metricConfig = [
  { label: "Upgrade Komponen", type: "UPGRADE", icon: Cpu, tone: "info" },
  { label: "Replace Perangkat", type: "REPLACE", icon: RefreshCw, tone: "danger" },
  { label: "Decommission", type: "DECOMMISSION", icon: HardDrive, tone: "warning" },
  { label: "Prioritas Kritis", status: "PRIORITAS_PENGGANTIAN", icon: ShieldAlert, tone: "danger" }
] as const;

const scoringFactors = [
  { label: "Umur aset", value: "+30", description: "Aset lebih dari 5 tahun masuk risiko penggantian." },
  { label: "Processor lama", value: "+25", description: "Pentium, Celeron, Core 2, atau generasi lama." },
  { label: "RAM rendah", value: "+20", description: "RAM di bawah 8 GB untuk perangkat kerja." },
  { label: "Storage HDD", value: "+15", description: "Media penyimpanan belum SSD." },
  { label: "Riwayat repair", value: "+25", description: "Perbaikan berulang menaikkan prioritas tindakan." },
  { label: "Kondisi aset", value: "+30", description: "Rusak berat atau layak ganti menjadi sinyal kritis." }
];

const statusColors: Record<string, string> = {
  AMAN: "#059669",
  PERLU_DIPANTAU: "#d97706",
  DIREKOMENDASIKAN_UPGRADE: "#0284c7",
  PRIORITAS_PENGGANTIAN: "#dc2626"
};

// ==========================================
// Helper functions
// ==========================================

function downloadCsv(rows: RecommendationRow[]) {
  const columns = [
    ["kode", "Kode Aset"],
    ["aset", "Aset"],
    ["unit", "Unit"],
    ["kategori", "Kategori"],
    ["skor", "Skor"],
    ["status", "Status"],
    ["rekomendasi", "Rekomendasi"],
    ["alasan", "Alasan"],
    ["waktu", "Waktu"]
  ];
  const normalized = rows.map((row) => ({
    kode: row.asset.assetCode,
    aset: row.asset.assetName,
    unit: row.asset.unit?.name || "-",
    kategori: row.asset.category?.name || "-",
    skor: row.score,
    status: humanizeEnum(row.status),
    rekomendasi: row.recommendationTypes?.map(humanizeEnum).join("; ") || "-",
    alasan: humanizeSystemText(row.reason),
    waktu: formatDateTime(row.createdAt)
  }));
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [
    columns.map(([, label]) => escape(label)).join(","),
    ...normalized.map((item) => columns.map(([key]) => escape(item[key as keyof typeof item])).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ascit-rekomendasi-penggantian.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPrintDocument(rows: RecommendationRow[], stats: { total: number; critical: number; approved: number; average: number; latest: string }) {
  const printedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const body = rows.length
    ? rows
        .map((row) => {
          const recommendations = row.recommendationTypes?.map(humanizeEnum).join("; ") || "-";
          return `<tr>
            <td>${escapeHtml(row.asset.assetCode)}</td>
            <td>${escapeHtml(row.asset.assetName)}</td>
            <td>${escapeHtml(row.asset.unit?.name || "-")}</td>
            <td>${escapeHtml(row.asset.category?.name || "-")}</td>
            <td class="score">${escapeHtml(row.score)}</td>
            <td>${escapeHtml(humanizeEnum(row.status))}</td>
            <td>${escapeHtml(recommendations)}</td>
            <td>${escapeHtml(humanizeSystemText(row.reason))}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="8" class="empty">Belum ada rekomendasi.</td></tr>`;

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Rekomendasi Penggantian - ${escapeHtml(systemBrand.name)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #0f172a; font-family: Arial, sans-serif; font-size: 12px; }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 14px; }
    .brand { font-size: 11px; font-weight: 800; letter-spacing: .12em; color: #047857; text-transform: uppercase; }
    h1 { margin: 6px 0 4px; font-size: 22px; line-height: 1.2; }
    .subtitle { color: #475569; line-height: 1.5; }
    .meta { min-width: 240px; text-align: right; color: #475569; line-height: 1.6; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
    .stat { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #f8fafc; }
    .stat-label { font-size: 10px; font-weight: 800; letter-spacing: .08em; color: #64748b; text-transform: uppercase; }
    .stat-value { margin-top: 4px; font-size: 16px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; vertical-align: top; word-wrap: break-word; }
    th { background: #e0f2fe; color: #0f172a; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    tr:nth-child(even) td { background: #f8fafc; }
    .score { text-align: center; font-size: 16px; font-weight: 800; color: #b91c1c; }
    .empty { text-align: center; color: #64748b; font-weight: 700; padding: 24px; }
  </style>
</head>
<body>
  <section class="header">
    <div>
      <div class="brand">${escapeHtml(systemBrand.name)} / ${escapeHtml(hospitalBrand.division)}</div>
      <h1>Rekomendasi Penggantian</h1>
      <div class="subtitle">${escapeHtml(systemBrand.subtitle)} - ${escapeHtml(hospitalBrand.site)}</div>
    </div>
    <div class="meta">
      <div>Dicetak: ${escapeHtml(printedAt)}</div>
      <div>Update terakhir: ${escapeHtml(stats.latest)}</div>
    </div>
  </section>
  <section class="stats">
    <div class="stat"><div class="stat-label">Total</div><div class="stat-value">${stats.total}</div></div>
    <div class="stat"><div class="stat-label">Prioritas kritis</div><div class="stat-value">${stats.critical}</div></div>
    <div class="stat"><div class="stat-label">Disetujui</div><div class="stat-value">${stats.approved}</div></div>
    <div class="stat"><div class="stat-label">Rata-rata skor</div><div class="stat-value">${stats.average}</div></div>
  </section>
  <table>
    <thead>
      <tr>
        <th>Kode</th>
        <th>Aset</th>
        <th>Unit</th>
        <th>Kategori</th>
        <th>Skor</th>
        <th>Status</th>
        <th>Rekomendasi</th>
        <th>Alasan</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
}

// ==========================================
// Main Component
// ==========================================

export function ReplacementRecommendationsClient({ embedded = false }: { embedded?: boolean }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"daftar" | "analisis">("daftar");
  const [showGuide, setShowGuide] = useState(false);

  // Recommendations page states
  const [rows, setRows] = useState<RecommendationRow[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Decision states
  const [run, setRun] = useState<AiRun | null>(null);
  const [master, setMaster] = useState<MasterData | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFilters, setAiFilters] = useState<AiFilters>({
    year: String(new Date().getFullYear() + 1),
    unitId: "",
    categoryId: ""
  });
  const [visibleAiCount, setVisibleAiCount] = useState(5);

  // Fetch recommendations
  async function loadRecommendations() {
    setLoading(true);
    try {
      const response = await fetch("/api/recommendations");
      const json = await response.json();
      setRows(json.data || []);
    } catch {
      toast.push("Gagal mengambil data rekomendasi", "error");
    } finally {
      setLoading(false);
    }
  }

  // Fetch AI Decision support data
  async function loadAiDecision() {
    setAiLoading(true);
    setAiError(null);
    setVisibleAiCount(5);
    try {
      const query = new URLSearchParams(aiFilters);
      const [aiRes, masterRes] = await Promise.all([fetch(`/api/ai?${query}`), fetch("/api/master-data")]);
      const aiJson = await aiRes.json();
      const masterJson = await masterRes.json();

      if (!aiRes.ok) throw new Error(aiJson.error || "Hasil analisis AI belum dapat dimuat.");
      if (!masterRes.ok) throw new Error(masterJson.error || "Master data belum dapat dimuat.");

      setRun(aiJson.data || null);
      setMaster(masterJson);
    } catch (err) {
      setRun(null);
      setAiError(err instanceof Error ? err.message : "Hasil analisis AI belum dapat dimuat.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    void loadRecommendations();
    void loadAiDecision();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run AI analysis
  async function runAnalysis() {
    setRunning(true);
    setAiError(null);
    setVisibleAiCount(5);
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aiFilters)
    });
    const json = await response.json();
    setRunning(false);

    if (!response.ok) {
      const message = json.error || "Analisis AI gagal.";
      setAiError(message);
      toast.push(message, "error");
      return;
    }

    toast.push("Analisis AI selesai dan tersimpan.", "success");
    setRun(json.data);
    void loadRecommendations(); // reload recommendation list as well
  }

  // Stats memo for list tab
  const stats = useMemo(() => {
    const critical = rows.filter((row) => row.status === "PRIORITAS_PENGGANTIAN").length;
    const approved = rows.filter((row) => row.isApproved).length;
    const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0;
    const latest = rows[0]?.createdAt ? formatDateTime(rows[0].createdAt) : "-";
    return { total: rows.length, critical, approved, average, latest };
  }, [rows]);

  // AI page stats
  const aiRecommendations = useMemo(() => run?.recommendations || [], [run]);
  const aiMetrics = useMemo(
    () =>
      metricConfig.map((item) => ({
        ...item,
        value: "type" in item
          ? aiRecommendations.filter((rec) => rec.recommendationTypes?.includes(item.type)).length
          : aiRecommendations.filter((rec) => rec.scoreStatus === item.status).length
      })),
    [aiRecommendations]
  );
  const statusData = useMemo(() => countBy(aiRecommendations, (item) => item.scoreStatus), [aiRecommendations]);
  const recommendationData = useMemo(
    () =>
      countBy(
        aiRecommendations.flatMap((item) => item.recommendationTypes || []),
        (item) => item
      ),
    [aiRecommendations]
  );
  const criticalCount = aiRecommendations.filter((item) => item.scoreStatus === "PRIORITAS_PENGGANTIAN").length;
  const averageScore = aiRecommendations.length
    ? Math.round(aiRecommendations.reduce((sum, item) => sum + item.score, 0) / aiRecommendations.length)
    : 0;

  function printRecommendations() {
    const popup = window.open("", "_blank", "width=1120,height=760");
    if (!popup) {
      window.alert("Pop-up print diblokir browser.");
      return;
    }

    popup.document.write(buildPrintDocument(rows, stats));
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 250);
  }

  const actions = activeTab === "daftar" ? (
    <>
      <Button type="button" variant="outline" className="gap-1.5" onClick={() => setShowGuide(true)}>
        <HelpCircle className="h-4 w-4 text-emerald-700" />
        Panduan Skor
      </Button>
      <Button type="button" variant="outline" onClick={() => downloadCsv(rows)} disabled={!rows.length}>
        <Download className="h-4 w-4" />
        CSV
      </Button>
      <Button type="button" variant="outline" onClick={printRecommendations}>
        <Printer className="h-4 w-4" />
        Print
      </Button>
    </>
  ) : undefined;

  return (
    <PageStack>
      {!embedded ? (
        <PageHeader
          eyebrow="Monitoring"
          title="AI & Rekomendasi Tindakan"
          description="Analisis prioritas tindakan dan rekomendasi penggantian aset berbasis rule engine serta kecerdasan buatan (AI)."
          actions={actions}
        />
      ) : (
        actions && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-100 pb-3">
            {actions}
          </div>
        )
      )}

      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("daftar")}
          className={cn(
            "border-b-2 px-6 py-2.5 text-sm font-semibold transition-colors duration-200",
            activeTab === "daftar"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Daftar Rekomendasi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("analisis")}
          className={cn(
            "border-b-2 px-6 py-2.5 text-sm font-semibold transition-colors duration-200",
            activeTab === "analisis"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Dashboard Analisis AI
        </button>
      </div>

      {activeTab === "daftar" ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Stethoscope} label="Total Rekomendasi" value={stats.total} hint={`${stats.average} rata-rata skor`} layout="horizontal" />
            <MetricCard icon={ShieldAlert} label="Prioritas Kritis" value={stats.critical} tone={stats.critical ? "danger" : "success"} hint="Perlu keputusan" layout="horizontal" />
            <MetricCard icon={CheckCircle2} label="Sudah Disetujui" value={stats.approved} tone="success" hint="Siap ditindaklanjuti" layout="horizontal" />
            <MetricCard icon={AlertTriangle} label="Update Terakhir" value={stats.latest} compact hint="Rekomendasi terbaru" layout="horizontal" />
          </section>

          <Card>
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Daftar Prioritas</CardTitle>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Setiap baris menampilkan alasan utama, jenis rekomendasi, dan konteks aset tanpa tabel melebar.
                </p>
              </div>
              <Badge tone={stats.critical ? "danger" : "success"}>{stats.critical ? "Perlu keputusan" : "Terkendali"}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3">
              {loading ? <EmptyPanel title="Memuat rekomendasi" description="Data rekomendasi sedang diambil dari database." /> : null}
              {!loading && !rows.length ? (
                <EmptyPanel title="Belum ada rekomendasi" description="Jalankan analisis AI atau input perbaikan aset untuk menghasilkan rekomendasi penggantian." />
              ) : null}
              {!loading && rows.map((row) => (
                <RecommendationItem key={row.id} row={row} onScoreClick={() => setShowGuide(true)} />
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
                Parameter Analisis
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Analisis memakai rule engine internal untuk menilai umur aset, spesifikasi, riwayat repair, garansi, kondisi, dan kebutuhan upgrade.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-[180px_minmax(220px,1fr)_minmax(220px,1fr)]">
                <Field label="Tahun">
                  <Select value={aiFilters.year} onChange={(event) => setAiFilters((prev) => ({ ...prev, year: event.target.value }))}>
                    {[2026, 2027, 2028, 2029].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Unit">
                  <Select value={aiFilters.unitId} onChange={(event) => setAiFilters((prev) => ({ ...prev, unitId: event.target.value }))}>
                    <option value="">Semua unit</option>
                    {master?.units?.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Kategori">
                  <Select value={aiFilters.categoryId} onChange={(event) => setAiFilters((prev) => ({ ...prev, categoryId: event.target.value }))}>
                    <option value="">Semua kategori</option>
                    {master?.categories?.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void loadAiDecision()}>
                  <Search className="h-4 w-4" />
                  Filter
                </Button>
                <Button type="button" className="w-full whitespace-nowrap sm:w-auto" onClick={runAnalysis} disabled={running}>
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  Jalankan Analisis
                </Button>
              </div>
            </CardContent>
          </Card>

          {aiError ? <ErrorCard message={aiError} /> : null}
          {aiLoading ? (
            <Card>
              <CardContent className="text-sm font-semibold text-slate-600">Memuat hasil AI...</CardContent>
            </Card>
          ) : null}

          {!aiLoading && !aiError && (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Sparkles} label="Run Terakhir" value={run?.runCode || "-"} hint={run ? `${formatDateTime(run.createdAt)} via ${run.model || 'Groq'}` : "Belum ada hasil"} compact layout="horizontal" />
                <MetricCard icon={Gauge} label="Rata-rata Skor" value={averageScore} hint="Nilai gabungan rekomendasi" layout="horizontal" />
                <MetricCard icon={ShieldAlert} label="Prioritas Kritis" value={criticalCount} hint="Aset masuk rencana penggantian" tone={criticalCount > 0 ? "danger" : "success"} layout="horizontal" />
                <MetricCard icon={Wrench} label="Total Rekomendasi" value={aiRecommendations.length} hint={`${run?.totalAssets || 0} aset dianalisis`} layout="horizontal" />
              </section>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {aiMetrics.map(({ label, value, icon: Icon, tone }) => (
                  <MetricCard key={label} icon={Icon} label={label} value={value} tone={tone} layout="horizontal" />
                ))}
              </section>

              <section className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
                <RiskChart data={statusData} />
                <RecommendationChart data={recommendationData} />
              </section>

              <section className="grid gap-4 2xl:grid-cols-[0.75fr_1.25fr]">
                <ScoringModelCard />
                <Card>
                  <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <CardTitle>Ringkasan Keputusan</CardTitle>
                      <p className="mt-1 max-w-5xl text-sm leading-5 text-muted-foreground">
                        {run ? `${run.runCode} - ${formatDateTime(run.createdAt)} - ${run.summary}` : "Belum ada analisis untuk filter ini."}
                      </p>
                    </div>
                    <a
                      className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      href="/api/reports?type=ai&format=csv"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </a>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {aiRecommendations.length ? (
                      <>
                        <div className="grid gap-3">
                          {aiRecommendations.slice(0, visibleAiCount).map((recommendation) => (
                            <AiRecommendationItem key={recommendation.id} recommendation={recommendation} />
                          ))}
                        </div>
                        {visibleAiCount < aiRecommendations.length ? (
                          <div className="mt-4 flex justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full sm:w-auto font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => setVisibleAiCount((prev) => prev + 10)}
                            >
                              Tampilkan Lebih Banyak ({aiRecommendations.length - visibleAiCount} item tersisa)
                            </Button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="rounded-md border bg-slate-50 p-4 text-sm font-semibold text-muted-foreground">
                        Belum ada hasil. Jalankan analisis AI untuk membuat rekomendasi.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            </>
          )}
        </>
      )}

      {showGuide ? (
        <Modal title="Panduan Kriteria Skoring Aset" onClose={() => setShowGuide(false)}>
          <div className="grid gap-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Skor risiko aset berkisar antara <strong>0 hingga 100</strong>. Sistem menghitung skor secara otomatis berdasarkan parameter berikut untuk membantu menentukan tindak lanjut yang tepat:
            </p>
            
            <div className="grid gap-2">
              <div className="rounded-md border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex items-center justify-between font-bold text-slate-800 text-sm">
                  <span>Umur Aset & Kondisi Fisik</span>
                  <span className="text-emerald-700 font-extrabold">+20 s/d +30</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Umur &gt; 5 tahun (+30), kondisi rusak berat (+20), atau aset layak ganti (+30).</p>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex items-center justify-between font-bold text-slate-800 text-sm">
                  <span>Spesifikasi Hardware</span>
                  <span className="text-emerald-700 font-extrabold">+15 s/d +25</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Processor generasi lama (+25), RAM &lt; 8 GB (+20), atau penyimpanan masih HDD (+15).</p>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex items-center justify-between font-bold text-slate-800 text-sm">
                  <span>Operasional & Garansi</span>
                  <span className="text-emerald-700 font-extrabold">+10 s/d +15</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">OS lama (Win 7/8) terdeteksi (+15) atau masa garansi vendor telah berakhir (+10).</p>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex items-center justify-between font-bold text-slate-800 text-sm">
                  <span>Riwayat Perbaikan (Repair)</span>
                  <span className="text-emerald-700 font-extrabold">+20 s/d +25</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Frekuensi perbaikan &gt; 3 kali (+25) atau total biaya perbaikan melebihi Rp1.000.000 (+20).</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs font-black uppercase tracking-[0.06em] text-slate-400 mb-2">Klasifikasi Skor Tindakan:</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-red-200 bg-red-50 p-2.5">
                  <div className="font-bold text-red-700 text-xs">Skor &ge; 80 (Kritis)</div>
                  <div className="text-[11px] text-red-600 mt-0.5 font-semibold">Prioritas Penggantian Perangkat</div>
                </div>
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5">
                  <div className="font-bold text-emerald-700 text-xs">Skor 60 - 79 (Tinggi)</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5 font-semibold">Rekomendasi Upgrade Komponen</div>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5">
                  <div className="font-bold text-amber-700 text-xs">Skor 30 - 59 (Sedang)</div>
                  <div className="text-[11px] text-amber-600 mt-0.5 font-semibold">Perlu Dipantau & Maintenance</div>
                </div>
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5">
                  <div className="font-bold text-emerald-700 text-xs">Skor &lt; 30 (Rendah)</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5 font-semibold">Aman / Pemeliharaan Rutin</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button type="button" onClick={() => setShowGuide(false)} className="min-w-[80px]">
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </PageStack>
  );
}

// ==========================================
// Subcomponents
// ==========================================

function RecommendationItem({ row, onScoreClick }: { row: RecommendationRow; onScoreClick?: () => void }) {
  const isCritical = row.status === "PRIORITAS_PENGGANTIAN";
  const specs = [
    row.asset.processor,
    row.asset.ram,
    row.asset.storage,
    row.asset.operatingSystem
  ].filter(Boolean);

  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-panel transition hover:border-emerald-200">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)_96px_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700">{row.asset.assetCode}</span>
            <Badge tone={isCritical ? "danger" : "warning"}>{humanizeEnum(row.status)}</Badge>
          </div>
          <h3 className="mt-2 break-words text-sm font-semibold leading-snug text-slate-950">{row.asset.assetName}</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {row.asset.unit?.name || "-"} / {row.asset.room?.name || "-"} / {row.asset.category?.name || "-"}
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {row.recommendationTypes?.length ? (
              row.recommendationTypes.slice(0, 3).map((item) => (
                <Badge key={item} tone={item.includes("GANTI") ? "danger" : "info"}>
                  {humanizeEnum(item)}
                </Badge>
              ))
            ) : (
              <Badge tone="muted">Belum ditentukan</Badge>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-700">{humanizeSystemText(row.reason) || "Alasan rekomendasi belum tersedia."}</p>
          <div className="mt-2 text-xs font-semibold text-muted-foreground">{formatDateTime(row.createdAt)}</div>
        </div>

        <button
          type="button"
          onClick={onScoreClick}
          className={cn(
            "flex h-[62px] w-full flex-col items-center justify-center rounded-xl border px-3 py-2 text-center xl:justify-self-center hover:scale-[1.03] active:scale-[0.97] transition group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
            isCritical ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100/70" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/70"
          )}
          title="Klik untuk melihat kriteria skoring"
        >
          <div className="w-full text-center text-[11px] font-bold uppercase leading-none tracking-[0.06em] flex items-center justify-center gap-1">
            Skor
            <HelpCircle className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition" />
          </div>
          <div className="mt-1.5 w-full text-center text-xl font-bold tabular-nums leading-none">{row.score}</div>
        </button>

        <Link
          href={`/assets/${row.asset.id}`}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          Detail
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid gap-2 border-t pt-3 text-xs font-semibold text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
        {specs.length ? specs.slice(0, 4).map((item) => <span key={String(item)} className="truncate">{item}</span>) : <span>Spesifikasi belum lengkap</span>}
      </div>
    </article>
  );
}

// ponytail: exact dashboard styling for consistency
const dashboardCardStyle = "flex flex-col shadow-sm border-0 p-0 overflow-hidden bg-white ring-1 ring-slate-200/50";
const dashboardHeaderStyle = "bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center gap-2";
const dashboardHeaderTitleStyle = "text-xs font-extrabold uppercase tracking-widest text-slate-700";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const nameLabel = label || data.name || data.payload?.label || data.payload?.name;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: data.color || data.payload?.fill || data.fill || "#0284c7" }} />
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider truncate max-w-[150px]">{nameLabel}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-sm font-black text-slate-900 leading-none">{data.value}</span>
          <span className="text-[11px] font-bold text-slate-400 leading-none">Aset</span>
        </div>
      </div>
    );
  }
  return null;
};

function RiskChart({ data }: { data: Array<{ name: string; total: number }> }) {
  const chartData = data.map((item) => ({ ...item, label: humanizeEnum(item.name) }));
  const total = chartData.reduce((sum, item) => sum + item.total, 0);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 'bold' }}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className={dashboardCardStyle}>
      <div className={dashboardHeaderStyle}>
        <Activity className="h-4 w-4 text-emerald-600" />
        <span className={dashboardHeaderTitleStyle}>Status Risiko Aset</span>
      </div>
      <CardContent className="p-4 grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="h-[240px]">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                  <tspan x="50%" dy="-0.2em" fontSize="26" fontWeight="900" fill="#0f172a">{total}</tspan>
                  <tspan x="50%" dy="1.4em" fontSize="10" fill="#64748b" fontWeight="800" style={{ letterSpacing: "0.05em" }}>ASET</tspan>
                </text>
                <Pie
                  data={chartData}
                  dataKey="total"
                  nameKey="label"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={statusColors[entry.name] || "#64748b"} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>
        <div className="grid content-center gap-3">
          {chartData.length ? (
            chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[item.name] || "#64748b" }} />
                  <span className="text-sm font-bold text-slate-700">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-950">{item.total}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada distribusi risiko.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationChart({ data }: { data: Array<{ name: string; total: number }> }) {
  const chartData = data.map((item) => ({ ...item, label: humanizeEnum(item.name).replace("Upgrade ", "") }));
  const total = chartData.reduce((sum, item) => sum + item.total, 0);
  const totalUpgrade = chartData.filter(d => d.name.includes("UPGRADE")).reduce((sum, item) => sum + item.total, 0);
  const totalReplace = chartData.filter(d => d.name.includes("GANTI") || d.name.includes("REPLACE")).reduce((sum, item) => sum + item.total, 0);

  return (
    <Card className={dashboardCardStyle}>
      <div className={dashboardHeaderStyle}>
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <span className={dashboardHeaderTitleStyle}>Komposisi Rekomendasi</span>
      </div>
      <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-around">
        <div className="text-center">
          <div className="text-xl font-black text-slate-800">{total}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Action</div>
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <div className="text-center">
          <div className="text-xl font-black text-amber-600">{totalUpgrade}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70">Upgrade</div>
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <div className="text-center">
          <div className="text-xl font-black text-red-600">{totalReplace}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-red-600/70">Ganti</div>
        </div>
      </div>
      <CardContent className="flex-1 flex flex-col justify-center min-h-[220px] p-4">
        <div className="h-[300px] w-full">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -25, right: 10, top: 20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fontWeight: 700, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Total" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={25}>
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
  );
}

function ScoringModelCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Penilaian</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {scoringFactors.map((factor) => (
          <div key={factor.label} className="rounded-md border bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-slate-950">{factor.label}</div>
              <Badge tone="info">{factor.value}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{factor.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AiRecommendationItem({ recommendation }: { recommendation: AiRecommendation }) {
  const repairCount = recommendation.asset.serviceRecords?.length || 0;
  const details = recommendation.details || [];
  const openModelNote = recommendation.openModelSucceeded
    ? undefined
    : recommendation.openModelErrorMessage
      ? `Analisis AI gagal diproses untuk item ini: ${recommendation.openModelErrorMessage}. Rule engine ASCIT tetap digunakan.`
      : "Analisis AI dilewati untuk item ini. Rule engine ASCIT tetap digunakan.";

  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-panel transition hover:border-emerald-200">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700">{recommendation.asset.assetCode}</span>
            <Badge>{humanizeEnum(recommendation.scoreStatus)}</Badge>
            <span className="text-xs font-bold uppercase text-muted-foreground">Skor {recommendation.score}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-950">{recommendation.asset.assetName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {recommendation.asset.unit?.name || "-"} / {recommendation.asset.category?.name || "-"} / {repairCount} riwayat perbaikan
          </p>
        </div>
        <Link
          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border bg-white px-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          href={`/assets/${recommendation.asset.id}`}
        >
          Detail Aset
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <InfoBlock
          label="Spesifikasi"
          value={[
            recommendation.asset.processor || "-",
            `${recommendation.asset.ram || "-"} / ${recommendation.asset.storage || "-"}`,
            recommendation.asset.operatingSystem || "-"
          ].join("\n")}
        />
        <InfoBlock label="Rekomendasi" value={humanizeSystemText(recommendation.recommendation)} />
        <div className="lg:col-span-2">
          <InfoBlock
            label="Alasan"
            value={humanizeSystemText(recommendation.reason)}
            note={openModelNote}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">Faktor penyebab skor</div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {details.length ? (
            details.map((detail) => (
              <span key={`${detail.factor}-${detail.scoreImpact}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                {detail.factor}
                <span className="text-red-700">+{detail.scoreImpact}</span>
              </span>
            ))
          ) : (
            <span className="text-sm font-medium text-muted-foreground">Tidak ada faktor risiko signifikan.</span>
          )}
        </div>
      </div>
    </article>
  );
}

function InfoBlock({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">{label}</div>
      <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">{humanizeSystemText(value)}</div>
      {note ? <div className="mt-2 text-xs font-bold text-amber-700">{note}</div> : null}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="flex items-start gap-3 text-red-800">
        <AlertTriangle className="mt-0.5 h-5 w-5" />
        <div>
          <div className="font-semibold">Analisis belum dapat dimuat.</div>
          <div className="mt-1 text-sm">{message}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center rounded-md border bg-slate-50 text-sm font-semibold text-muted-foreground">
      Belum ada data.
    </div>
  );
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
}
