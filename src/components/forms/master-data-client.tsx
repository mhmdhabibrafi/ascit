"use client";

import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Factory,
  Layers3,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Truck,
  UserRoundCog,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyPanel, PageHeader, PageStack } from "@/components/ui/page";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "units", label: "Unit", icon: Building2, description: "Unit kerja pemilik aset." },
  { key: "rooms", label: "Ruangan", icon: DoorOpen, description: "Lokasi detail aset per unit." },
  { key: "categories", label: "Kategori", icon: Layers3, description: "Kelompok perangkat dan layanan IT." },
  { key: "segments", label: "Segmen", icon: LayoutGrid, description: "Segmen perangkat atau area." },
  { key: "brands", label: "Merek", icon: Tag, description: "Brand perangkat untuk inventaris." },
  { key: "vendors", label: "Vendor", icon: Truck, description: "Pemasok dan kontak garansi." },
  { key: "technicians", label: "Teknisi", icon: UserRoundCog, description: "PIC teknis untuk maintenance." }
] as const;

type TabKey = (typeof tabs)[number]["key"];

type MasterRow = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  unitId?: string | null;
  unit?: { id: string; name: string; code?: string | null } | null;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  specialty?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    rooms?: number;
    assets?: number;
    warranties?: number;
  };
};

type MasterData = Record<TabKey, MasterRow[]> & {
  roles?: unknown[];
  users?: unknown[];
};

const emptyForm = {
  name: "",
  code: "",
  unitId: "",
  contact: "",
  phone: "",
  email: "",
  address: "",
  specialty: "",
  description: ""
};

type MasterForm = typeof emptyForm;

