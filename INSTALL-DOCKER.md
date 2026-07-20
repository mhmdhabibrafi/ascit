# Panduan Instalasi ASCIT via Docker

Panduan ini ditujukan bagi Administrator IT di setiap cabang rumah sakit untuk menjalankan sistem **ASCIT (Asset Care Information Technology System)** di server lokal (*on-premise*) masing-masing secara mudah dan cepat menggunakan Docker.

## Prasyarat Server
Sebelum memulai instalasi, pastikan server Anda (Linux/Windows) telah memenuhi kebutuhan berikut:
1. **Docker Engine**: Telah terinstal dan berjalan. (Versi 20.10.x atau lebih baru).
2. **Docker Compose**: Telah terinstal (Versi V2 direkomendasikan).
3. **RAM Minimum**: 4 GB (disarankan 8 GB).
4. Akses internet untuk mengunduh *image* (*pull* dari Docker Hub atau build lokal).

## Langkah 1: Persiapan File
Anda akan menerima paket aplikasi ASCIT (misalnya `ascit.tar.gz` atau di-clone dari repository).
Ekstrak atau *clone* aplikasi ke direktori server Anda, contohnya: `/opt/ascit`.

```bash
mkdir -p /opt/ascit
cd /opt/ascit
# Jika menerima file ascit.tar.gz
tar -xzvf ascit.tar.gz
```

Pastikan struktur direktori utama memiliki file berikut:
- `docker-compose.yml`
- `Dockerfile`
- `package.json`
- Folder `prisma`, `src`, `public`

## Langkah 2: Konfigurasi Environment (`.env`)
Salin template konfigurasi ke file `.env` yang sesungguhnya.

```bash
cp .env.example .env
```

Buka file `.env` dengan editor teks favorit Anda (misal `nano` atau `vim`) dan sesuaikan beberapa nilai berikut:
```env
# Koneksi Database (Biarkan default jika memakai docker-compose bawaan)
DATABASE_URL="postgresql://ascit_app:AscitLocal2026@ascit-db:5432/ascit_db?schema=public"

# Keamanan (UBAH DENGAN SECRET ACAK)
# Anda bisa menghasilkan string acak dengan perintah: openssl rand -base64 32
NEXTAUTH_SECRET="masukkan-string-acak-yang-sangat-panjang-di-sini"
NEXTAUTH_URL="http://ip-server-anda:3000"

# Password Default (PENTING! Ganti sebelum instalasi)
SEED_ADMIN_PASSWORD="PasswordAdminKuat123!"
SEED_STAF_PASSWORD="PasswordStafKuat123!"
SEED_KEPALA_PASSWORD="PasswordKepalaKuat123!"
SEED_MANAJEMEN_PASSWORD="PasswordManajemenKuat123!"

# Kunci API AI (Dapatkan dari console.groq.com)
GROQ_API_KEY="isi_api_key_disini"
```

## Langkah 3: Build & Jalankan Kontainer
Gunakan Docker Compose untuk mem-*build* aplikasi (mode *standalone* yang sangat ringan) dan langsung menjalankan *database* beserta aplikasinya di latar belakang.

```bash
docker-compose up -d --build
```

**Proses ini akan melakukan hal berikut:**
1. Mengunduh *image* PostgreSQL.
2. Mem-*build* aplikasi ASCIT via Node.js (*multi-stage build* untuk ukuran kecil).
3. Menjalankan *database* dan kemudian aplikasi secara otomatis.
4. Menjalankan migrasi struktur *database* Prisma secara otomatis pada saat aplikasi ASCIT menyala (*container startup*).

## Langkah 4: Memasukkan Data Awal (Seeding) - Hanya Pertama Kali
Setelah *container* berhasil berjalan, Anda perlu menjalankan *seed* untuk memasukkan akun awal (Super Admin, dll) serta data master (Unit, Kategori, Status) ke dalam database baru.

Jalankan perintah berikut di terminal server:
```bash
docker exec -it ascit-app npx prisma db seed
```

*Catatan: Pastikan perintah di atas menghasilkan output 'Database seeded successfully'.*

## Langkah 5: Akses Sistem
Sistem kini dapat diakses melalui browser komputer mana pun dalam satu jaringan lokal.
Buka web browser dan masukkan alamat:

```text
http://<IP-SERVER-CABANG>:3000
```
(Contoh: `http://192.168.1.100:3000`)

### Login Awal:
Gunakan akun yang telah terbuat secara otomatis:
- **Admin**: `admin@ascit.local` (Password sesuai nilai `SEED_ADMIN_PASSWORD` di `.env`)
- **Staf IT**: `staf@ascit.local` (Password sesuai nilai `SEED_STAF_PASSWORD` di `.env`)

---

## Perintah Perawatan (Maintenance)

- **Melihat Log Aplikasi**:
  ```bash
  docker-compose logs -f ascit-app
  ```
- **Mematikan Sistem Sementara**:
  ```bash
  docker-compose stop
  ```
- **Menyalakan Kembali**:
  ```bash
  docker-compose start
  ```
- **Update/Restart Bersih (misal jika ada file .env yang diubah)**:
  ```bash
  docker-compose down
  docker-compose up -d
  ```

## Troubleshooting Umum
- **Gagal Build (Kekurangan Memory)**: Docker build Node.js kadang memakan RAM besar. Jika build macet atau mati, tambahkan *swap file* sebesar 4GB pada server Anda.
- **Port Bentrok**: Jika `localhost:3000` sudah dipakai oleh aplikasi lain, Anda dapat mengubah konfigurasi port di `docker-compose.yml` pada bagian `ports: - "3000:3000"` menjadi misalnya `ports: - "8080:3000"`. Jangan lupa sesuaikan `NEXTAUTH_URL` di `.env` menjadi port `8080`.
