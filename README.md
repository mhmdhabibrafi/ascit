# ASCIT

**Asset Care Information Technology System**

ASCIT adalah sistem informasi manajemen aset teknologi informasi berbasis web untuk RS Awal Bros Panam. Sistem ini mengelola data aset IT, QR Code, lifecycle aset, mutasi, maintenance, perbaikan, garansi, monitoring umur aset, laporan, audit log, dan AI Decision Support.

Tagline: **AI Powered IT Asset Management for Hospital Operations**

## Catatan Data

ASCIT hanya menyimpan data aset teknologi informasi. Sistem ini tidak menggunakan data pasien, rekam medis, diagnosis, tindakan medis, resep, billing, atau data klinis.

## Fitur Utama

- Login credentials dengan hash bcrypt.
- Role pengguna: SUPER_ADMIN, ADMIN_IT, STAF_IT, KEPALA_IT, MANAJEMEN.
- Dashboard statistik dan grafik Recharts.
- CRUD Data Aset IT dengan soft delete.
- QR Code aset dan cetak QR.
- Scan QR simulasi dari kode aset atau token QR.
- Mutasi aset dengan approval Kepala IT/Admin.
- Maintenance aset dengan checklist komputer dan jaringan.
- Perbaikan aset, biaya, status akhir, dan rekomendasi penggantian.
- Monitoring garansi otomatis: aktif, hampir habis, habis.
- Monitoring umur aset: kurang dari 3 tahun, 3 sampai 5 tahun, lebih dari 5 tahun.
- AI Decision Support berbasis rule engine dan OpenModel API server-side.
- Rekomendasi penggantian aset.
- Laporan, export CSV, dan print.
- Master data unit, ruangan, kategori, merek, vendor, teknisi.
- Pengguna dan hak akses.
- Audit log aktivitas penting.

## Stack Teknologi

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- Komponen UI custom bergaya ShadCN
- NextAuth Credentials Provider
- bcryptjs
- Recharts
- qrcode
- OpenModel API

## Cara Install

```bash
npm install
```

Salin file env:

```bash
copy .env.example .env
```

Isi `.env`:

```env
DATABASE_URL="postgresql://ascit_app:AscitLocal2026@localhost:5432/ascit_db?schema=public"
FLYENV_POSTGRES_ADMIN_USER="root"
FLYENV_POSTGRES_BIN_DIR="C:\\Program Files\\FlyEnv-Data\\app\\postgresql-18.4\\pgsql\\bin"
FLYENV_POSTGRES_DATA_DIR="C:\\FlyENV\\FlyEnv-Data\\server\\postgresql\\postgresql18"
NEXTAUTH_SECRET="ganti-dengan-secret-acak-minimal-32-karakter"
NEXTAUTH_URL="http://localhost:3000"
SEED_ADMIN_PASSWORD="ganti-password-admin-kuat-2026"
SEED_STAF_PASSWORD="ganti-password-staf-kuat-2026"
SEED_KEPALA_PASSWORD="ganti-password-kepala-kuat-2026"
SEED_MANAJEMEN_PASSWORD="ganti-password-manajemen-kuat-2026"
OPENMODEL_API_KEY="isi_api_key_openmodel_di_sini"
OPENMODEL_BASE_URL="https://api.openmodel.ai/v1"
OPENMODEL_MODEL="deepseek-v4-flash"
OPENMODEL_ANTHROPIC_VERSION="2023-06-01"
OPENMODEL_MAX_TOKENS="1024"
```

## Setup Database

ASCIT memakai konfigurasi database dari `.env`, terutama `DATABASE_URL`.

Database lokal dijalankan lewat PostgreSQL FlyEnv. Pastikan FlyEnv sudah terpasang, lalu jalankan:

```powershell
npm run db:setup
```

