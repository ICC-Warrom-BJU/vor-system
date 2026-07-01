# Panduan Deploy Vercel

## 1. Buat Project Baru
- Buka https://vercel.com/new
- Pilih **ICC-Warrom-BJU/vor-system**
- Klik **Import**

## 2. Konfigurasi
Di halaman **Configure Project**, atur:

| Setelan | Nilai |
|---------|-------|
| **Branch** | `staging` |
| **Framework Preset** | **Vite** (bukan "Other") |
| **Root Directory** | `vor-frontend` |
| **Project Name** | `vor-system` (biarkan) |

## 3. Environment Variables
Klik **+ Add Environment Variables** (biasanya di bawah Root Directory):

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://vor-system-production.up.railway.app` |

## 4. Deploy
Klik tombol **Deploy** dan tunggu selesai.

## 5. Update CORS di Railway
Setelah deploy sukses, Vercel akan kasih URL (misal `https://vor-system.vercel.app`). Copy URL itu, lalu:
- Buka Railway → Backend → **Variables**
- Tambah: `CORS_ORIGIN` = URL Vercel
- Railway otomatis redeploy

## 6. Selesai
Buka URL Vercel di browser → login page VOR tampil.
