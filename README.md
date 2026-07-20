# ASCIT

**Asset Care Information Technology System**

ASCIT adalah sistem informasi manajemen aset teknologi informasi berbasis web untuk RS Awal Bros Panam. Sistem ini membantu tim IT mengelola inventaris, QR Code, siklus hidup aset, mutasi, pemeliharaan, perbaikan, garansi, laporan, audit log, dan rekomendasi penggantian aset.

> **AI Powered IT Asset Management for Hospital Operations**

## Batasan Data

ASCIT hanya menyimpan data aset teknologi informasi. Sistem ini tidak dirancang untuk menyimpan data pasien, rekam medis, diagnosis, tindakan medis, resep, billing, atau data klinis lainnya.

## Fitur Utama

- Login berbasis credentials dengan password bcrypt.
- Hak akses `SUPER_ADMIN`, `ADMIN_IT`, `STAF_IT`, `KEPALA_IT`, dan `MANAJEMEN`.
- Dashboard statistik, grafik, dan monitoring kondisi aset.
- Pengelolaan aset IT dengan soft delete.
- Pembuatan, pencetakan, dan pemindaian QR Code aset.
- Mutasi aset dan alur persetujuan.
- Jadwal maintenance dan catatan perbaikan.
- Monitoring garansi dan umur aset.
- Rule engine untuk rekomendasi penggantian aset.
- Penjelasan berbantuan AI yang dapat diaktifkan secara opsional.
- Laporan, ekspor CSV, dan print.
- Master data unit, ruangan, kategori, merek, vendor, dan teknisi.
- Manajemen pengguna dan audit log.

## Teknologi

- Next.js App Router dan TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- NextAuth Credentials Provider
- Recharts dan QRCode
- Docker Engine dan Docker Compose

## Kebutuhan Sistem

Untuk deployment portable:

- Ubuntu Server 22.04/24.04 atau WSL2 Ubuntu
- Docker Engine
- Docker Compose plugin (`docker compose`)
- Git, jika mengambil source langsung dari repository

## Quick Start dengan Docker

Clone repository:

```bash
git clone https://github.com/mhmdhabibrafi/ascit.git
cd ascit
```

Siapkan konfigurasi:

```bash
cp .env.example .env
nano .env
chmod 600 .env
```

Nilai berikut wajib diganti sebelum penggunaan produksi:

```env
POSTGRES_PASSWORD=password-database-yang-kuat
NEXTAUTH_SECRET=secret-acak-minimal-32-karakter
```

Generate secret dengan:

```bash
openssl rand -base64 32
```

Jalankan aplikasi dan database:

```bash
docker compose up -d --build
```

Periksa status:

```bash
docker compose ps
docker compose logs --tail=100 ascit-app
```

## Inisialisasi Data Demo

Migration dijalankan otomatis saat container aplikasi dimulai. Pada instalasi baru, jalankan seed satu kali untuk membuat role, akun awal, master data, aset contoh, dan data simulasi:

```bash
docker compose run --rm \
  -e ALLOW_DESTRUCTIVE_SEED=true \
  ascit-app npx tsx prisma/seed.ts
```

> **Peringatan:** seed bersifat destruktif dan menghapus data aplikasi yang sudah ada. Jangan menjalankannya ulang pada database produksi yang telah berisi data.

## Akun Demo

Nilai default `.env.example` membuat akun berikut:

| Peran | Email | Password demo |
|---|---|---|
| Admin IT | `admin@ascit.local` | `ASCIT@123` |
| Staf IT | `staf@ascit.local` | `ASCIT@123` |
| Kepala IT | `kepala@ascit.local` | `ASCIT@123` |
| Manajemen | `manajemen@ascit.local` | `ASCIT@123` |

Password tersebut hanya untuk demo lokal. Ganti semua password sebelum penggunaan produksi.

## Konfigurasi Akses

### WSL atau komputer yang sama

Gunakan:

```env
APP_BIND_IP=127.0.0.1
APP_PORT=3000
NEXTAUTH_URL=http://ascit.local:3000
```

Tambahkan ke file `hosts` Windows menggunakan PowerShell Administrator:

