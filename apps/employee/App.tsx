import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  AppState,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Session } from '@supabase/supabase-js'
import { apiFetch } from './src/lib/api'
import { supabase } from './src/lib/supabase'
import {
  captureCurrentLocation,
  isWithinOfficeHours,
  requestLocationPermissions,
  startOfficeTracking,
  stopOfficeTracking,
  uploadLocationSamples,
} from './src/services/tracking'
import {
  AppPermissionsState,
  checkAllPermissions,
} from './src/services/permissions'
import { ProfileView } from './src/components/ProfileView'
import { Attendance, Employee, LocationPayload, TrackingPolicy, Visit } from './src/types'

type AppData = {
  employee: Employee
  policy: TrackingPolicy
}

type Tab = 'today' | 'attendance' | 'visits' | 'profile'

type LatestLocationResponse = {
  latest_sample: LocationPayload | null
}

type LocationNameResponse = {
  address: string | null
}

const fallbackPolicy: TrackingPolicy = {
  id: 'fallback',
  office_start_time: '09:00',
  office_end_time: '17:00',
  timezone: 'Asia/Karachi',
  sample_interval_minutes: 30,
  grace_period_minutes: 10,
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setInitializing(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  if (initializing) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    )
  }

  return session ? <EmployeeApp /> : <LoginScreen />
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)

    if (error) {
      Alert.alert('Login failed', 'Invalid email or password.')
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.loginWrap}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <Text style={styles.title}>Nire Employee</Text>
        <Text style={styles.muted}>Sign in with the credentials sent by admin</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@company.com"
            style={styles.input}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            style={styles.input}
          />
          <TouchableOpacity disabled={loading} onPress={signIn} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

