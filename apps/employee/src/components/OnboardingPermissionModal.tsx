import React, { useState } from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPermissionsState, openAppSettings, requestAllPermissionsSequentially } from '../services/permissions'

type Props = {
  visible: boolean
  permissionsState: AppPermissionsState | null
  onCompleted: (newState: AppPermissionsState) => void
}

export function OnboardingPermissionModal({ visible, permissionsState, onCompleted }: Props) {
  const [requesting, setRequesting] = useState(false)

  async function handleGrant() {
    setRequesting(true)
    try {
      const newState = await requestAllPermissionsSequentially()
      onCompleted(newState)
    } finally {
      setRequesting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.badgeWrap}>
            <Text style={styles.badgeIcon}>🛡️</Text>
          </View>
          <Text style={styles.title}>Required Permissions</Text>
          <Text style={styles.subtitle}>
            Nire Employee requires location and notification access to automatically record attendance during your shift hours.
          </Text>

          <View style={styles.list}>
            <View style={styles.item}>
              <Text style={styles.itemIcon}>📍</Text>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>Location ("Allow All The Time")</Text>
                <Text style={styles.itemMuted}>Used to log shift location and visits automatically.</Text>
              </View>
            </View>

            <View style={styles.item}>
              <Text style={styles.itemIcon}>🔔</Text>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>Notifications</Text>
                <Text style={styles.itemMuted}>Shows your active shift status bar indicator.</Text>
              </View>
            </View>

            <View style={styles.item}>
              <Text style={styles.itemIcon}>🛰️</Text>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>GPS Location Services</Text>
                <Text style={styles.itemMuted}>Must be enabled on your phone for accuracy.</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity disabled={requesting} onPress={handleGrant} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {requesting ? 'Granting...' : 'Grant Required Permissions'}
            </Text>
          </TouchableOpacity>

          {permissionsState && !permissionsState.allGranted && (
            <TouchableOpacity onPress={openAppSettings} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Open System Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  badgeIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#18181b',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  list: {
    gap: 16,
    marginBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27272a',
  },
  itemMuted: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#3f3f46',
    fontSize: 14,
    fontWeight: '700',
  },
})