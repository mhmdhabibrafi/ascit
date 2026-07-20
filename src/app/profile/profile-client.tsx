"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { PageHeader, PageStack } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import { humanizeRole } from "@/lib/utils";

export default function ProfileClient({ user }: { user: { name: string; email: string; role: string } }) {
  const toast = useToast();
  const router = useRouter();
  const { update } = useSession();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const passwordValid = !password || (password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password));

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      toast.push("Nama dan email wajib diisi.", "error");
      return;
    }
    if (!passwordValid) {
      toast.push("Password minimal 8 karakter, harus mengandung huruf dan angka.", "error");
      return;
    }
    if (password && !currentPassword) {
      toast.push("Password lama wajib diisi untuk mengubah password.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password || undefined,
          currentPassword: password ? currentPassword : undefined
        })
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal memperbarui profil.");
      }

      toast.push("Profil berhasil diperbarui.", "success");
      setPassword("");
      setCurrentPassword("");
      await update();
      router.refresh();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Gagal memperbarui profil.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageStack>
      <PageHeader
        eyebrow="Akun"
        title="Profil Saya"
        description="Kelola informasi akun dan kata sandi Anda."
      />

      <Card>
        <CardHeader>
          <CardTitle>Edit Profil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password Lama">
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Wajib diisi saat ganti password"
                disabled={!password}
              />
            </Field>
            <Field label="Password Baru">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kosongkan jika tidak diganti"
              />
              {password && !passwordValid && (
                <p className="mt-1 text-xs text-red-600">
                  Password minimal 8 karakter, wajib mengandung huruf dan angka.
                </p>
              )}
            </Field>
            <Field label="Role">
              <Input
                value={humanizeRole(user.role)}
                disabled
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              <X className="h-4 w-4" />
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !passwordValid}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Simpan Perubahan
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageStack>
  );
}
