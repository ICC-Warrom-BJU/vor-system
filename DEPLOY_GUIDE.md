# Panduan Deploy VOR System — Railway + Vercel

## A. Railway — Database PostgreSQL

1. Buka https://railway.app/dashboard
2. Klik **New Project** → **Provision PostgreSQL**
3. Tunggu ~1-2 menit sampai status **Running**
4. Klik service PostgreSQL → tab **Variables**
5. Salin nilai `DATABASE_URL` (akan dipakai nanti)

## B. Railway — Deploy Backend

1. Klik **New Project** → **Deploy from GitHub repo**
2. Pilih `ICC-Warrom-BJU/vor-system`
3. Setelah project dibuat:
   - **Settings** → **Root Directory** → isi: `vor-backend`
   - **Settings** → **Deploy Branch** → pilih: `staging`
4. **Variables** — klik **+ New Variable**, tambahkan satu per satu:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Paste dari PostgreSQL tadi |
| `JWT_SECRET` | `vor_super_secret_jwt_key_2026` |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

5. Setelah semua variable terisi, klik **Deploy**
6. Tunggu build selesai (bisa 3-5 menit)
7. Jika sukses, akan muncul URL seperti: `https://vor-backend-production-xxxx.up.railway.app`
8. Klik URL tersebut → tambah `/api/health` di akhir → harus muncul response JSON

## C. Vercel — Deploy Frontend

1. Buka https://vercel.com/dashboard
2. Klik **Add New** → **Project**
3. Pilih `ICC-Warrom-BJU/vor-system`
4. Di halaman konfigurasi:
   - **Root Directory** → pilih `vor-frontend`
   - **Framework Preset** → pilih `Vite`
   - **Build Command** → biarkan `npm run build`
   - **Output Directory** → biarkan `dist`
5. **Environment Variables** — klik **+ Add**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | URL Railway backend (dari langkah B.7) |

6. Klik **Deploy**
7. Tunggu ~1-2 menit
8. Jika sukses, akan muncul URL: `https://vor-frontend-xxxx.vercel.app`

## D. Update CORS Backend

1. Kembali ke Railway → pilih service Backend
2. Tab **Variables** → tambah variable:
   - `CORS_ORIGIN` → isi URL Vercel dari langkah C.8
3. Railway akan otomatis redeploy

## E. Selesai

Buka URL Vercel di browser → login page VOR akan tampil.
