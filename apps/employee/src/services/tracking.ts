import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Application from 'expo-application'
import * as Battery from 'expo-battery'
import * as Device from 'expo-device'
import * as Location from 'expo-location'
import * as Network from 'expo-network'
import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { AppState, PermissionsAndroid, Platform } from 'react-native'
import { apiFetch } from '../lib/api'
import { getInstallationId } from '../lib/install'
import { LocationPayload, TrackingPolicy } from '../types'
import { startTrackingService, stopTrackingService } from './alarmScheduler'

export const LOCATION_TASK_NAME = 'nire-office-hours-location'
export const LOCATION_HEALTH_TASK_NAME = 'nire-location-health-check'

const SCHEDULED_ADDRESS_INTERVAL_MS = 30 * 60 * 1000
const LAST_SCHEDULED_ADDRESS_AT_KEY = 'nire.lastScheduledAddressAt'
const TRACKING_POLICY_KEY = 'nire.trackingPolicy'
const LAST_SCHEDULED_UPLOAD_AT_KEY = 'nire.lastScheduledUploadAt'

export async function requestLocationPermissions() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => 'denied')
  }

  const foreground = await Location.requestForegroundPermissionsAsync()
  let background = await Location.getBackgroundPermissionsAsync()

  if (foreground.status === 'granted') {
    background = await Location.requestBackgroundPermissionsAsync()
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync()
  await uploadDeviceStatus({
    permission_foreground: foreground.status === 'granted',
    permission_background: background.status === 'granted',
    location_services_enabled: servicesEnabled,
    last_error: null,
  })

  return {
    foreground: foreground.status === 'granted',
    background: background.status === 'granted',
    servicesEnabled,
  }
}

export async function getLocationReadiness() {
  const [foreground, background, servicesEnabled] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Location.hasServicesEnabledAsync(),
  ])

  return {
    foreground: foreground.status === 'granted',
    background: background.status === 'granted',
    servicesEnabled,
  }
}

export async function uploadDeviceStatus(extra: Record<string, unknown> = {}) {
  const installationId = await getInstallationId()
  const readiness = await getLocationReadiness()

  await apiFetch('/api/mobile/device-status', {
    method: 'POST',
    body: JSON.stringify({
      installation_id: installationId,
      platform: Platform.OS,
      app_version: Application.nativeApplicationVersion,
      device_name: Device.deviceName,
      os_version: Device.osVersion,
      permission_foreground: readiness.foreground,
      permission_background: readiness.background,
      location_services_enabled: readiness.servicesEnabled,
      ...extra,
    }),
  })
}

export async function captureCurrentLocation(source: LocationPayload['source'] = 'manual') {
  const installationId = await getInstallationId()
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })

    return normalizeLocation(location, source, installationId)
  } catch (error) {
    void uploadDeviceStatus({
      last_error: error instanceof Error ? error.message : 'Location capture failed',
    }).catch(() => undefined)
    throw error
  }
}

export async function uploadLocationSamples(samples: LocationPayload[]) {
  if (samples.length === 0) return

  const batteryLevel = await Battery.getBatteryLevelAsync().catch(() => null)
  const batteryState = await Battery.getBatteryStateAsync().catch(() => null)
  const networkState = await Network.getNetworkStateAsync().catch(() => null)

  await apiFetch('/api/mobile/location-samples', {
    method: 'POST',
    body: JSON.stringify({
      samples: samples.map((sample) => ({
        ...sample,
        battery_level: batteryLevel,
        is_charging: batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL,
        network_type: networkState?.type ?? null,
        app_state: AppState.currentState,
      })),
    }),
  })

  // A successful location sample proves the service is available and clears prior errors.
  await uploadDeviceStatus({ last_error: null })
}

export async function dueScheduledSamples(samples: LocationPayload[]) {
  if (samples.length === 0) return samples

  const policy = await getSavedTrackingPolicy()
  const intervalMs = Math.max(policy?.sample_interval_minutes ?? 30, 1) * 60 * 1000
  const storedTimestamp = Number(await AsyncStorage.getItem(LAST_SCHEDULED_UPLOAD_AT_KEY))
  let lastUploadedAt = Number.isFinite(storedTimestamp) ? storedTimestamp : Number.NEGATIVE_INFINITY
  const dueSamples: LocationPayload[] = []

  for (const sample of [...samples].sort((left, right) => Date.parse(left.recorded_at ?? '') - Date.parse(right.recorded_at ?? ''))) {
    const recordedAt = Date.parse(sample.recorded_at ?? '')
    if (!Number.isFinite(recordedAt) || recordedAt - lastUploadedAt < intervalMs) continue
    dueSamples.push(sample)
    lastUploadedAt = recordedAt
  }

  return dueSamples
}

export async function markScheduledSamplesUploaded(samples: LocationPayload[]) {
  const latestTimestamp = samples.reduce((latest, sample) => {
    const timestamp = Date.parse(sample.recorded_at ?? '')
    return Number.isFinite(timestamp) && timestamp > latest ? timestamp : latest
  }, Number.NEGATIVE_INFINITY)

  if (Number.isFinite(latestTimestamp)) {
    await AsyncStorage.setItem(LAST_SCHEDULED_UPLOAD_AT_KEY, String(latestTimestamp))
  }
}

