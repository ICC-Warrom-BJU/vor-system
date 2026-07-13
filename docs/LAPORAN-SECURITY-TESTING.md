# Laporan Security Testing — Backend VOR

**Sistem:** VOR (Vehicle Operational Report) — Fleet Management BJU
**Lingkup:** Backend API (Express + Prisma 7 + PostgreSQL, autentikasi JWT) — deployment produksi di Railway
**Jenis Uji:** Security Testing — *white-box code review* + *live exploit/verification testing*
**Metode:** Telaah kode keamanan (auth, otorisasi, konfigurasi, penanganan error) + pembuktian langsung via HTTP request (PoC) di lingkungan lokal & produksi
**Tanggal:** 13 Juli 2026
**Penguji:** Tim Pengembang (pra-serah ke QA & Security)
**Branch:** `dev` → `staging` → `main` (semua temuan sudah diperbaiki, di-deploy & diverifikasi live)
**Commit perbaikan:** `b415ea0`, `48f317d`

---

## 1. Ringkasan Eksekutif

Dilakukan audit keamanan menyeluruh terhadap backend VOR yang mencakup autentikasi, otorisasi (RBAC), manajemen rahasia (secret), konfigurasi HTTP, rate-limiting, dan kebocoran informasi. Ditemukan **7 temuan** (1 Critical, 2 High, 3 Medium, 1 Low).

**Seluruh temuan telah diperbaiki, di-deploy ke produksi, dan diverifikasi live.** Temuan paling kritis (**SEC-01**) memungkinkan **siapa pun di internet membuat akun ADMIN** — dan sempat **aktif di produksi** sebelum diperbaiki.

| Severity | Jumlah | Status |
|---|---|---|
| 🔴 Critical | 1 | ✅ Fixed & verified |
| 🟠 High | 2 | ✅ Fixed & verified |
| 🟡 Medium | 3 | ✅ Fixed & verified |
| 🟢 Low | 1 | ✅ Fixed & verified |
| **Total** | **7** | **✅ 100% remediated** |

**Kesimpulan:** Postur keamanan backend meningkat signifikan. Tidak ada temuan terbuka yang tersisa. Beberapa rekomendasi *hardening* lanjutan (non-blocking) dicantumkan di Bagian 6.

---

## 2. Lingkup & Metodologi

**Cakupan audit:**
- Autentikasi & manajemen token (JWT)
- Otorisasi / kontrol akses (RBAC)
- Manajemen secret & environment variable
- Konfigurasi HTTP (CORS, security headers)
- Ketahanan brute-force (rate limiting)
- Kebocoran informasi pada respons error
- Validasi input & batas ukuran payload
- Ketahanan injeksi (SQL injection)

**Metode:**
1. **White-box code review** — pembacaan langsung kode sumber jalur keamanan (`auth.ts`, `middleware/auth.ts`, `index.ts`, `validators.ts`, `middleware/error.ts`, `routes/*`).
2. **Live PoC / verification** — pembuktian tiap temuan & perbaikan via HTTP request (`curl`) di lingkungan **lokal** dan **produksi** (`vor-system-production.up.railway.app`).

**Lingkungan:** Node.js + Express + TypeScript, Prisma 7 + PostgreSQL, JWT (Bearer), RBAC via `roleGuard`. Deploy via Docker di Railway.

---

## 3. Rekapitulasi Temuan

| ID | Judul | Severity | Kategori (OWASP) | Status |
|---|---|---|---|---|
| **SEC-01** | Registrasi publik dengan role bebas → eskalasi ke ADMIN | 🔴 Critical | A01 Broken Access Control | ✅ Fixed |
| **SEC-02** | `JWT_SECRET` fallback hardcoded di repo | 🟠 High | A02 Cryptographic Failures / A05 Misconfig | ✅ Fixed |
| **SEC-03** | Tidak ada rate-limit pada login (brute-force) | 🟠 High | A07 Identification & Auth Failures | ✅ Fixed |
| **SEC-04** | Tidak ada HTTP security headers | 🟡 Medium | A05 Security Misconfiguration | ✅ Fixed |
| **SEC-05** | CORS default ke `*` bila env kosong | 🟡 Medium | A05 Security Misconfiguration | ✅ Fixed |
| **SEC-06** | Kebocoran detail error internal pada middleware auth | 🟡 Medium | A05 / Information Disclosure | ✅ Fixed |
| **SEC-07** | Body request tanpa batas ukuran | 🟢 Low | A05 / DoS | ✅ Fixed |

---

