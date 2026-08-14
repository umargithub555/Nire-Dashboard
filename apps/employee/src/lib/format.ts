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
