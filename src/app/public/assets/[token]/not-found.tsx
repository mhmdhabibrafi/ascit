import Image from "next/image";
import Link from "next/link";
import { SearchX } from "lucide-react";

export default function PublicAssetNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-200/50 sm:p-10">
        <div className="mx-auto flex items-center justify-center gap-3">
          <Image src="/images/awal-bros-logo.png" alt="Logo Awal Bros" width={48} height={48} />
          <Image src="/images/rs-awal-bros-logo.png" alt="RS Awal Bros" width={170} height={24} className="h-6 w-auto" />
        </div>
        <div className="mx-auto mt-7 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600"><SearchX className="h-7 w-7" /></div>
        <h1 className="mt-5 text-2xl font-black text-slate-950">Aset tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">QR tidak valid, aset telah dihapus, atau data belum tersedia. Periksa kembali label QR atau hubungi tim IT.</p>
        <Link href="/login" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Login ke ASCIT</Link>
      </section>
    </main>
  );
}
