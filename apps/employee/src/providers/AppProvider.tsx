import * as Haptics from 'expo-haptics'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import { apiFetch } from '../lib/api'
import { pakistanToday } from '../lib/format'
import { supabase } from '../lib/supabase'
import {
  captureCurrentLocation,
  isWithinOfficeHours,
  requestLocationPermissions,
  startOfficeTracking,
  stopOfficeTracking,
  uploadLocationSamples,
} from '../services/tracking'
import type { Attendance, Employee, LocationPayload, TrackingPolicy, Visit } from '../types'

type AppData = { employee: Employee; policy: TrackingPolicy }
type LatestRemoteLocation = LocationPayload & { accuracy_meters?: number | null }
type AppContextValue = {
  session: Session | null
  initializing: boolean
  data: AppData | null
  attendance: Attendance[]
  visits: Visit[]
  latestLocation: LocationPayload | null
  todayRecord: Attendance | null
  trackingMessage: string
  loading: boolean
  refreshing: boolean
  refresh: () => Promise<void>
  refreshLocation: () => Promise<LocationPayload>
  requestLocationAccess: () => Promise<{ foreground: boolean; background: boolean; servicesEnabled: boolean }>
  submitAttendance: (action: 'in' | 'out') => Promise<void>
  submitVisit: (input: { purpose: string; placeName?: string; notes?: string }) => Promise<void>
  signOut: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

const fallbackPolicy: TrackingPolicy = {
  id: 'fallback',
  office_start_time: '09:00',
  office_end_time: '17:00',
  timezone: 'Asia/Karachi',
  sample_interval_minutes: 30,
  grace_period_minutes: 10,
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [data, setData] = useState<AppData | null>(null)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [latestLocation, setLatestLocation] = useState<LocationPayload | null>(null)
  const [trackingMessage, setTrackingMessage] = useState('Preparing location tracking')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const syncTracking = useCallback(async (policy: TrackingPolicy) => {
    try {
      if (isWithinOfficeHours(policy)) {
        const result = await startOfficeTracking(policy)
        setTrackingMessage(result.started ? 'Tracking active for this workday' : result.reason ?? 'Tracking needs attention')
      } else {
        await stopOfficeTracking()
        setTrackingMessage('Tracking paused outside office hours')
      }
    } catch {
      setTrackingMessage('Tracking will retry when the connection is available')
    }
  }, [])

  const refreshData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)

    try {
      const [me, attendanceRows, visitRows, latest] = await Promise.all([
        apiFetch<Partial<AppData> | null>('/api/mobile/me'),
        apiFetch<Attendance[]>('/api/mobile/attendance'),
        apiFetch<Visit[]>('/api/mobile/visits'),
        apiFetch<{ latest_sample: LatestRemoteLocation | null }>('/api/mobile/location-samples?latest=1').catch(() => ({ latest_sample: null })),
      ])

      if (!me?.employee) throw new Error('Your employee profile is not available. Please contact your administrator.')

      const nextData = { employee: me.employee, policy: me.policy ?? fallbackPolicy }
      setData(nextData)
      setAttendance(Array.isArray(attendanceRows) ? attendanceRows : [])
      setVisits(Array.isArray(visitRows) ? visitRows : [])
      setLatestLocation(normalizeLocation(latest.latest_sample))
      await syncTracking(nextData.policy)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [syncTracking])

  const refresh = useCallback(async () => refreshData(true), [refreshData])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: result }) => {
      setSession(result.session)
      setInitializing(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setInitializing(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (initializing || !session) return
    void refreshData().catch(() => undefined)
  }, [initializing, refreshData, session])

  useEffect(() => {
    if (initializing || session) return
    setData(null)
    setAttendance([])
    setVisits([])
    setLatestLocation(null)
  }, [initializing, session])

  useEffect(() => {
    if (!data?.policy) return
    const timer = setInterval(() => void syncTracking(data.policy), 60_000)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncTracking(data.policy)
    })
    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [data?.policy, syncTracking])

  const namedLocation = useCallback(async (source: LocationPayload['source']) => {
    const location = await captureCurrentLocation(source)
    const response = await apiFetch<{ address: string | null }>(
      `/api/mobile/location-name?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}`
    ).catch(() => ({ address: null }))
    return { ...location, address: response.address }
  }, [])

  const refreshLocation = useCallback(async () => {
    const location = await namedLocation('manual')
    await uploadLocationSamples([location])
    setLatestLocation(location)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    return location
  }, [namedLocation])

  const requestLocationAccess = useCallback(async () => {
    const result = await requestLocationPermissions()
    if (data?.policy) await syncTracking(data.policy)
    return result
  }, [data?.policy, syncTracking])

  const submitAttendance = useCallback(async (action: 'in' | 'out') => {
    const location = await namedLocation(action === 'in' ? 'attendance_checkin' : 'attendance_checkout')
    await apiFetch('/api/mobile/attendance', {
      method: action === 'in' ? 'POST' : 'PATCH',
      body: JSON.stringify({
        ...location,
        address: location.address ?? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
      }),
    })
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await refreshData(true)
  }, [namedLocation, refreshData])

  const submitVisit = useCallback(async ({ purpose, placeName, notes }: { purpose: string; placeName?: string; notes?: string }) => {
    const location = await namedLocation('visit')
    await apiFetch('/api/mobile/visits', {
      method: 'POST',
      body: JSON.stringify({
        ...location,
        address: location.address ?? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
        purpose: purpose.trim(),
        place_name: placeName?.trim() || null,
        notes: notes?.trim() || null,
      }),
    })
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await refreshData(true)
  }, [namedLocation, refreshData])

  const signOut = useCallback(async () => {
    await stopOfficeTracking().catch(() => undefined)
    await supabase.auth.signOut({ scope: 'local' })
  }, [])

  const todayRecord = useMemo(() => attendance.find((record) => record.date === pakistanToday()) ?? null, [attendance])
  const value = useMemo<AppContextValue>(() => ({
    session,
    initializing,
    data,
    attendance,
    visits,
    latestLocation,
    todayRecord,
    trackingMessage,
    loading,
    refreshing,
    refresh,
    refreshLocation,
    requestLocationAccess,
    submitAttendance,
    submitVisit,
    signOut,
  }), [attendance, data, initializing, latestLocation, loading, refresh, refreshLocation, refreshing, requestLocationAccess, session, signOut, submitAttendance, submitVisit, todayRecord, trackingMessage, visits])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}

function normalizeLocation(location: LatestRemoteLocation | null): LocationPayload | null {
  if (!location) return null
  return { ...location, accuracy: location.accuracy ?? location.accuracy_meters ?? null }
}
