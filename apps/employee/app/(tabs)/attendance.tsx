import { CalendarCheck, CheckCircle2, Circle, MapPinned, Navigation, ShieldCheck } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { ActionButton, EmptyState, LoadingScreen, Panel, PageTitle, Screen, SectionTitle, StatusPill } from '../../src/components/ui'
import { formatDate, formatTime } from '../../src/lib/format'
import { useApp } from '../../src/providers/AppProvider'
import { colors, radii, spacing } from '../../src/theme'

export default function AttendancePage() {
  const { data, attendance, latestLocation, todayRecord, loading, refreshing, refresh, submitAttendance } = useApp()
  const [submitting, setSubmitting] = useState<'in' | 'out' | null>(null)

  if (!data && loading) return <LoadingScreen />
  if (!data) return <LoadingScreen label="Loading attendance..." />

  const checkedOut = Boolean(todayRecord?.clock_out_at)
  const action = !todayRecord ? 'in' : checkedOut ? null : 'out'
  const actionLabel = action === 'in' ? 'Check in with current location' : 'Check out with current location'

  async function submit() {
    if (!action) return
    setSubmitting(action)
    try {
      await submitAttendance(action)
    } catch (error) {
      Alert.alert('Attendance could not be saved', error instanceof Error ? error.message : 'Please check location access and try again.')
    } finally {
      setSubmitting(null)
    }
  }

  function openMap() {
    if (!latestLocation) return
    void Linking.openURL(`https://www.openstreetmap.org/?mlat=${latestLocation.lat}&mlon=${latestLocation.lng}#map=17/${latestLocation.lat}/${latestLocation.lng}`)
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={() => void refresh()}>
      <PageTitle eyebrow={formatDate(new Date().toISOString())} title="Attendance" />

      <View style={styles.hero}>
        <View style={styles.heroTop}><View><Text style={styles.heroEyebrow}>Today</Text><Text style={styles.heroTitle}>{checkedOut ? 'Workday complete' : todayRecord ? 'You are checked in' : 'Ready when you are'}</Text></View><StatusPill label={checkedOut ? 'Complete' : todayRecord ? 'Active' : 'Pending'} tone={checkedOut ? 'blue' : todayRecord ? 'teal' : 'amber'} /></View>
        <View style={styles.timeline}>
          <TimelineItem title="Check in" value={todayRecord ? formatTime(todayRecord.clock_in_at) : 'Not yet recorded'} complete={Boolean(todayRecord)} />
          <View style={styles.timelineLine} />
          <TimelineItem title="Check out" value={checkedOut ? formatTime(todayRecord?.clock_out_at) : 'Pending'} complete={checkedOut} />
        </View>
        {action ? <ActionButton label={actionLabel} icon={CalendarCheck} tone={action === 'in' ? 'primary' : 'dark'} loading={submitting !== null} onPress={() => void submit()} /> : <View style={styles.completeNote}><CheckCircle2 size={18} color={colors.teal} /><Text style={styles.completeText}>Your attendance has been completed for today.</Text></View>}
      </View>

      <SectionTitle title="Location for attendance" />
      <Panel>
        <View style={styles.locationRow}><View style={styles.locationIcon}><Navigation size={19} color={colors.primary} strokeWidth={2.4} /></View><View style={styles.locationCopy}><Text style={styles.locationTitle}>{latestLocation?.address || 'Current location will be captured when you check in or out.'}</Text><Text style={styles.locationMeta}>{latestLocation ? `Accuracy ${latestLocation.accuracy ? `${Math.round(latestLocation.accuracy)} m` : 'unknown'} ? Last updated ${formatTime(latestLocation.recorded_at)}` : 'Location services need to be available to save attendance.'}</Text></View></View>
        {latestLocation ? <Pressable onPress={openMap} style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}><MapPinned size={17} color={colors.primary} /><Text style={styles.mapButtonText}>Review on map</Text></Pressable> : null}
      </Panel>

      <View style={styles.policy}><ShieldCheck size={17} color={colors.teal} /><Text style={styles.policyText}>Attendance captures your current location at the time you check in or check out.</Text></View>

      <SectionTitle title="Recent attendance" />
      {attendance.length === 0 ? <EmptyState title="No attendance yet" description="Your check-in history will appear here." icon={CalendarCheck} /> : (
        <View style={styles.history}>
          {attendance.map((record) => <View key={record.id} style={styles.historyRow}><View><Text style={styles.historyDate}>{formatDate(`${record.date}T12:00:00+05:00`)}</Text><Text style={styles.historyMeta}>{formatTime(record.clock_in_at)} - {record.clock_out_at ? formatTime(record.clock_out_at) : 'Checkout pending'}</Text></View><StatusPill label={record.clock_out_at ? 'Completed' : 'Open'} tone={record.clock_out_at ? 'blue' : 'teal'} /></View>)}
        </View>
      )}
    </Screen>
  )
}

function TimelineItem({ title, value, complete }: { title: string; value: string; complete: boolean }) {
  return <View style={styles.timelineItem}>{complete ? <CheckCircle2 size={20} color={colors.teal} strokeWidth={2.4} /> : <Circle size={20} color="#A8B6C9" strokeWidth={2.2} />}<View><Text style={styles.timelineLabel}>{title}</Text><Text style={styles.timelineValue}>{value}</Text></View></View>
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  heroEyebrow: { color: colors.inkMuted, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  heroTitle: { color: colors.ink, fontSize: 23, fontWeight: '900' },
  timeline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineLine: { width: 20, height: 1, backgroundColor: colors.border },
  timelineLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  timelineValue: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 2 },
  completeNote: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.tealSoft, borderRadius: radii.md, paddingHorizontal: spacing.md },
  completeText: { flex: 1, color: '#087365', fontSize: 13, fontWeight: '800' },
  locationRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  locationIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  locationCopy: { flex: 1, minWidth: 0, gap: 4 },
  locationTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '800' },
  locationMeta: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  mapButton: { minHeight: 44, marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapButtonText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  policy: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.sm, alignItems: 'flex-start' },
  policyText: { flex: 1, color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  history: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  historyRow: { minHeight: 70, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  historyDate: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  historyMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  pressed: { opacity: 0.65 },
})
