import * as Haptics from 'expo-haptics'
import type { LucideIcon } from 'lucide-react-native'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radii, shadow, spacing } from '../theme'

type ButtonTone = 'primary' | 'dark' | 'soft' | 'danger'

export function Screen({ children, scroll = false, contentStyle, refreshing, onRefresh }: {
  children: React.ReactNode
  scroll?: boolean
  contentStyle?: StyleProp<ViewStyle>
  refreshing?: boolean
  onRefresh?: () => void
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : children}
    </SafeAreaView>
  )
}

export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>
}

export function PageTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.pageTitle}>
      <View style={styles.titleCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  )
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {action}
    </View>
  )
}

export function ActionButton({ label, onPress, tone = 'primary', icon: Icon, disabled = false, loading = false }: {
  label: string
  onPress: () => void
  tone?: ButtonTone
  icon?: LucideIcon
  disabled?: boolean
  loading?: boolean
}) {
  const handlePress = () => {
    if (disabled || loading) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={handlePress}
      style={({ pressed }) => [styles.button, buttonStyle[tone], (pressed || disabled || loading) && styles.buttonPressed]}
    >
      {loading ? <ActivityIndicator color={tone === 'soft' ? colors.primary : colors.white} /> : Icon ? <Icon size={18} color={tone === 'soft' ? colors.primary : colors.white} strokeWidth={2.4} /> : null}
      <Text style={[styles.buttonText, tone === 'soft' && styles.softButtonText]}>{label}</Text>
    </Pressable>
  )
}

export function IconButton({ icon: Icon, label, onPress, tone = 'neutral', disabled = false }: {
  icon: LucideIcon
  label: string
  onPress: () => void
  tone?: 'neutral' | 'primary'
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        if (!disabled) void Haptics.selectionAsync()
        onPress()
      }}
      style={({ pressed }) => [styles.iconButton, tone === 'primary' && styles.iconPrimary, (pressed || disabled) && styles.buttonPressed]}
    >
      <Icon size={19} color={tone === 'primary' ? colors.white : colors.ink} strokeWidth={2.2} />
    </Pressable>
  )
}

export function StatusPill({ label, tone = 'teal' }: { label: string; tone?: 'teal' | 'amber' | 'coral' | 'blue' }) {
  const toneStyle = {
    teal: styles.pillTeal,
    amber: styles.pillAmber,
    coral: styles.pillCoral,
    blue: styles.pillBlue,
  }[tone]
  const textStyle = {
    teal: styles.pillTextTeal,
    amber: styles.pillTextAmber,
    coral: styles.pillTextCoral,
    blue: styles.pillTextBlue,
  }[tone]

  return <View style={[styles.pill, toneStyle]}><Text style={[styles.pillText, textStyle]}>{label}</Text></View>
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const letters = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}><Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{letters || 'N'}</Text></View>
}

export function Metric({ icon: Icon, value, label, tone = 'blue' }: { icon: LucideIcon; value: string; label: string; tone?: 'blue' | 'teal' | 'amber' }) {
  const iconStyle = tone === 'teal' ? styles.metricTeal : tone === 'amber' ? styles.metricAmber : styles.metricBlue
  const iconColor = tone === 'teal' ? colors.teal : tone === 'amber' ? colors.amber : colors.primary
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, iconStyle]}><Icon size={17} color={iconColor} strokeWidth={2.2} /></View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

export function LoadingScreen({ label = 'Loading your workspace...' }: { label?: string }) {
  return <Screen><View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.loadingText}>{label}</Text></View></Screen>
}

export function EmptyState({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Icon size={24} color={colors.primary} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDescription}>{description}</Text></View>
}

const buttonStyle = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  dark: { backgroundColor: colors.navy },
  soft: { backgroundColor: colors.blueSoft },
  danger: { backgroundColor: colors.coral },
})

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { padding: spacing.lg, paddingBottom: 36, gap: spacing.lg },
  panel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, ...shadow },
  pageTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  titleCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.inkMuted, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: 0 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  sectionTitleText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  button: { minHeight: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  softButtonText: { color: colors.primary },
  buttonPressed: { opacity: 0.72 },
  iconButton: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  iconPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  pill: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 10 },
  pillText: { fontSize: 12, fontWeight: '800' },
  pillTeal: { backgroundColor: colors.tealSoft },
  pillTextTeal: { color: '#087365' },
  pillAmber: { backgroundColor: colors.amberSoft },
  pillTextAmber: { color: '#986000' },
  pillCoral: { backgroundColor: colors.coralSoft },
  pillTextCoral: { color: '#B23F3C' },
  pillBlue: { backgroundColor: colors.blueSoft },
  pillTextBlue: { color: colors.primaryDark },
  avatar: { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white, ...shadow },
  avatarText: { color: colors.white, fontWeight: '800' },
  metric: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md },
  metricIcon: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  metricBlue: { backgroundColor: colors.blueSoft },
  metricTeal: { backgroundColor: colors.tealSoft },
  metricAmber: { backgroundColor: colors.amberSoft },
  metricValue: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  metricLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.inkMuted, fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { color: colors.inkMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
})
