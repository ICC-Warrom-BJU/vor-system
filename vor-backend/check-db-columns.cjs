require('dotenv/config')

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
})

const tables = [
  'Vehicle',
  'ActualStatus',
  'ForecastStatus',
  'DailyKPI',
  'WeeklyKPI',
  'MonthlyKPI',
  'ForecastDeviation',
  'RevenueData',
]

async function main() {
  for (const table of tables) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' ORDER BY ordinal_position`
    )
    console.log(`\n${table}`)
    for (const row of rows) {
      console.log(`- ${row.column_name} ${row.data_type} nullable=${row.is_nullable}`)
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