## 4. Detail Temuan & Perbaikan

### 🔴 SEC-01 — Registrasi publik dengan role bebas (CRITICAL)

**Deskripsi.** Endpoint `POST /api/auth/register` terdaftar sebagai rute **publik** (tanpa middleware autentikasi). Schema validasinya menerima field `role` (`z.enum(['ADMIN','PLANNER','SUPERVISOR','MANAGEMENT'])`) dan controller menyimpannya apa adanya (`role: body.role`).

**Dampak.** Siapa pun di internet dapat mengirim request registrasi dengan `"role": "ADMIN"` dan **langsung memperoleh akun administrator** — eskalasi hak akses penuh, bypass seluruh kontrol RBAC. **Temuan ini aktif di produksi** saat ditemukan.

**Bukti (PoC).**
```
POST /api/auth/register
{ "name":"Hacker", "email":"hack@evil.com", "password":"secret123", "role":"ADMIN" }
→ (sebelum fix) akun ADMIN terbentuk
```

**Perbaikan.** Endpoint publik `/api/auth/register` **dihapus** dari server. Pembuatan user kini **hanya** melalui `POST /api/users` yang dilindungi `authMiddleware` + `roleGuard(['ADMIN'])`. Frontend tidak menggunakan endpoint register (dikonfirmasi), sehingga penghapusan tidak berdampak fungsional.

**Verifikasi (produksi).**
```
POST /api/auth/register → HTTP 404  ✅ (endpoint tidak ada lagi)
```

---

### 🟠 SEC-02 — `JWT_SECRET` fallback hardcoded (HIGH)

**Deskripsi.** Secret penandatanganan & verifikasi JWT memakai nilai default hardcoded yang **tercantum di kode sumber** (repo): `process.env.JWT_SECRET || 'vor_super_secret_jwt_key_ganti_ini_nanti'` — di `controllers/auth.ts` (sign) dan `middleware/auth.ts` (verify).

**Dampak.** Bila `JWT_SECRET` lupa di-set pada suatu environment, aplikasi diam-diam memakai secret yang **diketahui publik** (ada di repo). Penyerang dapat **menempa (forge) token admin** yang valid → pengambilalihan penuh. Ini "landmine" konfigurasi.

**Perbaikan.** Dibuat modul `config/env.ts` yang memvalidasi env wajib saat **startup** dan **gagal-cepat (fail-fast)** bila kosong. Kedua fallback hardcoded dihapus; `JWT_SECRET` kini bersumber tunggal dari modul tersebut.

**Verifikasi.**
```
Start server tanpa JWT_SECRET →
Error: FATAL: environment variable "JWT_SECRET" wajib di-set ... (server gagal start) ✅
```
Di produksi `JWT_SECRET` sudah ter-set → aplikasi berjalan normal; nilai secret tidak diubah sehingga **sesi user existing tetap valid**.

---

### 🟠 SEC-03 — Tidak ada rate-limit pada login (HIGH)

**Deskripsi.** Endpoint `POST /api/auth/login` tidak memiliki pembatasan laju, memungkinkan **brute-force password** tak terbatas.

**Perbaikan.** Ditambahkan `express-rate-limit`: **maks 10 percobaan per IP klien per 15 menit**, membalas **HTTP 429** saat terlampaui. Karena Railway berada di belakang reverse proxy, `req.ip` bawaan tidak stabil (menunjuk IP proxy internal yang berganti-ganti sehingga penghitung ter-reset); diperbaiki dengan `keyGenerator` yang mengambil IP klien dari entri paling kiri header `X-Forwarded-For` + `trust proxy`.

**Verifikasi (produksi).**
```
12–14× POST /api/auth/login (IP sama) → request 1–10: 401, request ke-11+: 429  ✅
Request dengan IP berbeda-beda → tidak saling menghitung (kunci per-IP benar)   ✅
```

---

### 🟡 SEC-04 — Tidak ada HTTP security headers (MEDIUM)

**Deskripsi.** Respons tidak menyertakan header keamanan standar (proteksi clickjacking, MIME-sniffing, HSTS, dll).

**Perbaikan.** Ditambahkan middleware `helmet()`.

