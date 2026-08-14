import * as Haptics from 'expo-haptics'
import { Redirect } from 'expo-router'
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ActionButton } from '../src/components/ui'
import { supabase } from '../src/lib/supabase'
import { useApp } from '../src/providers/AppProvider'
import { colors, radii, shadow, spacing } from '../src/theme'

export default function SignInPage() {
  const { session, initializing } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!initializing && session) return <Redirect href="/home" />

  async function signIn() {
    if (!email.trim() || !password) {
      Alert.alert('Enter your credentials', 'Use the email and password sent by your administrator.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)

    if (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Sign-in failed', 'Check your email and password, then try again.')
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Text style={styles.brandLetter}>N</Text></View>
            <Text style={styles.brandName}>Nire</Text>
          </View>

          <View style={styles.intro}>
            <View style={styles.badge}><ShieldCheck size={17} color={colors.teal} strokeWidth={2.4} /><Text style={styles.badgeText}>Employee workspace</Text></View>
            <Text style={styles.title}>A clear view of every workday.</Text>
            <Text style={styles.subtitle}>Attendance, visits, and office-hours location tracking in one secure place.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Work email</Text>
            <View style={styles.inputShell}>
              <Mail size={18} color={colors.inkMuted} />
              <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="name@company.com" placeholderTextColor={colors.inkMuted} style={styles.input} />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputShell}>
              <KeyRound size={18} color={colors.inkMuted} />
              <TextInput value={password} onChangeText={setPassword} autoComplete="current-password" secureTextEntry={!showPassword} placeholder="Your password" placeholderTextColor={colors.inkMuted} style={styles.input} />
              <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((current) => !current)} hitSlop={10}>
                {showPassword ? <EyeOff size={19} color={colors.inkMuted} /> : <Eye size={19} color={colors.inkMuted} />}
              </Pressable>
            </View>

            <ActionButton label="Sign in" onPress={signIn} loading={loading} />
          </View>

          <Text style={styles.footer}>Nire records location only according to your organization?s active work-hours policy.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  keyboard: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: 34 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: colors.white, fontSize: 20, fontWeight: '900' },
  brandName: { color: colors.ink, fontSize: 21, fontWeight: '800' },
  intro: { gap: 10 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.tealSoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.pill },
  badgeText: { color: '#087365', fontSize: 12, fontWeight: '800' },
  title: { color: colors.ink, fontSize: 31, lineHeight: 39, fontWeight: '900' },
  subtitle: { color: colors.inkMuted, fontSize: 15, lineHeight: 22 },
  form: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, gap: 10, ...shadow },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 4 },
  inputShell: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 14, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 15, paddingVertical: 0 },
  footer: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 12 },
})
