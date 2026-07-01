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
  console.log('Checking database...')
  
  const vehicles = await prisma.vehicle.findMany()
  console.log(`Vehicles: ${vehicles.length}`)
  
  const actualStatus = await prisma.actualStatus.findMany()
  console.log(`Actual Status: ${actualStatus.length}`)
  
  const forecastStatus = await prisma.forecastStatus.findMany()
  console.log(`Forecast Status: ${forecastStatus.length}`)
  
  const revenueData = await prisma.revenueData.findMany()
  console.log(`Revenue Data: ${revenueData.length}`)
  
  if (actualStatus.length > 0) {
    console.log('\nSample Actual Status:')
    console.log(actualStatus.slice(0, 3))
  }
  
  if (forecastStatus.length > 0) {
    console.log('\nSample Forecast Status:')
    console.log(forecastStatus.slice(0, 3))
  }
  
  if (revenueData.length > 0) {
    console.log('\nSample Revenue Data:')
    console.log(revenueData.slice(0, 3))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
