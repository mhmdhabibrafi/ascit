"use client";

import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { GoogleIcon } from "@/components/ui/google-icon";
import { useToast } from "@/components/ui/toast";
import { hospitalBrand, systemBrand } from "@/lib/branding";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [router, status]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });
    setLoading(false);
    if (result?.ok) {
      toast.push("Login berhasil. Mengalihkan ke dashboard.", "success");
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    toast.push("Email atau password tidak sesuai.", "error");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-emerald-50/20 px-4 py-10 overflow-hidden">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-emerald-200/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-100/20 blur-2xl" />
      </div>

      <Card className="relative w-full max-w-[430px] p-7 sm:p-8 shadow-2xl border-slate-200/80 animate-page-in">
        <div className="mb-7 mt-2 flex flex-col items-center text-center">
          <img src="/images/rs-awal-bros-logo.png" alt="RS Awal Bros" className="mb-4 h-12 w-auto object-contain" />
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{systemBrand.name}</h1>
          <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-600">{systemBrand.subtitle}</p>
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <Field label="Username">
            <Input type="text" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="admin" />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="••••••••" className="pr-10" />
              <button
                type="button"
                className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                <GoogleIcon name={showPassword ? "visibility_off" : "visibility"} className="h-4.5 w-4.5" />
              </button>
            </div>
          </Field>
          <Button type="submit" disabled={loading} className="mt-1 h-11">
            {loading ? <GoogleIcon name="progress_activity" className="animate-spin" /> : <GoogleIcon name="login" />}
            {loading ? "Memproses..." : "Login ke Sistem"}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-[11px] font-medium text-slate-400">
          © {new Date().getFullYear()} {systemBrand.name}
        </div>
      </Card>
    </main>
  );
}
