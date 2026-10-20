// Number, date and duration formatting shared by the dashboards.

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat('en')

// num shows 1,284 below ten thousand and 12.9K above.
export const num = (n) => (n == null ? '-' : Math.abs(n) >= 10000 ? compact.format(n) : whole.format(n))

export const pct = (r, digits = 0) => (r == null ? '-' : `${(r * 100).toFixed(digits)}%`)

export const usd = (cents, currency = 'usd') =>
  ((cents || 0) / 100).toLocaleString('en', {
    style: 'currency', currency: currency.toUpperCase(),
    notation: Math.abs(cents || 0) >= 10000000 ? 'compact' : 'standard',
    maximumFractionDigits: (cents || 0) % 100 ? 2 : 0,
  })

export function duration(seconds) {
  if (seconds == null) return '-'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
}

export function hours(h) {
  if (h == null) return '-'
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)}h`
  return `${(h / 24).toFixed(1)}d`
}

export const dateTime = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '-')
export const date = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '-')

// day formats a YYYY-MM-DD analytics day (UTC) as "Oct 20".
export const day = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
export function ago(iso) {
  if (!iso) return 'never'
  const s = (new Date(iso).getTime() - Date.now()) / 1000
  const abs = Math.abs(s)
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day')
  return date(iso)
}

// change compares a period with the one before it. Returns null when there
// is nothing to compare against.
export function change(current, previous) {
  if (previous == null || current == null) return null
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / previous
}

export const initials = (s) => (s || '?').split(/[\s@._-]+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase()

// device names a session's browser and system from its user agent, e.g.
// "Chrome on macOS". Unknown agents (API clients, scripts) show as given.
export function device(ua) {
  if (!ua) return 'Unknown device'
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : null
  if (!browser && !os) return ua.length > 60 ? `${ua.slice(0, 57)}...` : ua
  return [browser || 'Browser', os && `on ${os}`].filter(Boolean).join(' ')
}
