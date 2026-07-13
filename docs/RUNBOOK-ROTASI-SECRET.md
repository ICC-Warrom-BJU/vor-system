# Runbook — Rotasi Secret (VOR Backend @ Railway)

**Sistem:** VOR (Vehicle Operational Report) — Fleet Management BJU
**Lingkup:** Prosedur operasional untuk merotasi rahasia/kredensial produksi secara aman.
**Referensi temuan:** R-5 (Laporan Security Testing).
**Terakhir diperbarui:** 13 Juli 2026.

> Dokumen ini adalah *runbook* operasional. Simpan di tempat yang hanya dapat diakses tim yang berwenang. **Jangan** menaruh nilai secret sebenarnya di dokumen ini atau di chat/tiket.

---

## 1. Prinsip

- **Rotasi berkala** mengurangi dampak bila secret bocor tanpa disadari.
- **Rotasi segera (ad-hoc)** wajib bila secret pernah terekspos (mis. muncul di log, chat, screenshot, repo publik) atau saat **offboarding** anggota tim yang pernah mengaksesnya.
- Selalu **verifikasi** setelah rotasi (Bagian 6) dan siapkan **rollback** (Bagian 7).
- Rotasi yang berdampak logout massal (JWT) dijadwalkan pada **jam sepi**.

---

## 2. Inventaris Secret

| Secret | Lokasi | Dampak bila bocor | Frekuensi rotasi |
|---|---|---|---|
| **Password DB PostgreSQL** | Railway service *Postgres* → `POSTGRES_PASSWORD` (+ role `postgres` di DB) | Akses penuh ke data | 90 hari / ad-hoc |
| **`JWT_SECRET`** | Railway service *backend* → Variables | Pemalsuan token (impersonasi ADMIN) | 90 hari / ad-hoc |
| **`GPS_API_KEY`** (token EasyGo) | Railway service *backend* → Variables | Penyalahgunaan integrasi GPS pihak ketiga | Sesuai kebijakan EasyGo / ad-hoc |

> `DATABASE_URL` di service **backend** harus berupa **reference** `${{Postgres.DATABASE_URL}}` (bukan URL statis), agar otomatis mengikuti kredensial Postgres.

---

## 3. Jadwal & Pemicu

- **Terjadwal:** setiap **90 hari** (kuartalan) untuk DB & `JWT_SECRET`.
- **Ad-hoc (segera):** secret terekspos, dugaan kompromi, atau offboarding personel.

---

## 4. Prosedur Rotasi

### 4.A — Password Database PostgreSQL

> ⚠️ **JEBAKAN RAILWAY (penting!).** Mengubah variabel `POSTGRES_PASSWORD` **TIDAK** otomatis mengganti password role `postgres` di database — image Postgres hanya memakai variabel itu saat **inisialisasi pertama** (volume kosong). Pada DB yang sudah berisi data, mengubah variabel saja membuat `DATABASE_URL` (password baru) **tidak cocok** dengan password DB (masih lama) → **error P1000 Authentication failed** pada deploy berikutnya. Karena itu, password harus diubah **langsung di DB** dengan `ALTER USER`, lalu variabel disamakan.

**Langkah:**
1. Siapkan **password baru** yang kuat (≥24 karakter acak). Contoh generate:
   ```bash
   node -e "console.log(require('crypto').randomBytes(21).toString('base64').replace(/[+/=]/g,'').slice(0,28))"
   ```
2. Ambil **Public URL** DB terkini: Railway → service *Postgres* → **Connect** → *Public Network* (host `*.proxy.rlwy.net`).
3. **Ubah password di DB** memakai koneksi yang masih valid (password lama):
   ```bash
   # dari vor-backend (punya paket pg)
   node -e "const{Client}=require('pg');(async()=>{const c=new Client({connectionString:process.env.OLD_URL});await c.connect();await c.query(\"ALTER USER postgres WITH PASSWORD '\"+process.env.NEWPASS+\"'\");console.log('OK');await c.end()})()"
   ```
   (set `OLD_URL` = public URL lama, `NEWPASS` = password baru)
4. **Samakan variabel:** Railway → service *Postgres* → Variables → set `POSTGRES_PASSWORD` = **password baru yang sama persis** → Save.
5. Pastikan backend `DATABASE_URL` = reference `${{Postgres.DATABASE_URL}}`.
6. **Redeploy backend** (Deployments → ⋮ → Redeploy).
7. Verifikasi (Bagian 6). Password lama harus **ditolak**.

> Antara langkah 3 dan 6 ada jendela singkat di mana container lama (password lama) gagal query DB — lakukan berurutan & cepat, idealnya di jam sepi.

---

