"use client";

import { Check, Clock3, MapPin, Plus, RefreshCw, X, Loader2 } from "lucide-react";
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
import { cn, formatDate, humanizeEnum } from "@/lib/utils";

const emptyForm = {
  assetId: "",
  toUnitId: "",
  toRoomId: "",
  newResponsibleUserId: "",
  mutationDate: new Date().toISOString().slice(0, 10),
  reason: "",
  notes: ""
};

const statusOptions = [
  { value: "PROCESSED", label: "Riwayat" },
  { value: "ALL", label: "Semua status" },
  { value: "MENUNGGU", label: "Menunggu" },
  { value: "DISETUJUI", label: "Disetujui" },
  { value: "DITOLAK", label: "Ditolak" }
] as const;

function mutationSearchText(row: any) {
  return [
    row.asset?.assetCode,
    row.asset?.assetName,
    row.fromUnit?.name,
    row.fromRoom?.name,
    row.toUnit?.name,
    row.toRoom?.name,
    row.oldResponsibleUser?.name,
    row.newResponsibleUser?.name,
    row.reason,
    row.notes,
    row.approvalStatus
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function MutationsClient() {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [master, setMaster] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PROCESSED");
  const [visibleCount, setVisibleCount] = useState(10);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setVisibleCount(10);
    const [mutationRes, assetRes, masterRes] = await Promise.all([fetch("/api/mutations"), fetch("/api/assets"), fetch("/api/master-data")]);
    setRows((await mutationRes.json()).data || []);
    setAssets((await assetRes.json()).data || []);
    setMaster(await masterRes.json());
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setVisibleCount(10);
  }, [search, statusFilter]);

  const rooms = useMemo(() => master?.rooms?.filter((room: any) => !form.toUnitId || room.unitId === form.toUnitId) || [], [master, form.toUnitId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/mutations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const json = await response.json();
    setSaving(false);
    if (!response.ok) {
      toast.push(json.error || "Gagal membuat mutasi.", "error");
      return;
    }
    toast.push("Pengajuan mutasi berhasil dibuat.", "success");
    setShowForm(false);
    setForm(emptyForm);
    await load();
  }

  async function approve(id: string, approvalStatus: string) {
    const response = await fetch("/api/mutations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approvalStatus })
    });
    const json = await response.json();
    if (!response.ok) {
      toast.push(json.error || "Gagal memproses mutasi.", "error");
      return;
    }
    toast.push(`Mutasi ${approvalStatus.toLowerCase()}.`, "success");
    await load();
  }

  const stats = useMemo(() => {
    const pending = rows.filter((row) => row.approvalStatus === "MENUNGGU").length;
    const approved = rows.filter((row) => row.approvalStatus === "DISETUJUI").length;
    const rejected = rows.filter((row) => row.approvalStatus === "DITOLAK").length;
    return { total: rows.length, pending, approved, rejected };
  }, [rows]);

  const pendingRows = useMemo(() => rows.filter((row) => row.approvalStatus === "MENUNGGU"), [rows]);
  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (statusFilter === "ALL") return true;
        if (statusFilter === "PROCESSED") return row.approvalStatus !== "MENUNGGU";
        return row.approvalStatus === statusFilter;
      })
      .filter((row) => !keyword || mutationSearchText(row).includes(keyword))
      .sort((a, b) => {
        if (a.approvalStatus === "MENUNGGU" && b.approvalStatus !== "MENUNGGU") return -1;
        if (a.approvalStatus !== "MENUNGGU" && b.approvalStatus === "MENUNGGU") return 1;
        return new Date(b.createdAt || b.mutationDate).getTime() - new Date(a.createdAt || a.mutationDate).getTime();
      });
  }, [rows, search, statusFilter]);

  function resetFilters() {
    setSearch("");
    setStatusFilter("PROCESSED");
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow="Operasional"
        title="Mutasi Aset"
        description="Ajukan perpindahan aset antar unit/ruangan, ubah penanggung jawab, dan proses approval mutasi dari satu tempat."
        actions={
          <Button type="button" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Ajukan Mutasi
          </Button>
        }
      />

      {loading ? (
        <MetricSkeleton />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={RefreshCw} label="Total mutasi" value={stats.total} hint="Semua pengajuan" />
          <MetricCard icon={Clock3} label="Menunggu" value={stats.pending} tone={stats.pending ? "warning" : "success"} hint="Perlu keputusan" />
          <MetricCard icon={Check} label="Disetujui" value={stats.approved} tone="success" hint="Sudah diproses" />
          <MetricCard icon={X} label="Ditolak" value={stats.rejected} tone={stats.rejected ? "danger" : "success"} hint="Pengajuan tidak diterima" />
        </section>
      )}

      {showForm ? (
        <Modal title="Form Pengajuan Mutasi" onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              <Field label="Unit tujuan">
                <Select value={form.toUnitId} onChange={(event) => setForm((prev) => ({ ...prev, toUnitId: event.target.value, toRoomId: "" }))} required>
                  <option value="">Pilih unit</option>
                  {master?.units?.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ruangan tujuan">
                <Select value={form.toRoomId} onChange={(event) => setForm((prev) => ({ ...prev, toRoomId: event.target.value }))} required>
                  <option value="">Pilih ruangan</option>
                  {rooms.map((room: any) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Penanggung jawab baru">
                <Select value={form.newResponsibleUserId} onChange={(event) => setForm((prev) => ({ ...prev, newResponsibleUserId: event.target.value }))}>
                  <option value="">Tidak berubah</option>
                  {master?.users?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tanggal mutasi">
                <Input type="date" value={form.mutationDate} onChange={(event) => setForm((prev) => ({ ...prev, mutationDate: event.target.value }))} required />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Alasan mutasi">
                <Textarea value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} required />
              </Field>
              <Field label="Catatan">
                <Textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Simpan Pengajuan
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      <ApprovalQueue rows={pendingRows} onApprove={approve} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Workflow Mutasi</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Riwayat mutasi yang sudah diproses tampil di sini. Pilih filter Menunggu atau Semua jika perlu melihat pengajuan pending di daftar lengkap.
              </p>
            </div>
            <Badge tone="info">{filteredRows.length} tampil</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <SearchBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Cari kode aset, nama aset, unit, ruangan, alasan, atau PIC..."
            onReset={resetFilters}
            filters={
              <SearchFilter
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
              />
            }
          />
          <div className="flex flex-wrap gap-2">
            <StatusChip active={statusFilter === "PROCESSED"} onClick={() => setStatusFilter("PROCESSED")} label="Riwayat" value={stats.approved + stats.rejected} />
            <StatusChip active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")} label="Semua" value={stats.total} />
            <StatusChip active={statusFilter === "MENUNGGU"} onClick={() => setStatusFilter("MENUNGGU")} label="Menunggu" value={stats.pending} tone="warning" />
            <StatusChip active={statusFilter === "DISETUJUI"} onClick={() => setStatusFilter("DISETUJUI")} label="Disetujui" value={stats.approved} tone="success" />
            <StatusChip active={statusFilter === "DITOLAK"} onClick={() => setStatusFilter("DITOLAK")} label="Ditolak" value={stats.rejected} tone="danger" />
          </div>
          {loading ? <TableSkeleton /> : null}
          {!loading && !rows.length ? <EmptyPanel title="Belum ada mutasi" description="Ajukan mutasi pertama ketika aset berpindah unit atau ruangan." /> : null}
          {!loading && rows.length > 0 && !filteredRows.length ? (
            <EmptyPanel title="Tidak ada mutasi yang cocok" description="Ubah kata kunci pencarian atau reset filter status." />
          ) : null}
          {!loading && filteredRows.length > 0 && (
            <>
              <div className="grid gap-3">
                {filteredRows.slice(0, visibleCount).map((row) => (
                  <MutationItem key={row.id} row={row} onApprove={approve} />
                ))}
              </div>
              {visibleCount < filteredRows.length ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                  >
                    Tampilkan Lebih Banyak ({filteredRows.length - visibleCount} item tersisa)
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

function StatusChip({
  active,
  onClick,
  label,
  value,
  tone = "info"
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: number;
  tone?: "info" | "success" | "warning" | "danger";
}) {
  const activeClass = {
    info: "border-emerald-300 bg-emerald-50 text-emerald-800",
    success: "border-emerald-300 bg-emerald-50 text-emerald-800",
    warning: "border-amber-300 bg-amber-50 text-amber-800",
    danger: "border-red-300 bg-red-50 text-red-800"
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-md border bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50",
        active && activeClass
      )}
    >
      {label}
      <span className="rounded bg-white/80 px-1.5 py-0.5 text-[11px] leading-none">{value}</span>
    </button>
  );
}

function ApprovalQueue({ rows, onApprove }: { rows: any[]; onApprove: (id: string, status: string) => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>Antrian Approval</CardTitle>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Mutasi yang masih menunggu keputusan muncul di sini, jadi tidak perlu mencari sampai bawah.</p>
        </div>
        <Badge tone={rows.length ? "warning" : "success"}>{rows.length ? `${rows.length} perlu keputusan` : "Tidak ada pending"}</Badge>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows.length ? (
          rows.map((row) => <ApprovalQueueItem key={row.id} row={row} onApprove={onApprove} />)
        ) : (
          <EmptyPanel title="Tidak ada mutasi menunggu" description="Semua pengajuan sudah diproses." className="py-5" />
        )}
      </CardContent>
    </Card>
  );
}

function ApprovalQueueItem({ row, onApprove }: { row: any; onApprove: (id: string, status: string) => void }) {
  return (
    <article className="grid gap-4 rounded-md border border-l-4 border-l-amber-400 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
          <Badge tone="warning" className="min-h-5 py-0">Menunggu</Badge>
          <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-700">{formatDate(row.mutationDate)}</span>
        </div>
        <div className="mt-2 break-words text-base font-black leading-snug text-slate-950">
          {row.asset?.assetCode || "-"} / {row.asset?.assetName || "-"}
        </div>
        <div className="mt-2 grid gap-2 text-sm leading-6 text-slate-700 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
          <div className="min-w-0 rounded-md border bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Dari</div>
            <div className="truncate font-black text-slate-800">{row.fromUnit?.name || "-"}</div>
            <div className="truncate text-xs text-muted-foreground">{row.fromRoom?.name || "-"}</div>
          </div>
          <div className="hidden text-slate-300 md:block">-&gt;</div>
          <div className="min-w-0 rounded-md border bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Tujuan</div>
            <div className="truncate font-black text-slate-800">{row.toUnit?.name || "-"}</div>
            <div className="truncate text-xs text-muted-foreground">{row.toRoom?.name || "-"}</div>
          </div>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{row.reason || "Alasan belum diisi."}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end lg:min-w-[244px]">
        <Button type="button" className="min-w-[104px]" onClick={() => onApprove(row.id, "DISETUJUI")}>
          <Check className="h-4 w-4" />
          ACC
        </Button>
        <Button type="button" variant="danger" className="min-w-[104px]" onClick={() => onApprove(row.id, "DITOLAK")}>
          <X className="h-4 w-4" />
          Tolak
        </Button>
      </div>
    </article>
  );
}



function MutationItem({ row, onApprove }: { row: any; onApprove: (id: string, status: string) => void }) {
  const pending = row.approvalStatus === "MENUNGGU";
  return (
    <article className="grid max-w-full gap-3 overflow-hidden rounded-md border bg-white p-4 shadow-panel">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{formatDate(row.mutationDate)}</span>
            <Badge tone={pending ? "warning" : row.approvalStatus === "DISETUJUI" ? "success" : "danger"}>{humanizeEnum(row.approvalStatus)}</Badge>
          </div>
          <h3 className="mt-2 break-words text-sm font-semibold leading-snug text-slate-950">{row.asset?.assetCode || "-"} / {row.asset?.assetName || "-"}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">{row.reason || "Alasan belum diisi."}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {pending ? (
            <>
              <Button type="button" className="h-9 w-9 p-0" onClick={() => onApprove(row.id, "DISETUJUI")} aria-label="Setujui mutasi">
                <Check className="h-4 w-4" />
              </Button>
              <Button type="button" variant="danger" className="h-9 w-9 p-0" onClick={() => onApprove(row.id, "DITOLAK")} aria-label="Tolak mutasi">
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Badge tone={row.approvalStatus === "DISETUJUI" ? "success" : "danger"}>Selesai</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <LocationBlock title="Dari" unit={row.fromUnit?.name} room={row.fromRoom?.name} />
        <LocationBlock title="Tujuan" unit={row.toUnit?.name} room={row.toRoom?.name} />
      </div>

      {row.newResponsibleUser?.name ? (
        <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-muted-foreground">
          PIC baru: <span className="text-slate-800">{row.newResponsibleUser.name}</span>
        </div>
      ) : null}
    </article>
  );
}

function LocationBlock({ title, unit, room }: { title: string; unit?: string; room?: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        <MapPin className="h-4 w-4 text-emerald-700" />
        {title}
      </div>
      <div className="mt-2 break-words text-sm font-black leading-6 text-slate-800">{unit || "-"}</div>
      <div className="break-words text-sm leading-6 text-muted-foreground">{room || "-"}</div>
    </div>
  );
}
