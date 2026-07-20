"use client";

import { AlertTriangle, CalendarDays, CheckCircle2, Gauge, ShieldAlert, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyPanel, PageHeader, PageStack } from "@/components/ui/page";
import { MonitoringInfoBlock, MonitoringInfoGrid, MonitoringRow } from "@/components/monitoring/monitoring-ui";
import { MetricCard } from "@/components/ui/metric-card";
import { formatDate, humanizeEnum } from "@/lib/utils";

export function AssetAgeClient() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    setVisibleCount(10);
    fetch("/api/asset-age")
      .then((res) => res.json())
      .then((json) => setRows(json.data || []))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const old = rows.filter((row) => row.assetAge?.tone === "danger").length;
    const watch = rows.filter((row) => row.assetAge?.tone === "warning").length;
    const safe = rows.filter((row) => row.assetAge?.tone === "success").length;
    const replacement = rows.filter((row) => row.recommendation?.scoreStatus === "PRIORITAS_PENGGANTIAN").length;
    return { total: rows.length, old, watch, safe, replacement };
  }, [rows]);

  return (
    <PageStack>
      <PageHeader
        eyebrow="Monitoring"
        title="Monitoring Umur Aset"
        description="Pantau usia perangkat, kondisi, garansi, jumlah perbaikan, dan rekomendasi awal untuk membantu perencanaan penggantian tahunan."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Gauge} label="Total Aset" value={stats.total} hint="Aset yang dianalisis" layout="horizontal" />
        <MetricCard icon={ShieldAlert} label="Lebih 5 Tahun" value={stats.old} tone={stats.old ? "danger" : "success"} hint="Masuk risiko penggantian" layout="horizontal" />
        <MetricCard icon={AlertTriangle} label="Perlu Dipantau" value={stats.watch} tone={stats.watch ? "warning" : "success"} hint="Umur 3 sampai 5 tahun" layout="horizontal" />
        <MetricCard icon={CheckCircle2} label="Masih Muda" value={stats.safe} tone="success" hint={`${stats.replacement} prioritas ganti`} layout="horizontal" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Umur Aset</CardTitle>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Aset dengan skor dan umur tertinggi ditampilkan untuk prioritas evaluasi.</p>
        </CardHeader>
        <CardContent className="grid gap-3">
          {loading ? <EmptyPanel title="Memuat umur aset" description="Data aset sedang dianalisis dari database." /> : null}
          {!loading && !rows.length ? <EmptyPanel title="Belum ada aset" description="Tambahkan data aset agar monitoring umur dapat berjalan." /> : null}
          {!loading && rows.length > 0 && (
            <>
              <div className="grid gap-3">
                {rows.slice(0, visibleCount).map((row) => (
                  <AgeItem key={row.id} row={row} />
                ))}
              </div>
              {visibleCount < rows.length ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                  >
                    Tampilkan Lebih Banyak ({rows.length - visibleCount} item tersisa)
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </PageStack>
  );
}

function AgeItem({ row }: { row: any }) {
  const ageTone = row.assetAge?.tone === "danger" ? "danger" : row.assetAge?.tone === "warning" ? "warning" : "success";
  return (
    <MonitoringRow
      code={row.assetCode}
      title={row.assetName}
      subtitle={`${row.unit?.name || "-"} / ${row.category?.name || "-"}`}
      badges={<Badge>{humanizeEnum(row.conditionStatus)}</Badge>}
      score={row.recommendation?.score || 0}
      scoreTone={row.recommendation?.score >= 80 ? "danger" : "info"}
      action={
        <Link
          href={`/assets/${row.id}`}
          className="inline-flex h-10 items-center rounded-md border bg-white px-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          Detail Aset
        </Link>
      }
    >
      <MonitoringInfoGrid className="lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <MonitoringInfoBlock label="Usia perangkat" icon={CalendarDays}>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={ageTone}>{row.assetAge?.label || "Tidak diketahui"}</Badge>
            <span className="text-sm font-black text-slate-900">{Number(row.assetAge?.years || 0).toFixed(1)} tahun</span>
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">Pembelian: {formatDate(row.purchaseDate)}</div>
        </MonitoringInfoBlock>

        <MonitoringInfoBlock label="Status tindak lanjut" icon={Wrench}>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{humanizeEnum(row.warrantyInfo?.status)}</Badge>
            <Badge tone={row.repairCount ? "warning" : "success"}>{row.repairCount || 0} perbaikan</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Rekomendasi awal: <span className="font-black">{humanizeEnum(row.recommendation?.scoreStatus)}</span>
          </p>
        </MonitoringInfoBlock>
      </MonitoringInfoGrid>
    </MonitoringRow>
  );
}
