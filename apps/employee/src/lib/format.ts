const pakistanTimeZone = 'Asia/Karachi'

export function pakistanToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: pakistanTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function formatTime(value?: string | null) {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: pakistanTimeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatTimeString(timeStr?: string | null) {
  if (!timeStr) return ''
  const clean = timeStr.trim()
  const parts = clean.split(':')
  if (parts.length < 2) return clean
  let hour = parseInt(parts[0], 10)
  const min = parts[1].slice(0, 2)
  if (isNaN(hour)) return clean
  const period = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12
  if (hour === 0) hour = 12
  return `${String(hour).padStart(2, '0')}:${min} ${period}`
}

export function formatDate(value?: string | null) {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: pakistanTimeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDay(value?: string | null) {
  if (!value) return 'Today'
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: pakistanTimeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(value))
}

export function initials(name?: string | null) {
  return (name ?? 'Nire')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
