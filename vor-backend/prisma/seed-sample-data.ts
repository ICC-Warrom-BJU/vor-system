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
  console.log('🌱 Seeding sample data...')

  // Seed Drivers
  const drivers = [
    { name: 'Budi Santoso' },
    { name: 'Ahmad Wijaya' },
    { name: 'Dedi Kurniawan' },
    { name: 'Eko Prasetyo' },
    { name: 'Fajar Nugraha' },
    { name: 'Gilang Ramadhan' },
  ]

  const createdDrivers = []
  for (const d of drivers) {
    const driver = await prisma.driver.upsert({
      where: { id: '' }, // Dummy where, will create if not exists
      update: {},
      create: d,
    })
    createdDrivers.push(driver)
  }
  console.log(`✓ Seeded ${createdDrivers.length} drivers`)

  // Seed Customers
  const customers = [
    { name: 'PT Indofood Sukses Makmur' },
    { name: 'PT Unilever Indonesia' },
    { name: 'PT Astra International' },
    { name: 'PT Sinar Mas Agro' },
  ]

  const createdCustomers = []
  for (const c of customers) {
    const customer = await prisma.customer.upsert({
      where: { id: '' }, // Dummy where, will create if not exists
      update: {},
      create: c,
    })
    createdCustomers.push(customer)
  }
  console.log(`✓ Seeded ${createdCustomers.length} customers`)

  // Seed Vehicles
  const vehicles = [
    { nopol: 'B 1234 XYZ', vehicleType: 'Tronton', tonase: 25, kubikasi: 30, cabang: 'Jakarta', driverId: createdDrivers[0].id, customerId: createdCustomers[0].id },
    { nopol: 'B 5678 ABC', vehicleType: 'Tronton', tonase: 25, kubikasi: 30, cabang: 'Jakarta', driverId: createdDrivers[1].id, customerId: createdCustomers[0].id },
    { nopol: 'D 9012 DEF', vehicleType: 'Box', tonase: 8, kubikasi: 10, cabang: 'Bandung', driverId: createdDrivers[2].id, customerId: createdCustomers[1].id },
    { nopol: 'D 3456 GHI', vehicleType: 'Box', tonase: 8, kubikasi: 10, cabang: 'Bandung', driverId: createdDrivers[3].id, customerId: createdCustomers[1].id },
    { nopol: 'L 7890 JKL', vehicleType: 'Trailer', tonase: 40, kubikasi: 45, cabang: 'Surabaya', driverId: createdDrivers[4].id, customerId: createdCustomers[2].id },
    { nopol: 'L 2345 MNO', vehicleType: 'Trailer', tonase: 40, kubikasi: 45, cabang: 'Surabaya', driverId: createdDrivers[5].id, customerId: createdCustomers[3].id },
  ]

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { nopol: v.nopol },
      update: v,
      create: v,
    })
  }
  console.log(`✓ Seeded ${vehicles.length} vehicles`)

  console.log('\n✅ Sample data seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
