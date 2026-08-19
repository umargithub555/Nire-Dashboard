import { NativeModules, Platform } from 'react-native'
import { TrackingPolicy } from '../types'

const { TrackingAlarmModule } = NativeModules

/**
 * Computes next epoch timestamps for start and end alarms.
 * If today's window is already past, schedules for tomorrow.
 */
function computeNextAlarmTimes(policy: TrackingPolicy): { startMs: number; endMs: number } {
  const now = new Date()

  const [startHour, startMin] = policy.office_start_time.split(':').map(Number)
  const [endHour, endMin] = policy.office_end_time.split(':').map(Number)

  // Build today's start/end Date objects
  let startDate = new Date(now)
  startDate.setHours(startHour, startMin, 0, 0)

  let endDate = new Date(now)
  endDate.setHours(endHour, endMin, 0, 0)

  // If end is before start in clock time, end is next day (overnight shift)
  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1)
  }

  const nowMs = now.getTime()

  // If both alarms are already past for today, schedule for tomorrow
  if (startDate.getTime() <= nowMs && endDate.getTime() <= nowMs) {
    startDate.setDate(startDate.getDate() + 1)
    endDate.setDate(endDate.getDate() + 1)
  }

  return { startMs: startDate.getTime(), endMs: endDate.getTime() }
}

/**
 * Schedules exact alarms for the next tracking window.
 * Cancels any previously set alarms first.
 * Safe to call multiple times — idempotent.
 */
export async function scheduleTrackingAlarms(policy: TrackingPolicy): Promise<void> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return

  const { startMs, endMs } = computeNextAlarmTimes(policy)
  await TrackingAlarmModule.scheduleAlarms(startMs, endMs)
}

/**
 * Cancels all pending tracking alarms. Called on sign-out.
 */
export async function cancelTrackingAlarms(): Promise<void> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return
  await TrackingAlarmModule.cancelAlarms()
}

/**
 * Returns true if the app can schedule exact alarms.
 * On Android 12+, this requires user permission.
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return false
  return TrackingAlarmModule.canScheduleExactAlarms()
}

/**
 * Opens Android system settings for Alarms & Reminders permission.
 */
export async function openAlarmPermissionSettings(): Promise<void> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return
  await TrackingAlarmModule.openAlarmPermissionSettings()
}