export async function addScheduledAddressIfDue(samples: LocationPayload[]) {
  if (samples.length === 0) return samples

  const savedPolicy = await getSavedTrackingPolicy()
  if (savedPolicy && !isWithinOfficeHours(savedPolicy)) return samples

  const lastLookupAt = Number(await AsyncStorage.getItem(LAST_SCHEDULED_ADDRESS_AT_KEY))
  if (Number.isFinite(lastLookupAt) && Date.now() - lastLookupAt < SCHEDULED_ADDRESS_INTERVAL_MS) {
    return samples
  }

  const sampleIndex = samples.length - 1
  const sample = samples[sampleIndex]
  try {
    const result = await apiFetch<{ address: string | null }>(
      `/api/mobile/location-name?lat=${encodeURIComponent(sample.lat)}&lng=${encodeURIComponent(sample.lng)}`
    )
    if (!result.address) return samples

    const enrichedSamples = [...samples]
    enrichedSamples[sampleIndex] = { ...sample, address: result.address }
    await AsyncStorage.setItem(LAST_SCHEDULED_ADDRESS_AT_KEY, String(Date.now()))
    return enrichedSamples
  } catch {
    // Keep live coordinate uploads running when the address provider is unavailable.
    return samples
  }
}

export async function startOfficeTracking(policy: TrackingPolicy) {
  await AsyncStorage.setItem(TRACKING_POLICY_KEY, JSON.stringify(policy))
  const permissions = await getLocationReadiness()
  console.log('[Tracking] startOfficeTracking permissions:', JSON.stringify(permissions))
  await uploadDeviceStatus({
    last_error: null,
    permission_foreground: permissions.foreground,
    permission_background: permissions.background,
    location_services_enabled: permissions.servicesEnabled,
  })
  if (!permissions.foreground || !permissions.background || !permissions.servicesEnabled) {
    const missing = [
      !permissions.foreground && 'foreground location',
      !permissions.background && 'background location (Allow all the time)',
      !permissions.servicesEnabled && 'GPS/location services',
    ].filter(Boolean).join(', ')
    console.warn(`[Tracking] Cannot start: missing ${missing}`)
    return { started: false, reason: `Missing permissions: ${missing}. Please allow location access (all the time) in Settings.` }
  }

  const intervalMs = policy.sample_interval_minutes * 60 * 1000
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (alreadyStarted) {
    await registerLocationHealthCheck()
    await startTrackingService().catch(() => undefined)
    return { started: true }
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: intervalMs,
    distanceInterval: 0,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Nire tracking active',
      notificationBody: 'Office-hours location tracking is running.',
      notificationColor: '#2563eb',
    },
  })

  await registerLocationHealthCheck()
  await startTrackingService().catch(() => undefined)
  return { started: true }
}

export async function stopOfficeTracking(completely: boolean = false) {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
  await stopTrackingService().catch(() => undefined)

  if (completely) {
    const healthTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_HEALTH_TASK_NAME)
    if (healthTaskRegistered) await BackgroundTask.unregisterTaskAsync(LOCATION_HEALTH_TASK_NAME)
  }
}

async function registerLocationHealthCheck() {
  const registered = await TaskManager.isTaskRegisteredAsync(LOCATION_HEALTH_TASK_NAME)
  if (registered) return

  await BackgroundTask.registerTaskAsync(LOCATION_HEALTH_TASK_NAME, {

    minimumInterval: 15,
  })
}

export async function getSavedTrackingPolicy() {
  const rawPolicy = await AsyncStorage.getItem(TRACKING_POLICY_KEY)
  if (!rawPolicy) return null

  try {
    const policy = JSON.parse(rawPolicy) as TrackingPolicy
    return policy.office_start_time && policy.office_end_time ? policy : null
  } catch {
    return null
  }
}

export function isWithinOfficeHours(policy: TrackingPolicy, now = new Date()) {
  try {
    // Use the policy's configured timezone so the check is correct regardless of device timezone
    const tz = policy.timezone ?? 'Asia/Karachi'
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now)
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
    const currentMinutes = hour * 60 + minute

    const [startHour, startMinute] = policy.office_start_time.split(':').map(Number)
    const [endHour, endMinute] = policy.office_end_time.split(':').map(Number)
    const start = startHour * 60 + startMinute
    // Add grace period as a trailing buffer so the last samples at shift end are never missed
    const graceMins = policy.grace_period_minutes ?? 0
    const end = endHour * 60 + endMinute + graceMins

    const result = start <= end
      ? currentMinutes >= start && currentMinutes <= end
      : currentMinutes >= start || currentMinutes <= end

    console.log(`[Tracking] isWithinOfficeHours: ${hour}:${String(minute).padStart(2, '0')} (${tz}) | window=${policy.office_start_time}-${policy.office_end_time}+${graceMins}min | active=${result}`)
    return result
  } catch {
    // Fallback: compare using device local time
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const [startHour, startMinute] = policy.office_start_time.split(':').map(Number)
    const [endHour, endMinute] = policy.office_end_time.split(':').map(Number)
    const start = startHour * 60 + startMinute
    const end = endHour * 60 + endMinute + (policy.grace_period_minutes ?? 0)
    if (start <= end) return currentMinutes >= start && currentMinutes <= end
    return currentMinutes >= start || currentMinutes <= end
  }
}

export function normalizeLocation(
  location: Location.LocationObject,
  source: LocationPayload['source'],
  installationId: string
) {
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy,
    mocked: location.mocked ?? null,
    recorded_at: new Date(location.timestamp).toISOString(),
    source,
    installation_id: installationId,
  }
}
