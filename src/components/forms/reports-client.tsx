"use client";

import { Download, FileText, Printer, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form";
import { EmptyPanel, PageHeader, PageStack } from "@/components/ui/page";
import { MetricCard } from "@/components/ui/metric-card";
import { humanizeEnum } from "@/lib/utils";

const reportTypes = [
  ["assets", "Laporan seluruh aset"],
  ["maintenance", "Laporan maintenance"],
  ["mutations", "Laporan mutasi"],
  ["ai", "Laporan AI Decision Support"]
];

function escapeHtml(value: unknown) {
  const normalized = value === null || value === undefined || String(value).trim() === "" ? "-" : value;
  return String(normalized)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPrintDocument({
  reportLabel,
  rows,
  columns
}: {
  reportLabel: string;
  rows: any[];
  columns: Array<[string, string]>;
}) {
  const documentDate = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const isAssetReport = columns.some(([key]) => key === "assetCode");
  const printColumns: Array<[string, string]> = isAssetReport
    ? [
        ["no", "No"],
        ["namaBarang", "Nama Barang"],
        ["serialNumber", "Serial Number"],
        ["unitRuangan", "Nama Unit / Ruangan"],
        ["ipAddress", "IP Address"],
        ["macAddress", "MAC Address"],
        ["catatan", "Keterangan"]
      ]
    : columns;
  const printRows = isAssetReport
    ? rows.map((row) => ({ ...row, unitRuangan: [row.unit, row.ruangan].filter((value) => value && value !== "-").join(" / ") || "-" }))
    : rows;
  const tableHead = printColumns.map(([key, label]) => {
    let w = "10%";
    if (key === "no") w = "3%";
    else if (key === "namaBarang" || key === "aset") w = "20%";
    else if (key === "jenisBarang" || key === "kategori") w = "12%";
    else if (key === "serialNumber" || key === "kode") w = "12%";
    else if (key === "unitRuangan" || key === "unit") w = "14%";
    else if (key === "kondisi" || key === "status") w = "9%";
    else if (key === "skorRisiko" || key === "skor") w = "4%";
    else if (key === "statusGaransi") w = "10%";
    return `<th${isAssetReport ? "" : ` style="width: ${w};"`}>${escapeHtml(label)}</th>`;
  }).join("");
  const tableBody = printRows.length
    ? printRows
        .map((row) => `<tr>${printColumns.map(([key]) => `<td${key === "no" || key === "skorRisiko" ? ' class="center"' : ""}>${escapeHtml(row[key])}</td>`).join("")}</tr>`)
        .join("")
    : `<tr><td colspan="${Math.max(printColumns.length, 1)}" class="empty">Tidak ada data laporan.</td></tr>`;

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reportLabel)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm 12mm 13mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 1.35; }
    .letterhead { display: flex; min-height: 56px; align-items: center; justify-content: space-between; border-bottom: 2px solid #111; padding: 0 4px 8px; }
    .hospital-wordmark { display: block; width: 178px; height: auto; object-fit: contain; object-position: left center; }
    .hospital-mark { display: block; width: 48px; height: 48px; object-fit: contain; }
    .doc-title { padding: 14px 0 12px; text-align: center; }
    .doc-title h1 { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .doc-title p { margin: 4px 0 0; font-size: 9px; letter-spacing: .04em; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #222; padding: 5px 6px; text-align: left; vertical-align: middle; overflow-wrap: anywhere; }
    th { background: #e8f3ec; color: #111; font-size: 8.5px; font-weight: 700; text-align: center; text-transform: uppercase; }
    td { min-height: 25px; }
    tbody tr:nth-child(even) td { background: #f8faf9; }
    th:nth-child(1) { width: 4%; }
    th:nth-child(2) { width: 17%; }
    th:nth-child(3) { width: 14%; }
    th:nth-child(4) { width: 21%; }
    th:nth-child(5) { width: 13%; }
    th:nth-child(6) { width: 16%; }
    th:nth-child(7) { width: 15%; }
    .center { text-align: center; }
    .empty { text-align: center; color: #666; font-style: italic; padding: 20px; }
    .footer { display: flex; justify-content: flex-end; margin-top: 18px; break-inside: avoid; page-break-inside: avoid; }
    .signature { width: 230px; text-align: center; }
    .signature-date, .signature-title, .signature-name { font-size: 9px; }
    .signature-title { margin: 5px 0 54px; }
    .signature-name { font-weight: 700; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="letterhead">
    <img class="hospital-wordmark" src="${window.location.origin}/images/rs-awal-bros-logo.png" alt="RS Awal Bros" />
    <img class="hospital-mark" src="${window.location.origin}/images/awal-bros-logo.png" alt="Logo Awal Bros" />
  </div>

  <div class="doc-title">
    <h1>${escapeHtml(isAssetReport ? "Data Inventaris Perangkat IT" : reportLabel)}</h1>
    ${isAssetReport ? `<p>RS Awal Bros</p>` : ""}
  </div>

  <table><thead><tr>${tableHead || "<th>Laporan</th>"}</tr></thead><tbody>${tableBody}</tbody></table>

  <div class="footer">
    <div class="signature">
      <div class="signature-date">Pekanbaru, ${escapeHtml(documentDate)}</div>
      <div class="signature-title">Mengetahui,<br/>Penanggung Jawab IT</div>
      <div class="signature-name">Arpi Nanda Putra</div>
    </div>
  </div>
</body>
</html>`;
}

export function ReportsClient() {
  const [master, setMaster] = useState<any>(null);
  const [report, setReport] = useState<any>({ rows: [], columns: [] });
  const [filters, setFilters] = useState({ type: "assets", unitId: "", categoryId: "", segmentId: "", conditionStatus: "" });
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  async function load() {
    setLoading(true);
    setVisibleCount(10);
    const query = new URLSearchParams(filters);
    const [reportRes, masterRes] = await Promise.all([fetch(`/api/reports?${query}`), fetch("/api/master-data")]);
    setReport(await reportRes.json());
    setMaster(await masterRes.json());
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setVisibleCount(10);
  }, [filters]);

  function exportCsv() {
    window.location.href = `/api/reports?${new URLSearchParams({ ...filters, format: "csv" })}`;
  }

  const reportLabel = reportTypes.find(([value]) => value === filters.type)?.[1] || "Laporan";
  const rows = report.rows || [];
  const columns = report.columns || [];
  const summary = useMemo(() => {
    const unit = master?.units?.find((item: any) => item.id === filters.unitId)?.name || "Semua unit";
    const category = master?.categories?.find((item: any) => item.id === filters.categoryId)?.name || "Semua kategori";
    const segment = master?.segments?.find((item: any) => item.id === filters.segmentId)?.name || "Semua segmen";
    const condition = filters.conditionStatus ? humanizeEnum(filters.conditionStatus) : "Semua kondisi";
    return { unit, category, segment, condition };
  }, [filters, master]);

  function printReport() {
    const popup = window.open("", "_blank", "width=1120,height=760");
    if (!popup) {
      window.alert("Pop-up print diblokir browser.");
      return;
    }

    popup.document.write(buildPrintDocument({ reportLabel, rows, columns }));
    popup.document.close();
    popup.focus();
    const triggerPrint = () => window.setTimeout(() => popup.print(), 350);
    if (popup.document.readyState === "complete") triggerPrint();
    else popup.addEventListener("load", triggerPrint, { once: true });
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow="Monitoring"
        title="Laporan"
        description="Buka ringkasan aset, maintenance, mutasi, dan AI Decision Support dalam format yang mudah dibaca untuk evaluasi monitoring."
        actions={
          <>
            <Button type="button" variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button type="button" variant="outline" onClick={printReport}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-emerald-700" />
            Filter Laporan
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Jenis laporan">
              <Select value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}>
                {reportTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unit">
              <Select value={filters.unitId} onChange={(event) => setFilters((prev) => ({ ...prev, unitId: event.target.value }))}>
                <option value="">Semua unit</option>
                {master?.units?.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kategori">
              <Select value={filters.categoryId} onChange={(event) => setFilters((prev) => ({ ...prev, categoryId: event.target.value }))}>
                <option value="">Semua kategori</option>
                {master?.categories?.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Segmen">
              <Select value={filters.segmentId} onChange={(event) => setFilters((prev) => ({ ...prev, segmentId: event.target.value }))}>
                <option value="">Semua segmen</option>
                {master?.segments?.map((segment: any) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kondisi">
              <Select value={filters.conditionStatus} onChange={(event) => setFilters((prev) => ({ ...prev, conditionStatus: event.target.value }))}>
                <option value="">Semua kondisi</option>
                {master?.conditions?.map((condition: string) => (
                  <option key={condition} value={condition}>
                    {humanizeEnum(condition)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" className="w-full sm:w-auto sm:min-w-[180px]" onClick={load}>
              <Search className="h-4 w-4" />
              Tampilkan
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={FileText} label="Jenis Laporan" value={reportLabel} compact layout="horizontal" />
        <MetricCard icon={FileText} label="Filter Unit" value={summary.unit} compact layout="horizontal" />
        <MetricCard icon={FileText} label="Total Baris" value={rows.length} layout="horizontal" />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{reportLabel}</CardTitle>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{summary.unit} / {summary.category} / {summary.condition}</p>
          </div>
          <Badge tone="info">{columns.length} kolom</Badge>
        </CardHeader>
        <CardContent className="grid gap-3">
          {loading ? <EmptyPanel title="Memuat laporan" description="Data laporan sedang dihitung dari database." /> : null}
          {!loading && !rows.length ? <EmptyPanel title="Tidak ada data laporan" description="Ubah filter atau tambah data operasional terlebih dahulu." /> : null}
          {!loading && rows.length > 0 && (
            <>
              <div className="grid gap-3">
                {rows.slice(0, visibleCount).map((row: any, index: number) => (
                  <ReportRow key={index} row={row} columns={columns} />
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

function ReportRow({ row, columns }: { row: any; columns: Array<[string, string]> }) {
  const titleColumn = columns.find(([key]) => key === "namaBarang" || key === "aset") || columns[1] || columns[0];
  const codeColumn = columns.find(([key]) => key === "assetCode" || key === "barcode" || key === "kode");
  const detailColumns = columns.filter((column) => column[0] !== "no" && column[0] !== titleColumn?.[0] && column[0] !== codeColumn?.[0]);

  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-panel transition hover:border-emerald-200">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-base font-bold leading-snug text-slate-950">{String((titleColumn ? row[titleColumn[0]] : null) ?? (codeColumn ? row[codeColumn[0]] : null) ?? "-")}</div>
          {codeColumn ? <div className="mt-1.5 text-xs font-bold text-emerald-700">{String(row[codeColumn[0]] ?? "-")}</div> : null}
        </div>
        <Badge tone="muted">Laporan</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {detailColumns.map(([key, label]) => (
          <div key={key} className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">{label}</div>
            <div className="mt-2.5 break-words text-sm leading-6 text-slate-800">{String(row[key] ?? "-")}</div>
          </div>
        ))}
      </div>
    </article>
  );
}
