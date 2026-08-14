import { CheckCircle2, ClipboardPenLine, MapPin, Plus, Sparkles } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import { ActionButton, EmptyState, LoadingScreen, Panel, PageTitle, Screen, SectionTitle, StatusPill } from '../../src/components/ui'
import { formatDate, formatTime } from '../../src/lib/format'
import { useApp } from '../../src/providers/AppProvider'
import { colors, radii, spacing } from '../../src/theme'

export default function VisitsPage() {
  const { data, visits, loading, refreshing, refresh, submitVisit } = useApp()
  const [purpose, setPurpose] = useState('')
  const [placeName, setPlaceName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!data && loading) return <LoadingScreen />
  if (!data) return <LoadingScreen label="Loading your visits..." />

  async function saveVisit() {
    if (!purpose.trim()) {
      Alert.alert('Add a purpose', 'Enter a short purpose before logging the visit.')
      return
    }

    setSubmitting(true)
    try {
      await submitVisit({ purpose, placeName, notes })
      setPurpose('')
      setPlaceName('')
      setNotes('')
    } catch (error) {
      Alert.alert('Visit could not be saved', error instanceof Error ? error.message : 'Please check location access and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={() => void refresh()}>
      <PageTitle eyebrow="Field activity" title="Visits" />

      <Panel>
        <View style={styles.formTitle}><View style={styles.formIcon}><ClipboardPenLine size={19} color={colors.primary} strokeWidth={2.3} /></View><View><Text style={styles.heading}>Log a visit</Text><Text style={styles.subheading}>Your live location is saved automatically.</Text></View></View>
        <View style={styles.form}>
          <Field label="Purpose" value={purpose} onChangeText={setPurpose} placeholder="For example, client meeting" />
          <Field label="Place name" value={placeName} onChangeText={setPlaceName} placeholder="Optional: company or shop name" />
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional details" multiline />
          <ActionButton label="Save visit" icon={Plus} loading={submitting} onPress={() => void saveVisit()} />
        </View>
      </Panel>

      <View style={styles.info}><Sparkles size={17} color={colors.teal} /><Text style={styles.infoText}>Location and accuracy are captured at the moment you save the visit.</Text></View>

      <SectionTitle title="Recent visits" />
      {visits.length === 0 ? <EmptyState title="No visits logged yet" description="Your latest field visits will appear here." icon={MapPin} /> : (
        <View style={styles.visitList}>
          {visits.map((visit) => <View key={visit.id} style={styles.visitRow}><View style={styles.pin}><MapPin size={17} color={colors.coral} strokeWidth={2.4} /></View><View style={styles.visitContent}><View style={styles.visitTitleRow}><Text style={styles.visitTitle}>{visit.purpose}</Text><StatusPill label={formatDate(visit.visited_at)} tone="blue" /></View><Text style={styles.visitPlace}>{visit.place_name || visit.address || 'Location name unavailable'}</Text><Text style={styles.visitTime}>{formatTime(visit.visited_at)}</Text>{visit.notes ? <Text style={styles.visitNotes}>{visit.notes}</Text> : null}</View></View>)}
        </View>
      )}
    </Screen>
  )
}

function Field({ label, value, onChangeText, placeholder, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.inkMuted} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.textArea]} /></View>
}

const styles = StyleSheet.create({
  formTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  formIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  heading: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  subheading: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  form: { marginTop: spacing.lg, gap: spacing.md },
  field: { gap: 6 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  input: { minHeight: 50, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, color: colors.ink, fontSize: 15, paddingHorizontal: spacing.md },
  textArea: { minHeight: 92, paddingVertical: spacing.md },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: spacing.sm },
  infoText: { flex: 1, color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  visitList: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  visitRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'flex-start' },
  pin: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coralSoft },
  visitContent: { flex: 1, minWidth: 0, gap: 4 },
  visitTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  visitTitle: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 15, fontWeight: '900' },
  visitPlace: { color: colors.inkMuted, fontSize: 13, lineHeight: 18 },
  visitTime: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  visitNotes: { color: colors.ink, fontSize: 12, lineHeight: 18, marginTop: 3 },
})
