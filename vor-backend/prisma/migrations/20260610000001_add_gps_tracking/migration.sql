-- CreateTable
CREATE TABLE "GpsTracking" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalDistance" DOUBLE PRECISION NOT NULL,
    "drivingTime" INTEGER NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "parkingTime" INTEGER NOT NULL,
    "idleTime" INTEGER NOT NULL,
    "maxSpeed" DOUBLE PRECISION,
    "ratioSpeed" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GpsTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GpsTracking_vehicleId_date_key" ON "GpsTracking"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "GpsTracking_date_idx" ON "GpsTracking"("date");

-- CreateIndex
CREATE INDEX "GpsTracking_vehicleId_idx" ON "GpsTracking"("vehicleId");

-- AddForeignKey
ALTER TABLE "GpsTracking" ADD CONSTRAINT "GpsTracking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
