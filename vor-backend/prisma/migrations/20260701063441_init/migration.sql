-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PLANNER', 'SUPERVISOR', 'MANAGEMENT');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "nopol" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "tonase" DOUBLE PRECISION,
    "kubikasi" DOUBLE PRECISION,
    "nomorRangka" TEXT,
    "detailUnit" TEXT,
    "nomorLambung" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetRevenue" DOUBLE PRECISION,
    "cabang" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT,
    "driverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "pic" TEXT,
    "address" TEXT,
    "cabang" TEXT,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "nid" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "simType" TEXT,
    "simExpiry" TIMESTAMP(3),
    "address" TEXT,
    "joinDate" TIMESTAMP(3),
    "cabang" TEXT,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterStatus" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "groupStatus" TEXT NOT NULL,
    "color" TEXT,
    "isPA" BOOLEAN NOT NULL DEFAULT false,
    "isUA" BOOLEAN NOT NULL DEFAULT false,
    "isProductivity" BOOLEAN NOT NULL DEFAULT false,
    "canCopyNextDay" BOOLEAN NOT NULL DEFAULT true,
    "forecastAllowed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MasterStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualStatus" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "statusCode" TEXT NOT NULL,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActualStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastStatus" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "statusCode" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForecastStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyKPI" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "KPA" DOUBLE PRECISION NOT NULL,
    "UA" DOUBLE PRECISION NOT NULL,
    "PA" DOUBLE PRECISION NOT NULL,
    "availableCount" INTEGER NOT NULL,
    "utilizedCount" INTEGER NOT NULL,
    "productiveCount" INTEGER NOT NULL,
    "totalVehicles" INTEGER NOT NULL,
    "calculatedBy" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyKPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyKPI" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "KPA" DOUBLE PRECISION NOT NULL,
    "UA" DOUBLE PRECISION NOT NULL,
    "PA" DOUBLE PRECISION NOT NULL,
    "availableCount" INTEGER NOT NULL,
    "utilizedCount" INTEGER NOT NULL,
    "productiveCount" INTEGER NOT NULL,
    "totalVehicles" INTEGER NOT NULL,
    "calculatedBy" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyKPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyKPI" (
    "id" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "KPA" DOUBLE PRECISION NOT NULL,
    "UA" DOUBLE PRECISION NOT NULL,
    "PA" DOUBLE PRECISION NOT NULL,
    "availableCount" INTEGER NOT NULL,
    "utilizedCount" INTEGER NOT NULL,
    "productiveCount" INTEGER NOT NULL,
    "totalVehicles" INTEGER NOT NULL,
    "calculatedBy" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyKPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastDeviation" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "forecastStatusCode" TEXT NOT NULL,
    "actualStatusCode" TEXT NOT NULL,
    "isDeviated" BOOLEAN NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "deviationNotes" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastDeviation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueData" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "tripCount" INTEGER NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL,
    "fuelExpense" DOUBLE PRECISION NOT NULL,
    "otherExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profit" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueData_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLANNER',
    "cabang" TEXT,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowedVehicleTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_nopol_key" ON "Vehicle"("nopol");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleType_name_key" ON "VehicleType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_nid_key" ON "Driver"("nid");

-- CreateIndex
CREATE UNIQUE INDEX "MasterStatus_code_key" ON "MasterStatus"("code");

-- CreateIndex
CREATE INDEX "ActualStatus_date_idx" ON "ActualStatus"("date");

-- CreateIndex
CREATE INDEX "ActualStatus_statusCode_idx" ON "ActualStatus"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "ActualStatus_vehicleId_date_key" ON "ActualStatus"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "ForecastStatus_date_idx" ON "ForecastStatus"("date");

-- CreateIndex
CREATE INDEX "ForecastStatus_statusCode_idx" ON "ForecastStatus"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastStatus_vehicleId_date_key" ON "ForecastStatus"("vehicleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyKPI_date_key" ON "DailyKPI"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyKPI_startDate_key" ON "WeeklyKPI"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyKPI_yearMonth_key" ON "MonthlyKPI"("yearMonth");

-- CreateIndex
CREATE INDEX "ForecastDeviation_date_idx" ON "ForecastDeviation"("date");

-- CreateIndex
CREATE INDEX "ForecastDeviation_forecastStatusCode_idx" ON "ForecastDeviation"("forecastStatusCode");

-- CreateIndex
CREATE INDEX "ForecastDeviation_actualStatusCode_idx" ON "ForecastDeviation"("actualStatusCode");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastDeviation_vehicleId_date_key" ON "ForecastDeviation"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "RevenueData_date_idx" ON "RevenueData"("date");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueData_vehicleId_date_key" ON "RevenueData"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "GpsTracking_date_idx" ON "GpsTracking"("date");

-- CreateIndex
CREATE INDEX "GpsTracking_vehicleId_idx" ON "GpsTracking"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "GpsTracking_vehicleId_date_key" ON "GpsTracking"("vehicleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualStatus" ADD CONSTRAINT "ActualStatus_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualStatus" ADD CONSTRAINT "ActualStatus_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "MasterStatus"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastStatus" ADD CONSTRAINT "ForecastStatus_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastStatus" ADD CONSTRAINT "ForecastStatus_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "MasterStatus"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastDeviation" ADD CONSTRAINT "ForecastDeviation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastDeviation" ADD CONSTRAINT "ForecastDeviation_forecastStatusCode_fkey" FOREIGN KEY ("forecastStatusCode") REFERENCES "MasterStatus"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastDeviation" ADD CONSTRAINT "ForecastDeviation_actualStatusCode_fkey" FOREIGN KEY ("actualStatusCode") REFERENCES "MasterStatus"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueData" ADD CONSTRAINT "RevenueData_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsTracking" ADD CONSTRAINT "GpsTracking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
