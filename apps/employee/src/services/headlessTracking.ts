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
    const me = await apiFetch<{ policy?: TrackingPolicy } | null>('/api/mobile/me')
    return me?.policy ?? null
  } catch {
    // Fall back to locally cached policy if network is unavailable
    return getSavedTrackingPolicy()
  }
}

async function headlessTrackingTask(data: HeadlessData) {
  const { action } = data

  if (action === 'stop') {
    await stopOfficeTracking(false)
  }

  // Always re-fetch latest policy to pick up any admin changes, then reschedule
  const policy = await fetchLatestPolicy()
  if (!policy) return

  if (action === 'start') {
    await startOfficeTracking(policy)
  }

  // Reschedule alarms for the next occurrence (tomorrow or today if not yet passed)
  await scheduleTrackingAlarms(policy)
}

export default () => headlessTrackingTask
