export type AttendanceAnalysis = {
  isLate: boolean
  lateMinutes: number
  lateHoursDeducted: number
  lateDeductionAmount: number

  isEarly: boolean
  earlyMinutes: number
  earlyHoursDeducted: number
  earlyDeductionAmount: number

  totalHoursDeducted: number
  totalDeductionAmount: number
  hourlyRate: number

  statusLabel: 'On Time' | 'Late Arrival' | 'Early Departure' | 'Late & Early'
  statusTone: 'emerald' | 'amber' | 'rose' | 'red'
}

/**
 * Calculates late arrival, early departure, and hourly salary deductions for an attendance record.
 * 
 * Rules:
 * 1. Branch start/end times (e.g. Peshawar 08:00 - 16:00, Islamabad 09:00 - 17:00).
 * 2. 20-minute grace period from start time. (If start is 8:00, arrivals up to 8:20 are on time; 8:21+ is late).
 * 3. Deductions: Hourly Rate = Monthly Salary / 240 hours.
 * 4. Deductions are rounded up per late/early block (e.g., 30 mins late = 1 hour deducted).
 */
export function evaluateAttendance(
  clockInAt: string,
  clockOutAt: string | null | undefined,
  branch?: {
    office_start_time?: string
    office_end_time?: string
    grace_period_minutes?: number
  } | null,
  salary?: number | null
): AttendanceAnalysis {
  const startTime = (branch?.office_start_time || '09:00:00').slice(0, 5)
  const endTime = (branch?.office_end_time || '17:00:00').slice(0, 5)
  const graceMinutes = branch?.grace_period_minutes ?? 20

  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const branchStartMinutes = (startH || 0) * 60 + (startM || 0)
  const branchEndMinutes = (endH || 0) * 60 + (endM || 0)
  const graceDeadlineMinutes = branchStartMinutes + graceMinutes

  // Evaluate Clock-in
  const inDate = new Date(clockInAt)
  const inMinutes = inDate.getHours() * 60 + inDate.getMinutes()

  let isLate = false
  let lateMinutes = 0
  let lateHoursDeducted = 0

  if (inMinutes > graceDeadlineMinutes) {
    isLate = true
    lateMinutes = inMinutes - branchStartMinutes
    lateHoursDeducted = Math.ceil(lateMinutes / 60)
  }

  // Evaluate Clock-out
  let isEarly = false
  let earlyMinutes = 0
  let earlyHoursDeducted = 0

  if (clockOutAt) {
    const outDate = new Date(clockOutAt)
    const outMinutes = outDate.getHours() * 60 + outDate.getMinutes()
    if (outMinutes < branchEndMinutes) {
      isEarly = true
      earlyMinutes = branchEndMinutes - outMinutes
      earlyHoursDeducted = Math.ceil(earlyMinutes / 60)
    }
  }

  const monthlySalary = Number(salary) || 0
  const hourlyRate = monthlySalary > 0 ? monthlySalary / 240 : 0

  const lateDeductionAmount = Math.round(lateHoursDeducted * hourlyRate)
  const earlyDeductionAmount = Math.round(earlyHoursDeducted * hourlyRate)
  const totalHoursDeducted = lateHoursDeducted + earlyHoursDeducted
  const totalDeductionAmount = lateDeductionAmount + earlyDeductionAmount

  let statusLabel: 'On Time' | 'Late Arrival' | 'Early Departure' | 'Late & Early' = 'On Time'
  let statusTone: 'emerald' | 'amber' | 'rose' | 'red' = 'emerald'

  if (isLate && isEarly) {
    statusLabel = 'Late & Early'
    statusTone = 'red'
  } else if (isLate) {
    statusLabel = 'Late Arrival'
    statusTone = 'amber'
  } else if (isEarly) {
    statusLabel = 'Early Departure'
    statusTone = 'rose'
  }

  return {
    isLate,
    lateMinutes,
    lateHoursDeducted,
    lateDeductionAmount,
    isEarly,
    earlyMinutes,
    earlyHoursDeducted,
    earlyDeductionAmount,
    totalHoursDeducted,
    totalDeductionAmount,
    hourlyRate,
    statusLabel,
    statusTone,
  }
}
