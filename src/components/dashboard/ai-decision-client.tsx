"use client";

import {
  Activity,
  AlertTriangle,
  Lightbulb,
  Bot,
  Cpu,
  Download,
  ExternalLink,
  Gauge,
  HardDrive,
  Loader2,
  MemoryStick,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader, PageStack } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, humanizeEnum, humanizeSystemText } from "@/lib/utils";

type MasterData = {
  units?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
};

type RecommendationDetail = {
  id?: string;
  factor: string;
  scoreImpact: number;
  message: string;
};

type Recommendation = {
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
  details?: RecommendationDetail[];
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
  recommendations: Recommendation[];
};

type Filters = {
  year: string;
  unitId: string;
  categoryId: string;
};

const metricConfig = [
  { label: "Processor", type: "UPGRADE_PROCESSOR", icon: Cpu, tone: "info" },
  { label: "RAM", type: "UPGRADE_RAM", icon: MemoryStick, tone: "success" },
  { label: "Storage", type: "UPGRADE_STORAGE", icon: HardDrive, tone: "info" },
  { label: "Penggantian", status: "PRIORITAS_PENGGANTIAN", icon: ShieldAlert, tone: "danger" },
  { label: "OS", type: "UPDATE_OS", icon: RefreshCw, tone: "warning" }
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

export function AiDecisionClient() {
  const toast = useToast();
  const [run, setRun] = useState<AiRun | null>(null);
  const [master, setMaster] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    year: String(new Date().getFullYear() + 1),
    unitId: "",
    categoryId: ""
  });
  const [visibleCount, setVisibleCount] = useState(5);

  async function load() {
    setLoading(true);
    setError(null);
    setVisibleCount(5);

    try {
      const query = new URLSearchParams(filters);
      const [aiRes, masterRes] = await Promise.all([fetch(`/api/ai?${query}`), fetch("/api/master-data")]);
      const aiJson = await aiRes.json();
      const masterJson = await masterRes.json();

      if (!aiRes.ok) throw new Error(aiJson.error || "Hasil analisis AI belum dapat dimuat.");
      if (!masterRes.ok) throw new Error(masterJson.error || "Master data belum dapat dimuat.");

      setRun(aiJson.data || null);
      setMaster(masterJson);
    } catch (err) {
      setRun(null);
      setError(err instanceof Error ? err.message : "Hasil analisis AI belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAnalysis() {
    setRunning(true);
    setError(null);
    setVisibleCount(5);

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters)
    });
    const json = await response.json();
    setRunning(false);

    if (!response.ok) {
      const message = json.error || "Analisis AI gagal.";
      setError(message);
      toast.push(message, "error");
      return;
    }

    toast.push("Analisis AI selesai dan tersimpan.", "success");
    setRun(json.data);
  }

  const recommendations = useMemo(() => run?.recommendations || [], [run]);
  const metrics = useMemo(
    () =>
      metricConfig.map((item) => ({
        ...item,
        value: "type" in item
          ? recommendations.filter((recommendation) => recommendation.recommendationTypes?.includes(item.type)).length
          : recommendations.filter((recommendation) => recommendation.scoreStatus === item.status).length
      })),
    [recommendations]
  );
  const statusData = useMemo(() => countBy(recommendations, (item) => item.scoreStatus), [recommendations]);
  const recommendationData = useMemo(
    () =>
      countBy(
        recommendations.flatMap((item) => item.recommendationTypes || []),
        (item) => item
      ),
    [recommendations]
  );
  const criticalCount = recommendations.filter((item) => item.scoreStatus === "PRIORITAS_PENGGANTIAN").length;
  const averageScore = recommendations.length
    ? Math.round(recommendations.reduce((sum, item) => sum + item.score, 0) / recommendations.length)
    : 0;

  return (
    <PageStack>
      <PageHeader
        eyebrow="Monitoring"
        title="AI Decision Support"
        description="Analisis prioritas aset berbasis rule engine dan OpenModel untuk membantu menentukan aset yang perlu dipantau, di-upgrade, atau diganti."
      />

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
              <Select value={filters.year} onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}>
                {[2026, 2027, 2028, 2029].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unit">
              <Select value={filters.unitId} onChange={(event) => setFilters((prev) => ({ ...prev, unitId: event.target.value }))}>
                <option value="">Semua unit</option>
                {master?.units?.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kategori">
              <Select value={filters.categoryId} onChange={(event) => setFilters((prev) => ({ ...prev, categoryId: event.target.value }))}>
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
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void load()}>
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

      {error ? <ErrorCard message={error} /> : null}
      {loading ? (
        <Card>
          <CardContent className="text-sm font-semibold text-slate-600">Memuat hasil AI...</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Sparkles} label="Run Terakhir" value={run?.runCode || "-"} hint={run ? `${formatDateTime(run.createdAt)} via ${run.model || 'Groq'}` : "Belum ada hasil"} compact layout="horizontal" />
        <MetricCard icon={Gauge} label="Rata-rata Skor" value={averageScore} hint="Nilai gabungan rekomendasi" layout="horizontal" />
        <MetricCard icon={ShieldAlert} label="Prioritas Kritis" value={criticalCount} hint="Aset masuk rencana penggantian" tone={criticalCount > 0 ? "danger" : "success"} layout="horizontal" />
        <MetricCard icon={Wrench} label="Total Rekomendasi" value={recommendations.length} hint={`${run?.totalAssets || 0} aset dianalisis`} layout="horizontal" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
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
            {recommendations.length ? (
              <>
                <div className="grid gap-3">
                  {recommendations.slice(0, visibleCount).map((recommendation) => (
                    <RecommendationItem key={recommendation.id} recommendation={recommendation} />
                  ))}
                </div>
                {visibleCount < recommendations.length ? (
                  <div className="mt-4 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                    >
                      Tampilkan Lebih Banyak ({recommendations.length - visibleCount} item tersisa)
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
    </PageStack>
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
                <Pie
                  data={chartData}
                  dataKey="total"
                  nameKey="label"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={statusColors[entry.name] || "#64748b"} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
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

  return (
    <Card className={dashboardCardStyle}>
      <div className={dashboardHeaderStyle}>
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <span className={dashboardHeaderTitleStyle}>Komposisi Rekomendasi</span>
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
                <Tooltip content={<CustomTooltip />} />
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

function RecommendationItem({ recommendation }: { recommendation: Recommendation }) {
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
