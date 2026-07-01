require('dotenv/config')

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
})

const checks = [
  {
    name: 'ForecastStatus vehicleId+date',
    sql: 'SELECT "vehicleId", "date", COUNT(*)::int AS count FROM "ForecastStatus" GROUP BY "vehicleId", "date" HAVING COUNT(*) > 1',
  },
  {
    name: 'WeeklyKPI startDate',
    sql: 'SELECT "startDate", COUNT(*)::int AS count FROM "WeeklyKPI" GROUP BY "startDate" HAVING COUNT(*) > 1',
  },
  {
    name: 'MonthlyKPI yearMonth',
    sql: 'SELECT "yearMonth", COUNT(*)::int AS count FROM "MonthlyKPI" GROUP BY "yearMonth" HAVING COUNT(*) > 1',
  },
]

async function main() {
  for (const check of checks) {
    try {
      const rows = await prisma.$queryRawUnsafe(check.sql)
      console.log(`${check.name}: ${rows.length} duplicate group(s)`)
      if (rows.length > 0) {
        console.log(JSON.stringify(rows, null, 2))
      }
    } catch (error) {
      console.log(`${check.name}: check failed - ${error.message}`)
    }
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
