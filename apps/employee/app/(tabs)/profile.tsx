import { Building2, CalendarClock, LogOut, MapPin, ShieldCheck, Smartphone, UserRoundCheck } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { ActionButton, Avatar, LoadingScreen, PageTitle, Panel, Screen, SectionTitle, StatusPill } from '../../src/components/ui'
import { useApp } from '../../src/providers/AppProvider'
import { colors, radii, spacing } from '../../src/theme'

export default function ProfilePage() {
  const { data, loading, requestLocationAccess, signOut, trackingMessage } = useApp()
  const [checking, setChecking] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  if (!data && loading) return <LoadingScreen />
  if (!data) return <LoadingScreen label="Loading profile..." />

  async function checkPermissions() {
    setChecking(true)
    try {
      const result = await requestLocationAccess()
      Alert.alert(
        'Location access',
        result.foreground && result.background && result.servicesEnabled
          ? 'Location access is ready for attendance and office-hours tracking.'
          : 'Allow location all the time and keep device location services enabled for office-hours tracking.'
      )
    } catch (error) {
      Alert.alert('Could not check location access', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setChecking(false)
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out of Nire?', 'Scheduled tracking stops on this device once you sign out.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void performSignOut() },
    ])
  }

  async function performSignOut() {
    setSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      Alert.alert('Could not sign out', error instanceof Error ? error.message : 'Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <Screen scroll>
      <PageTitle eyebrow="Your account" title="Profile" />

      <Panel>
        <View style={styles.person}><Avatar name={data.employee.full_name} size={58} /><View style={styles.personCopy}><Text style={styles.name}>{data.employee.full_name}</Text><Text style={styles.role}>{data.employee.designation || 'Employee'}</Text><StatusPill label="Active account" tone="teal" /></View></View>
        <View style={styles.detailList}>
          <Detail icon={Building2} label="Branch" value={data.employee.branch?.name || 'Not assigned'} />
          <Detail icon={UserRoundCheck} label="Work email" value={data.employee.email} />
        </View>
      </Panel>

      <SectionTitle title="Tracking" />
      <Panel>
        <View style={styles.trackingHeader}><View style={styles.trackingIcon}><MapPin size={19} color={colors.teal} strokeWidth={2.4} /></View><View style={styles.trackingCopy}><Text style={styles.trackingTitle}>Office-hours tracking</Text><Text style={styles.trackingText}>{trackingMessage}</Text></View></View>
        <View style={styles.policyRow}><CalendarClock size={17} color={colors.primary} /><Text style={styles.policyText}>{data.policy.office_start_time.slice(0, 5)} - {data.policy.office_end_time.slice(0, 5)} ? Every {data.policy.sample_interval_minutes} minutes</Text></View>
        <ActionButton label="Check location access" icon={ShieldCheck} tone="soft" loading={checking} onPress={() => void checkPermissions()} />
      </Panel>

      <SectionTitle title="Device" />
      <Panel>
        <View style={styles.device}><View style={styles.deviceIcon}><Smartphone size={19} color={colors.primary} /></View><View style={styles.trackingCopy}><Text style={styles.trackingTitle}>This device</Text><Text style={styles.trackingText}>Location access is used for attendance, visits, and scheduled workday samples.</Text></View></View>
      </Panel>

      <ActionButton label="Sign out" icon={LogOut} tone="danger" loading={signingOut} onPress={confirmSignOut} />
    </Screen>
  )
}

function Detail({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return <View style={styles.detail}><Icon size={17} color={colors.inkMuted} /><View style={styles.detailCopy}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View></View>
}

const styles = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  personCopy: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  role: { color: colors.inkMuted, fontSize: 13, marginBottom: 4 },
  detailList: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
  detail: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailCopy: { flex: 1, minWidth: 0 },
  detailLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  detailValue: { color: colors.ink, fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 2 },
  trackingHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  trackingIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tealSoft },
  trackingCopy: { flex: 1, minWidth: 0 },
  trackingTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  trackingText: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceMuted, padding: spacing.md, borderRadius: radii.md, marginVertical: spacing.lg },
  policyText: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '800' },
  device: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  deviceIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
})