### 4.B — `JWT_SECRET`

> ⚠️ **Dampak:** mengganti `JWT_SECRET` membuat **semua token yang beredar tidak valid** → **seluruh user ter-logout** dan harus login ulang. Penanganan sesi kadaluarsa (F-04) sudah terpasang, jadi user akan diarahkan ke halaman login secara rapi (bukan error kasar). Jadwalkan di **jam sepi**.

**Langkah:**
1. Generate secret baru yang kuat (≥32 karakter acak):
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
2. Railway → service *backend* → Variables → ganti `JWT_SECRET` dengan nilai baru → Save.
3. **Redeploy backend** (biasanya otomatis setelah ubah variabel).
   - Catatan: backend akan **gagal start** bila `JWT_SECRET` kosong (fail-fast SEC-02) — pastikan nilainya terisi.
4. Verifikasi (Bagian 6). Umumkan ke user bahwa mereka perlu login ulang.

---

### 4.C — `GPS_API_KEY` (token EasyGo)

**Langkah:**
1. Minta/terbitkan **token baru** dari penyedia **EasyGo** (via portal/PIC EasyGo).
2. Railway → service *backend* → Variables → ganti `GPS_API_KEY` dengan token baru → Save.
3. **Redeploy backend.**
4. Verifikasi integrasi GPS (Bagian 6). Bila token salah/kosong, EasyGo membalas **HTTP 500** ("An error has occurred").

---

## 5. Aturan Nilai Secret

- **Password DB:** ≥24 karakter acak (huruf besar/kecil, angka).
- **`JWT_SECRET`:** ≥32 karakter acak, unik per environment.
- **Jangan** menaruh nilai secret di repo, chat, tiket, atau screenshot. Bila terlanjur → rotasi segera (Bagian 3).

---

## 6. Verifikasi Pasca-Rotasi

Ganti `BASE` dengan domain produksi (mis. `https://vor-system-production.up.railway.app`).

```bash
BASE="https://vor-system-production.up.railway.app"

# 1. Aplikasi hidup
curl -s -w "\n[%{http_code}]\n" $BASE/api/health          # → 200 "Server running"

# 2. Koneksi DB (login dummy) — 401 = DB OK; 500 = DB bermasalah
curl -s -w "\n[%{http_code}]\n" -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"probe@x.test","password":"salah"}'   # → 401

# 3. Login user nyata → harus berhasil (setelah rotasi JWT, semua wajib login ulang)
# 4. EasyGo → coba fitur "Analisa Jarak Tempuh (Sync)" / "Live Tracking" di UI → tidak 500
```

**Checklist verifikasi:**
- [ ] `/api/health` → 200
- [ ] Login user nyata → berhasil
- [ ] (Rotasi DB) password lama **ditolak**
- [ ] (Rotasi GPS) sync/live tracking EasyGo tidak error 500
- [ ] Deploy Railway status **Active** (hijau), log tanpa P1000/FATAL

---

## 7. Rollback

- **JWT_SECRET / GPS_API_KEY:** kembalikan variabel ke nilai sebelumnya → redeploy. (Simpan nilai lama sementara di password manager sampai verifikasi sukses.)
- **Password DB:** karena diubah via `ALTER USER`, rollback berarti menjalankan `ALTER USER postgres WITH PASSWORD '<lama>'` lagi + samakan `POSTGRES_PASSWORD`. Karena itu, **jangan buang** nilai lama sampai verifikasi selesai.

---

## 8. Checklist Ringkas (satu rotasi)

1. [ ] Tentukan secret yang dirotasi & jadwalkan (jam sepi bila JWT/DB).
2. [ ] Generate nilai baru yang kuat.
3. [ ] Terapkan (DB: `ALTER USER` + samakan `POSTGRES_PASSWORD`; lainnya: ganti variabel).
4. [ ] Redeploy backend.
5. [ ] Verifikasi (Bagian 6).
6. [ ] Konfirmasi rollback tidak diperlukan → hapus nilai lama dari penyimpanan sementara.
7. [ ] Catat tanggal rotasi (untuk jadwal 90 hari berikutnya).

---

## Lampiran — Env produksi wajib (service backend)

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Reference `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Wajib; backend fail-fast bila kosong |
| `JWT_EXPIRES_IN` | Masa berlaku token (`7d`/`1d`/`12h`/detik); default `7d` |
| `GPS_API_URL` | `https://vtsapi.easygo-gps.co.id` |
| `GPS_API_KEY` | Token EasyGo |
| `CORS_ORIGIN` | Origin frontend produksi (jangan `*`) |

*Runbook ini bagian dari dokumentasi keamanan internal VOR. Nilai secret sengaja tidak dicantumkan.*
