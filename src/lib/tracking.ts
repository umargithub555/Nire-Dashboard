export type TrackingPolicy = {
  id: string
  name: string
  office_start_time: string
  office_end_time: string
  timezone: string
  sample_interval_minutes: number
  grace_period_minutes: number
  is_active: boolean
  updated_by: string | null
  updated_at: string
  created_at: string
}

export type EmployeeDevice = {
  id: string
  employee_id: string
  installation_id: string
  platform: string
  app_version: string | null
  device_name: string | null
  os_version: string | null
  permission_foreground: boolean
  permission_background: boolean
  location_services_enabled: boolean
  battery_optimization_note: string | null
  last_seen_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export type LocationSample = {
  id: string
  employee_id: string
  attendance_id: string | null
  recorded_at: string
  received_at: string
  lat: number
  lng: number
  accuracy_meters: number | null
  altitude: number | null
  heading: number | null
  speed: number | null
  mocked: boolean | null
  source: 'scheduled' | 'attendance_checkin' | 'attendance_checkout' | 'visit' | 'manual'
  battery_level: number | null
  is_charging: boolean | null
  network_type: string | null
  app_state: string | null
  installation_id: string | null
  upload_batch_id: string | null
  created_at: string
}

export function todayDateString(date = new Date(), timeZone = 'Asia/Karachi') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getStalenessStatus(lastSeenAt: string | null, intervalMinutes: number) {
  if (!lastSeenAt) return 'never'

  const ageMinutes = (Date.now() - new Date(lastSeenAt).getTime()) / 60000
  if (ageMinutes <= intervalMinutes) return 'active'
  if (ageMinutes <= intervalMinutes * 3) return 'stale'
  return 'offline'
}

export function isWithinPolicyHoursAt(policy: Pick<TrackingPolicy, 'office_start_time' | 'office_end_time' | 'timezone'>, value: string | Date) {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: policy.timezone || 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
  const [hour, minute] = time.split(':').map(Number)
  const current = hour * 60 + minute
  const [startHour, startMinute] = policy.office_start_time.slice(0, 5).split(':').map(Number)
  const [endHour, endMinute] = policy.office_end_time.slice(0, 5).split(':').map(Number)
  const start = startHour * 60 + startMinute
  const end = endHour * 60 + endMinute

  if (start <= end) return current >= start && current <= end
  return current >= start || current <= end
}

export function pakistanDayRange(date: string) {
  const start = new Date(`${date}T00:00:00+05:00`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}
