/**
 * Headless JS task that runs when Android AlarmManager fires.
 * Handles: 'start', 'stop', 'reschedule' actions.
 * This runs even when the app is fully closed.
 */
import { apiFetch } from '../lib/api'
import { getSavedTrackingPolicy, isWithinOfficeHours, startOfficeTracking, stopOfficeTracking } from './tracking'
import { scheduleTrackingAlarms } from './alarmScheduler'
import { TrackingPolicy } from '../types'

type HeadlessData = {
  action: 'start' | 'stop' | 'reschedule'
}

async function fetchLatestPolicy(): Promise<TrackingPolicy | null> {
  try {
    console.log('[HeadlessTracking] Fetching latest policy from server...')
    const me = await apiFetch<{ policy?: TrackingPolicy } | null>('/api/mobile/me')
    if (me?.policy) {
      console.log('[HeadlessTracking] Successfully fetched policy from server.')
      return me.policy
    }
  } catch (err) {
    console.log('[HeadlessTracking] Failed to fetch policy from server (offline?), falling back to local cache. Error:', err)
  }

  const localPolicy = await getSavedTrackingPolicy()
  console.log('[HeadlessTracking] Local cached policy:', localPolicy)
  return localPolicy
}

async function headlessTrackingTask(data: HeadlessData) {
  console.log('[HeadlessTracking] Task started with data:', data)
  const { action } = data

  try {
    if (action === 'stop') {
      console.log('[HeadlessTracking] Stopping office tracking...')
      await stopOfficeTracking(false)
      console.log('[HeadlessTracking] Office tracking stopped.')
    }

    const policy = await fetchLatestPolicy()
    if (!policy) {
      console.log('[HeadlessTracking] No tracking policy found (server & local cache empty). Aborting.')
      return
    }

    if (action === 'start') {
      console.log('[HeadlessTracking] Starting office tracking with policy:', policy)
      const result = await startOfficeTracking(policy)
      console.log('[HeadlessTracking] startOfficeTracking result:', result)
    }

    console.log('[HeadlessTracking] Rescheduling alarms...')
    await scheduleTrackingAlarms(policy)
    console.log('[HeadlessTracking] Alarms rescheduled successfully.')
  } catch (err) {
    console.error('[HeadlessTracking] Critical error in headless task:', err)
  }
}

export default headlessTrackingTask
