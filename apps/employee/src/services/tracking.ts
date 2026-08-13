import * as Application from 'expo-application'
import * as Battery from 'expo-battery'
import * as Device from 'expo-device'
import * as Location from 'expo-location'
import * as Network from 'expo-network'
import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { AppState, Platform } from 'react-native'
import { apiFetch } from '../lib/api'
import { getInstallationId } from '../lib/install'
import { LocationPayload, TrackingPolicy } from '../types'

export const LOCATION_TASK_NAME = 'nire-office-hours-location'
export const LOCATION_HEALTH_TASK_NAME = 'nire-location-health-check'

export async function requestLocationPermissions() {
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

export async function startOfficeTracking(policy: TrackingPolicy) {
  const permissions = await getLocationReadiness()
  await uploadDeviceStatus({ last_error: null })
  if (!permissions.foreground || !permissions.background || !permissions.servicesEnabled) {
    return { started: false, reason: 'Location permissions or services are missing.' }
  }

  const intervalMs = policy.sample_interval_minutes * 60 * 1000
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (alreadyStarted) {
    await registerLocationHealthCheck()
    return { started: true }
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: intervalMs,
    deferredUpdatesInterval: intervalMs,
    distanceInterval: 0,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Nire tracking active',
      notificationBody: 'Office-hours location tracking is running.',
      notificationColor: '#2563eb',
    },
  })

  await registerLocationHealthCheck()
  return { started: true }
}

export async function stopOfficeTracking() {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)

  const healthTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_HEALTH_TASK_NAME)
  if (healthTaskRegistered) await BackgroundTask.unregisterTaskAsync(LOCATION_HEALTH_TASK_NAME)
}

async function registerLocationHealthCheck() {
  const registered = await TaskManager.isTaskRegisteredAsync(LOCATION_HEALTH_TASK_NAME)
  if (registered) return

  await BackgroundTask.registerTaskAsync(LOCATION_HEALTH_TASK_NAME, {
    minimumInterval: 15,
  })
}

export function isWithinOfficeHours(policy: TrackingPolicy, now = new Date()) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startHour, startMinute] = policy.office_start_time.split(':').map(Number)
  const [endHour, endMinute] = policy.office_end_time.split(':').map(Number)
  const start = startHour * 60 + startMinute
  const end = endHour * 60 + endMinute

  if (start <= end) return currentMinutes >= start && currentMinutes <= end
  return currentMinutes >= start || currentMinutes <= end
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
