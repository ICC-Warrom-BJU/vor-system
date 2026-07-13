-- AlterTable
ALTER TABLE "RevenueData" ADD COLUMN     "customerId" TEXT;

-- AddForeignKey
ALTER TABLE "RevenueData" ADD CONSTRAINT "RevenueData_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: isi customerId dari penugasan unit saat ini (model dedikasi 1 unit = 1 customer)
UPDATE "RevenueData" rd
SET "customerId" = v."customerId"
FROM "Vehicle" v
WHERE rd."vehicleId" = v."id"
  AND rd."customerId" IS NULL
  AND v."customerId" IS NOT NULL;
