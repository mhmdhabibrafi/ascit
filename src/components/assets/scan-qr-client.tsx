"use client";

import type { IScannerControls } from "@zxing/browser";
import { Camera, CameraOff, ExternalLink, Loader2, QrCode, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { EmptyPanel, PageHeader, PageStack } from "@/components/ui/page";
import { humanizeEnum } from "@/lib/utils";

function normalizeQrInput(rawValue: string) {
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
}

export function ScanQrClient() {
  const [assets, setAssets] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Kamera belum aktif.");
  const [cameraError, setCameraError] = useState("");
  const [lastScanned, setLastScanned] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const lastScannedRef = useRef("");
  const autoScanHandledRef = useRef(false);

  useEffect(() => {
    fetch("/api/assets")
      .then((res) => res.json())
      .then((json) => setAssets(json.data || []))
      .finally(() => setLoading(false));
  }, []);

  const stopCamera = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setCameraActive(false);
    setCameraStarting(false);
    setCameraStatus("Kamera dihentikan.");
  }, []);

  const scan = useCallback(async (value = query) => {
    const normalizedValue = normalizeQrInput(value);
    setNotFound(false);
    setResult(null);
    if (!normalizedValue) return;
    setQuery(normalizedValue);
    const response = await fetch(`/api/assets/${encodeURIComponent(normalizedValue)}`);
    const json = await response.json();
    if (!response.ok) {
      setNotFound(true);
      return;
    }
    setResult(json.data);
  }, [query]);

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
          setQuery(normalizedValue);
          setCameraStatus("QR berhasil dipindai.");
          activeControls.stop();
          scannerControlsRef.current = null;
          setCameraActive(false);
          void scan(normalizedValue);
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
  }, [scan]);

  useEffect(() => {
    if (autoScanHandledRef.current) return;
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;
    autoScanHandledRef.current = true;
    const normalizedValue = normalizeQrInput(code);
    setQuery(normalizedValue);
    void scan(normalizedValue);
  }, [scan]);

  useEffect(() => () => {
    scannerControlsRef.current?.stop();
  }, []);

  const sampleAssets = useMemo(() => assets.slice(0, 12), [assets]);

  return (
    <PageStack>
      <PageHeader
        eyebrow="Operasional"
        title="Scan QR Aset"
        description="Cari aset dari kode aset atau QR token untuk membuka identitas perangkat, lokasi, status, dan detail inventaris."
      />

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Input QR atau Kode Aset</CardTitle>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">Tempel token QR, ketik kode aset, atau pilih dari daftar referensi di samping.</p>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Contoh: IT-PC-2026-001 atau QR token"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void scan();
                    }}
                  />
                </div>
                <Button type="button" onClick={() => scan()}>
                  <QrCode className="h-4 w-4" />
                  Scan
                </Button>
              </div>
              <div className="grid gap-4 rounded-md border bg-slate-50 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
                <div className="relative min-h-[220px] overflow-hidden rounded-md border bg-slate-950">
                  <video ref={videoRef} className="h-full min-h-[220px] w-full object-cover" muted playsInline />
                  {!cameraActive && !cameraStarting ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-center text-white">
                      <Camera className="h-9 w-9 text-emerald-200" />
                      <div>
                        <div className="text-sm font-semibold">Scan QR dengan kamera</div>
                        <div className="mt-1 text-xs font-medium text-slate-300">Akses kamera berjalan di browser lokal.</div>
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

                <div className="flex min-w-0 flex-col justify-between gap-4">
                  <div className="grid gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Kamera QR</div>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">{cameraStatus}</p>
                    </div>
                    {lastScanned ? (
                      <div className="rounded-md border bg-white p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Terakhir terbaca</div>
                        <div className="mt-2 break-all font-mono text-xs font-bold text-slate-700">{lastScanned}</div>
                      </div>
                    ) : null}
                    {cameraError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{cameraError}</div> : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <Button type="button" onClick={() => void startCamera()} disabled={cameraActive || cameraStarting}>
                      {cameraStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      Mulai Kamera
                    </Button>
                    <Button type="button" variant="outline" onClick={stopCamera} disabled={!cameraActive && !cameraStarting}>
                      <CameraOff className="h-4 w-4" />
                      Stop
                    </Button>
                  </div>
                </div>
              </div>
              {notFound ? <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">Data aset tidak ditemukan.</div> : null}
            </CardContent>
          </Card>

          {result ? <ScanResult asset={result} /> : <EmptyPanel title="Belum ada aset dipilih" description="Masukkan kode aset atau pilih salah satu kode aset dari daftar di samping untuk melihat detail." />}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Referensi Kode QR</CardTitle>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">Daftar aset terdaftar beserta token QR aktif yang siap dipindai.</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            {loading ? <EmptyPanel title="Memuat aset" description="Daftar QR sedang diambil dari database." /> : null}
            {!loading && !sampleAssets.length ? <EmptyPanel title="Belum ada aset" /> : null}
            {!loading && sampleAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => {
                  setQuery(asset.qrToken);
                  void scan(asset.qrToken);
                }}
                className="rounded-md border bg-white p-3 text-left shadow-panel transition hover:border-emerald-200 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">{asset.assetCode}</div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">{asset.assetName}</div>
                  </div>
                  <Badge tone="info">Pilih</Badge>
                </div>
                <div className="mt-2 truncate font-mono text-xs font-bold text-slate-500">{asset.qrToken}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>
    </PageStack>
  );
}

function ScanResult({ asset }: { asset: any }) {
  return (
    <Card>
      <CardContent className="grid gap-4 lg:grid-cols-[210px_1fr]">
        <div className="rounded-md border bg-slate-50 p-4 text-center">
          {asset.qrCodeUrl ? <Image src={asset.qrCodeUrl} alt={asset.assetCode} width={180} height={180} className="mx-auto rounded-md bg-white p-2" /> : null}
          <div className="mt-3 text-sm font-semibold text-slate-950">{asset.assetCode}</div>
          <div className="mt-1 break-all font-mono text-xs font-bold text-slate-500">{asset.qrToken}</div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge>{humanizeEnum(asset.conditionStatus)}</Badge>
            <Badge>{humanizeEnum(asset.lifecycleStatus)}</Badge>
            <Badge tone="info">{asset.category?.name || "-"}</Badge>
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-tight text-slate-950">{asset.assetName}</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {asset.unit?.name || "-"} / {asset.room?.name || "-"} / {asset.brand?.name || "-"} {asset.model || ""}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Info label="Serial" value={asset.serialNumber || "-"} />
            <Info label="IP / MAC" value={`${asset.ipAddress || "-"} / ${asset.macAddress || "-"}`} />
            <Info label="OS" value={asset.operatingSystem || "-"} />
            <Info label="Spesifikasi" value={[asset.processor, asset.ram, asset.storage].filter(Boolean).join(" / ") || "-"} />
          </div>
          <Link
            href={`/assets/${asset.id}`}
            className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          >
            Buka Detail Aset
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">{label}</div>
      <div className="mt-2 break-words text-sm font-bold leading-6 text-slate-800">{value}</div>
    </div>
  );
}
