import { useRouter } from 'expo-router'
import { CalendarCheck, ChevronRight, ClipboardList, Clock3, MapPinned, Navigation, RefreshCw } from 'lucide-react-native'
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { ActionButton, Avatar, IconButton, LoadingScreen, Metric, Panel, PageTitle, Screen, SectionTitle, StatusPill } from '../../src/components/ui'
import { formatDay, formatTime } from '../../src/lib/format'
import { getAttendanceStatus } from '../../src/lib/attendanceStatus'
import { useApp } from '../../src/providers/AppProvider'
import { colors, radii, spacing } from '../../src/theme'

export default function HomePage() {
  const router = useRouter()
  const { data, attendance, visits, todayRecord, latestLocation, trackingMessage, loading, refreshing, refresh, refreshLocation } = useApp()

  if (!data && loading) return <LoadingScreen />
  if (!data) return <LoadingScreen label="Loading your employee workspace..." />

  const hasCheckedOut = Boolean(todayRecord?.clock_out_at)
  const attStatus = getAttendanceStatus(todayRecord, data.policy)
  const attendanceTitle = !todayRecord ? 'Ready to start your day' : hasCheckedOut ? 'Workday completed' : 'Checked in today'
  const attendanceDetail = !todayRecord
    ? 'Capture your current location to check in.'
    : hasCheckedOut
      ? `Checked out at ${formatTime(todayRecord.clock_out_at)}${attStatus ? ` (${attStatus.label})` : ''}`
      : `Checked in at ${formatTime(todayRecord.clock_in_at)}${attStatus ? ` (${attStatus.label})` : ''}`

  async function captureLocation() {
    try {
      await refreshLocation()
    } catch (error) {
      Alert.alert('Location unavailable', error instanceof Error ? error.message : 'Please check location access and try again.')
    }
  }

  function openMap() {
    if (!latestLocation) return
    void Linking.openURL(`https://www.openstreetmap.org/?mlat=${latestLocation.lat}&mlon=${latestLocation.lng}#map=17/${latestLocation.lat}/${latestLocation.lng}`)
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={() => void refresh()}>
      <View style={styles.topRow}>
        <PageTitle eyebrow={formatDay(new Date().toISOString())} title={`Hello, ${data.employee.full_name.split(' ')[0]}`} />
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/profile')}><Avatar name={data.employee.full_name} /></Pressable>
      </View>

      <View style={styles.workday}>
        <View style={styles.workdayTop}>
          <Text style={styles.workdayEyebrow}>Today&apos;s workday</Text>
          <StatusPill
            label={todayRecord ? (attStatus?.label ?? (hasCheckedOut ? 'Completed' : 'Checked in')) : 'Not checked in'}
            tone={todayRecord ? (attStatus?.tone ?? (hasCheckedOut ? 'blue' : 'teal')) : 'amber'}
          />
        </View>
        <Text style={styles.workdayTime}>{data.policy.office_start_time.slice(0, 5)} - {data.policy.office_end_time.slice(0, 5)}</Text>
        <Text style={styles.workdayMessage}>{attStatus ? `${attStatus.details} · ${trackingMessage}` : trackingMessage}</Text>
        <ActionButton label={todayRecord && !hasCheckedOut ? 'Open attendance' : todayRecord ? 'View attendance' : 'Check in now'} icon={CalendarCheck} tone="primary" onPress={() => router.push('/attendance')} />
      </View>

      <View style={styles.metrics}>
        <Metric icon={CalendarCheck} value={String(attendance.length)} label="Present days" />
        <Metric icon={ClipboardList} value={String(visits.length)} label="Recent visits" tone="teal" />
      </View>

      <SectionTitle title="Current location" action={<IconButton icon={RefreshCw} label="Refresh current location" onPress={() => void captureLocation()} disabled={loading} />} />
      <Panel>
        <View style={styles.locationHeading}><View style={styles.locationIcon}><Navigation size={19} color={colors.primary} strokeWidth={2.4} /></View><View style={styles.locationCopy}><Text style={styles.locationTitle}>{latestLocation?.address || 'Location not captured yet'}</Text><Text style={styles.locationMeta}>{latestLocation ? `Accuracy ${latestLocation.accuracy ? `${Math.round(latestLocation.accuracy)} m` : 'unknown'} - ${formatTime(latestLocation.recorded_at)}` : 'Use the refresh button to capture your current location.'}</Text></View></View>
        {latestLocation ? <Pressable onPress={openMap} style={({ pressed }) => [styles.mapRow, pressed && styles.pressed]}><MapPinned size={17} color={colors.primary} /><Text style={styles.mapRowText}>Open location on map</Text><ChevronRight size={17} color={colors.inkMuted} /></Pressable> : null}
      </Panel>

      <SectionTitle title="Attendance" action={<Pressable onPress={() => router.push('/attendance')}><Text style={styles.linkText}>View details</Text></Pressable>} />
      <Panel>
        <View style={styles.attendanceRow}><View style={styles.attendanceIcon}><Clock3 size={19} color={colors.teal} strokeWidth={2.4} /></View><View style={styles.locationCopy}><Text style={styles.locationTitle}>{attendanceTitle}</Text><Text style={styles.locationMeta}>{attendanceDetail}</Text></View><ChevronRight size={18} color={colors.inkMuted} /></View>
      </Panel>
    </Screen>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  workday: { backgroundColor: colors.navy, borderRadius: radii.lg, padding: spacing.lg, gap: 10 },
  workdayTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  workdayEyebrow: { color: '#C6D7F1', fontSize: 12, fontWeight: '800' },
  workdayTime: { color: colors.white, fontSize: 28, fontWeight: '900', letterSpacing: 0 },
  workdayMessage: { color: '#DDE9F9', fontSize: 13, lineHeight: 19, marginBottom: 4 },
  metrics: { flexDirection: 'row', gap: spacing.md },
  locationHeading: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  locationIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  locationCopy: { flex: 1, minWidth: 0, gap: 4 },
  locationTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '800' },
  locationMeta: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  mapRow: { minHeight: 48, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 9 },
  mapRowText: { flex: 1, color: colors.primary, fontSize: 13, fontWeight: '800' },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  attendanceIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.65 },
})
