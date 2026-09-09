import React, { useState } from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPermissionsState, openAppSettings, requestAllPermissionsSequentially } from '../services/permissions'

type Props = {
  visible: boolean
  permissionsState: AppPermissionsState | null
  onCompleted: (newState: AppPermissionsState) => void
  onDismiss: () => void
}

export function OnboardingPermissionModal({ visible, permissionsState, onCompleted, onDismiss }: Props) {
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} accessibilityLabel="Close">
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

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
                <Text style={styles.itemTitle}>Location (&quot;Allow All The Time&quot;)</Text>
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
              <Text style={styles.itemIcon}>⚡</Text>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>Battery (Unrestricted)</Text>
                <Text style={styles.itemMuted}>Allows background tracking while phone is locked.</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity disabled={requesting} onPress={handleGrant} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {requesting ? 'Granting...' : 'Grant Required Permissions'}
            </Text>
          </TouchableOpacity>

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={openAppSettings} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>System Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onDismiss} style={styles.continueButton}>
              <Text style={styles.continueButtonText}>Continue to App</Text>
            </TouchableOpacity>
          </View>
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
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#71717a',
    fontWeight: '700',
  },
  badgeWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  badgeIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#18181b',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  list: {
    gap: 14,
    marginBottom: 20,
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
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#3f3f46',
    fontSize: 13,
    fontWeight: '700',
  },
  continueButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '800',
  },
})