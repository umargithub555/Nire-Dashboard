import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Employee, TrackingPolicy } from '../types'
import { formatTimeString } from '../lib/format'
import {
  AppPermissionsState,
  openAppSettings,
  requestBackgroundLocationPermission,
  requestForegroundLocationPermission,
  requestNotificationPermission,
} from '../services/permissions'
import { openAutostartSettings, requestBatteryOptimizationExemption } from '../services/alarmScheduler'

type Props = {
  employee: Employee
  policy: TrackingPolicy
  permissionsState: AppPermissionsState | null
  onRefreshPermissions: () => Promise<void> | void
  onSignOut: () => void
}

export function ProfileView({
  employee,
  policy,
  permissionsState,
  onRefreshPermissions,
  onSignOut,
}: Props) {
  async function handleForegroundLocation() {
    await requestForegroundLocationPermission()
    await onRefreshPermissions()
  }

  async function handleBackgroundLocation() {
    // On Android 11+, this opens the system Location settings page for the user to pick "Allow all the time"
    await requestBackgroundLocationPermission()
    await onRefreshPermissions()
  }

  async function handleNotification() {
    await requestNotificationPermission()
    await onRefreshPermissions()
  }

  async function handleRefreshStatus() {
    await onRefreshPermissions()
  }

  return (
    <View style={styles.stack}>
      {/* Employee Profile Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{employee.full_name?.charAt(0) ?? 'E'}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{employee.full_name}</Text>
            <Text style={styles.email}>{employee.email}</Text>
            <Text style={styles.shift}>
              Shift: {formatTimeString(policy.office_start_time)} – {formatTimeString(policy.office_end_time)}
            </Text>
          </View>
        </View>
      </View>

      {/* Permissions Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Permissions & System Health</Text>
        <Text style={styles.cardMuted}>
          If location tracking is paused or any option was declined, enable it below.
        </Text>

        <View style={styles.permList}>
          {/* Foreground Location */}
          <View style={styles.permItem}>
            <View style={styles.permLeft}>
              <Text style={styles.permIcon}>📍</Text>
              <View style={styles.permTextWrap}>
                <Text style={styles.permTitle}>Foreground Location</Text>
                <Text style={styles.permSub}>Required for check-ins</Text>
              </View>
            </View>
            {permissionsState?.foregroundLocation ? (
              <View style={styles.grantedBadge}>
                <Text style={styles.grantedText}>Granted</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleForegroundLocation} style={styles.enableButton}>
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Background Location */}
          <View style={styles.permItem}>
            <View style={styles.permLeft}>
              <Text style={styles.permIcon}>🗺️</Text>
              <View style={styles.permTextWrap}>
                <Text style={styles.permTitle}>Background Location</Text>
                <Text style={styles.permSub}>Set to "Allow all the time"</Text>
              </View>
            </View>
            {permissionsState?.backgroundLocation ? (
              <View style={styles.grantedBadge}>
                <Text style={styles.grantedText}>Allow All The Time</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleBackgroundLocation} style={styles.enableButton}>
                <Text style={styles.enableButtonText}>Allow All Time</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notifications */}
          <View style={styles.permItem}>
            <View style={styles.permLeft}>
              <Text style={styles.permIcon}>🔔</Text>
              <View style={styles.permTextWrap}>
                <Text style={styles.permTitle}>Notifications</Text>
                <Text style={styles.permSub}>Active shift status bar icon</Text>
              </View>
            </View>
            {permissionsState?.notifications ? (
              <View style={styles.grantedBadge}>
                <Text style={styles.grantedText}>Granted</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleNotification} style={styles.enableButton}>
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location Services */}
          <View style={styles.permItem}>
            <View style={styles.permLeft}>
              <Text style={styles.permIcon}>🛰️</Text>
              <View style={styles.permTextWrap}>
                <Text style={styles.permTitle}>GPS Location Services</Text>
                <Text style={styles.permSub}>Device hardware location</Text>
              </View>
            </View>
            {permissionsState?.locationServices ? (
              <View style={styles.grantedBadge}>
                <Text style={styles.grantedText}>Enabled</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={openAppSettings} style={styles.enableButton}>
                <Text style={styles.enableButtonText}>Turn On GPS</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Battery Optimization */}
          <View style={styles.permItem}>
            <View style={styles.permLeft}>
              <Text style={styles.permIcon}>🔋</Text>
              <View style={styles.permTextWrap}>
                <Text style={styles.permTitle}>Unrestricted Battery</Text>
                <Text style={styles.permSub}>Prevents Android killing background tracking</Text>
              </View>
            </View>
            {permissionsState?.batteryOptimizationIgnored ? (
              <View style={styles.grantedBadge}>
                <Text style={styles.grantedText}>Unrestricted</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={async () => { await requestBatteryOptimizationExemption(); await onRefreshPermissions(); }} style={styles.enableButton}>
                <Text style={styles.enableButtonText}>Allow</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Autostart (Xiaomi / Poco / Samsung / Oppo) */}
          <View style={styles.permItem}>
            <View style={styles.permLeft}>
              <Text style={styles.permIcon}>⚡</Text>
              <View style={styles.permTextWrap}>
                <Text style={styles.permTitle}>Autostart & Background Start</Text>
                <Text style={styles.permSub}>Required on Xiaomi/Poco/Samsung</Text>
              </View>
            </View>
            <TouchableOpacity onPress={openAutostartSettings} style={styles.enableButton}>
              <Text style={styles.enableButtonText}>Configure</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => void handleRefreshStatus()} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>↻ Refresh Permission Status</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={openAppSettings} style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Open Android App Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity onPress={onSignOut} style={styles.dangerButton}>
        <Text style={styles.dangerButtonText}>Sign out of Nire Employee</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18181b',
  },
  email: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 2,
  },
  shift: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '700',
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#18181b',
  },
  cardMuted: {
    fontSize: 13,
    color: '#71717a',
    marginTop: -4,
  },
  permList: {
    gap: 12,
    marginTop: 6,
  },
  permItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  permLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  permIcon: {
    fontSize: 18,
  },
  permTextWrap: {
    flex: 1,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27272a',
  },
  permSub: {
    fontSize: 12,
    color: '#71717a',
  },
  grantedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  grantedText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '800',
  },
  enableButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  refreshButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  refreshButtonText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 13,
  },
  outlineButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  outlineButtonText: {
    color: '#3f3f46',
    fontWeight: '800',
    fontSize: 13,
  },
  dangerButton: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#dc2626',
    fontWeight: '800',
    fontSize: 14,
  },
})