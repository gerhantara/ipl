# Sistem IPL (Iuran Pemeliharaan Lingkungan)

Proyek ini adalah aplikasi web berbasis Next.js untuk mengelola Iuran Pemeliharaan Lingkungan (IPL) di lingkungan perumahan (RT/RW).

## Memulai

Pertama, salin file `.env.example` menjadi `.env.local` dan isi variabel yang dibutuhkan.

```bash
cp .env.example .env.local
```

Contoh isi file `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyxxxxxxxxxx
```

Untuk pengembangan lokal lama yang masih memakai `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`, aplikasi juga masih akan membacanya sebagai fallback, tetapi sebaiknya pindahkan ke `SUPABASE_SERVICE_ROLE_KEY`.

Selanjutnya, jalankan server pengembangan:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Buka [http://localhost:3000](http://localhost:3000) dengan browser anda untuk mulai mencobas.


---

## Dokumentasi Penggunaan Aplikasi

Aplikasi ini dirancang untuk mempermudah pengelolaan iuran warga, baik dari sisi admin (pengurus) maupun dari sisi warga. Aplikasi ini memiliki dua peran utama: **Admin** dan **Warga**.

### 1. Halaman Utama & Peran Pengguna

Setelah login, pengguna akan diarahkan ke halaman **Dashboard** yang tampilannya disesuaikan berdasarkan peran pengguna.

*   **Admin**: Memiliki akses penuh ke semua fitur manajemen, termasuk keuangan, data warga, verifikasi, dan pengaturan lainnya.
*   **Warga**: Memiliki akses terbatas untuk melihat riwayat pembayaran, melakukan pembayaran, dan melihat profil pribadi.

### 2. Fitur untuk Admin

Admin memiliki hak akses ke semua fitur yang ada di dalam sistem.

#### a. Dashboard (`/dashboard`)

Halaman utama untuk admin yang memberikan ringkasan komprehensif kondisi keuangan dan status iuran.

*   **Kartu Statistik Utama**:
    *   **Saldo Kas**: Total pemasukan dikurangi total pengeluaran.
    *   **Total Pemasukan**: Akumulasi semua pembayaran yang telah diverifikasi.
    *   **Total Pengeluaran**: Akumulasi semua pencatatan pengeluaran.
    *   **Perlu Verifikasi**: Jumlah pembayaran dari warga yang masih menunggu untuk diverifikasi oleh admin.
*   **Grafik Keuangan**: Visualisasi perbandingan antara **Pemasukan** dan **Pengeluaran** selama 6 bulan terakhir.
*   **Status Pembayaran Warga**: Tabel matriks yang menunjukkan status pembayaran iuran bulanan dari semua warga untuk 12 bulan terakhir.

#### b. Manajemen User (`/dashboard/users`)

Halaman untuk mengelola semua data pengguna yang terdaftar di sistem.

*   **Daftar User**: Menampilkan seluruh pengguna (admin dan warga).
*   **Pencarian**: Memfilter daftar pengguna berdasarkan nama, email, atau blok rumah.
*   **Tambah User**: Admin dapat menambahkan pengguna baru secara manual.
*   **Edit User**: Mengubah data profil pengguna.
*   **Ubah Password**: Mengganti password untuk pengguna tertentu.
*   **Nonaktifkan User**: Menonaktifkan akun pengguna.
*   **Upload Excel/CSV**: Fitur untuk menambahkan banyak pengguna sekaligus dengan mengunggah file.

#### c. Verifikasi Pembayaran (`/dashboard/verifikasi`)

Halaman ini berfungsi untuk mengelola pembayaran yang **sudah terverifikasi**. Admin dapat membatalkan pembayaran jika ditemukan kesalahan.

*   **Pembayaran Aktif**: Menampilkan daftar semua pembayaran yang statusnya sudah `verified`.
*   **Pembayaran Dibatalkan**: Menampilkan daftar pembayaran yang telah dibatalkan (`rejected`).

#### d. Pengeluaran (`/dashboard/pengeluaran`)

Fitur untuk mencatat dan melacak semua pengeluaran kas.

*   **Tambah Pengeluaran**: Admin dapat mencatat pengeluaran baru.
*   **Daftar Pengeluaran**: Menampilkan semua riwayat pengeluaran.

#### e. Jenis Iuran (`/dashboard/jenis-iuran`)

Halaman untuk mengelola berbagai jenis iuran yang berlaku.

*   **Tambah/Edit Iuran**: Admin dapat membuat atau mengubah jenis iuran.
*   **Daftar Iuran**: Menampilkan semua jenis iuran yang ada.

#### f. Rekening (`/dashboard/rekening`)

Mengelola rekening bank tujuan pembayaran iuran.

*   **Tambah/Edit Rekening**: Admin dapat mengatur rekening bank.
*   **Daftar Rekening**: Menampilkan semua rekening yang terdaftar.

### 3. Fitur untuk Warga

Warga memiliki akses yang lebih terbatas, fokus pada aktivitas pembayaran dan melihat histori pribadi.

#### a. Dashboard (`/dashboard`)

Dashboard untuk warga menampilkan ringkasan yang relevan bagi mereka.

*   **Kartu Statistik**:
    *   **Total Dibayar**: Total nominal dari semua pembayaran yang telah diverifikasi.
    *   **Pending**: Jumlah pembayaran yang sudah di-submit tetapi masih menunggu verifikasi dari admin.
*   **Status Pembayaran Warga**: Sama seperti admin, warga juga dapat melihat tabel matriks pembayaran seluruh warga untuk transparansi.

#### b. Bayar IPL (`/dashboard/bayar`)

Halaman bagi warga untuk melakukan pembayaran iuran.

#### c. Riwayat Pembayaran (`/dashboard/riwayat`)

Halaman untuk melihat seluruh riwayat transaksi pembayaran yang pernah dilakukan oleh warga tersebut.

#### d. Profil (`/dashboard/profile`)

Halaman bagi warga untuk melihat dan mengubah data profil pribadi mereka.

---

## Deploy di Vercel

Cara termudah untuk menggunakan aplikasi Next.js ini adalah dengan menggunakan [Platform Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Lihat [dokumentasi cara deploy Next.js di Vercel](https://nextjs.org/docs/app/building-your-application/deploying) untuk detail lebih lanjut.
