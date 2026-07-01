import express from 'express'

const app = express()
app.use(express.json())

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function rand(min: number, max: number) {
  return Math.round(Math.random() * (max - min) + min)
}

function randFloat(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2))
}

function generateDayData(day: number, year: number, month: number) {
  const totalKm = rand(80, 480)
  const drivingSec = rand(5 * 3600, 16 * 3600)
  const movingSec = rand(drivingSec * 0.6, drivingSec * 0.85)
  const idleSec = rand(300, 4000)
  const parkingSec = drivingSec - movingSec - idleSec
  const maxSpeed = rand(60, 120)

  const dt = new Date(year, month - 1, day)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  const h1 = String(rand(4, 8)).padStart(2, '0')
  const m1 = String(rand(0, 59)).padStart(2, '0')
  const h2 = String(rand(20, 23)).padStart(2, '0')
  const m2 = String(rand(0, 59)).padStart(2, '0')

  return {
    tripSum: {
      max_speed: maxSpeed,
      avg_speed: randFloat(25, 50),
      total_km: totalKm,
      fuel_ratio: 0,
      fuelBySensor: 0,
      HB: 0, HA: 0, HC: 0, IC: 0,
      overSpeed_count: rand(0, 5),
      dur_parking: { value: Math.max(parkingSec, 0), text: `${Math.floor(parkingSec / 3600)} h, ${Math.floor((parkingSec % 3600) / 60)} m` },
      dur_idle: { value: idleSec, text: `${Math.floor(idleSec / 3600)} h, ${Math.floor((idleSec % 3600) / 60)} m` },
      dur_moving: { value: movingSec, text: `${Math.floor(movingSec / 3600)} h, ${Math.floor((movingSec % 3600) / 60)} m` },
      dur_driving: { value: drivingSec, text: `${Math.floor(drivingSec / 3600)} h, ${Math.floor((drivingSec % 3600) / 60)} m` },
      dur_overSpeed: { value: 0, text: '' },
    },
    dayofweek: DAY_NAMES[dt.getDay()],
    engine_first_start: `${y}-${m}-${d}T${h1}:${m1}:00+07:00`,
    engine_last_stop: `${y}-${m}-${d}T${h2}:${m2}:00+07:00`,
  }
}

app.post('/api/Report/Monthly', (req, res) => {
  const { tahun, bulan, lstNoPOL = [] } = req.body
  const nopols = lstNoPOL.length > 0 ? lstNoPOL : [
    'DD 8089 SC', 'DD 1234 AB', 'D 9012 DEF', 'L 2345 MNO',
    'B 1234 CD', 'F 5678 GH', 'AB 9012 CD', 'S 3456 TU',
    'B 7890 VW', 'F 1122 XY', 'DD 3344 ZZ', 'L 5566 WW',
    'B 7788 QQ', 'F 9900 RR', 'DD 2233 SS',
  ]

  const daysInMonth = new Date(tahun, bulan, 0).getDate()
  const data = nopols.map((nopol: string, i: number) => {
    const dayEntries: Record<string, any> = {}
    for (let d = 1; d <= daysInMonth; d++) {
      dayEntries[`day_${d}`] = generateDayData(d, tahun, bulan)
    }
    // remaining days null
    for (let d = daysInMonth + 1; d <= 31; d++) {
      dayEntries[`day_${d}`] = null
    }

    return {
      gps_sn: `353691840${String(314300 + i).padStart(6, '0')}`,
      nopol,
      vehicle_id: `VEH${String(168000 + i).padStart(7, '0')}`,
      company_id: 6581,
      company_nm: 'PT. BUMI JASA UTAMA (CABO)',
      tahun,
      bulan,
      totalSum: {
        max_speed: rand(90, 120),
        avg_speed: randFloat(30, 45),
        total_km: rand(daysInMonth * 80, daysInMonth * 400),
        fuel_ratio: 0, fuelBySensor: 0, HB: 0, HA: 0, HC: 0, IC: 0,
        overSpeed_count: rand(0, 20),
        dur_parking: { value: rand(daysInMonth * 20000, daysInMonth * 40000), text: `${rand(80, 160)} h` },
        dur_idle: { value: rand(daysInMonth * 5000, daysInMonth * 15000), text: `${rand(20, 60)} h` },
        dur_moving: { value: rand(daysInMonth * 30000, daysInMonth * 50000), text: `${rand(120, 200)} h` },
        dur_driving: { value: rand(daysInMonth * 40000, daysInMonth * 60000), text: `${rand(160, 240)} h` },
        dur_overSpeed: { value: 0, text: '' },
      },
      ...dayEntries,
    }
  })

  console.log(`[Mock] ${tahun}-${bulan}: ${data.length} vehicles, ${daysInMonth} days`)

  res.json({
    ResponseCode: 1,
    ResponseMessage: `success ${data.length} recs`,
    Data: data,
  })
})

const PORT = 3002
app.listen(PORT, () => {
  console.log(`🔵 Mock GPS API running on http://localhost:${PORT}`)
  console.log(`   POST /api/Report/Monthly (EasyGo format)`)
  console.log(`   15 vehicles x day_1..day_31 structure`)
})
