import { Linking, PermissionsAndroid, Platform } from 'react-native'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { uploadDeviceStatus } from './tracking'

import { isBatteryOptimizationIgnored, requestBatteryOptimizationExemption } from './alarmScheduler'

export type AppPermissionsState = {
  foregroundLocation: boolean
  backgroundLocation: boolean
  notifications: boolean
  locationServices: boolean
  batteryOptimizationIgnored: boolean
  allGranted: boolean
}

const ONBOARDING_COMPLETED_KEY = 'nire.onboarding_permissions_completed'

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY)
    return value === 'true'
  } catch {
    return false
  }
}

export async function markOnboardingCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
  } catch {}
}

export async function checkAllPermissions(): Promise<AppPermissionsState> {
  try {
    const [fgRes, bgRes, servicesEnabled, batteryIgnored] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
      Location.hasServicesEnabledAsync(),
      isBatteryOptimizationIgnored(),
    ])

    let notifGranted = true
    if (Platform.OS === 'android') {
      const version = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10)
      if (version >= 33) {
        const permission = (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS || 'android.permission.POST_NOTIFICATIONS'
        notifGranted = await PermissionsAndroid.check(permission).catch(() => false)
      }
    }

    const foregroundLocation = fgRes.status === 'granted'
    const backgroundLocation = bgRes.status === 'granted'
    const notifications = notifGranted
    const locationServices = servicesEnabled
    const batteryOptimizationIgnored = batteryIgnored

    const allGranted = foregroundLocation && backgroundLocation && notifications && locationServices

    return {
      foregroundLocation,
      backgroundLocation,
      notifications,
      locationServices,
      batteryOptimizationIgnored,
      allGranted,
    }
  } catch {
    return {
      foregroundLocation: false,
      backgroundLocation: false,
      notifications: false,
      locationServices: false,
      batteryOptimizationIgnored: false,
      allGranted: false,
    }
  }
}

export async function requestForegroundLocationPermission(): Promise<boolean> {
  try {
    const res = await Location.requestForegroundPermissionsAsync()
    void uploadDeviceStatus({ permission_foreground: res.status === 'granted' }).catch(() => undefined)
    return res.status === 'granted'
  } catch {
    return false
  }
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  try {
    const fg = await Location.getForegroundPermissionsAsync()
    if (fg.status !== 'granted') {
      const fgReq = await Location.requestForegroundPermissionsAsync()
      if (fgReq.status !== 'granted') return false
    }
    const bgRes = await Location.requestBackgroundPermissionsAsync()
    void uploadDeviceStatus({ permission_background: bgRes.status === 'granted' }).catch(() => undefined)
    return bgRes.status === 'granted'
  } catch {
    return false
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const version = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10)
      if (version >= 33) {
        const permission = (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS || 'android.permission.POST_NOTIFICATIONS'
        const isGranted = await PermissionsAndroid.check(permission).catch(() => false)
        if (isGranted) return true

        const granted = await PermissionsAndroid.request(permission).catch(() => 'denied')
        return granted === PermissionsAndroid.RESULTS.GRANTED
      }
    }
    return true
  } catch {
    return false
  }
}

export async function requestAllPermissionsSequentially(): Promise<AppPermissionsState> {
  await requestNotificationPermission()
  await new Promise((r) => setTimeout(r, 400))
  await requestForegroundLocationPermission()
  await new Promise((r) => setTimeout(r, 400))
  await requestBackgroundLocationPermission()
  await new Promise((r) => setTimeout(r, 400))
  await requestBatteryOptimizationExemption().catch(() => undefined)
  await markOnboardingCompleted()
  return await checkAllPermissions()
}

export function openAppSettings(): void {
  void Linking.openSettings()
}