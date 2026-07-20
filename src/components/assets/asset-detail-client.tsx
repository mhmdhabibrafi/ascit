"use client";

import { Bot, CalendarClock, History, MapPin, Printer, RefreshCw, Wrench, HelpCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyPanel, PageHeader, PageStack } from "@/components/ui/page";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { hospitalBrand, systemBrand } from "@/lib/branding";
import { cn, formatCurrency, formatDate, formatDateTime, humanizeEnum } from "@/lib/utils";

export function AssetDetailClient({ id }: { id: string }) {
  const toast = useToast();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch(`/api/assets/${encodeURIComponent(id)}`);
    const json = await response.json();
    setAsset(json.data || null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runAi() {
    setAnalyzing(true);
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: new Date().getFullYear() + 1 })
    });
    setAnalyzing(false);
    if (!response.ok) {
      toast.push("Analisis AI gagal dijalankan.", "error");
      return;
    }
    toast.push("Analisis AI selesai. Rekomendasi terbaru tersimpan.", "success");
    await load();
  }

  function printQr() {
    if (!asset) return;
    const popup = window.open("", "_blank", "width=520,height=400");
    if (!popup) return;
    popup.document.write(`
      <html>
        <head>
          <title>QR ${asset.assetCode}</title>
          <style>
            @page { size: auto; margin: 0mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; margin: 0; padding: 20px; display: flex; justify-content: flex-start; align-items: flex-start; }
            .label-container { display: flex; align-items: center; border: 2px solid #000; padding: 12px 16px; width: fit-content; border-radius: 8px; gap: 20px; background: #fff; }
            .qr-code { width: 130px; height: 130px; flex-shrink: 0; }
            .info-col { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; max-width: 320px; }
            .brand { font-size: 28px; font-weight: 900; margin: 0 0 2px 0; color: #059669; letter-spacing: 0.5px; line-height: 1; }
            .subtitle { font-size: 11px; font-weight: 700; margin: 0 0 16px 0; color: #64748b; line-height: 1.2; }
            .sn { font-size: 14px; font-weight: 700; margin: 0 0 4px 0; color: #000; }
            .name { font-size: 16px; font-weight: 900; margin: 0; color: #000; line-height: 1.3; text-transform: capitalize; }
          </style>
        </head>
        <body>
          <div class="label-container">
            <img class="qr-code" src="${asset.qrCodeUrl}" />
            <div class="info-col">
              <div class="brand">ASCIT</div>
              <div class="subtitle">Asset Care Information Technology System</div>
              <div class="sn">SN: ${asset.serialNumber || asset.assetCode}</div>
              <div class="name">${asset.assetName}</div>
            </div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    popup.document.close();
  }

  if (loading) {
    return (
      <PageStack>
        <EmptyPanel title="Memuat detail aset" description="Data aset sedang diambil dari database." />
      </PageStack>
    );
  }

  if (!asset) {
    return (
      <PageStack>
        <EmptyPanel title="Aset tidak ditemukan" description="Kode aset atau QR token tidak tersedia di database." />
      </PageStack>
    );
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow="Detail Aset"
        title={asset.assetName}
        description={`${asset.assetCode} / ${asset.unit?.name || "-"} / ${asset.room?.name || "-"}`}
        actions={
          <>
            <Button type="button" variant="outline" onClick={printQr}>
              <Printer className="h-4 w-4" />
              Cetak QR
            </Button>
            <Button type="button" onClick={runAi} disabled={analyzing}>
              {analyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              Analisis AI
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge>{humanizeEnum(asset.conditionStatus)}</Badge>
              <Badge>{humanizeEnum(asset.lifecycleStatus)}</Badge>
              <Badge tone="info">{asset.category?.name || "-"}</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Info label="Barcode / Kode aset" value={asset.assetCode || "-"} />
              <Info label="Nama barang" value={asset.assetName || "-"} />
              <Info label="Jenis barang" value={asset.category?.name || "-"} />
              <Info label="Serial number" value={asset.serialNumber || "-"} />
              <Info label="Unit" value={asset.unit?.name || "-"} />
              <Info label="Ruangan" value={asset.room?.name || "-"} />
              <Info label="IP address" value={asset.ipAddress || "-"} />
              <Info label="MAC address" value={asset.macAddress || "-"} />
              <Info label="Keterangan" value={asset.notes || "-"} />
              <Info label="Penanggung jawab" value={asset.responsibleUser?.name || "-"} />
              <Info label="Merek / Model" value={`${asset.brand?.name || "-"} ${asset.model || ""}`} />
              <Info label="Vendor" value={asset.vendor?.name || "-"} />
              <Info label="OS" value={asset.operatingSystem || "-"} />
              <Info label="Processor" value={asset.processor || "-"} />
              <Info label="RAM" value={asset.ram || "-"} />
              <Info label="Storage" value={asset.storage || "-"} />
              <Info label="Tanggal pembelian" value={formatDate(asset.purchaseDate)} />
              <Info label="Harga pembelian" value={formatCurrency(asset.purchasePrice)} />
              <Info label="Garansi" value={`${formatDate(asset.warrantyStartDate)} - ${formatDate(asset.warrantyEndDate)}`} />
            </div>
          </div>
          <div className="rounded-md border bg-slate-50 p-4 text-center">
            {asset.qrCodeUrl ? <Image src={asset.qrCodeUrl} alt={asset.assetCode} width={190} height={190} className="mx-auto rounded-md bg-white p-2" /> : null}
            <div className="mt-3 text-sm font-semibold text-slate-950">{asset.assetCode}</div>
            <div className="mt-1 break-all font-mono text-xs font-bold text-slate-500">{asset.qrToken}</div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <HistoryCard title="Riwayat Lifecycle" icon={History} empty="Belum ada histori lifecycle.">
          {asset.lifecycleLogs?.map((row: any) => (
            <HistoryItem key={row.id} title={humanizeEnum(row.status)} meta={formatDateTime(row.createdAt)} badge={row.status} description={row.description} />
          ))}
        </HistoryCard>
        <HistoryCard title="Riwayat Mutasi" icon={MapPin} empty="Belum ada mutasi.">
          {asset.mutations?.map((row: any) => (
            <HistoryItem key={row.id} title={`${row.fromUnit?.name || "-"} ke ${row.toUnit?.name || "-"}`} meta={formatDate(row.mutationDate)} badge={row.approvalStatus} description={`${row.fromRoom?.name || "-"} / ${row.toRoom?.name || "-"}`} />
          ))}
        </HistoryCard>
        <HistoryCard title="Riwayat Maintenance" icon={CalendarClock} empty="Belum ada maintenance.">
          {asset.serviceRecords?.map((row: any) => (
            <HistoryItem key={row.id} title={row.technicianName || "Teknisi belum diisi"} meta={formatDate(row.createdAt)} badge={row.statusAfter} description={row.actionTaken} extra={formatCurrency(row.cost || 0)} />
          ))}
        </HistoryCard>
        <HistoryCard title="Riwayat Perbaikan" icon={Wrench} empty="Belum ada perbaikan.">
          {asset.serviceRecords?.map((row: any) => (
            <HistoryItem key={row.id} title={row.damageType || "Kerusakan"} meta={formatDate(row.createdAt)} badge={row.finalStatus} description={row.symptoms || row.actionTaken} extra={formatCurrency(row.cost || 0)} />
          ))}
        </HistoryCard>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Rekomendasi AI</CardTitle>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Analisis terbaru untuk aset ini, termasuk skor, rekomendasi, dan alasan keputusan.</p>
          </div>
          <Button type="button" variant="outline" className="h-8 text-xs gap-1.5 shrink-0" onClick={() => setShowGuide(true)}>
            <HelpCircle className="h-3.5 w-3.5" />
            Panduan Skor
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          {asset.aiRecommendations?.length ? (
            asset.aiRecommendations.map((row: any) => {
              const isCritical = row.scoreStatus === "PRIORITAS_PENGGANTIAN" || row.score >= 80;
              return (
                <article key={row.id} className="grid max-w-full gap-3 overflow-hidden rounded-md border bg-white p-4 shadow-panel xl:grid-cols-[120px_minmax(0,1fr)] 2xl:grid-cols-[130px_minmax(0,0.7fr)_minmax(0,1fr)]">
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowGuide(true)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-md border px-3 py-2 text-center w-full transition hover:scale-[1.03] active:scale-[0.97] group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
                        isCritical ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100/70" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/70"
                      )}
                      title="Klik untuk melihat kriteria skoring"
                    >
                      <div className="w-full text-center text-[11px] font-semibold uppercase leading-none tracking-[0.06em] flex items-center justify-center gap-1">
                        Skor
                        <HelpCircle className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition" />
                      </div>
                      <div className="mt-1.5 w-full text-center text-xl font-semibold tabular-nums leading-none">{row.score}</div>
                    </button>
                    <div className="mt-2.5 text-center text-[11px] font-bold text-muted-foreground">{formatDateTime(row.createdAt)}</div>
                  </div>
                  <div className="min-w-0">
                    <Badge tone={isCritical ? "danger" : "warning"}>{humanizeEnum(row.scoreStatus)}</Badge>
                    <p className="mt-2 text-sm leading-5 text-slate-700">{row.recommendation}</p>
                  </div>
                  <p className="min-w-0 break-words text-sm leading-5 text-slate-700 xl:col-span-2 2xl:col-span-1">{row.reason}</p>
                </article>
              );
            })
          ) : (
            <EmptyPanel title="Belum ada rekomendasi AI" description="Jalankan analisis AI untuk membuat rekomendasi aset ini." />
          )}
        </CardContent>
      </Card>

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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">{label}</div>
      <div className="mt-2 break-words text-sm font-bold leading-6 text-slate-800">{value}</div>
    </div>
  );
}

function HistoryCard({ title, icon: Icon, empty, children }: { title: string; icon: typeof History; empty: string; children: React.ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-emerald-700" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {hasItems ? children : <EmptyPanel title={empty} />}
      </CardContent>
    </Card>
  );
}

function HistoryItem({ title, meta, badge, description, extra }: { title: string; meta: string; badge: string; description?: string; extra?: string }) {
  return (
    <article className="rounded-md border bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-black leading-snug text-slate-950">{title}</div>
          <div className="mt-1 text-xs font-bold text-muted-foreground">{meta}</div>
        </div>
        <Badge>{humanizeEnum(badge)}</Badge>
      </div>
      {description ? <p className="mt-3 text-sm leading-6 text-slate-700">{description}</p> : null}
      {extra ? <div className="mt-3 text-xs font-black text-slate-500">{extra}</div> : null}
    </article>
  );
}
