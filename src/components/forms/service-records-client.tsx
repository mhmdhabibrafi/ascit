"use client";

import { Activity, Clock3, Plus, RefreshCw, Wrench, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { MetricCard } from "@/components/ui/metric-card";
import { Modal } from "@/components/ui/modal";
import { EmptyPanel, PageHeader, PageStack } from "@/components/ui/page";
import { SearchBar, SearchFilter } from "@/components/ui/search-bar";
import { MetricSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn, formatDateTime, humanizeEnum } from "@/lib/utils";

const emptyForm = {
  assetId: "",
  type: "PREVENTIVE",
  status: "TERJADWAL",
  scheduledDate: new Date().toISOString().slice(0, 10),
  completedDate: "",
  technicianName: "",
  symptoms: "",
  actionTaken: "",
  replacedComponents: "",
  cost: "0",
  notes: ""
};

export function ServiceRecordsClient() {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(10);

  async function load() {
    setLoading(true);
    setVisibleCount(10);
    try {
      const [serviceRes, assetRes] = await Promise.all([fetch("/api/service-records"), fetch("/api/assets")]);
      if (serviceRes.ok) {
        const json = await serviceRes.json();
        setRows(json.data || []);
      }
      if (assetRes.ok) {
        const json = await assetRes.json();
        setAssets(json.data || []);
      }
    } catch (err) {
      toast.push("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/service-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cost: parseFloat(form.cost) || 0
        })
      });
      const json = await response.json();
      if (!response.ok) {
        toast.push(json.error || "Gagal menyimpan service record.", "error");
        return;
      }
      toast.push("Service record berhasil disimpan.", "success");
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const preventive = rows.filter((row) => row.type === "PREVENTIVE").length;
    const corrective = rows.filter((row) => row.type === "CORRECTIVE").length;
    const scheduled = rows.filter((row) => row.status === "TERJADWAL").length;
    return { total: rows.length, preventive, corrective, scheduled };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (typeFilter !== "ALL" && row.type !== typeFilter) return false;
        if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
        return true;
      })
      .filter((row) => {
        if (!keyword) return true;
        const text = [
          row.asset?.assetCode,
          row.asset?.assetName,
          row.technicianName,
          row.symptoms,
          row.actionTaken,
          row.notes
        ].join(" ").toLowerCase();
        return text.includes(keyword);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rows, search, typeFilter, statusFilter]);

  return (
    <PageStack>
      <PageHeader
        eyebrow="Operasional"
        title="Service Records"
        description="Kelola jadwal pemeliharaan berkala (Preventive) dan riwayat perbaikan kerusakan (Corrective) aset IT dalam satu tempat."
        actions={
          <Button type="button" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Tambah Record
          </Button>
        }
      />

      {loading ? (
        <MetricSkeleton />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Activity} label="Total Record" value={stats.total} hint="Seluruh riwayat" />
          <MetricCard icon={Clock3} label="Preventive" value={stats.preventive} tone="info" hint="Pemeliharaan rutin" />
          <MetricCard icon={ShieldAlert} label="Corrective" value={stats.corrective} tone="danger" hint="Perbaikan kerusakan" />
          <MetricCard icon={Wrench} label="Terjadwal" value={stats.scheduled} tone="warning" hint="Belum dikerjakan" />
        </section>
      )}

      {showForm ? (
        <Modal title="Form Service Record" onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Aset">
                <Select value={form.assetId} onChange={(event) => setForm((prev) => ({ ...prev, assetId: event.target.value }))} required>
                  <option value="">Pilih aset</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetCode} - {asset.assetName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Jenis (Type)">
                <Select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))} required>
                  <option value="PREVENTIVE">PREVENTIVE (Pemeliharaan Berkala)</option>
                  <option value="CORRECTIVE">CORRECTIVE (Perbaikan Kerusakan)</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} required>
                  <option value="TERJADWAL">TERJADWAL</option>
                  <option value="SEDANG_DIKERJAKAN">SEDANG DIKERJAKAN</option>
                  <option value="SELESAI">SELESAI</option>
                  <option value="DIBATALKAN">DIBATALKAN</option>
                </Select>
              </Field>
              <Field label="Teknisi Pelaksana">
                <Input type="text" placeholder="Nama teknisi" value={form.technicianName} onChange={(event) => setForm((prev) => ({ ...prev, technicianName: event.target.value }))} />
              </Field>
              <Field label="Tanggal Dijadwalkan">
                <Input type="date" value={form.scheduledDate} onChange={(event) => setForm((prev) => ({ ...prev, scheduledDate: event.target.value }))} />
              </Field>
              <Field label="Tanggal Selesai">
                <Input type="date" value={form.completedDate} onChange={(event) => setForm((prev) => ({ ...prev, completedDate: event.target.value }))} />
              </Field>
            </div>

            {form.type === "CORRECTIVE" && (
              <div className="grid gap-4 md:grid-cols-2 bg-red-50/50 p-4 rounded-xl border border-red-100">
                <div className="md:col-span-2">
                  <span className="text-xs font-bold text-red-700 uppercase tracking-widest mb-2 block">Informasi Kerusakan (Corrective)</span>
                </div>
                <Field label="Gejala / Keluhan">
                  <Textarea value={form.symptoms} onChange={(event) => setForm((prev) => ({ ...prev, symptoms: event.target.value }))} placeholder="Jelaskan kendala atau keluhan..." />
                </Field>
                <Field label="Tindakan Perbaikan">
                  <Textarea value={form.actionTaken} onChange={(event) => setForm((prev) => ({ ...prev, actionTaken: event.target.value }))} placeholder="Langkah perbaikan yang dilakukan..." />
                </Field>
                <Field label="Komponen Diganti">
                  <Input type="text" value={form.replacedComponents} onChange={(event) => setForm((prev) => ({ ...prev, replacedComponents: event.target.value }))} placeholder="RAM, HDD, Keyboard..." />
                </Field>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
               <Field label="Total Biaya (Rp)">
                <Input type="number" min="0" value={form.cost} onChange={(event) => setForm((prev) => ({ ...prev, cost: event.target.value }))} />
              </Field>
              <Field label="Catatan Tambahan">
                <Textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>Simpan Record</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Riwayat Layanan</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Log lengkap perawatan dan perbaikan aset IT.</p>
            </div>
            <Badge tone="info">{filteredRows.length} tampil</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <SearchBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Cari aset, teknisi, tindakan..."
            onReset={() => { setSearch(""); setTypeFilter("ALL"); setStatusFilter("ALL"); }}
            filters={
              <>
                <SearchFilter
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                    { value: "ALL", label: "Semua Jenis" },
                    { value: "PREVENTIVE", label: "Preventive" },
                    { value: "CORRECTIVE", label: "Corrective" }
                  ]}
                />
                <SearchFilter
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "ALL", label: "Semua Status" },
                    { value: "TERJADWAL", label: "Terjadwal" },
                    { value: "SEDANG_DIKERJAKAN", label: "Dikerjakan" },
                    { value: "SELESAI", label: "Selesai" },
                    { value: "DIBATALKAN", label: "Dibatalkan" }
                  ]}
                />
              </>
            }
          />

          {loading ? <TableSkeleton /> : null}
          {!loading && !rows.length ? <EmptyPanel title="Belum ada record" description="Belum ada riwayat service yang tercatat." /> : null}
          {!loading && filteredRows.length > 0 && (
            <div className="grid gap-3">
              {filteredRows.slice(0, visibleCount).map((row) => (
                <ServiceRecordItem key={row.id} row={row} />
              ))}
            </div>
          )}
          {visibleCount < filteredRows.length ? (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + 10)}>
                Tampilkan Lebih Banyak ({filteredRows.length - visibleCount} item tersisa)
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageStack>
  );
}

