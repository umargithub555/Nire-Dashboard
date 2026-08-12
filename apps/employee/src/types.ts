export type Employee = {
  id: string
  full_name: string
  email: string
  designation: string | null
  phone: string | null
  branch_id: string | null
  branch?: { name: string | null; address: string | null } | null
}

export type TrackingPolicy = {
  id: string
  office_start_time: string
  office_end_time: string
  timezone: string
  sample_interval_minutes: number
  grace_period_minutes: number
}

export type Attendance = {
  id: string
  date: string
  clock_in_at: string
  clock_out_at: string | null
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_out_lat: number | null
  clock_out_lng: number | null
}

export type Visit = {
  id: string
  purpose: string
  place_name: string | null
  address: string | null
  visited_at: string
  notes: string | null
}

export type LocationPayload = {
  lat: number
  lng: number
  accuracy?: number | null
  mocked?: boolean | null
  recorded_at?: string
  source?: 'scheduled' | 'attendance_checkin' | 'attendance_checkout' | 'visit' | 'manual'
  installation_id?: string
}
