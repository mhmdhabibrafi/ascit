"use client";

import type { IScannerControls } from "@zxing/browser";
import { AlertTriangle, Boxes, Calendar, Camera, CheckCircle2, CreditCard, Download, Edit, Eye, FileText, Laptop, Loader2, MapPin, Plus, Printer, QrCode, Search, ShieldCheck, Trash2, User, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { MetricCard } from "@/components/ui/metric-card";
import { Modal } from "@/components/ui/modal";
import { EmptyPanel, PageHeader, PageStack } from "@/components/ui/page";
import { MetricSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { hospitalBrand, systemBrand } from "@/lib/branding";
import { cn, formatCurrency, formatDate, humanizeEnum } from "@/lib/utils";

const emptyForm = {
  assetCode: "",
  assetName: "",
  categoryId: "",
  segmentId: "",
  brandId: "",
  vendorId: "",
  unitId: "",
  roomId: "",
  responsibleUserId: "",
  model: "",
  serialNumber: "",
  ipAddress: "",
  macAddress: "",
  operatingSystem: "",
  processor: "",
  ram: "",
  storage: "",
  purchaseDate: "",
  purchasePrice: "",
  invoiceNumber: "",
  warrantyStartDate: "",
  warrantyEndDate: "",
  conditionStatus: "BAIK",
  lifecycleStatus: "AKTIF",
  photoUrl: "",
  notes: ""
};

function toDateInput(value?: string | null) {
  return value ? String(value).slice(0, 10) : "";
}

function escapePrintHtml(value: unknown) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function AssetsClient() {
  const toast = useToast();
  const [assets, setAssets] = useState<any[]>([]);
  const [master, setMaster] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; asset?: any }>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState({ search: "", categoryId: "", unitId: "", segmentId: "", conditionStatus: "", lifecycleStatus: "" });
  const [visibleCount, setVisibleCount] = useState(10);
  const [printingAllQr, setPrintingAllQr] = useState(false);

  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Kamera belum aktif.");
  const [cameraError, setCameraError] = useState("");
  const [lastScanned, setLastScanned] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const lastScannedRef = useRef("");

  const stopCamera = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setCameraActive(false);
    setCameraStarting(false);
    setCameraStatus("Kamera dihentikan.");
  }, []);

  const closeScanner = useCallback(() => {
    stopCamera();
    setScannerOpen(false);
  }, [stopCamera]);

  const normalizeQrInput = (rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return "";
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const url = new URL(value, baseUrl);
      const token = url.searchParams.get("code") || url.searchParams.get("qr") || url.searchParams.get("token");
      if (token?.trim()) return token.trim();
      const publicAssetMatch = url.pathname.match(/^\/public\/assets\/([^/]+)\/?$/);
      if (publicAssetMatch?.[1]) return decodeURIComponent(publicAssetMatch[1]);
    } catch {
      const queryIndex = value.indexOf("?");
      if (queryIndex >= 0) {
        const token = new URLSearchParams(value.slice(queryIndex + 1)).get("code");
        if (token?.trim()) return token.trim();
      }
    }
    return value;
  };

  const handleScan = useCallback(async (value: string) => {
    const normalizedValue = normalizeQrInput(value);
    if (!normalizedValue) return;

    try {
      const response = await fetch(`/api/assets/${encodeURIComponent(normalizedValue)}`);
      const json = await response.json();
      if (!response.ok) {
        toast.push("Data aset tidak ditemukan dari QR.", "error");
        return;
      }
      setSelectedAsset(json.data);
      toast.push("Aset berhasil ditemukan dari QR!", "success");
      closeScanner();
    } catch {
      toast.push("Gagal memproses data QR.", "error");
    }
  }, [toast, closeScanner]);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser belum mendukung akses kamera.");
      return;
    }

    setCameraError("");
    setCameraStarting(true);
    setCameraStatus("Meminta akses kamera...");

    try {
      scannerControlsRef.current?.stop();
      lastScannedRef.current = "";
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 250,
        delayBetweenScanSuccess: 800
      });

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        videoRef.current,
        (scanResult, _scanError, activeControls) => {
          if (!scanResult) return;
          const normalizedValue = normalizeQrInput(scanResult.getText());
          if (!normalizedValue || normalizedValue === lastScannedRef.current) return;

          lastScannedRef.current = normalizedValue;
          setLastScanned(normalizedValue);
          setCameraStatus("QR berhasil dipindai.");
          activeControls.stop();
          scannerControlsRef.current = null;
          setCameraActive(false);
          void handleScan(normalizedValue);
        }
      );

      scannerControlsRef.current = controls;
      setCameraActive(true);
      setCameraStatus("Kamera aktif.");
    } catch (error) {
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
      setCameraActive(false);
      setCameraError(error instanceof Error ? error.message : "Kamera tidak dapat dibuka.");
      setCameraStatus("Kamera gagal dibuka.");
    } finally {
      setCameraStarting(false);
    }
  }, [handleScan]);

  useEffect(() => {
    return () => {
      scannerControlsRef.current?.stop();
    };
  }, []);

  async function load(nextFilters = filters) {
    setLoading(true);
    setVisibleCount(10);
    const query = new URLSearchParams(nextFilters);
    try {
      const responses = await Promise.all([
        fetch(`/api/assets?${query}`),
        master ? Promise.resolve(null) : fetch("/api/master-data")
      ]);
      const assetJson = await responses[0].json();
      if (responses[1]) {
        const masterJson = await responses[1].json();
        setMaster(masterJson);
      }
      const nextAssets = assetJson.data || [];
      setAssets(nextAssets);
      setSelectedAsset((current: any | null) => {
        if (!nextAssets.length) return null;
        if (!current) return nextAssets[0];
        return nextAssets.find((asset: any) => asset.id === current.id) || nextAssets[0];
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setVisibleCount(10);
  }, [filters]);

  const filteredRooms = useMemo(() => {
    if (!master?.rooms) return [];
    return master.rooms.filter((room: any) => !form.unitId || room.unitId === form.unitId);
  }, [form.unitId, master]);

  const stats = useMemo(() => {
    const active = assets.filter((asset) => asset.lifecycleStatus === "AKTIF").length;
    const attention = assets.filter((asset) => asset.conditionStatus !== "BAIK" || asset.lifecycleStatus === "DALAM_PERBAIKAN").length;
    const warrantySoon = assets.filter((asset) => {
      const end = asset.warrantyEndDate ? new Date(asset.warrantyEndDate).getTime() : 0;
      const diff = end ? Math.ceil((end - Date.now()) / 86400000) : -1;
      return diff >= 0 && diff <= 30;
    }).length;
    return { total: assets.length, active, attention, warrantySoon };
  }, [assets]);

  function openCreate() {
    setForm({
      ...emptyForm,
      assetCode: `IT-NEW-${new Date().getFullYear()}-${String(assets.length + 1).padStart(3, "0")}`
    });
    setModal({ mode: "create" });
  }

  function openEdit(asset: any) {
    setForm({
      assetCode: asset.assetCode || "",
      assetName: asset.assetName || "",
      categoryId: asset.categoryId || "",
      segmentId: asset.segmentId || "",
      brandId: asset.brandId || "",
      vendorId: asset.vendorId || "",
      unitId: asset.unitId || "",
      roomId: asset.roomId || "",
      responsibleUserId: asset.responsibleUserId || "",
      model: asset.model || "",
      serialNumber: asset.serialNumber || "",
      ipAddress: asset.ipAddress || "",
      macAddress: asset.macAddress || "",
      operatingSystem: asset.operatingSystem || "",
      processor: asset.processor || "",
      ram: asset.ram || "",
      storage: asset.storage || "",
      purchaseDate: toDateInput(asset.purchaseDate),
      purchasePrice: String(asset.purchasePrice || ""),
      invoiceNumber: asset.invoiceNumber || "",
      warrantyStartDate: toDateInput(asset.warrantyStartDate),
      warrantyEndDate: toDateInput(asset.warrantyEndDate),
      conditionStatus: asset.conditionStatus || "BAIK",
      lifecycleStatus: asset.lifecycleStatus || "AKTIF",
      photoUrl: asset.photoUrl || "",
      notes: asset.notes || ""
    });
    setModal({ mode: "edit", asset });
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal?.mode === "create" && assets.some(a => a.assetCode.toLowerCase() === form.assetCode.toLowerCase())) {
      toast.push("Kode aset sudah digunakan.", "error");
      return;
    }
    setIsSaving(true);
    const url = modal?.mode === "edit" ? `/api/assets/${modal.asset.id}` : "/api/assets";
    const response = await fetch(url, {
      method: modal?.mode === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const json = await response.json();
    if (!response.ok) {
      toast.push(json.error || "Gagal menyimpan aset.", "error");
      setIsSaving(false);
      return;
    }
    toast.push("Data aset berhasil disimpan.", "success");
    setIsSaving(false);
    setModal(null);
    await load();
  }

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const response = await fetch(`/api/assets/${deleteTarget.id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.push("Gagal menghapus aset.", "error");
    } else {
      toast.push("Aset dihapus dengan soft delete.", "success");
    }
    setDeleteTarget(null);
    await load();
  }

  function exportExcel() {
    window.location.href = "/api/reports?type=assets&format=excel";
  }

  function resetFilters() {
    const nextFilters = { search: "", categoryId: "", unitId: "", segmentId: "", conditionStatus: "", lifecycleStatus: "" };
    setFilters(nextFilters);
    void load(nextFilters);
  }

  async function printQr(asset: any) {
    const response = await fetch(`/api/assets/${encodeURIComponent(asset.id)}`);
    const json = await response.json();
    const printableAsset = json.data || asset;

    if (!printableAsset.qrCodeUrl) {
      toast.push("QR aset belum tersedia.", "error");
      return;
    }

    const popup = window.open("", "_blank", "width=520,height=400");
    if (!popup) {
      toast.push("Pop-up print diblokir browser.", "error");
      return;
    }
    popup.document.write(`
      <html>
        <head>
          <title>QR ${printableAsset.assetCode}</title>
          <style>
            @page { size: 100mm 40mm; margin: 0; }
            * { box-sizing: border-box; }
            html, body { width: 100mm; height: 40mm; margin: 0; padding: 0; overflow: hidden; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
            .label-container { display: flex; align-items: center; border: .45mm solid #000; padding: 2.5mm 3.5mm; width: 100mm; height: 40mm; gap: 4mm; background: #fff; }
            .qr-code { width: 31mm; height: 31mm; flex-shrink: 0; }
            .info-col { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; max-width: 320px; }
            .brand { font-size: 20pt; font-weight: 900; margin: 0 0 1mm; color: #059669; letter-spacing: 0.5px; line-height: 1; }
            .subtitle { font-size: 7pt; font-weight: 700; margin: 0 0 2.5mm; color: #64748b; line-height: 1.2; }
            .sn { font-size: 9pt; font-weight: 700; margin: 0 0 1mm; color: #000; }
            .name { font-size: 11pt; font-weight: 900; margin: 0; color: #000; line-height: 1.2; text-transform: capitalize; }
          </style>
        </head>
        <body>
          <div class="label-container">
            <img class="qr-code" src="${printableAsset.qrCodeUrl}" />
            <div class="info-col">
              <div class="brand">ASCIT</div>
              <div class="subtitle">Asset Care Information Technology System</div>
              <div class="sn">SN: ${escapePrintHtml(printableAsset.serialNumber || printableAsset.assetCode)}</div>
              <div class="name">${escapePrintHtml(printableAsset.assetName)}</div>
            </div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    popup.document.close();
  }

  async function printAllQr() {
    const popup = window.open("", "_blank", "width=760,height=680");
    if (!popup) {
      toast.push("Pop-up print diblokir browser.", "error");
      return;
    }
    popup.document.write("<title>Menyiapkan QR Aset...</title><p style='font-family:Arial;padding:24px'>Menyiapkan seluruh label QR...</p>");
    setPrintingAllQr(true);
    try {
      const response = await fetch("/api/assets");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal mengambil daftar aset.");
      const allAssets: any[] = json.data || [];
      if (!allAssets.length) throw new Error("Belum ada aset yang dapat dicetak.");
      const { default: QRCodeGenerator } = await import("qrcode");
      const printable = await Promise.all(allAssets.map(async (asset) => ({
        ...asset,
        qrCodeUrl: await QRCodeGenerator.toDataURL(`${window.location.origin}/public/assets/${encodeURIComponent(asset.qrToken)}`, {
          width: 420,
          margin: 1,
          errorCorrectionLevel: "M"
        })
      })));
      const labels = printable.map((asset, index) => `
        <section class="label-page">
          <div class="label-container">
            <img class="qr-code" src="${asset.qrCodeUrl}" alt="QR ${escapePrintHtml(asset.assetCode)}" />
            <div class="info-col">
              <div class="brand">ASCIT</div>
              <div class="subtitle">Asset Care Information Technology System</div>
              <div class="sn">SN: ${escapePrintHtml(asset.serialNumber || asset.assetCode)}</div>
              <div class="name">${escapePrintHtml(asset.assetName)}</div>
              <div class="code">${escapePrintHtml(asset.assetCode)}</div>
            </div>
          </div>
          <span class="page-count">${index + 1}/${printable.length}</span>
        </section>`).join("");

      popup.document.open();
      popup.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8" /><title>Semua QR Aset (${printable.length})</title><style>
        @page { size: 100mm 40mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; }
        body { font-family: 'Segoe UI', Arial, sans-serif; }
        .print-hint { margin: 16px auto; max-width: 100mm; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; color: #475569; background: #f8fafc; font-size: 12px; line-height: 1.5; }
        .label-page { position: relative; width: 100mm; height: 40mm; margin: 8px auto; page-break-after: always; break-after: page; overflow: hidden; background: #fff; }
        .label-page:last-child { page-break-after: auto; break-after: auto; }
        .label-container { display: flex; align-items: center; width: 100mm; height: 40mm; border: .45mm solid #000; padding: 2.5mm 3.5mm; gap: 4mm; background: #fff; }
        .qr-code { width: 31mm; height: 31mm; flex-shrink: 0; image-rendering: crisp-edges; }
        .info-col { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .brand { margin-bottom: 1mm; color: #059669; font-size: 20pt; font-weight: 900; line-height: 1; letter-spacing: .5px; }
        .subtitle { margin-bottom: 2mm; color: #64748b; font-size: 7pt; font-weight: 700; line-height: 1.2; }
        .sn { max-width: 56mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #000; font-size: 9pt; font-weight: 700; }
        .name { max-width: 56mm; margin-top: .8mm; overflow: hidden; color: #000; font-size: 11pt; font-weight: 900; line-height: 1.15; text-transform: capitalize; }
        .code { margin-top: .8mm; color: #64748b; font-family: monospace; font-size: 6.5pt; font-weight: 700; }
        .page-count { display: none; }
        @media print { .print-hint { display: none; } .label-page { margin: 0; } }
      </style></head><body>
        <div class="print-hint"><strong>${printable.length} label siap dicetak.</strong><br/>Gunakan ukuran kertas <strong>100 × 40 mm</strong>, skala <strong>100%</strong>, margin <strong>None</strong>, dan nonaktifkan header/footer browser.</div>
        ${labels}
        <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
      </body></html>`);
      popup.document.close();
    } catch (error) {
      popup.close();
      toast.push(error instanceof Error ? error.message : "Gagal menyiapkan QR.", "error");
    } finally {
      setPrintingAllQr(false);
    }
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow="Inventaris"
        title="Data Aset IT"
        description="Kelola inventaris perangkat IT, lokasi, spesifikasi, status lifecycle, garansi, QR code, dan nilai pembelian."
        actions={
          <>
            <Button type="button" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setScannerOpen(true)}>
              <QrCode className="h-4 w-4" />
              Scan QR
            </Button>
            <Button type="button" variant="outline" onClick={exportExcel}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button type="button" variant="outline" onClick={() => void printAllQr()} disabled={printingAllQr || loading}>
              {printingAllQr ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Print Semua QR
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Tambah Aset
            </Button>
          </>
        }
      />

      {loading ? (
        <MetricSkeleton />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Boxes} label="Total aset" value={stats.total} />
          <MetricCard icon={CheckCircle2} label="Aset aktif" value={stats.active} tone="success" />
          <MetricCard icon={AlertTriangle} label="Perlu perhatian" value={stats.attention} tone={stats.attention ? "danger" : "success"} />
          <MetricCard icon={ShieldCheck} label="Garansi 30 hari" value={stats.warrantySoon} tone={stats.warrantySoon ? "warning" : "success"} />
        </section>
      )}

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="w-full pl-9 h-9"
              placeholder="Cari kode, nama, serial, unit, ruangan, IP, MAC, QR..."
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") void load();
              }}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" className="min-w-[100px] h-9 gap-1.5" onClick={resetFilters}>
              <X className="h-4 w-4" />
              Reset
            </Button>
            <Button type="button" className="min-w-[110px] h-9 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold" onClick={() => void load()}>
              Terapkan
            </Button>
          </div>
        </div>

        <div className="mt-3.5 pt-3.5 border-t border-slate-100 grid gap-3 grid-cols-2 md:grid-cols-5">
          <Select value={filters.categoryId} onChange={(event) => setFilters((prev) => ({ ...prev, categoryId: event.target.value }))}>
            <option value="">Kategori</option>
            {master?.categories?.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select value={filters.segmentId} onChange={(event) => setFilters((prev) => ({ ...prev, segmentId: event.target.value }))}>
            <option value="">Segmen</option>
            {master?.segments?.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select value={filters.unitId} onChange={(event) => setFilters((prev) => ({ ...prev, unitId: event.target.value }))}>
            <option value="">Unit</option>
            {master?.units?.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select value={filters.conditionStatus} onChange={(event) => setFilters((prev) => ({ ...prev, conditionStatus: event.target.value }))}>
            <option value="">Kondisi</option>
            {master?.conditions?.map((item: string) => (
              <option key={item} value={item}>
                {humanizeEnum(item)}
              </option>
            ))}
          </Select>
          <Select value={filters.lifecycleStatus} onChange={(event) => setFilters((prev) => ({ ...prev, lifecycleStatus: event.target.value }))}>
            <option value="">Lifecycle</option>
            {master?.lifecycleStatuses?.map((item: string) => (
              <option key={item} value={item}>
                {humanizeEnum(item)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <section className="grid gap-4 grid-cols-1">
        <Card className="border-slate-200/90 shadow-sm">
          <CardHeader className="border-b border-slate-100/80 pb-4">
            <CardTitle className="text-base font-extrabold text-slate-900">Daftar Aset</CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid gap-3.5">
            {loading ? (
              <TableSkeleton />
            ) : assets.length ? (
              <>
                <div className="grid gap-3">
                  {assets.slice(0, visibleCount).map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      active={false}
                      onSelect={() => {
                        setSelectedAsset(asset);
                        setPreviewModalOpen(true);
                      }}
                      onEdit={() => openEdit(asset)}
                      onPrint={() => void printQr(asset)}
                      onRemove={() => setDeleteTarget(asset)}
                    />
                  ))}
                </div>
                {visibleCount < assets.length ? (
                  <div className="mt-4 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all"
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                    >
                      Tampilkan Lebih Banyak ({assets.length - visibleCount} aset tersisa)
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyPanel title="Data aset kosong" description="Tambah aset baru atau jalankan seed database untuk membuat data awal." />
            )}
          </CardContent>
        </Card>

      </section>

      {deleteTarget ? (
        <ConfirmDialog
          title="Hapus Aset"
          message={`Yakin ingin menghapus aset "${deleteTarget.assetCode} - ${deleteTarget.assetName}"? Data akan di-soft delete dan bisa dipulihkan.`}
          confirmLabel="Ya, Hapus"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {modal ? (
        <Modal title={modal.mode === "edit" ? "Edit Aset IT" : "Tambah Aset IT"} onClose={() => setModal(null)}>
          <AssetForm form={form} setForm={setForm} master={master} filteredRooms={filteredRooms} onSubmit={save} onCancel={() => setModal(null)} isSaving={isSaving} />
        </Modal>
      ) : null}

      {previewModalOpen && selectedAsset ? (
        <Modal title="Detail Cepat Aset" onClose={() => setPreviewModalOpen(false)}>
          <div className="-mx-4 -mt-4 rounded-t-md overflow-hidden">
            <AssetPreview 
              asset={selectedAsset} 
              onEdit={(a) => { setPreviewModalOpen(false); openEdit(a); }} 
              onPrint={(a) => void printQr(a)} 
              onRemove={(a) => { setPreviewModalOpen(false); setDeleteTarget(a); }} 
            />
          </div>
        </Modal>
      ) : null}

      {scannerOpen ? (
        <Modal title="Scan QR Aset" onClose={closeScanner}>
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">Posisikan kode QR di dalam area pemindaian kamera.</p>
            <div className="relative min-h-[260px] overflow-hidden rounded-md border bg-slate-950">
              <video ref={videoRef} className="h-full min-h-[260px] w-full object-cover" muted playsInline />
              {!cameraActive && !cameraStarting ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-center text-white">
                  <Camera className="h-9 w-9 text-emerald-200" />
                  <div>
                    <div className="text-sm font-semibold">Kamera belum aktif</div>
                  </div>
                </div>
              ) : null}
              {cameraStarting ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-white">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span className="text-sm font-bold">Membuka kamera...</span>
                </div>
              ) : null}
              {cameraActive ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-40 rounded-lg border-2 border-emerald-300 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 rounded-md border bg-slate-50 p-3 text-xs text-muted-foreground">
              <div>
                Status: <span className="font-semibold text-slate-800">{cameraStatus}</span>
              </div>
              {lastScanned ? (
                <div className="rounded border border-emerald-100 bg-white p-2">
                  <div className="font-semibold text-emerald-700">Terakhir terbaca:</div>
                  <div className="mt-1 break-all font-mono text-[11px] font-bold text-slate-700">{lastScanned}</div>
                </div>
              ) : null}
            </div>
            {cameraError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{cameraError}</div> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={closeScanner}>
                Batal
              </Button>
              <Button type="button" onClick={() => void startCamera()} disabled={cameraActive || cameraStarting}>
                Mulai Kamera
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </PageStack>
  );
}


function AssetRow({ asset, active, onSelect, onEdit, onPrint, onRemove }: any) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "grid max-w-full cursor-pointer gap-4 items-center rounded-xl border bg-white p-4 text-left transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50/20 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1.1fr_1.1fr_1fr_auto]",
        active ? "border-emerald-300 bg-emerald-50/70 shadow-sm" : "border-slate-200"
      )}
    >
      <div className="min-w-0 flex flex-col gap-1">
        <div className="flex items-center flex-wrap gap-2">
          <span className="font-mono text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded leading-none">
            {asset.assetCode}
          </span>
          <span className="text-[11px] font-semibold text-slate-405 leading-none truncate max-w-[130px]">
            {asset.brand?.name || ""} {asset.model || ""}
          </span>
        </div>
        <div className="mt-1 text-sm font-bold text-slate-900 leading-snug line-clamp-2" title={asset.assetName}>
          {asset.assetName}
        </div>
      </div>

      <div className="min-w-0 text-xs">
        <div className="font-bold text-slate-800 truncate">{asset.category?.name || "-"}</div>
        <div className="mt-1 font-mono text-[11px] text-slate-450 truncate">SN: {asset.serialNumber || "-"}</div>
      </div>

      <div className="min-w-0 text-xs">
        <div className="font-bold text-slate-800 truncate">{asset.unit?.name || "-"}</div>
        <div className="mt-1 text-[11px] text-slate-450 truncate">{asset.room?.name || "-"}</div>
      </div>

      <div className="flex flex-wrap lg:flex-col items-start gap-1.5 shrink-0">
        <Badge tone={asset.conditionStatus === "BAIK" ? "success" : asset.conditionStatus === "LAYAK_GANTI" ? "danger" : "warning"} className="text-[11px] py-0 px-1.5 font-bold uppercase tracking-wider">
          {asset.conditionStatus}
        </Badge>
        <Badge tone={asset.lifecycleStatus === "AKTIF" ? "success" : "muted"} className="text-[11px] py-0 px-1.5 font-bold uppercase tracking-wider">
          {asset.lifecycleStatus}
        </Badge>
      </div>

      <div className="flex items-center justify-start lg:justify-end" onClick={(event) => event.stopPropagation()}>
        <div className="inline-flex h-9 items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50/50 p-1">
          <Link className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-emerald-700 hover:shadow-sm" href={`/assets/${asset.id}`} title="Detail Lengkap">
            <Eye className="h-3.5 w-3.5" />
          </Link>
          <IconButton title="Edit" onClick={onEdit}>
            <Edit className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton title="Cetak QR" onClick={onPrint}>
            <Printer className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton title="Hapus" onClick={onRemove} danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
    </article>
  );
}

function PreviewItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2 px-1 border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors rounded-md">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-400">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="mt-0.5 text-sm font-bold text-slate-800 break-words leading-tight">{value}</div>
      </div>
    </div>
  );
}

function AssetPreview({ asset, onEdit, onPrint, onRemove }: { asset: any | null; onEdit: (asset: any) => void; onPrint: (asset: any) => void; onRemove: (asset: any) => void }) {
  if (!asset) return null;

  return (
    <div className="overflow-hidden border-0">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-5 text-slate-800">
        <span className="font-mono text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200/50">
          {asset.assetCode}
        </span>
        <h3 className="mt-2.5 text-base font-extrabold leading-snug text-slate-900">{asset.assetName}</h3>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          {asset.category?.name || "-"} &bull; SN: {asset.serialNumber || "Tanpa serial"}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone={asset.conditionStatus === "BAIK" ? "success" : asset.conditionStatus === "LAYAK_GANTI" ? "danger" : "warning"} className="text-[11px] py-0 px-1.5 font-bold">
            {asset.conditionStatus}
          </Badge>
          <Badge tone={asset.lifecycleStatus === "AKTIF" ? "success" : "muted"} className="text-[11px] py-0 px-1.5 font-bold">
            {asset.lifecycleStatus}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 grid gap-3.5">
        <div className="grid gap-0.5">
          <PreviewItem icon={MapPin} label="Unit / Ruangan" value={`${asset.unit?.name || "-"} / ${asset.room?.name || "-"}`} />
          <PreviewItem icon={Laptop} label="IP / Mac Address" value={`${asset.ipAddress || "-"} / ${asset.macAddress || "-"}`} />
          <PreviewItem icon={FileText} label="Keterangan / Notes" value={asset.notes || "-"} />
          <PreviewItem icon={User} label="Penanggung Jawab" value={asset.responsibleUser?.name || "-"} />
          <PreviewItem icon={Calendar} label="Garansi Sampai" value={formatDate(asset.warrantyEndDate)} />
          <PreviewItem icon={CreditCard} label="Nilai Pembelian" value={formatCurrency(asset.purchasePrice)} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" className="h-9 text-xs font-bold border-slate-200 text-slate-700" onClick={() => onEdit(asset)}>
            <Edit className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button type="button" variant="outline" className="h-9 text-xs font-bold border-slate-200 text-slate-700" onClick={() => onPrint(asset)}>
            <Printer className="h-3.5 w-3.5 mr-1" />
            QR Code
          </Button>
          <Link className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm" href={`/assets/${asset.id}`}>
            <Eye className="h-3.5 w-3.5" />
            Detail Lengkap
          </Link>
          <Button type="button" variant="danger" className="h-9 text-xs font-bold" onClick={() => onRemove(asset)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Hapus
          </Button>
        </div>
      </CardContent>
    </div>
  );
}

function AssetForm({ form, setForm, master, filteredRooms, onSubmit, onCancel, isSaving }: any) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <FormSection title="Data Utama Inventaris">
        <FormInput label="Barcode / Kode Aset" name="assetCode" form={form} setForm={setForm} required />
        <FormInput label="Nama Barang" name="assetName" form={form} setForm={setForm} required />
        <Field label="Jenis Barang" required>
          <Select value={form.categoryId} onChange={(event) => setForm((prev: any) => ({ ...prev, categoryId: event.target.value }))} required>
            <option value="">Pilih kategori</option>
            {master?.categories?.map((item: any) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </Field>

        <FormInput label="Serial Number" name="serialNumber" form={form} setForm={setForm} />
        <Field label="Nama Unit" required>
          <Select value={form.unitId} onChange={(event) => setForm((prev: any) => ({ ...prev, unitId: event.target.value, roomId: "" }))} required>
            <option value="">Pilih unit</option>
            {master?.units?.map((item: any) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nama Ruangan" required>
          <Select value={form.roomId} onChange={(event) => setForm((prev: any) => ({ ...prev, roomId: event.target.value }))} required>
            <option value="">Pilih ruangan</option>
            {filteredRooms.map((item: any) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Segmen" required>
          <Select value={form.segmentId} onChange={(event) => setForm((prev: any) => ({ ...prev, segmentId: event.target.value }))} required>
            <option value="">Pilih segmen</option>
            {master?.segments?.map((item: any) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </Field>
        <FormInput label="IP Address" name="ipAddress" form={form} setForm={setForm} />
        <FormInput label="Mac Address" name="macAddress" form={form} setForm={setForm} />
        <div className="md:col-span-2 xl:col-span-3">
          <Field label="Keterangan">
            <Textarea value={form.notes} onChange={(event) => setForm((prev: any) => ({ ...prev, notes: event.target.value }))} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Data Tambahan Opsional">
        <Field label="Merek">
          <Select value={form.brandId} onChange={(event) => setForm((prev: any) => ({ ...prev, brandId: event.target.value }))}>
            <option value="">Tidak diisi</option>
            {master?.brands?.map((item: any) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </Field>
        <FormInput label="Model" name="model" form={form} setForm={setForm} />
        <Field label="Penanggung jawab">
          <Select value={form.responsibleUserId} onChange={(event) => setForm((prev: any) => ({ ...prev, responsibleUserId: event.target.value }))}>
            <option value="">Tidak ada</option>
            {master?.users?.map((item: any) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Vendor">
          <Select value={form.vendorId} onChange={(event) => setForm((prev: any) => ({ ...prev, vendorId: event.target.value }))}>
            <option value="">Tidak diisi</option>
            {master?.vendors?.map((item: any) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </Field>
        <FormInput label="Tanggal pembelian" name="purchaseDate" type="date" form={form} setForm={setForm} />
        <FormInput label="Harga pembelian" name="purchasePrice" type="number" form={form} setForm={setForm} />
        <FormInput label="Nomor invoice" name="invoiceNumber" form={form} setForm={setForm} />
        <FormInput label="Garansi mulai" name="warrantyStartDate" type="date" form={form} setForm={setForm} />
        <FormInput label="Garansi sampai" name="warrantyEndDate" type="date" form={form} setForm={setForm} />
        <FormInput label="URL foto" name="photoUrl" form={form} setForm={setForm} />
      </FormSection>

      <FormSection title="Spesifikasi Opsional">
        <FormInput label="Sistem operasi" name="operatingSystem" form={form} setForm={setForm} />
        <FormInput label="Processor" name="processor" form={form} setForm={setForm} />
        <FormInput label="RAM" name="ram" form={form} setForm={setForm} />
        <FormInput label="Storage" name="storage" form={form} setForm={setForm} />
      </FormSection>

      <FormSection title="Status Aset">
        <Field label="Kondisi" required>
          <Select value={form.conditionStatus} onChange={(event) => setForm((prev: any) => ({ ...prev, conditionStatus: event.target.value }))} required>
            {master?.conditions?.map((item: string) => (
              <option key={item} value={item}>{humanizeEnum(item)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Lifecycle" required>
          <Select value={form.lifecycleStatus} onChange={(event) => setForm((prev: any) => ({ ...prev, lifecycleStatus: event.target.value }))} required>
            {master?.lifecycleStatuses?.map((item: string) => (
              <option key={item} value={item}>{humanizeEnum(item)}</option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Batal</Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {isSaving ? "Menyimpan..." : "Simpan Aset"}
        </Button>
      </div>
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border bg-slate-50 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function FormInput({ label, name, type = "text", required, form, setForm }: any) {
  return (
    <Field label={label} required={required}>
      <Input
        type={type}
        value={form[name] || ""}
        required={required}
        onChange={(event) => setForm((prev: any) => ({ ...prev, [name]: event.target.value }))}
      />
    </Field>
  );
}

function IconButton({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-[5px] text-slate-600 transition hover:bg-white hover:text-emerald-700 hover:shadow-sm",
        danger && "text-red-600 hover:bg-white hover:text-red-700"
      )}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}
