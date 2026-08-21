import { NativeModules, Platform } from 'react-native'
import { TrackingPolicy } from '../types'

const { TrackingAlarmModule } = NativeModules

function getNextOccurrence(hour: number, minute: number, now: Date): Date {
  const date = new Date(now)
  date.setHours(hour, minute, 0, 0)
  if (date.getTime() <= now.getTime()) {
    date.setDate(date.getDate() + 1)
  }
  return date
}

function computeNextAlarmTimes(policy: TrackingPolicy): { startMs: number; endMs: number } {
  const now = new Date()
  const [startHour, startMin] = policy.office_start_time.split(':').map(Number)
  const [endHour, endMin] = policy.office_end_time.split(':').map(Number)
  const startDate = getNextOccurrence(startHour, startMin, now)
  const endDate = getNextOccurrence(endHour, endMin, now)
  return { startMs: startDate.getTime(), endMs: endDate.getTime() }
}

export async function startTrackingService(): Promise<void> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return
  try {
    await TrackingAlarmModule.startTrackingService()
    console.log('[AlarmScheduler] Foreground tracking service started.')
  } catch (e) {
    console.error('[AlarmScheduler] Failed to start foreground service:', e)
  }
}

export async function stopTrackingService(): Promise<void> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return
  try {
    await TrackingAlarmModule.stopTrackingService()
    console.log('[AlarmScheduler] Foreground tracking service stopped.')
  } catch (e) {
    console.error('[AlarmScheduler] Failed to stop foreground service:', e)
  }
}

export async function scheduleTrackingAlarms(policy: TrackingPolicy): Promise<void> {
  console.log('[AlarmScheduler] scheduleTrackingAlarms called')
  if (Platform.OS !== 'android' || !TrackingAlarmModule) {
    console.log('[AlarmScheduler] Module missing:', !!TrackingAlarmModule)
    return
  }

  const { startMs, endMs } = computeNextAlarmTimes(policy)
  const startStr = new Date(startMs).toLocaleTimeString()
  const endStr = new Date(endMs).toLocaleTimeString()
  console.log('[AlarmScheduler] Next START alarm: ' + startStr + '  |  Next STOP alarm: ' + endStr)

  try {
    await TrackingAlarmModule.scheduleAlarms(startMs, endMs)
    console.log('[AlarmScheduler] Alarms saved to AlarmManager successfully.')
  } catch (err) {
    console.error('[AlarmScheduler] Failed to set alarms', err)
  }
}

export async function cancelTrackingAlarms(): Promise<void> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return
  await TrackingAlarmModule.cancelAlarms()
}

export async function saveAuthTokenForBackground(token: string, apiBaseUrl: string, installationId: string, policyJson?: string): Promise<void> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return
  try {
    await TrackingAlarmModule.saveAuthToken(token, apiBaseUrl, installationId, policyJson ?? '{}')
    console.log('[AlarmScheduler] Auth token + Policy saved for background service.')
  } catch (e) {
    console.error('[AlarmScheduler] Failed to save auth token', e)
  }
}

export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return false
  try {
    return await TrackingAlarmModule.canScheduleExactAlarms()
  } catch {
    return false
  }
}

export async function openAlarmPermissionSettings(): Promise<void> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return
  await TrackingAlarmModule.openAlarmPermissionSettings()
}

export async function isBatteryOptimizationIgnored(): Promise<boolean> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return true
  try {
    return await TrackingAlarmModule.isBatteryOptimizationIgnored()
  } catch {
    return true
  }
}

export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return
  try {
    await TrackingAlarmModule.requestIgnoreBatteryOptimization()
  } catch (e) {
    console.warn('[AlarmScheduler] Battery optimization request failed:', e)
  }
}

export async function openAutostartSettings(): Promise<void> {
  if (Platform.OS !== 'android' || !TrackingAlarmModule) return
  try {
    await TrackingAlarmModule.openAutostartSettings()
  } catch (e) {
    console.warn('[AlarmScheduler] Failed to open autostart settings:', e)
  }
}
