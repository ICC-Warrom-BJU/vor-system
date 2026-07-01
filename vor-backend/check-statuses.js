import 'dotenv/config'
import pkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const { PrismaClient } = pkg
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
})

async function main() {
  console.log('Checking master statuses...')
  
  const masterStatuses = await prisma.masterStatus.findMany()
  console.log(`Total Master Statuses: ${masterStatuses.length}`)
  console.log('\nMaster Status Codes:')
  masterStatuses.forEach(ms => {
    console.log(`- ${ms.code}: ${ms.description}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