function EmployeeApp() {
  const [tab, setTab] = useState<Tab>('today')
  const [data, setData] = useState<AppData | null>(null)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [trackingMessage, setTrackingMessage] = useState('')
  const [latestLocation, setLatestLocation] = useState<LocationPayload | null>(null)
  const [refreshingLocation, setRefreshingLocation] = useState(false)
  const [permissionsState, setPermissionsState] = useState<AppPermissionsState | null>(null)

  async function loadPermissionsStatus() {
    const permStatus = await checkAllPermissions()
    setPermissionsState(permStatus)
  }



  async function load() {
    setLoading(true)
    try {
      const [me, att, visitRows, latest] = await Promise.all([
        apiFetch<Partial<AppData> | null>('/api/mobile/me'),
        apiFetch<Attendance[]>('/api/mobile/attendance'),
        apiFetch<Visit[]>('/api/mobile/visits'),
        apiFetch<LatestLocationResponse>('/api/mobile/location-samples?latest=1').catch(() => ({ latest_sample: null })),
      ])
      if (!me?.employee) {
        throw new Error('Employee profile was not returned by the server. Make sure the latest dashboard APIs are deployed.')
      }
      const appData: AppData = { employee: me.employee, policy: me.policy ?? fallbackPolicy }
      setData(appData)
      setAttendance(Array.isArray(att) ? att : [])
      setVisits(Array.isArray(visitRows) ? visitRows : [])
      setLatestLocation(latest.latest_sample)
      await syncTracking(appData.policy)
      await loadPermissionsStatus()
    } catch (error) {
      Alert.alert('Could not load app', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function syncTracking(policy: TrackingPolicy) {
    try {
      if (isWithinOfficeHours(policy)) {
        const result = await startOfficeTracking(policy)
        setTrackingMessage(result.started ? 'Tracking active during office hours' : result.reason ?? 'Tracking not active')
      } else {
        await stopOfficeTracking()
        setTrackingMessage('Tracking paused outside office hours')
      }
    } catch {
      setTrackingMessage('Tracking status will retry when the network is available')
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!data?.policy) return
    const id = setInterval(() => syncTracking(data.policy), 60000)
    return () => clearInterval(id)
  }, [data?.policy])

  useEffect(() => {
    if (!data?.policy) return

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void syncTracking(data.policy)
        void loadPermissionsStatus()
      }
    })

    return () => subscription.remove()
  }, [data?.policy])

  const todayRecord = useMemo(() => {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    return (Array.isArray(attendance) ? attendance : []).find((record) => record.date === today) ?? null
  }, [attendance])

  async function signOut() {
    setData(null)
    setAttendance([])
    setVisits([])
    setLatestLocation(null)
    void stopOfficeTracking(true).catch(() => undefined)
    await supabase.auth.signOut({ scope: 'local' })
  }

  async function captureLocationWithName(source: LocationPayload['source']) {
    const location = await captureCurrentLocation(source)
    const name = await apiFetch<LocationNameResponse>(
      `/api/mobile/location-name?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}`
    ).catch(() => ({ address: null }))

    return { ...location, address: name.address }
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>

      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Nire Employee</Text>
          <Text style={styles.headerTitle}>{data?.employee.full_name ?? 'Employee'}</Text>
        </View>
        <TouchableOpacity onPress={() => setTab('profile')} style={styles.lightButton}>
          <Text style={styles.lightButtonText}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {[
          ['today', 'Today'],
          ['attendance', 'Attendance'],
          ['visits', 'Visits'],
          ['profile', 'Profile'],
        ].map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setTab(key as Tab)} style={[styles.tab, tab === key && styles.activeTab]}>
            <Text style={[styles.tabText, tab === key && styles.activeTabText]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'today' && data && (
          <TodayView
            data={data}
            attendance={attendance}
            visits={visits}
            todayRecord={todayRecord}
            trackingMessage={trackingMessage}
            latestLocation={latestLocation}
            refreshingLocation={refreshingLocation}
            onRefresh={load}
            onRefreshLocation={async () => {
              setRefreshingLocation(true)
              try {
                const location = await captureLocationWithName('manual')
                setLatestLocation(location)
                await uploadLocationSamples([location])
              } catch (error) {
                Alert.alert('Location failed', error instanceof Error ? error.message : 'Please try again.')
              } finally {
                setRefreshingLocation(false)
              }
            }}
            onRequestPermissions={async () => {
              const result = await requestLocationPermissions()
              await loadPermissionsStatus()
              Alert.alert(
                'Location status',
                result.foreground && result.background && result.servicesEnabled
                  ? 'Location is ready.'
                  : 'Please allow location all the time and keep location services enabled.'
              )
              await syncTracking(data.policy)
            }}
          />
        )}
        {tab === 'attendance' && <AttendanceView attendance={Array.isArray(attendance) ? attendance : []} todayRecord={todayRecord} onChanged={load} />}
        {tab === 'visits' && <VisitsView visits={Array.isArray(visits) ? visits : []} onChanged={load} />}
        {tab === 'profile' && data && (
          <ProfileView
            employee={data.employee}
            policy={data.policy}
            permissionsState={permissionsState}
            onRefreshPermissions={async () => {
              await loadPermissionsStatus()
              await syncTracking(data.policy)
            }}
            onSignOut={signOut}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function TodayView({
  data,
  attendance,
  visits,
  todayRecord,
  trackingMessage,
  latestLocation,
  refreshingLocation,
  onRefresh,
  onRefreshLocation,
  onRequestPermissions,
}: {
  data: AppData
  attendance: Attendance[]
  visits: Visit[]
  todayRecord: Attendance | null
  trackingMessage: string
  latestLocation: LocationPayload | null
  refreshingLocation: boolean
  onRefresh: () => void
  onRefreshLocation: () => Promise<void>
  onRequestPermissions: () => Promise<void>
}) {
  const [busyAction, setBusyAction] = useState<string | null>(null)

  async function submitAttendance(action: 'in' | 'out') {
    setBusyAction(action)
    try {
      const location = await captureCurrentLocation(action === 'in' ? 'attendance_checkin' : 'attendance_checkout')
      const addressResult = await apiFetch<LocationNameResponse>(
        `/api/mobile/location-name?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}`
      ).catch(() => ({ address: null }))
      await apiFetch('/api/mobile/attendance', {
        method: action === 'in' ? 'POST' : 'PATCH',
        body: JSON.stringify({
          ...location,
          address: addressResult.address ?? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
        }),
      })
      onRefresh()
    } catch (error) {
      Alert.alert('Check-in failed', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Status</Text>
        <Text style={styles.bigText}>
          {todayRecord?.clock_in_at ? (todayRecord.clock_out_at ? 'Shift Completed' : 'Checked In') : 'Not Checked In'}
        </Text>
        <Text style={styles.muted}>
          Office hours: {data.policy.office_start_time.slice(0, 5)} - {data.policy.office_end_time.slice(0, 5)} ({data.policy.timezone})
        </Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{trackingMessage}</Text>
        </View>

        {!todayRecord?.clock_in_at && (
          <TouchableOpacity disabled={!!busyAction} onPress={() => submitAttendance('in')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{busyAction === 'in' ? 'Checking in...' : 'Clock In'}</Text>
          </TouchableOpacity>
        )}

        {todayRecord?.clock_in_at && !todayRecord?.clock_out_at && (
          <TouchableOpacity disabled={!!busyAction} onPress={() => submitAttendance('out')} style={styles.warningButton}>
            <Text style={styles.primaryButtonText}>{busyAction === 'out' ? 'Checking out...' : 'Clock Out'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.grid}>
        <Stat label="Total Attendance" value={String(attendance.length)} />
        <Stat label="Total Visits" value={String(visits.length)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location Tracking</Text>
        {latestLocation ? (
          <>
            <Text style={styles.muted}>Last recorded location</Text>
            <Text style={styles.listTitle}>{latestLocation.address ?? `${latestLocation.lat.toFixed(5)}, ${latestLocation.lng.toFixed(5)}`}</Text>
            <Text style={styles.muted}>
              Recorded at: {formatDate(latestLocation.recorded_at ?? new Date().toISOString())} - {formatTime(latestLocation.recorded_at ?? new Date().toISOString())}
            </Text>
          </>
        ) : (
          <Text style={styles.muted}>No location samples recorded yet today.</Text>
        )}

        <TouchableOpacity disabled={refreshingLocation} onPress={onRefreshLocation} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{refreshingLocation ? 'Updating...' : 'Refresh current location'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onRequestPermissions} style={styles.lightButtonWide}>
          <Text style={styles.lightButtonText}>Check Location Permissions</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function AttendanceView({ attendance, todayRecord, onChanged }: { attendance: Attendance[]; todayRecord: Attendance | null; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)

  async function toggle(action: 'in' | 'out') {
    setBusy(true)
    try {
      const location = await captureCurrentLocation(action === 'in' ? 'attendance_checkin' : 'attendance_checkout')
      const addressResult = await apiFetch<LocationNameResponse>(
        `/api/mobile/location-name?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}`
      ).catch(() => ({ address: null }))
      await apiFetch('/api/mobile/attendance', {
        method: action === 'in' ? 'POST' : 'PATCH',
        body: JSON.stringify({
          ...location,
          address: addressResult.address ?? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
        }),
      })
      onChanged()
    } catch (error) {
      Alert.alert('Attendance failed', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Action</Text>
        {!todayRecord?.clock_in_at ? (
          <TouchableOpacity disabled={busy} onPress={() => toggle('in')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{busy ? 'Processing...' : 'Clock In'}</Text>
          </TouchableOpacity>
        ) : !todayRecord?.clock_out_at ? (
          <TouchableOpacity disabled={busy} onPress={() => toggle('out')} style={styles.warningButton}>
            <Text style={styles.primaryButtonText}>{busy ? 'Processing...' : 'Clock Out'}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.muted}>You have completed your shift today.</Text>
        )}
      </View>

      {attendance.map((record) => (
        <View key={record.id} style={styles.listItem}>
          <Text style={styles.listTitle}>{formatDate(record.date)}</Text>
          <Text style={styles.muted}>Status: {record.clock_out_at ? 'Completed' : 'Checked In'}</Text>
          <Text style={styles.muted}>
            {formatTime(record.clock_in_at)}
            {record.clock_out_at ? ` - ${formatTime(record.clock_out_at)}` : ' - pending'}
          </Text>
        </View>
      ))}
    </View>
  )
}

function VisitsView({ visits, onChanged }: { visits: Visit[]; onChanged: () => void }) {
  const [purpose, setPurpose] = useState('')
  const [place, setPlace] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!purpose.trim()) {
      Alert.alert('Purpose required', 'Add a short purpose for this visit.')
      return
    }

    setBusy(true)
    try {
      const location = await captureCurrentLocation('visit')
      const addressResult = await apiFetch<LocationNameResponse>(
        `/api/mobile/location-name?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}`
      ).catch(() => ({ address: null }))
      await apiFetch('/api/mobile/visits', {
        method: 'POST',
        body: JSON.stringify({
          ...location,
          address: addressResult.address ?? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
          purpose: purpose.trim(),
          place_name: place.trim() || null,
          notes: notes.trim() || null,
        }),
      })
      setPurpose('')
      setPlace('')
      setNotes('')
      await onChanged()
    } catch (error) {
      Alert.alert('Visit failed', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Log Visit</Text>
        <TextInput
          value={purpose}
          onChangeText={setPurpose}
          placeholder="Purpose, e.g. client meeting"
          placeholderTextColor="#71717a"
          style={styles.input}
        />
        <TextInput
          value={place}
          onChangeText={setPlace}
          placeholder="Place name (optional)"
          placeholderTextColor="#71717a"
          style={styles.input}
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor="#71717a"
          style={[styles.input, styles.textArea]}
          multiline
        />
        <TouchableOpacity disabled={busy} onPress={submit} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{busy ? 'Logging...' : 'Log visit'}</Text>
        </TouchableOpacity>
      </View>

      {visits.map((visit) => (
        <View key={visit.id} style={styles.listItem}>
          <Text style={styles.listTitle}>{visit.purpose}</Text>
          {!!visit.place_name && <Text style={styles.muted}>{visit.place_name}</Text>}
          {!!visit.address && <Text style={styles.muted}>{visit.address}</Text>}
          <Text style={styles.muted}>{formatDate(visit.visited_at)} - {formatTime(visit.visited_at)}</Text>
        </View>
      ))}
    </View>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f4f5',
  },
  loginWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#18181b',
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    color: '#18181b',
    fontWeight: '700',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
  },
  activeTab: {
    backgroundColor: '#18181b',
  },
  tabText: {
    color: '#52525b',
    fontWeight: '700',
    fontSize: 12,
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  stack: {
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3f3f46',
  },
  bigText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#18181b',
  },
  muted: {
    fontSize: 13,
    color: '#71717a',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3f3f46',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: '#18181b',
  },
  textArea: {
    minHeight: 82,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  warningButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  lightButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
  },
  lightButtonWide: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  lightButtonText: {
    color: '#3f3f46',
    fontWeight: '800',
  },
  statusPill: {
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statusText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 16,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#18181b',
  },
  statLabel: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 14,
  },
  listTitle: {
    color: '#18181b',
    fontWeight: '800',
    marginBottom: 4,
  },
})