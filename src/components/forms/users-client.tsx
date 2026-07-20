"use client";

import { Check, LockKeyhole, Pencil, Plus, ShieldCheck, UserCheck, UserRound, UserX, Loader2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { MetricCard } from "@/components/ui/metric-card";
import { Modal } from "@/components/ui/modal";
import { EmptyPanel, PageHeader, PageStack } from "@/components/ui/page";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { MetricSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { humanizeRole } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role?: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type RoleRow = {
  id: string;
  name: string;
};

const emptyForm = { name: "", email: "", password: "", roleId: "" };

export function UsersClient() {
  const { data: session } = useSession();
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  async function load() {
    setLoading(true);
    setError(null);
    setVisibleCount(10);
    const [userRes, masterRes] = await Promise.all([fetch("/api/users"), fetch("/api/master-data")]);
    const masterJson = await masterRes.json().catch(() => ({}));
    setRoles(masterJson.roles || []);

    const userJson = await userRes.json().catch(() => ({}));
    if (!userRes.ok) {
      setUsers([]);
      setError(userJson.error || "Akun ini belum memiliki akses untuk mengelola pengguna.");
      setLoading(false);
      return;
    }

    setUsers(userJson.data || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      roleId: user.roleId || user.role?.id || ""
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const payload = editing && !form.password ? { ...form, password: undefined } : form;
    const response = await fetch("/api/users", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing?.id, ...payload })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      toast.push(json.error || "Gagal menyimpan user.", "error");
      return;
    }

    toast.push(`User berhasil ${editing ? "diperbarui" : "dibuat"}.`, "success");
    closeForm();
    await load();
  }

  async function confirmToggle() {
    if (!toggleTarget) return;
    const response = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: toggleTarget.id, isActive: !toggleTarget.isActive })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.push(json.error || "Gagal memperbarui status user.", "error");
    } else {
      toast.push(`User ${toggleTarget.isActive ? "dinonaktifkan" : "diaktifkan"}.`, "success");
    }
    setToggleTarget(null);
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const response = await fetch(`/api/users?id=${deleteTarget.id}`, {
      method: "DELETE",
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.push(json.error || "Gagal menghapus user.", "error");
    } else {
      toast.push(`User "${deleteTarget.name}" berhasil dihapus.`, "success");
    }
    setDeleteTarget(null);
    await load();
  }

  const stats = useMemo(() => {
    const active = users.filter((user) => user.isActive).length;
    const inactive = users.length - active;
    return { total: users.length, active, inactive, roles: roles.length };
  }, [roles.length, users]);

  return (
    <PageStack>
      <PageHeader
        eyebrow="Administrasi"
        title="Pengguna dan Hak Akses"
        description="Kelola akun, role akses, status aktif, dan perubahan kredensial pengguna ASCIT."
        actions={
          <Button type="button" onClick={openCreate} disabled={Boolean(error)}>
            <Plus className="h-4 w-4" />
            Tambah Pengguna
          </Button>
        }
      />

      {loading ? (
        <MetricSkeleton />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={UserRound} label="Total user" value={stats.total} hint="Akun terdaftar" layout="horizontal" />
          <MetricCard icon={UserCheck} label="Aktif" value={stats.active} tone="success" hint="Bisa login" layout="horizontal" />
          <MetricCard icon={UserX} label="Nonaktif" value={stats.inactive} tone={stats.inactive ? "warning" : "success"} hint="Akses ditutup" layout="horizontal" />
          <MetricCard icon={ShieldCheck} label="Role" value={stats.roles} hint="Hak akses tersedia" layout="horizontal" />
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-panel">
        <div className="flex flex-col gap-2 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-emerald-700" />
              <h3 className="text-base font-bold text-slate-950">Daftar Pengguna</h3>
              <Badge tone="info">{users.length} akun</Badge>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Status akun bisa diaktifkan atau dinonaktifkan tanpa menghapus histori audit.</p>
          </div>
        </div>
        <div className="p-5">
          {loading ? <TableSkeleton /> : null}
          {!loading && error ? <EmptyPanel title="Akses pengguna dibatasi" description={error} /> : null}
          {!loading && !error && !users.length ? <EmptyPanel title="Belum ada pengguna" description="Tambahkan pengguna pertama untuk sistem." /> : null}
          {!loading && !error && users.length ? (
            <>
              <UsersTable
                users={users.slice(0, visibleCount)}
                onEdit={openEdit}
              />
              {visibleCount < users.length ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                  >
                    Tampilkan Lebih Banyak ({users.length - visibleCount} item tersisa)
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      {toggleTarget ? (
        <ConfirmDialog
          title={toggleTarget.isActive ? "Nonaktifkan Pengguna" : "Aktifkan Pengguna"}
          message={`Yakin ingin ${toggleTarget.isActive ? "menonaktifkan" : "mengaktifkan"} akun "${toggleTarget.name}"?`}
          confirmLabel={toggleTarget.isActive ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
          variant={toggleTarget.isActive ? "warning" : "info"}
          onConfirm={confirmToggle}
          onCancel={() => setToggleTarget(null)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="Hapus Pengguna"
          message={`Yakin ingin menghapus akun "${deleteTarget.name}"? Semua histori yang berkaitan dengan pengguna ini akan dilepaskan keterkaitannya.`}
          confirmLabel="Ya, Hapus"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {formOpen ? (
        <Modal title={`${editing ? "Edit" : "Tambah"} Pengguna`} onClose={closeForm}>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nama">
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required />
              </Field>
              <Field label={editing ? "Password Baru" : "Password"}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  required={!editing}
                  placeholder={editing ? "Kosongkan jika tidak diganti" : ""}
                />
                {form.password && !(form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password)) && (
                  <p className="mt-1 text-xs text-red-600">
                    Password minimal 8 karakter, wajib mengandung huruf dan angka.
                  </p>
                )}
              </Field>
              <Field label="Role">
                <Select
                  value={form.roleId}
                  onChange={(event) => setForm((prev) => ({ ...prev, roleId: event.target.value }))}
                  required
                  disabled={editing?.id === session?.user?.id}
                >
                  <option value="">Pilih role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {humanizeRole(role.name)}
                    </option>
                  ))}
                </Select>
                {editing?.id === session?.user?.id && (
                  <p className="mt-1 text-[11px] text-amber-600 leading-normal">
                    Role Anda sendiri tidak dapat diubah untuk mencegah hilangnya hak akses admin.
                  </p>
                )}
              </Field>
            </div>

            {editing ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-800">Pengaturan akun</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">Atur akses login atau hapus akun ini. Tindakan akan meminta konfirmasi terlebih dahulu.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className={editing.isActive ? "text-amber-700 hover:border-amber-200 hover:bg-amber-50" : "text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50"}
                    disabled={editing.id === session?.user?.id}
                    onClick={() => {
                      const target = editing;
                      closeForm();
                      setToggleTarget(target);
                    }}
                  >
                    <UserX className="h-4 w-4" />
                    {editing.isActive ? "Nonaktifkan Pengguna" : "Aktifkan Pengguna"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    disabled={editing.id === session?.user?.id}
                    onClick={() => {
                      const target = editing;
                      closeForm();
                      setDeleteTarget(target);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus Pengguna
                  </Button>
                </div>
                {editing.id === session?.user?.id ? (
                  <p className="mt-2 text-[11px] font-medium text-amber-700">Akun Anda sendiri tidak dapat dinonaktifkan atau dihapus.</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeForm}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving || (Boolean(form.password) && !(form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password)))}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editing ? "Simpan Perubahan" : "Simpan Pengguna"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </PageStack>
  );
}

function UsersTable({
  users,
  onEdit
}: {
  users: UserRow[];
  onEdit: (user: UserRow) => void;
}) {
  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Nama</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Diperbarui</Th>
            <Th className="w-[72px] text-center">Aksi</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <Td>
                <div className="font-semibold text-slate-950">{user.name}</div>
              </Td>
              <Td>
                <div className="break-words text-sm font-semibold text-slate-700">{user.email}</div>
              </Td>
              <Td>
                <Badge tone="info">{humanizeRole(user.role?.name)}</Badge>
              </Td>
              <Td>
                <Badge tone={user.isActive ? "success" : "warning"}>{user.isActive ? "Aktif" : "Nonaktif"}</Badge>
              </Td>
              <Td>
                <div className="text-xs font-bold text-slate-500">{formatShortDate(user.updatedAt || user.createdAt)}</div>
              </Td>
              <Td>
                <div className="flex justify-center">
                  <Button type="button" variant="outline" className="h-9 w-9 p-0" onClick={() => onEdit(user)} title={`Edit ${user.name}`} aria-label={`Edit ${user.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}

function formatShortDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