function ServiceRecordItem({ row }: { row: any }) {
  const isCorrective = row.type === "CORRECTIVE";
  return (
    <article className="grid max-w-full gap-3 overflow-hidden rounded-md border bg-white p-4 shadow-panel">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
             <Badge tone={isCorrective ? "danger" : "info"}>{row.type}</Badge>
             <Badge tone={row.status === "SELESAI" ? "success" : row.status === "DIBATALKAN" ? "danger" : "warning"}>
               {humanizeEnum(row.status)}
             </Badge>
             <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
               {row.completedDate ? formatDateTime(row.completedDate) : row.scheduledDate ? formatDateTime(row.scheduledDate) : "Belum ada tgl"}
             </span>
          </div>
          <h3 className="mt-2 break-words text-sm font-bold leading-snug text-slate-950">
            {row.asset?.assetCode || "-"} / {row.asset?.assetName || "-"}
          </h3>
          <div className="mt-1 text-xs text-muted-foreground font-semibold">
             Teknisi: {row.technicianName || "-"} | Biaya: Rp {Number(row.cost).toLocaleString("id-ID")}
          </div>
        </div>
      </div>
      <div className="mt-2 grid gap-3 md:grid-cols-2 rounded-md border bg-slate-50 p-3">
         {isCorrective ? (
           <>
             <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">Gejala/Keluhan:</span>
                <span className="text-sm font-semibold text-slate-800">{row.symptoms || "-"}</span>
             </div>
             <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">Tindakan/Penggantian:</span>
                <span className="text-sm font-semibold text-slate-800">{row.actionTaken || "-"} {row.replacedComponents ? `(${row.replacedComponents})` : ""}</span>
             </div>
           </>
         ) : (
           <div className="md:col-span-2">
             <span className="text-xs font-bold text-slate-400 block mb-1">Catatan Pemeliharaan:</span>
             <span className="text-sm font-semibold text-slate-800">{row.notes || "Tidak ada catatan."}</span>
           </div>
         )}
      </div>
    </article>
  );
}
