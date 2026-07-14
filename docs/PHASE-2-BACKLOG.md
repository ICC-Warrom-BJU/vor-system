# Phase 2 — Backlog

Daftar pekerjaan yang ditunda ke Phase 2. Dicatat agar tidak hilang.
Terakhir diperbarui: 13 Juli 2026.

---

## 1. Analisa Customer — lanjutan (B, C, D)

Fondasi sudah ada: `RevenueData.customerId` (backfilled) & `ActualStatus.customerId` (snapshot per-hari). Scope **A (Revenue per Customer)** sudah live.

### B. Operasional per Customer
Dari `ActualStatus.customerId` (data lama null → **fallback ke `vehicle.customerId`**).
- Utilisasi (KPA/UA/PA) rata-rata unit per customer
- Unit-hari per group status (UTILISASI / BREAKDOWN / DELAY / READY FOR USE / DNA) per customer
- Hari breakdown per customer (keandalan / risiko layanan)

### C. Customer Scorecard (gabungan) — *paling bernilai untuk manajemen*
Satu baris/kartu per customer menggabungkan revenue + operasional:
- Revenue, Gross Profit, Margin %, Trip, jumlah Unit
- Utilisasi %, hari Breakdown, Share %
- (opsional) revenue per unit-hari-utilisasi (efisiensi)

### D. Drill-down per Customer
Detail satu customer:
- Daftar unit yang melayani + revenue & status masing-masing
- Daftar DO (dari `RevenueData.deliveryOrder`)
- Timeline status harian unit-unit customer tsb

**Catatan teknis B/C/D:**
- Reuse pola endpoint + filter (`startDate`/`endDate`/`vehicleType`/`branchId`) & tab di Reports.
- Kemungkinan endpoint baru: `/api/reports/customer-scorecard`, `/api/reports/customer/:id` (detail).
- Operasional (B/C) pakai `ActualStatus.customerId` dengan fallback `vehicle.customerId` untuk record lama (keputusan yang sudah disepakati).

---

## 2. Laporan / Analitik lain
- **Export CSV/PDF** untuk tab **Analisa Customer** (tab lain sudah punya export).
- **O-02:** export **PDF** (saat ini beberapa modul CSV-only).
- **O-01:** seragamkan parameter tanggal antar-endpoint (`date` vs `startDate`/`endDate`).

---

## 3. Status Forecast
- Snapshot **customer/driver** di Forecast (pola sama seperti Actual Status) bila dibutuhkan analisa forecast per customer/driver.

---

## 4. Security (lanjutan)
- **R-7:** rate-limit pakai **Redis store** — hanya bila kelak scale ke **multi-replika** (saat ini 1 replika, MemoryStore cukup).
- Tinjauan berkala: `npm audit`, rotasi secret terjadwal (lihat `RUNBOOK-ROTASI-SECRET.md`).

---

## 5. QA / UI Manual
- **Point 15–16** functional testing: konfirmasi visual/responsif di browser (modal, tabel di layar HP) — logika sudah lolos via code review.

---

## 6. Housekeeping
- `vor-backend/prisma/seed-july.ts` masih untracked — commit atau hapus.
- File `C:\Users\LENOVO\BACKUP-prod-masterstatus.json` (backup sebelum sync MasterStatus) — hapus bila sudah tak diperlukan.

---

## Sudah SELESAI di Phase 1 (referensi)
- Functional testing 16 modul + Security hardening (SEC-01..07, R-1..R-6)
- Fitur: Live Tracking, Tier 1 (Audit/GPS Sync Log/Notifikasi), Revenue multi-DO, Avatar, 2FA
- Actual Status: customer/driver per-hari + titik biru override
- Forecast: panel READY FOR USE per tipe unit
- Reports: BOP & Biaya Lain, format Rupiah penuh, "Gross Profit", **Analisa Customer (revenue)**