export function MasterDataClient() {
  const toast = useToast();
  const [data, setData] = useState<MasterData | null>(null);
  const [tab, setTab] = useState<TabKey>("units");
  const [form, setForm] = useState<MasterForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MasterRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ensuring, setEnsuring] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MasterRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  async function load() {
    setLoading(true);
    setCurrentPage(1);
    const response = await fetch("/api/master-data");
    const json = await response.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, search]);

  const currentTab = tabs.find((item) => item.key === tab) || tabs[0];
  const counts = useMemo(
    () =>
      tabs.map((item) => ({
        ...item,
        count: data?.[item.key]?.length || 0
      })),
    [data]
  );

  const rows = useMemo(() => {
    const allRows = data?.[tab] || [];
    if (!search.trim()) return allRows;
    const keyword = search.toLowerCase();
    return allRows.filter((row) =>
      [
        row.name,
        row.code,
        row.description,
        row.contact,
        row.phone,
        row.email,
        row.address,
        row.specialty,
        row.unit?.name,
        row.unit?.code
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [data, search, tab]);

  function switchTab(nextTab: TabKey) {
    setTab(nextTab);
    setSearch("");
    closeForm();
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(row: MasterRow) {
    setEditing(row);
    setForm({
      name: row.name || "",
      code: row.code || "",
      unitId: row.unitId || row.unit?.id || "",
      contact: row.contact || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      specialty: row.specialty || "",
      description: row.description || ""
    });
    setFormOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/master-data", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing?.id, type: tab, ...form })
    });
    const json = await response.json();
    setSaving(false);

    if (!response.ok) {
      toast.push(json.error || "Gagal menyimpan master data.", "error");
      return;
    }

    toast.push(`Master data ${editing ? "diperbarui" : "ditambahkan"}.`, "success");
    closeForm();
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const response = await fetch("/api/master-data", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteTarget.id, type: tab, name: deleteTarget.name })
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.push(json.error || "Gagal menghapus master data.", "error");
    } else {
      toast.push("Master data dihapus.", "success");
    }
    setDeleteTarget(null);
    await load();
  }

  async function ensureDefaults() {
    setEnsuring(true);
    const response = await fetch("/api/master-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ensureDefaults" })
    });
    const json = await response.json();
    setEnsuring(false);

    if (!response.ok) {
      toast.push(json.error || "Gagal melengkapi master data.", "error");
      return;
    }

    toast.push("Referensi master data standar sudah lengkap.", "success");
    await load();
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow="Administrasi"
        title="Master Data"
        description="Kelola referensi unit, ruangan, kategori aset, merek, vendor, dan teknisi dalam satu tampilan yang konsisten."
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => void ensureDefaults()} disabled={ensuring}>
              <RefreshCw className={cn("h-4 w-4", ensuring && "animate-spin")} />
              Lengkapi Referensi
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Tambah {currentTab.label}
            </Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {counts.map((item) => {
          const Icon = item.icon;
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => switchTab(item.key)}
              className={cn(
                "rounded-md border bg-white p-3 text-left shadow-panel transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
                active ? "border-emerald-300 bg-emerald-50" : "hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", active ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500")}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-xl font-semibold text-slate-950">{item.count}</div>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{item.label}</div>
              <div className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.description}</div>
            </button>
          );
        })}
      </section>

      <section className="rounded-md border bg-white shadow-panel">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Factory className="h-4 w-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-slate-950">Daftar {currentTab.label}</h3>
              <Badge tone="info">{rows.length} data</Badge>
            </div>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{currentTab.description}</p>
          </div>
          <div className="relative w-full lg:w-[340px]">
            <Search className="pointer-events-none absolute left-3 top-[11px] h-4 w-4 text-slate-400" />
            <Input 
              className="pl-9 pr-9" 
              value={search} 
              onChange={(event) => setSearch(event.target.value)} 
              placeholder={`Cari ${currentTab.label.toLowerCase()}...`} 
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                aria-label="Bersihkan pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? <div className="p-5"><TableSkeleton /></div> : null}
        {!loading && !rows.length ? <div className="p-5"><EmptyPanel title="Data belum tersedia" description="Tambahkan data pertama atau ubah kata kunci pencarian." /></div> : null}
        {!loading && rows.length ? (
          <div className="p-5">
            <MasterTable rows={rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)} tab={tab} onEdit={openEdit} onRemove={(row) => setDeleteTarget(row)} />
            {Math.ceil(rows.length / pageSize) > 1 ? (
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                <div className="text-sm text-slate-500">
                  Menampilkan <span className="font-semibold text-slate-700">{((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, rows.length)}</span> dari <span className="font-semibold text-slate-700">{rows.length}</span> data
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 w-8 p-0 border-slate-200"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="px-3 text-sm font-semibold text-slate-700">
                    {currentPage} <span className="text-slate-400 font-normal">/ {Math.ceil(rows.length / pageSize)}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 w-8 p-0 border-slate-200"
                    disabled={currentPage === Math.ceil(rows.length / pageSize)}
                    onClick={() => setCurrentPage((p) => Math.min(Math.ceil(rows.length / pageSize), p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {formOpen ? (
        <Modal title={`${editing ? "Edit" : "Tambah"} ${currentTab.label}`} onClose={closeForm}>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nama">
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
              </Field>

              {requiresCode(tab) ? (
                <Field label="Kode">
                  <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))} placeholder="Otomatis jika dikosongkan" />
                </Field>
              ) : null}

              {tab === "rooms" ? (
                <Field label="Unit">
                  <Select value={form.unitId} onChange={(event) => setForm((prev) => ({ ...prev, unitId: event.target.value }))} required>
                    <option value="">Pilih unit</option>
                    {data?.units?.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              {tab === "vendors" ? (
                <>
                  <Field label="Kontak">
                    <Input value={form.contact} onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))} />
                  </Field>
                  <Field label="Telepon">
                    <Input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
                  </Field>
                </>
              ) : null}

              {tab === "technicians" ? (
                <>
                  <Field label="Telepon">
                    <Input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
                  </Field>
                  <Field label="Spesialisasi">
                    <Input value={form.specialty} onChange={(event) => setForm((prev) => ({ ...prev, specialty: event.target.value }))} />
                  </Field>
                </>
              ) : null}
            </div>

            {tab === "vendors" ? (
              <Field label="Alamat">
                <Textarea value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
              </Field>
            ) : null}

            {hasDescription(tab) ? (
              <Field label="Catatan">
                <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Opsional" />
              </Field>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeForm}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editing ? "Simpan Perubahan" : `Simpan ${currentTab.label}`}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title={`Hapus ${currentTab.label}`}
          message={
            <div className="flex flex-col gap-3">
              <p>
                Yakin ingin menghapus {currentTab.label.toLowerCase()} <strong className="text-slate-900">&quot;{deleteTarget.name}&quot;</strong>?
              </p>
              <div className="rounded border border-red-200 bg-red-50 p-3 text-red-800 text-xs">
                <strong>PERINGATAN:</strong> Mengingat sifat data master yang saling berelasi dengan tabel aset lainnya, menghapus data ini dapat menyebabkan hilangnya referensi pada aset terkait. Tindakan ini tidak dapat dibatalkan.
              </div>
            </div>
          }
          confirmLabel="Ya, Hapus"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </PageStack>
  );
}

function MasterTable({
  rows,
  tab,
  onEdit,
  onRemove
}: {
  rows: MasterRow[];
  tab: TabKey;
  onEdit: (row: MasterRow) => void;
  onRemove: (row: MasterRow) => void;
}) {
  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Nama & Kode</Th>
            <Th>Informasi Utama</Th>
            <Th>Catatan / Relasi</Th>
            <Th>Pemakaian</Th>
            <Th>Diperbarui</Th>
            <Th className="w-[132px] text-right">Aksi</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const meta = getRowMeta(row, tab);
            return (
              <tr key={row.id}>
                <Td>
                  <div className="font-semibold text-slate-950">{row.name}</div>
                  {row.code ? <div className="mt-1 font-mono text-xs font-bold text-slate-500">{row.code}</div> : null}
                </Td>
                <Td>
                  <div className="font-medium text-slate-800 leading-snug max-w-[200px]">{meta.primary}</div>
                </Td>
                <Td>
                  <div className="max-w-[320px] text-xs leading-5 text-muted-foreground">{meta.secondary}</div>
                </Td>
                <Td>
                  <Badge tone={meta.usageTone}>{meta.usage}</Badge>
                </Td>
                <Td>
                  <div className="text-xs font-bold text-slate-500">{formatShortDate(row.updatedAt || row.createdAt)}</div>
                </Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" className="h-9 w-9 p-0" onClick={() => onEdit(row)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" className="h-9 w-9 p-0 text-red-700 hover:bg-red-50" onClick={() => onRemove(row)} title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </TableWrap>
  );
}

function requiresCode(tab: TabKey) {
  return tab === "units" || tab === "rooms" || tab === "categories" || tab === "segments";
}

function hasDescription(tab: TabKey) {
  return tab === "units" || tab === "rooms" || tab === "categories" || tab === "segments" || tab === "brands";
}

function getRowMeta(row: MasterRow, tab: TabKey) {
  if (tab === "units") {
    return {
      primary: row.description || "Unit kerja aktif.",
      secondary: `${row._count?.rooms || 0} ruangan terhubung.`,
      usage: `${row._count?.assets || 0} aset`,
      usageTone: (row._count?.assets ? "info" : "muted") as "info" | "muted"
    };
  }

  if (tab === "rooms") {
    return {
      primary: row.unit?.name ? `Unit ${row.unit.name}` : "Unit belum dipilih",
      secondary: row.description || "Lokasi detail aset.",
      usage: `${row._count?.assets || 0} aset`,
      usageTone: (row._count?.assets ? "info" : "muted") as "info" | "muted"
    };
  }

  if (tab === "vendors") {
    return {
      primary: row.contact || "Kontak belum diisi",
      secondary: [row.phone, row.email, row.address].filter(Boolean).join(" / ") || "Informasi vendor belum lengkap.",
      usage: `${row._count?.assets || 0} aset / ${row._count?.warranties || 0} garansi`,
      usageTone: (row._count?.assets || row._count?.warranties ? "info" : "muted") as "info" | "muted"
    };
  }

  if (tab === "technicians") {
    return {
      primary: row.specialty || "Spesialisasi belum diisi",
      secondary: row.phone || "Nomor telepon belum diisi.",
      usage: row.isActive === false ? "Nonaktif" : "Aktif",
      usageTone: (row.isActive === false ? "warning" : "success") as "warning" | "success"
    };
  }

  return {
    primary: row.description || (tab === "brands" ? "Brand perangkat." : tab === "segments" ? "Segmen perangkat." : "Kategori aset."),
    secondary: "Referensi aktif untuk modul aset.",
    usage: `${row._count?.assets || 0} aset`,
    usageTone: (row._count?.assets ? "info" : "muted") as "info" | "muted"
  };
}

function formatShortDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