```powershell
Add-Content -Path "$env:windir\System32\drivers\etc\hosts" -Value "`n127.0.0.1 ascit.local"
ipconfig /flushdns
```

Buka:

```text
http://ascit.local:3000
```

### Ubuntu Server dalam jaringan lokal

Gunakan alamat IP statis server, misalnya `192.168.1.50`:

```env
APP_BIND_IP=0.0.0.0
APP_PORT=3000
NEXTAUTH_URL=http://192.168.1.50:3000
```

Buka dari komputer di jaringan yang sama:

```text
http://192.168.1.50:3000
```

Jangan melakukan port forwarding ke internet tanpa reverse proxy, HTTPS, autentikasi yang kuat, dan peninjauan keamanan.

## Konfigurasi AI Opsional

ASCIT tetap dapat digunakan tanpa API AI. Rule engine internal tetap menghasilkan skor dan rekomendasi.

Tanpa AI:

```env
GROQ_API_KEY=
GROQ_BASE_URL=
GROQ_MODEL=
```

Untuk provider OpenAI-compatible:

```env
GROQ_API_KEY=api-key-provider
GROQ_BASE_URL=https://alamat-provider/v1
GROQ_MODEL=nama-model
```

Contoh Ollama pada komputer lain dalam jaringan:

```env
GROQ_API_KEY=ollama
GROQ_BASE_URL=http://192.168.1.60:11434/v1
GROQ_MODEL=llama3.2
```

Setelah mengubah `.env`, terapkan konfigurasi baru:

```bash
docker compose up -d --force-recreate ascit-app
```

## Operasional Docker

Melihat status:

```bash
docker compose ps
```

Mengikuti log aplikasi:

```bash
docker compose logs -f --tail=100 ascit-app
```

Restart:

```bash
docker compose restart
```

Menghentikan dan menjalankan kembali:

```bash
docker compose stop
docker compose start
```

Update dari GitHub:

```bash
git pull
docker compose up -d --build
```

Jangan gunakan perintah berikut pada sistem yang telah berisi data:

```bash
docker compose down -v
```

Opsi `-v` menghapus volume database.

## Backup PostgreSQL

Buat folder backup:

```bash
mkdir -p backups
chmod 700 backups
```

Backup database:

```bash
docker compose exec -T ascit-db \
  pg_dump -U ascit -d ascit \
  > "backups/ascit-$(date +%F-%H%M).sql"
```

Jika nama database atau user di `.env` diubah, sesuaikan argumen `-U` dan `-d`.

Restore database harus dilakukan dengan hati-hati dan idealnya diuji terlebih dahulu pada environment terpisah.

## Troubleshooting

### Aplikasi tidak dapat dibuka

```bash
docker compose ps
docker compose logs --tail=200 ascit-app
curl http://127.0.0.1:3000/api/health
```

Pastikan `APP_BIND_IP`, `APP_PORT`, firewall, dan IP server sudah benar.

### Login ditolak pada instalasi baru

Pastikan seed telah dijalankan:

```bash
docker compose run --rm \
  -e ALLOW_DESTRUCTIVE_SEED=true \
  ascit-app npx tsx prisma/seed.ts
```

Jalankan hanya untuk database baru atau data demo karena seed menghapus data lama.

### Database tidak sehat

```bash
docker compose logs --tail=200 ascit-db
docker compose restart ascit-db
```

### Perubahan `.env` belum terbaca

```bash
docker compose up -d --force-recreate
```

## Development Lokal Tanpa Docker

```bash
npm ci
npx prisma generate
npm run dev
```

Development tanpa Docker memerlukan PostgreSQL dan `DATABASE_URL` yang telah dikonfigurasi sendiri. Workflow FlyEnv bersifat opsional dan khusus lingkungan pengembangan Windows.

## Keamanan

- Jangan commit `.env`, API key, secret, password produksi, atau backup database.
- Commit hanya `.env.example` tanpa secret asli.
- Gunakan password unik dan `NEXTAUTH_SECRET` acak.
- Batasi port aplikasi menggunakan firewall dan jaringan internal.
- Simpan backup pada perangkat atau server terpisah.
- Ganti semua akun demo sebelum sistem digunakan secara operasional.

## Lisensi dan Penggunaan

Tambahkan informasi lisensi serta kebijakan penggunaan internal organisasi sebelum distribusi lebih lanjut.