Script ini akan start PostgreSQL FlyEnv, membuat role/database dari `.env`, menjalankan migrasi Prisma, lalu seed role, user awal, master data, 25 aset IT dummy, mutasi, maintenance, perbaikan, warranty, audit log, dan rekomendasi AI dummy. Password user awal wajib diisi lewat `SEED_ADMIN_PASSWORD`, `SEED_STAF_PASSWORD`, `SEED_KEPALA_PASSWORD`, dan `SEED_MANAJEMEN_PASSWORD`.

Cek koneksi database dari terminal:

```powershell
npm run flyenv:db:status
npm run db:health
```

Untuk mengecek koneksi database dari aplikasi, login ke ASCIT lalu buka menu **Pengaturan**. Panel **Status Database** menjalankan query langsung ke PostgreSQL dan menampilkan jumlah aset, pengguna, unit, serta audit log.

## Menjalankan Aplikasi

Untuk pemakaian biasa atau demo, jalankan mode production lokal agar lebih cepat:

```powershell
npm run build
npm run start:flyenv
```

Buka:

```text
http://localhost:3000
```

Jika sedang coding dan butuh hot reload, pakai mode development:

```powershell
npm run dev:flyenv
```

Build production:

```bash
npm run build
npm run start
```

## Akun Login Awal

Seed membuat akun awal dengan email `admin@ascit.local`, `staf@ascit.local`, `kepala@ascit.local`, dan `manajemen@ascit.local`. Password tidak disimpan di dokumentasi; gunakan nilai kuat yang sudah Anda set di `.env`.

## OpenModel API

AI Decision Support menjalankan rule engine internal terlebih dahulu. OpenModel API hanya dipakai untuk membuat penjelasan natural language dalam bahasa Indonesia formal.

Endpoint Messages API yang dipanggil server:

```text
POST ${OPENMODEL_BASE_URL}/messages
```

Header:

```text
Authorization: Bearer ${OPENMODEL_API_KEY}
anthropic-version: ${OPENMODEL_ANTHROPIC_VERSION}
Content-Type: application/json
```

Body memakai format Anthropic Messages:

```json
{
  "model": "deepseek-v4-flash",
  "max_tokens": 1024,
  "system": "Instruksi AI Decision Support ASCIT",
  "messages": [{ "role": "user", "content": "Data aset dan skor rule engine" }],
  "temperature": 0.2
}
```

Jika `OPENMODEL_API_KEY` belum diisi atau API gagal, ASCIT tetap menampilkan hasil rule engine dan menyimpan catatan bahwa penjelasan OpenModel gagal dibuat.

## Cara Mencoba AI Decision Support

1. Login sebagai `admin@ascit.local` atau `kepala@ascit.local`.
2. Buka menu **AI Decision Support**.
3. Pilih tahun, unit, atau kategori jika perlu.
4. Klik **Jalankan Analisis AI**.
5. Lihat skor, status rekomendasi, alasan, dan detail aset.
6. Export laporan AI melalui tombol CSV.

## Troubleshooting Database

Jika aplikasi menampilkan error koneksi database:

1. Pastikan FlyEnv PostgreSQL berjalan.
2. Pastikan database `ascit_db` sudah dibuat lewat `npm run db:setup`.
3. Pastikan `DATABASE_URL` di `.env` benar.
4. Jalankan ulang:

```powershell
npm run db:setup
npm run dev:flyenv
```

Jika FlyEnv menampilkan log seperti `could not bind IPv4 address "127.0.0.1"` atau `could not create any TCP/IP sockets`, cek apakah PostgreSQL lain sudah berjalan di port `5432`:

```powershell
netstat -ano | Select-String ":5432"
```

Gunakan satu server PostgreSQL saja untuk port `5432`. Untuk proyek ini, gunakan FlyEnv sebagai server utama dan jangan nyalakan service PostgreSQL Windows bersamaan.

## Script Package

```bash
npm run dev
npm run dev:flyenv
npm run build
npm run start
npm run start:flyenv
npm run serve:flyenv
npm run lint
npm run db:setup
npm run db:health
npm run flyenv:db:start
npm run flyenv:db:status
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```
