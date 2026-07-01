require('dotenv/config')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

async function main() {
  const result = await prisma.$queryRawUnsafe('select count(*) as cnt from "MasterStatus";')
  console.log(JSON.stringify(result, null, 2))
  await prisma.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
