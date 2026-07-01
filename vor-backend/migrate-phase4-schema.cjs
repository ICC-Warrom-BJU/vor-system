require('dotenv/config')

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
})

const statements = [
  `ALTER TABLE "ActualStatus" RENAME COLUMN "subStatus" TO "notes"`,
  `ALTER TABLE "ActualStatus" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT`,
  `ALTER TABLE "ActualStatus" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,

  `ALTER TABLE "ForecastStatus" RENAME COLUMN "forecastDate" TO "date"`,
  `ALTER TABLE "ForecastStatus" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT`,
  `ALTER TABLE "ForecastStatus" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE "ForecastStatus" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,

  `ALTER TABLE "DailyKPI" RENAME COLUMN "pa" TO "KPA"`,
  `ALTER TABLE "DailyKPI" RENAME COLUMN "ua" TO "UA"`,
  `ALTER TABLE "DailyKPI" RENAME COLUMN "productivity" TO "PA"`,
  `ALTER TABLE "DailyKPI" RENAME COLUMN "totalFleet" TO "totalVehicles"`,
  `ALTER TABLE "DailyKPI" ADD COLUMN IF NOT EXISTS "availableCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "DailyKPI" ADD COLUMN IF NOT EXISTS "utilizedCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "DailyKPI" ADD COLUMN IF NOT EXISTS "productiveCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "DailyKPI" ADD COLUMN IF NOT EXISTS "calculatedBy" TEXT`,
  `ALTER TABLE "DailyKPI" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,

  `ALTER TABLE "WeeklyKPI" RENAME COLUMN "weekStart" TO "startDate"`,
  `ALTER TABLE "WeeklyKPI" RENAME COLUMN "pa" TO "KPA"`,
  `ALTER TABLE "WeeklyKPI" RENAME COLUMN "ua" TO "UA"`,
  `ALTER TABLE "WeeklyKPI" RENAME COLUMN "productivity" TO "PA"`,
  `ALTER TABLE "WeeklyKPI" RENAME COLUMN "totalFleet" TO "totalVehicles"`,
  `ALTER TABLE "WeeklyKPI" ADD COLUMN IF NOT EXISTS "availableCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "WeeklyKPI" ADD COLUMN IF NOT EXISTS "utilizedCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "WeeklyKPI" ADD COLUMN IF NOT EXISTS "productiveCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "WeeklyKPI" ADD COLUMN IF NOT EXISTS "calculatedBy" TEXT`,
  `ALTER TABLE "WeeklyKPI" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,

  `ALTER TABLE "MonthlyKPI" ADD COLUMN IF NOT EXISTS "yearMonth" TEXT`,
  `UPDATE "MonthlyKPI" SET "yearMonth" = CONCAT("year", '-', LPAD("month"::TEXT, 2, '0')) WHERE "yearMonth" IS NULL`,
  `ALTER TABLE "MonthlyKPI" ALTER COLUMN "yearMonth" SET NOT NULL`,
  `ALTER TABLE "MonthlyKPI" RENAME COLUMN "pa" TO "KPA"`,
  `ALTER TABLE "MonthlyKPI" RENAME COLUMN "ua" TO "UA"`,
  `ALTER TABLE "MonthlyKPI" RENAME COLUMN "productivity" TO "PA"`,
  `ALTER TABLE "MonthlyKPI" RENAME COLUMN "totalFleet" TO "totalVehicles"`,
  `ALTER TABLE "MonthlyKPI" ADD COLUMN IF NOT EXISTS "availableCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "MonthlyKPI" ADD COLUMN IF NOT EXISTS "utilizedCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "MonthlyKPI" ADD COLUMN IF NOT EXISTS "productiveCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "MonthlyKPI" ADD COLUMN IF NOT EXISTS "calculatedBy" TEXT`,
  `ALTER TABLE "MonthlyKPI" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,

  `ALTER TABLE "ForecastDeviation" RENAME COLUMN "forecastCode" TO "forecastStatusCode"`,
  `ALTER TABLE "ForecastDeviation" RENAME COLUMN "actualCode" TO "actualStatusCode"`,
  `ALTER TABLE "ForecastDeviation" RENAME COLUMN "notes" TO "deviationNotes"`,
  `ALTER TABLE "ForecastDeviation" ADD COLUMN IF NOT EXISTS "isDeviated" BOOLEAN NOT NULL DEFAULT FALSE`,
  `UPDATE "ForecastDeviation" SET "isDeviated" = ("forecastStatusCode" <> "actualStatusCode")`,
  `ALTER TABLE "ForecastDeviation" ADD COLUMN IF NOT EXISTS "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 100`,
  `UPDATE "ForecastDeviation" SET "accuracy" = CASE WHEN "isDeviated" THEN 0 ELSE 100 END`,
  `ALTER TABLE "ForecastDeviation" ADD COLUMN IF NOT EXISTS "recordedBy" TEXT`,

  `ALTER TABLE "RevenueData" RENAME COLUMN "amount" TO "totalRevenue"`,
  `ALTER TABLE "RevenueData" RENAME COLUMN "createdBy" TO "recordedBy"`,
  `ALTER TABLE "RevenueData" ADD COLUMN IF NOT EXISTS "tripCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "RevenueData" ADD COLUMN IF NOT EXISTS "fuelExpense" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "RevenueData" ADD COLUMN IF NOT EXISTS "otherExpense" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "RevenueData" ADD COLUMN IF NOT EXISTS "profit" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `UPDATE "RevenueData" SET "profit" = "totalRevenue" - "fuelExpense" - "otherExpense"`,
  `ALTER TABLE "RevenueData" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
]

async function runIgnoringDuplicateColumn(statement) {
  try {
    await prisma.$executeRawUnsafe(statement)
    console.log(`OK: ${statement}`)
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('does not exist')) {
      console.log(`SKIP: ${statement}`)
      return
    }
    throw error
  }
}

async function main() {
  for (const statement of statements) {
    await runIgnoringDuplicateColumn(statement)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