**Verifikasi (produksi).** Header kini terpasang:
```
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

---

### 🟡 SEC-05 — CORS default ke `*` (MEDIUM)

**Deskripsi.** Konfigurasi CORS: `origin: process.env.CORS_ORIGIN?.split(',') || '*'`. Bila `CORS_ORIGIN` kosong, server mengizinkan **semua origin**.

**Perbaikan.** Default `*` dihapus. Bila `CORS_ORIGIN` di-set → pakai daftar origin tersebut; bila kosong → di **produksi tolak** cross-origin (di dev diizinkan untuk kemudahan). Produksi sudah men-set `CORS_ORIGIN`.

---

### 🟡 SEC-06 — Kebocoran detail error internal (MEDIUM)

**Deskripsi.** Middleware autentikasi mengembalikan detail error internal ke klien: token invalid membalas `error: <jwt error message>`, dan cabang 500 membalas `error: String(error)`.

**Perbaikan.** Respons dibuat generik tanpa membocorkan detail internal.

**Verifikasi (produksi).**
```
GET /api/vehicles dengan token invalid → { "success": false, "message": "Token tidak valid" }  ✅ (tanpa detail)
```

---

### 🟢 SEC-07 — Body request tanpa batas ukuran (LOW)

**Deskripsi.** `express.json()` / `express.urlencoded()` tanpa `limit`, berpotensi *large-payload DoS*.

**Perbaikan.** Ditetapkan batas **1 MB** untuk JSON & urlencoded.

---

## 5. Temuan Positif (Kontrol yang Sudah Baik)

Selama audit, beberapa kontrol keamanan **sudah diterapkan dengan benar**:

- ✅ **RBAC ditegakkan di sisi server** pada semua endpoint terlindungi (`authMiddleware` + `roleGuard`) — bukan hanya UI. Sudah diverifikasi pada Functional Testing (403 untuk akses tidak berhak walau request langsung ke API).
- ✅ **Password di-hash** dengan `bcrypt` (bukan plaintext).
- ✅ **Perlindungan SQL Injection** — seluruh akses DB via Prisma ORM (query terparameterisasi), tidak ada raw SQL dari input pengguna.
- ✅ **Audit log tidak membocorkan kredensial** (field `password` disanitasi; login tidak dicatat) — diverifikasi pada Functional Testing.
- ✅ **Validasi input** via Zod (`safeParse` → 400) pada endpoint mutasi.
- ✅ **Pesan login generik** ("Email atau password salah") — tidak membedakan user tidak ada vs password salah (mencegah user enumeration).

---

## 6. Rekomendasi Hardening Lanjutan (Non-Blocking, Phase 2)

Tidak menghalangi rilis; disarankan untuk penguatan berikutnya:

| # | Rekomendasi | Prioritas |
|---|---|---|
| R-1 | **Audit dependensi** — jalankan `npm audit` & perbaiki kerentanan paket pihak ketiga secara berkala. | Sedang |
| R-2 | **Kebijakan password lebih kuat** — saat ini minimal 6 karakter; tingkatkan ke ≥8 + kompleksitas. | Sedang |
| R-3 | **Masa berlaku JWT** — token 7 hari cukup panjang; pertimbangkan diperpendek + mekanisme refresh/revoke. | Sedang |
| R-4 | **Hapus kode mati** — controller `register` di `auth.ts` kini tak terpakai; hapus untuk mengurangi *attack surface*. | Rendah |
| R-5 | **Rotasi secret berkala** — `JWT_SECRET` & kredensial DB dirotasi terjadwal. | Rendah |
| R-6 | **Pertimbangkan 2FA** untuk akun ADMIN. | Rendah |
| R-7 | **Rate-limit** memakai MemoryStore (memadai untuk 1 replika saat ini). Bila kelak *scale* multi-replika, gunakan store bersama (Redis). | Rendah |

---

## 7. Kesimpulan

- **7 temuan (1 Critical, 2 High, 3 Medium, 1 Low) — seluruhnya diperbaiki, di-deploy, dan diverifikasi live di produksi.**
- Temuan Critical (**SEC-01**) yang memungkinkan pembuatan akun ADMIN oleh siapa pun **telah ditutup** (endpoint mengembalikan 404 di produksi).
- Kontrol fundamental (RBAC server-side, bcrypt, proteksi SQLi via ORM, audit tanpa bocor kredensial) sudah baik.
- Deploy dilakukan tanpa downtime; sesi pengguna existing tetap valid.
- Rekomendasi R-1..R-7 dijadwalkan sebagai *hardening* Phase 2.

**Status akhir: backend VOR dinyatakan aman untuk operasional, dengan rekomendasi penguatan lanjutan yang terdokumentasi.**

---

*Dokumen ini dihasilkan sebagai bagian dari proses Security Testing internal sebelum serah-terima ke tim QA & Security perusahaan. Detail kredensial/secret sengaja tidak dicantumkan.*
