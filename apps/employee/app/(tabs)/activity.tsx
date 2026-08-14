import { CalendarDays, CheckCircle2, ClipboardList, Clock3, MapPin, TrendingUp } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { EmptyState, LoadingScreen, Metric, PageTitle, Screen, SectionTitle, StatusPill } from '../../src/components/ui'
import { formatDate, formatTime } from '../../src/lib/format'
import { useApp } from '../../src/providers/AppProvider'
import { colors, radii, spacing } from '../../src/theme'

export default function ActivityPage() {
  const { data, attendance, visits, loading, refreshing, refresh } = useApp()
  if (!data && loading) return <LoadingScreen />
  if (!data) return <LoadingScreen label="Loading your activity..." />

  const completedDays = attendance.filter((record) => Boolean(record.clock_out_at)).length
  const addressedVisits = visits.filter((visit) => Boolean(visit.place_name || visit.address)).length

  return (
    <Screen scroll refreshing={refreshing} onRefresh={() => void refresh()}>
      <PageTitle eyebrow="Your records" title="Activity" />

      <View style={styles.metrics}>
        <Metric icon={CalendarDays} value={String(attendance.length)} label="Present days" />
        <Metric icon={CheckCircle2} value={String(completedDays)} label="Completed" tone="teal" />
        <Metric icon={MapPin} value={String(visits.length)} label="Visits" tone="amber" />
      </View>

      <View style={styles.summary}><View style={styles.summaryIcon}><TrendingUp size={20} color={colors.primary} strokeWidth={2.4} /></View><View style={styles.summaryCopy}><Text style={styles.summaryTitle}>{addressedVisits} verified visit{addressedVisits === 1 ? '' : 's'} recorded</Text><Text style={styles.summaryText}>Your attendance history shows the latest 10 days, while visits cover the latest 30 days.</Text></View></View>

      <SectionTitle title="Attendance history" />
      {attendance.length === 0 ? <EmptyState title="No attendance history" description="Completed check-ins will appear here." icon={CalendarDays} /> : (
        <View style={styles.list}>
          {attendance.map((record) => <View key={record.id} style={styles.row}><View style={styles.rowIcon}><Clock3 size={17} color={colors.primary} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{formatDate(`${record.date}T12:00:00+05:00`)}</Text><Text style={styles.rowMeta}>In {formatTime(record.clock_in_at)}{record.clock_out_at ? ` ? Out ${formatTime(record.clock_out_at)}` : ' ? Checkout pending'}</Text></View><StatusPill label={record.clock_out_at ? 'Done' : 'Open'} tone={record.clock_out_at ? 'blue' : 'teal'} /></View>)}
        </View>
      )}

      <SectionTitle title="Visit history" />
      {visits.length === 0 ? <EmptyState title="No visit history" description="Saved client or field visits will appear here." icon={ClipboardList} /> : (
        <View style={styles.list}>
          {visits.map((visit) => <View key={visit.id} style={styles.row}><View style={[styles.rowIcon, styles.visitIcon]}><MapPin size={17} color={colors.coral} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{visit.purpose}</Text><Text style={styles.rowMeta} numberOfLines={2}>{visit.place_name || visit.address || 'Location name unavailable'} ? {formatDate(visit.visited_at)}</Text></View></View>)}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: spacing.sm },
  summary: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.blueSoft, borderRadius: radii.lg, padding: spacing.lg, alignItems: 'flex-start' },
  summaryIcon: { width: 38, height: 38, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  summaryCopy: { flex: 1, minWidth: 0, gap: 4 },
  summaryTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  summaryText: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  list: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  visitIcon: { backgroundColor: colors.coralSoft },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  rowMeta: { color: colors.inkMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
})
