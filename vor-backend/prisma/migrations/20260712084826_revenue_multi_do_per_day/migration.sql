-- DropIndex
DROP INDEX "RevenueData_vehicleId_date_key";

-- CreateIndex
CREATE INDEX "RevenueData_vehicleId_date_idx" ON "RevenueData"("vehicleId", "date");
