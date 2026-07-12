import prisma from '../config/prisma'

const GPS_API_BASE = process.env.GPS_API_URL || 'https://vtsapi.easygo-gps.co.id'
const GPS_API_TOKEN = process.env.GPS_API_KEY || ''

interface EasyGoMonthlyRequest {
  tahun: number
  bulan: number
  lstNoPOL: string[]
  page: number
  limit: number | null
  encrypted: number
}

interface EasyGoMonthlyResponse {
  ResponseCode: number
  ResponseMessage: string
  Data: EasyGoVehicleReport[]
}

interface DurationField {
  value: number
  text: string
}

interface TripSum {
  max_speed: number
  avg_speed: number
  total_km: number
  fuel_ratio: number
  fuelBySensor: number
  HB: number
  HA: number
  HC: number
  IC: number
  overSpeed_count: number
  dur_parking: DurationField
  dur_idle: DurationField
  dur_moving: DurationField
  dur_driving: DurationField
  dur_overSpeed: DurationField
}

interface DayData {
  tripSum: TripSum
  dayofweek: string
  engine_first_start: string
  engine_last_stop: string
}

interface TotalSum extends TripSum {}

interface EasyGoVehicleReport {
  gps_sn: string
  nopol: string
  vehicle_id: string
  company_id: number
  company_nm: string
  tahun: number
  bulan: number
  totalSum: TotalSum
  day_1: DayData | null
  day_2: DayData | null
  day_3: DayData | null
  day_4: DayData | null
  day_5: DayData | null
  day_6: DayData | null
  day_7: DayData | null
  day_8: DayData | null
  day_9: DayData | null
  day_10: DayData | null
  day_11: DayData | null
  day_12: DayData | null
  day_13: DayData | null
  day_14: DayData | null
  day_15: DayData | null
  day_16: DayData | null
  day_17: DayData | null
  day_18: DayData | null
  day_19: DayData | null
  day_20: DayData | null
  day_21: DayData | null
  day_22: DayData | null
  day_23: DayData | null
  day_24: DayData | null
  day_25: DayData | null
  day_26: DayData | null
  day_27: DayData | null
  day_28: DayData | null
  day_29: DayData | null
  day_30: DayData | null
  day_31: DayData | null
}

export async function fetchMonthlyReport(
  year: number,
  month: number,
  noPolList: string[] = [],
  page = 0,
  limit: number | null = null
): Promise<EasyGoMonthlyResponse> {
  const body: EasyGoMonthlyRequest = {
    tahun: year,
    bulan: month,
    lstNoPOL: noPolList,
    page,
    limit,
    encrypted: 0,
  }

  const response = await fetch(`${GPS_API_BASE}/api/Report/Monthly`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      token: GPS_API_TOKEN,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`EasyGo API error ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

function extractDayData(vehicle: EasyGoVehicleReport): Array<{
  nopol: string
  day: number
  total_km: number
  driving_sec: number
  moving_sec: number
  parking_sec: number
  idle_sec: number
  max_speed: number
  avg_speed: number
}> {
  const results: Array<{
    nopol: string
    day: number
    total_km: number
    driving_sec: number
    moving_sec: number
    parking_sec: number
    idle_sec: number
    max_speed: number
    avg_speed: number
  }> = []

  for (let d = 1; d <= 31; d++) {
    const dayKey = `day_${d}` as keyof EasyGoVehicleReport
    const dayData = vehicle[dayKey] as DayData | null
    if (!dayData) continue

    results.push({
      nopol: vehicle.nopol,
      day: d,
      total_km: dayData.tripSum.total_km,
      driving_sec: Math.round(dayData.tripSum.dur_driving.value),
      moving_sec: Math.round(dayData.tripSum.dur_moving.value),
      parking_sec: Math.round(dayData.tripSum.dur_parking.value),
      idle_sec: Math.round(dayData.tripSum.dur_idle.value),
      max_speed: dayData.tripSum.max_speed,
      avg_speed: dayData.tripSum.avg_speed,
    })
  }

  return results
}

export async function syncMonthlyGpsData(year: number, month: number, noPolList: string[] = []): Promise<{
  total: number
  success: number
  failed: number
  errors: string[]
}> {
  const result = { total: 0, success: 0, failed: 0, errors: [] as string[] }

  const response = await fetchMonthlyReport(year, month, noPolList)

  // EasyGo menandai sukses level-aplikasi dengan ResponseCode === 1.
  // Kode lain berarti API-nya sendiri gagal (mis. error server-side), walau HTTP 200
  // dan Data berupa array kosong. Tanpa cek ini, sync akan "berhasil" dengan 0 record
  // secara senyap. Dilempar agar terlihat jelas di UI (route → 500 + pesan) maupun di log scheduler.
  if (response.ResponseCode !== 1) {
    throw new Error(
      `EasyGo API gagal (ResponseCode ${response.ResponseCode}): ${response.ResponseMessage}`,
    )
  }

  if (!Array.isArray(response.Data)) {
    result.errors.push(`API response error: ${response.ResponseMessage}`)
    return result
  }

  const vehicleMap = new Map<string, string>()
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true },
    select: { id: true, nopol: true },
  })
  for (const v of vehicles) {
    vehicleMap.set(v.nopol.toUpperCase(), v.id)
  }

  for (const vehicle of response.Data) {
    if (!vehicle.nopol) {
      result.failed++
      result.errors.push('Skipped vehicle with missing nopol')
      continue
    }

    const vehicleId = vehicleMap.get(vehicle.nopol.toUpperCase())
    if (!vehicleId) {
      result.failed++
      result.errors.push(`Nopol ${vehicle.nopol} tidak ditemukan di VOR`)
      continue
    }

    const days = extractDayData(vehicle)

    for (const day of days) {
      try {
        const dateObj = new Date(year, month - 1, day.day)
        dateObj.setHours(0, 0, 0, 0)

        const existing = await prisma.gpsTracking.findFirst({
          where: { vehicleId, date: dateObj },
        })

        const data = {
          totalDistance: day.total_km,
          drivingTime: day.driving_sec,
          movingTime: day.moving_sec,
          parkingTime: day.parking_sec,
          idleTime: day.idle_sec,
          maxSpeed: day.max_speed,
          ratioSpeed: day.avg_speed,
        }

        if (existing) {
          await prisma.gpsTracking.update({
            where: { id: existing.id },
            data,
          })
        } else {
          await prisma.gpsTracking.create({
            data: { vehicleId, date: dateObj, ...data },
          })
        }

        result.success++
      } catch (err) {
        result.failed++
        result.errors.push(`${vehicle.nopol} day_${day.day}: ${(err as Error).message}`)
      }
    }
  }

  result.total = result.success + result.failed
  return result
}
