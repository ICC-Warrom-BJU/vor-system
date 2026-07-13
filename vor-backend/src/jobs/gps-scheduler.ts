import cron from 'node-cron'
import { syncMonthlyGpsData, writeGpsSyncLog } from '../services/gps-integration'

const GPS_SYNC_ENABLED = process.env.GPS_SYNC_ENABLED === 'true'
const GPS_SYNC_CRON = process.env.GPS_SYNC_CRON || '0 2 * * *'

export function startGpsScheduler() {
  if (!GPS_SYNC_ENABLED || !process.env.GPS_API_KEY) {
    console.log('[GPS Scheduler] Disabled. Set GPS_SYNC_ENABLED=true and GPS_API_KEY in .env')
    return
  }

  cron.schedule(GPS_SYNC_CRON, async () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    console.log(`[GPS Scheduler] Starting sync for ${year}-${String(month).padStart(2, '0')}...`)

    try {
      const result = await syncMonthlyGpsData(year, month)
      console.log(`[GPS Scheduler] Done: ${result.success} success, ${result.failed} failed`)
      await writeGpsSyncLog({ triggeredBy: null, scope: 'ALL', year, month, result })

      if (result.errors.length > 0) {
        console.log(`[GPS Scheduler] Errors (${result.errors.length}):`)
        result.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`))
      }
    } catch (err) {
      console.error('[GPS Scheduler] Sync failed:', (err as Error).message)
      await writeGpsSyncLog({ triggeredBy: null, scope: 'ALL', year, month, result: null, hardError: (err as Error).message })
    }
  })

  console.log(`[GPS Scheduler] Running with cron: ${GPS_SYNC_CRON} (${process.env.TZ || 'UTC'})`)
}

export function logGpsStatus() {
  console.log(`[GPS Scheduler] GPS_SYNC_ENABLED=${GPS_SYNC_ENABLED}`)
  console.log(`[GPS Scheduler] GPS_API_KEY=${process.env.GPS_API_KEY ? '***' : 'not set'}`)
  console.log(`[GPS Scheduler] GPS_SYNC_CRON=${GPS_SYNC_CRON}`)
}
