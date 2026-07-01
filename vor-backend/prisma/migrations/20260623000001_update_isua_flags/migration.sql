-- Update isUA flags: only UTILISASI group (UTI, C, MB) counts toward UA%
-- AM (Antri Muat) and BT (BOP Terlambat) in DELAY group no longer count
-- L (Libur) in NWD group no longer counts
UPDATE "MasterStatus" SET "isUA" = false WHERE "code" IN ('AM', 'BT', 'L');
