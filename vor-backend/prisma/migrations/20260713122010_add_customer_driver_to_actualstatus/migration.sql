-- AlterTable
ALTER TABLE "ActualStatus" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "driverId" TEXT;

-- AddForeignKey
ALTER TABLE "ActualStatus" ADD CONSTRAINT "ActualStatus_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualStatus" ADD CONSTRAINT "ActualStatus_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
