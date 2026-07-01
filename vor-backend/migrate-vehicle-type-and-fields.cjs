const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "VehicleType" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "VehicleType_name_key" ON "VehicleType"("name");
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Vehicle"
    ADD COLUMN IF NOT EXISTS "detailUnit" TEXT,
    ADD COLUMN IF NOT EXISTS "nomorLambung" TEXT;
  `)

  await prisma.$executeRawUnsafe(`
    INSERT INTO "VehicleType" ("id", "name", "description", "createdAt", "updatedAt")
    SELECT CONCAT('seed_', md5("vehicleType")), "vehicleType", 'Migrated from existing vehicle data', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM (SELECT DISTINCT "vehicleType" FROM "Vehicle" WHERE "vehicleType" IS NOT NULL AND "vehicleType" <> '') AS types
    ON CONFLICT ("name") DO NOTHING;
  `)

  console.log('Vehicle type master and vehicle extra fields migration completed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
