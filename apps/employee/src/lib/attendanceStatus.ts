import { Attendance, TrackingPolicy } from '../types'

export type MobileAttendanceStatus = {
  label: 'On Time' | 'Late Arrival' | 'Early Departure' | 'Late & Early'
  tone: 'teal' | 'amber' | 'coral' | 'blue'
  details: string
}

/**
 * Determines attendance timeliness (Late Arrival / Early Departure / On Time)
 * for the mobile app interface without any salary or deduction information.
 */
export function getAttendanceStatus(
  record?: Attendance | null,
  policy?: TrackingPolicy | null
): MobileAttendanceStatus | null {
  if (!record || !record.clock_in_at) return null

  const startTime = (policy?.office_start_time || '09:00:00').slice(0, 5)
  const endTime = (policy?.office_end_time || '17:00:00').slice(0, 5)
  const grace = policy?.grace_period_minutes ?? 20

  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const branchStartMinutes = (startH || 0) * 60 + (startM || 0)
  const branchEndMinutes = (endH || 0) * 60 + (endM || 0)
  const graceDeadline = branchStartMinutes + grace

  const inDate = new Date(record.clock_in_at)
  const inMinutes = inDate.getHours() * 60 + inDate.getMinutes()

  const isLate = inMinutes > graceDeadline
  const lateMinutes = isLate ? inMinutes - branchStartMinutes : 0

  let isEarly = false
  let earlyMinutes = 0

  if (record.clock_out_at) {
    const outDate = new Date(record.clock_out_at)
    const outMinutes = outDate.getHours() * 60 + outDate.getMinutes()
    if (outMinutes < branchEndMinutes) {
      isEarly = true
      earlyMinutes = branchEndMinutes - outMinutes
    }
  }

  if (isLate && isEarly) {
    return {
      label: 'Late & Early',
      tone: 'coral',
      details: `Late by ${lateMinutes}m · Left ${earlyMinutes}m early`,
    }
  }

  if (isLate) {
    return {
      label: 'Late Arrival',
      tone: 'amber',
      details: `Checked in ${lateMinutes} mins after shift start`,
    }
  }

  if (isEarly) {
    return {
      label: 'Early Departure',
      tone: 'coral',
      details: `Checked out ${earlyMinutes} mins before shift end`,
    }
  }

  return {
    label: 'On Time',
    tone: 'teal',
    details: 'Attendance on time within shift hours',
  }
}
