import 'dotenv/config'
import pkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const { PrismaClient } = pkg
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
})

async function findOrCreateDriver(name: string, extra: any = {}) {
  let driver = await prisma.driver.findFirst({ where: { name } })
  if (!driver) {
    driver = await prisma.driver.create({ data: { name, ...extra } })
  }
  return driver
}

async function findOrCreateCustomer(name: string, extra: any = {}) {
  let customer = await prisma.customer.findFirst({ where: { name } })
  if (!customer) {
    customer = await prisma.customer.create({ data: { name, ...extra } })
  }
  return customer
}

function toISOStringUtc(dateString: string) {
  return new Date(dateString + 'T00:00:00.000Z').toISOString()
}

async function main() {
  const branches = [
    { name: 'Jakarta', code: 'CGK', description: 'Branch Jakarta' },
    { name: 'Bandung', code: 'BDO', description: 'Branch Bandung' },
    { name: 'Surabaya', code: 'SUB', description: 'Branch Surabaya' },
    { name: 'Makassar', code: 'UPG', description: 'Branch Makassar' },
  ]

  for (const b of branches) {
    await prisma.branch.upsert({
      where: { name: b.name },
      update: b,
      create: b,
    })
  }
  console.log('✔ Seed selesai: ' + branches.length + ' branch diinsert')

  const vehicleTypes = [
    { name: 'CDD LONG', description: 'Container Double Deck Long' },
    { name: 'TRONTON', description: 'Heavy truck tronton' },
    { name: 'BOX', description: 'Box truck' },
    { name: 'TRAILER', description: 'Trailer truck' },
  ]

  for (const vt of vehicleTypes) {
    await prisma.vehicleType.upsert({
      where: { name: vt.name },
      update: vt,
      create: vt,
    })
  }
  console.log('✔ Seed selesai: ' + vehicleTypes.length + ' vehicleType diinsert')

  const statuses = [
    { code:'UTI', description:'Utilisasi',         groupStatus:'UTILISASI',    color:'#C0DD97', isPA:true,  isUA:true,  isProductivity:true  },
    { code:'C',   description:'Carry Over',         groupStatus:'UTILISASI',    color:'#9FE1CB', isPA:true,  isUA:true,  isProductivity:true  },
    { code:'MB',  description:'Muatan Balik',       groupStatus:'UTILISASI',    color:'#5DCAA5', isPA:true,  isUA:true,  isProductivity:true  },
    { code:'RFU', description:'Ready For Use',     groupStatus:'READY FOR USE', color:'#B5D4F4', isPA:true,  isUA:false, isProductivity:false },
    { code:'RB',  description:'Ready Bengkel',     groupStatus:'READY FOR USE', color:'#85B7EB', isPA:true,  isUA:false, isProductivity:false },
    { code:'BD',  description:'Breakdown',         groupStatus:'BREAKDOWN',    color:'#F7C1C1', isPA:false, isUA:false, isProductivity:false },
    { code:'AM',  description:'Antri Muat',        groupStatus:'DELAY',        color:'#FAC775', isPA:true,  isUA:false, isProductivity:false },
    { code:'BT',  description:'BOP Terlambat',     groupStatus:'DELAY',        color:'#FAC775', isPA:true,  isUA:false, isProductivity:false },
    { code:'TAD', description:'Tidak Ada Driver', groupStatus:'DNA',          color:'#F4C0D1', isPA:true,  isUA:false, isProductivity:false },
    { code:'L',   description:'Libur',             groupStatus:'NWD',          color:'#D3D1C7', isPA:true,  isUA:false, isProductivity:false },
    { code:'AT',  description:'Asset Tertahan',   groupStatus:'UNR',          color:'#B4B2A9', isPA:false, isUA:false, isProductivity:false },
  ]

  for (const s of statuses) {
    await prisma.masterStatus.upsert({
      where:  { code: s.code },
      update: s,
      create: s,
    })
  }
  console.log('✔ Seed selesai: ' + statuses.length + ' status diinsert')

  const hashedPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vor.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@vor.com',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log('✔ Seed selesai: admin user diinsert')

  const plannerPass = await bcrypt.hash('planner123', 10)
  for (const u of [
    { name: 'Planner A (CDD+BOX)', email: 'planner-a@vor.com', role: 'PLANNER' as const, allowedVehicleTypes: ['CDD LONG', 'BOX'] },
    { name: 'Planner B (TRONTON+TRAILER)', email: 'planner-b@vor.com', role: 'PLANNER' as const, allowedVehicleTypes: ['TRONTON', 'TRAILER'] },
    { name: 'Supervisor Jakarta', email: 'supervisor@vor.com', role: 'SUPERVISOR' as const, allowedVehicleTypes: [] },
  ]) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, password: plannerPass, role: u.role, allowedVehicleTypes: u.allowedVehicleTypes, isActive: true },
    })
  }
  console.log('✔ Seed selesai: planner & supervisor user diinsert')

  const branchJakarta = await prisma.branch.findUnique({ where: { name: 'Jakarta' } })
  const branchBandung = await prisma.branch.findUnique({ where: { name: 'Bandung' } })
  const branchSurabaya = await prisma.branch.findUnique({ where: { name: 'Surabaya' } })
  const branchMakassar = await prisma.branch.findUnique({ where: { name: 'Makassar' } })

  if (!branchJakarta || !branchBandung || !branchSurabaya || !branchMakassar) {
    throw new Error('Branches not seeded correctly')
  }

  const cabangJakarta = branchJakarta.name
  const cabangBandung = branchBandung.name
  const cabangSurabaya = branchSurabaya.name
  const cabangMakassar = branchMakassar.name

  // Assign branch to seed users
  await prisma.user.updateMany({
    where: { email: { in: ['planner-a@vor.com', 'planner-b@vor.com', 'supervisor@vor.com'] } },
    data: { branchId: branchJakarta.id, cabang: cabangJakarta },
  })
  console.log('✔ Seed selesai: branch assigned to planner & supervisor')

  const drivers = [
    { name: 'Budi Santoso', nid: 'DRV-001', phone: '0811-111-1111', simType: 'SIM A', cabang: cabangJakarta, branchId: branchJakarta.id, address: 'Jl. Merdeka No.1, Jakarta' },
    { name: 'Ahmad Wijaya', nid: 'DRV-002', phone: '0811-111-1112', simType: 'SIM B1', cabang: cabangJakarta, branchId: branchJakarta.id, address: 'Jl. Sudirman No.2, Jakarta' },
    { name: 'Dedi Kurniawan', nid: 'DRV-003', phone: '0811-111-1113', simType: 'SIM A', cabang: cabangBandung, branchId: branchBandung.id, address: 'Jl. Asia Afrika No.3, Bandung' },
    { name: 'Eko Prasetyo', nid: 'DRV-004', phone: '0811-111-1114', simType: 'SIM B2', cabang: cabangBandung, branchId: branchBandung.id, address: 'Jl. Dago No.4, Bandung' },
    { name: 'Fajar Ramadhan', nid: 'DRV-005', phone: '0811-111-1115', simType: 'SIM A', cabang: cabangSurabaya, branchId: branchSurabaya.id, address: 'Jl. Tunjungan No.5, Surabaya' },
    { name: 'Gilang Pratama', nid: 'DRV-006', phone: '0811-111-1116', simType: 'SIM C', cabang: cabangSurabaya, branchId: branchSurabaya.id, address: 'Jl. Darmo No.6, Surabaya' },
    { name: 'Hendra Gunawan', nid: 'DRV-007', phone: '0811-111-1117', simType: 'SIM B1', cabang: cabangMakassar, branchId: branchMakassar.id, address: 'Jl. Pettarani No.7, Makassar' },
    { name: 'Irfan Hakim', nid: 'DRV-008', phone: '0811-111-1118', simType: 'SIM A', cabang: cabangMakassar, branchId: branchMakassar.id, address: 'Jl. Somba Opu No.8, Makassar' },
    { name: 'Joko Susilo', nid: 'DRV-009', phone: '0811-111-1119', simType: 'SIM B2', cabang: cabangJakarta, branchId: branchJakarta.id, address: 'Jl. Thamrin No.9, Jakarta' },
    { name: 'Kurniawan Saputra', nid: 'DRV-010', phone: '0811-111-1120', simType: 'SIM A', cabang: cabangJakarta, branchId: branchJakarta.id, address: 'Jl. Gatot Subroto No.10, Jakarta' },
    { name: 'Lukman Hidayat', nid: 'DRV-011', phone: '0811-111-1121', simType: 'SIM C', cabang: cabangBandung, branchId: branchBandung.id, address: 'Jl. Setiabudi No.11, Bandung' },
    { name: 'Mulyadi Taufik', nid: 'DRV-012', phone: '0811-111-1122', simType: 'SIM B1', cabang: cabangSurabaya, branchId: branchSurabaya.id, address: 'Jl. Kertajaya No.12, Surabaya' },
    { name: 'Nugroho Wicaksono', nid: 'DRV-013', phone: '0811-111-1123', simType: 'SIM A', cabang: cabangMakassar, branchId: branchMakassar.id, address: 'Jl. Diponegoro No.13, Makassar' },
    { name: 'Pramudya Kurniawan', nid: 'DRV-014', phone: '0811-111-1124', simType: 'SIM B2', cabang: cabangJakarta, branchId: branchJakarta.id, address: 'Jl. Rasuna Said No.14, Jakarta' },
    { name: 'Rudi Hartono', nid: 'DRV-015', phone: '0811-111-1125', simType: 'SIM A', cabang: cabangBandung, branchId: branchBandung.id, address: 'Jl. Braga No.15, Bandung' },
  ]
  const driverRecords = []
  for (const d of drivers) {
    const { name, ...rest } = d
    driverRecords.push(await findOrCreateDriver(name, rest))
  }

  const customers = [
    { name: 'PT Indofood Sukses Makmur', phone: '021-12345678', email: 'contact@indofood.co.id', pic: 'Budi Santoso', cabang: cabangJakarta, branchId: branchJakarta.id, address: 'Jl. Sudirman Kav. 76-78, Jakarta' },
    { name: 'PT Unilever Indonesia', phone: '021-87654321', email: 'info@unilever.co.id', pic: 'Siti Rahayu', cabang: cabangJakarta, branchId: branchJakarta.id, address: 'Jl. Jend. Gatot Subroto Kav. 15, Jakarta' },
    { name: 'PT Astra International', phone: '031-56789123', email: 'contact@astra.co.id', pic: 'Hendra Wijaya', cabang: cabangSurabaya, branchId: branchSurabaya.id, address: 'Jl. Tunjungan No. 105, Surabaya' },
  ]
  const customerRecords = []
  for (const c of customers) {
    const { name, ...rest } = c
    customerRecords.push(await findOrCreateCustomer(name, rest))
  }

  const vehicles = [
    {
      nopol: 'DD 8089 SC',
      vehicleType: 'CDD LONG',
      tonase: 25, kubikasi: 30,
      nomorRangka: 'NMRK8089SC12345',
      detailUnit: 'ISUZU CDD LONG NMR',
      targetRevenue: 30000000,
      nomorLambung: 'LMB-001',
      branchId: branchMakassar.id,
      customerId: customerRecords[0].id,
      driverId: driverRecords[0].id,
    },
    {
      nopol: 'DD 1234 AB',
      vehicleType: 'TRONTON',
      tonase: 25, kubikasi: 30,
      nomorRangka: 'NMRK1234AB56789',
      detailUnit: 'HINO 500 BOX',
      targetRevenue: 28000000,
      nomorLambung: 'LMB-002',
      branchId: branchJakarta.id,
      customerId: customerRecords[1].id,
      driverId: driverRecords[1].id,
    },
    {
      nopol: 'D 9012 DEF',
      vehicleType: 'BOX',
      tonase: 8, kubikasi: 10,
      nomorRangka: 'NMRK9012DEF34567',
      detailUnit: 'MITSUBISHI FUSO BOX',
      targetRevenue: 17000000,
      nomorLambung: 'LMB-003',
      branchId: branchBandung.id,
      customerId: customerRecords[2].id,
      driverId: driverRecords[2].id,
    },
    {
      nopol: 'L 2345 MNO',
      vehicleType: 'TRAILER',
      tonase: 40, kubikasi: 45,
      nomorRangka: 'NMRKL2345MNO89012',
      detailUnit: 'TRAILER TANDEM',
      targetRevenue: 45000000,
      nomorLambung: 'LMB-004',
      branchId: branchSurabaya.id,
      customerId: customerRecords[0].id,
      driverId: driverRecords[3].id,
    },
    {
      nopol: 'B 1234 CD',
      vehicleType: 'CDD LONG',
      tonase: 25, kubikasi: 30,
      nomorRangka: 'NMRKB1234CD56789',
      detailUnit: 'HINO CDD LONG',
      targetRevenue: 32000000,
      nomorLambung: 'LMB-005',
      branchId: branchJakarta.id,
      customerId: customerRecords[1].id,
      driverId: driverRecords[4].id,
    },
    {
      nopol: 'F 5678 GH',
      vehicleType: 'TRONTON',
      tonase: 30, kubikasi: 35,
      nomorRangka: 'NMRKF5678GH90123',
      detailUnit: 'MERCEDES ACTROS TRONTON',
      targetRevenue: 35000000,
      nomorLambung: 'LMB-006',
      branchId: branchBandung.id,
      customerId: customerRecords[2].id,
      driverId: driverRecords[5].id,
    },
    {
      nopol: 'AB 9012 CD',
      vehicleType: 'BOX',
      tonase: 10, kubikasi: 12,
      nomorRangka: 'NMRKAB9012CD34567',
      detailUnit: 'ISUZU ELF BOX',
      targetRevenue: 15000000,
      nomorLambung: 'LMB-007',
      branchId: branchMakassar.id,
      customerId: customerRecords[0].id,
      driverId: driverRecords[6].id,
    },
    {
      nopol: 'S 3456 TU',
      vehicleType: 'TRAILER',
      tonase: 45, kubikasi: 50,
      nomorRangka: 'NMRKS3456TU78901',
      detailUnit: 'TRAILER WINGBOX',
      targetRevenue: 50000000,
      nomorLambung: 'LMB-008',
      branchId: branchSurabaya.id,
      customerId: customerRecords[1].id,
      driverId: driverRecords[7].id,
    },
    {
      nopol: 'B 7890 VW',
      vehicleType: 'CDD LONG',
      tonase: 25, kubikasi: 28,
      nomorRangka: 'NMRKB7890VW12345',
      detailUnit: 'MITSUBISHI FUSO CDD',
      targetRevenue: 29000000,
      nomorLambung: 'LMB-009',
      branchId: branchJakarta.id,
      customerId: customerRecords[2].id,
      driverId: driverRecords[8].id,
    },
    {
      nopol: 'F 1122 XY',
      vehicleType: 'TRONTON',
      tonase: 28, kubikasi: 32,
      nomorRangka: 'NMRKF1122XY67890',
      detailUnit: 'HINO 700 TRONTON',
      targetRevenue: 33000000,
      nomorLambung: 'LMB-010',
      branchId: branchBandung.id,
      customerId: customerRecords[0].id,
      driverId: driverRecords[9].id,
    },
    {
      nopol: 'DD 3344 ZZ',
      vehicleType: 'BOX',
      tonase: 8, kubikasi: 10,
      nomorRangka: 'NMRKDD3344ZZ11111',
      detailUnit: 'SUZUKI CARRY BOX',
      targetRevenue: 12000000,
      nomorLambung: 'LMB-011',
      branchId: branchMakassar.id,
      customerId: customerRecords[1].id,
      driverId: driverRecords[10].id,
    },
    {
      nopol: 'L 5566 WW',
      vehicleType: 'TRAILER',
      tonase: 42, kubikasi: 48,
      nomorRangka: 'NMRKL5566WW22222',
      detailUnit: 'TRAILER LOWBED',
      targetRevenue: 48000000,
      nomorLambung: 'LMB-012',
      branchId: branchSurabaya.id,
      customerId: customerRecords[2].id,
      driverId: driverRecords[11].id,
    },
    {
      nopol: 'B 7788 QQ',
      vehicleType: 'CDD LONG',
      tonase: 22, kubikasi: 26,
      nomorRangka: 'NMRKB7788QQ33333',
      detailUnit: 'NISSAN CDD LONG',
      targetRevenue: 27000000,
      nomorLambung: 'LMB-013',
      branchId: branchJakarta.id,
      customerId: customerRecords[0].id,
      driverId: driverRecords[12].id,
    },
    {
      nopol: 'F 9900 RR',
      vehicleType: 'TRONTON',
      tonase: 30, kubikasi: 35,
      nomorRangka: 'NMRKF9900RR44444',
      detailUnit: 'SCANIA TRONTON',
      targetRevenue: 38000000,
      nomorLambung: 'LMB-014',
      branchId: branchBandung.id,
      customerId: customerRecords[1].id,
      driverId: driverRecords[13].id,
    },
    {
      nopol: 'DD 2233 SS',
      vehicleType: 'BOX',
      tonase: 12, kubikasi: 14,
      nomorRangka: 'NMRKDD2233SS55555',
      detailUnit: 'TOYOTA DYNA BOX',
      targetRevenue: 16000000,
      nomorLambung: 'LMB-015',
      branchId: branchMakassar.id,
      customerId: customerRecords[2].id,
      driverId: driverRecords[14].id,
    },
  ]

  const createdVehicles = []
  for (const v of vehicles) {
    createdVehicles.push(
      await prisma.vehicle.upsert({
        where: { nopol: v.nopol },
        update: v,
        create: {
          ...v,
          cabang: await prisma.branch.findUnique({ where: { id: v.branchId } }).then((b) => b?.name ?? ''),
        },
      }),
    )
  }
  console.log('✔ Seed selesai: ' + createdVehicles.length + ' vehicle diinsert')

  const actualStatuses = []
  const actualDates = [
    '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04',
    '2026-06-05', '2026-06-06', '2026-06-07', '2026-06-08',
  ]

  const statusPool = ['UTI', 'UTI', 'UTI', 'MB', 'C', 'RFU', 'AM', 'BT', 'TAD', 'BD']

  function pickRandomStatus() {
    return statusPool[Math.floor(Math.random() * statusPool.length)]
  }

  const schedule = [
    { vehicle: createdVehicles[0], codes: ['UTI', 'UTI', 'MB', 'UTI', 'C', 'UTI', 'UTI', 'UTI'] },
    { vehicle: createdVehicles[1], codes: ['RFU', 'UTI', 'UTI', 'BD', 'UTI', 'UTI', 'RFU', 'UTI'] },
    { vehicle: createdVehicles[2], codes: ['UTI', 'AM', 'UTI', 'UTI', 'RFU', 'UTI', 'UTI', 'C'] },
    { vehicle: createdVehicles[3], codes: ['UTI', 'UTI', 'UTI', 'BT', 'UTI', 'UTI', 'MB', 'UTI'] },
    { vehicle: createdVehicles[4], codes: ['UTI', 'C', 'UTI', 'UTI', 'MB', 'UTI', 'RFU', 'UTI'] },
    { vehicle: createdVehicles[5], codes: ['BD', 'RFU', 'UTI', 'UTI', 'UTI', 'C', 'UTI', 'MB'] },
    { vehicle: createdVehicles[6], codes: ['TAD', 'UTI', 'UTI', 'AM', 'UTI', 'UTI', 'UTI', 'RFU'] },
    { vehicle: createdVehicles[7], codes: ['UTI', 'UTI', 'MB', 'UTI', 'BT', 'UTI', 'UTI', 'UTI'] },
    { vehicle: createdVehicles[8], codes: ['RFU', 'UTI', 'UTI', 'UTI', 'C', 'UTI', 'AM', 'UTI'] },
    { vehicle: createdVehicles[9], codes: ['UTI', 'MB', 'UTI', 'RFU', 'UTI', 'UTI', 'UTI', 'C'] },
    { vehicle: createdVehicles[10], codes: ['UTI', 'UTI', 'TAD', 'UTI', 'UTI', 'RFU', 'UTI', 'UTI'] },
    { vehicle: createdVehicles[11], codes: ['C', 'UTI', 'UTI', 'MB', 'UTI', 'UTI', 'BT', 'UTI'] },
    { vehicle: createdVehicles[12], codes: ['AM', 'UTI', 'RFU', 'UTI', 'UTI', 'UTI', 'C', 'MB'] },
    { vehicle: createdVehicles[13], codes: ['UTI', 'UTI', 'C', 'UTI', 'MB', 'UTI', 'RFU', 'UTI'] },
    { vehicle: createdVehicles[14], codes: ['UTI', 'RFU', 'UTI', 'BD', 'UTI', 'UTI', 'UTI', 'RFU'] },
  ]

  for (const entry of schedule) {
    for (let i = 0; i < actualDates.length; i += 1) {
      actualStatuses.push({
        vehicleId: entry.vehicle.id,
        statusCode: entry.codes[i],
        date: new Date(toISOStringUtc(actualDates[i])),
        notes: `Status ${entry.codes[i]} pada ${actualDates[i]}`,
        createdBy: adminUser.id,
      })
    }
  }

  await prisma.actualStatus.createMany({
    data: actualStatuses,
    skipDuplicates: true,
  })
  console.log('✔ Seed selesai: ' + actualStatuses.length + ' actualStatus diinsert')

  // ─── Forecast Status ────────────────────────────────
  const forecastStatuses = []
  for (const entry of schedule) {
    for (let i = 0; i < actualDates.length; i += 1) {
      forecastStatuses.push({
        vehicleId: entry.vehicle.id,
        statusCode: statusPool[Math.floor(Math.random() * statusPool.length)],
        date: new Date(toISOStringUtc(actualDates[i])),
        confidence: Math.floor(Math.random() * 31) + 70,
        notes: `Forecast ${actualDates[i]}`,
        createdBy: adminUser.id,
      })
    }
  }

  await prisma.forecastStatus.createMany({
    data: forecastStatuses,
    skipDuplicates: true,
  })
  console.log('✔ Seed selesai: ' + forecastStatuses.length + ' forecastStatus diinsert')

  // ─── Revenue Data ────────────────────────────────
  const revenueData = []

  function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  for (const vehicle of createdVehicles) {
    for (const dateStr of actualDates) {
      const tripCount = randInt(1, 4)
      const revenuePerTrip = vehicle.targetRevenue
        ? Math.round(vehicle.targetRevenue / 22 / tripCount * randInt(80, 120) / 100)
        : randInt(500000, 1500000)
      const totalRevenue = tripCount * revenuePerTrip
      const fuelExpense = Math.round(totalRevenue * randInt(35, 55) / 100)
      const otherExpense = Math.round(totalRevenue * randInt(5, 15) / 100)
      const profit = totalRevenue - fuelExpense - otherExpense

      revenueData.push({
        vehicleId: vehicle.id,
        date: new Date(toISOStringUtc(dateStr)),
        tripCount,
        totalRevenue,
        fuelExpense,
        otherExpense,
        profit,
        notes: `Trip ${tripCount}x pendapatan ${totalRevenue}`,
        recordedBy: adminUser.id,
      })
    }
  }

  await prisma.revenueData.createMany({
    data: revenueData,
    skipDuplicates: true,
  })
  console.log('✔ Seed selesai: ' + revenueData.length + ' revenueData diinsert')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())