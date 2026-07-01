import 'dotenv/config'
import pkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const { PrismaClient } = pkg
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
})

const statuses = ['UTI', 'RFU', 'RB', 'BD', 'AM', 'L']
const confidenceLevels = [100, 75, 50, 25]

async function main() {
  console.log('Starting seed for 10 days...')

  // Get existing vehicles
  const vehicles = await prisma.vehicle.findMany()
  console.log(`Found ${vehicles.length} vehicles`)

  // Get existing master statuses
  const masterStatuses = await prisma.masterStatus.findMany()
  console.log(`Found ${masterStatuses.length} master statuses`)

  // Generate dates for next 10 days
  const today = new Date()
  const dates = []
  
  for (let i = 0; i < 10; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }

  console.log(`Generating data for dates: ${dates.map(d => d.toISOString().split('T')[0]).join(', ')}`)

  // Seed Actual Status
  for (const date of dates) {
    const dateStr = date.toISOString().split('T')[0]
    console.log(`Seeding Actual Status for ${dateStr}...`)
    
    for (const vehicle of vehicles) {
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
      const masterStatus = masterStatuses.find(ms => ms.code === randomStatus)
      
      // Check if actual status already exists
      const existing = await prisma.actualStatus.findFirst({
        where: {
          vehicleId: vehicle.id,
          date: date,
        },
      })

      if (!existing && masterStatus) {
        await prisma.actualStatus.create({
          data: {
            vehicleId: vehicle.id,
            date: date,
            statusCode: masterStatus.code,
            notes: `Auto-generated status for ${dateStr}`,
            createdBy: 'system',
          },
        })
      }
    }
  }

  // Seed Forecast Status
  for (const date of dates) {
    const dateStr = date.toISOString().split('T')[0]
    console.log(`Seeding Forecast Status for ${dateStr}...`)
    
    for (const vehicle of vehicles) {
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
      const randomConfidence = confidenceLevels[Math.floor(Math.random() * confidenceLevels.length)]
      const masterStatus = masterStatuses.find(ms => ms.code === randomStatus)
      
      // Check if forecast status already exists
      const existing = await prisma.forecastStatus.findFirst({
        where: {
          vehicleId: vehicle.id,
          date: date,
        },
      })

      if (!existing && masterStatus) {
        await prisma.forecastStatus.create({
          data: {
            vehicleId: vehicle.id,
            date: date,
            statusCode: masterStatus.code,
            confidence: randomConfidence,
            notes: `Auto-generated forecast for ${dateStr}`,
            createdBy: 'system',
          },
        })
      }
    }
  }

  // Seed Revenue Data
  for (const date of dates) {
    const dateStr = date.toISOString().split('T')[0]
    console.log(`Seeding Revenue Data for ${dateStr}...`)
    
    for (const vehicle of vehicles) {
      const randomRevenue = Math.floor(Math.random() * 10000000) + 1000000 // 1M - 11M
      const randomFuelExpense = Math.floor(randomRevenue * 0.2) // 20% of revenue
      const randomOtherExpense = Math.floor(randomRevenue * 0.1) // 10% of revenue
      const randomProfit = randomRevenue - randomFuelExpense - randomOtherExpense
      const randomTrips = Math.floor(Math.random() * 5) + 1 // 1-5 trips
      
      // Check if revenue data already exists
      const existing = await prisma.revenueData.findFirst({
        where: {
          vehicleId: vehicle.id,
          date: date,
        },
      })

      if (!existing) {
        await prisma.revenueData.create({
          data: {
            vehicleId: vehicle.id,
            date: date,
            totalRevenue: randomRevenue,
            fuelExpense: randomFuelExpense,
            otherExpense: randomOtherExpense,
            profit: randomProfit,
            tripCount: randomTrips,
            notes: `Auto-generated revenue for ${dateStr}`,
            recordedBy: 'system',
          },
        })
      }
    }
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
