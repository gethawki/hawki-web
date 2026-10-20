// Badges carry state as text plus a mark, never color alone.

const TONES = {
  neutral: 'bg-surface-3 text-fg-2 ring-line-strong',
  accent: 'bg-accent/10 text-accent ring-accent/30',
  good: 'bg-good/10 text-[#5fd35f] ring-good/30',
  warning: 'bg-warning/10 text-warning ring-warning/30',
  danger: 'bg-critical/10 text-[#ff8b8b] ring-critical/35',
  staff: 'bg-staff/10 text-staff ring-staff/35',
}

export default function Badge({ tone = 'neutral', dot, pulse, className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 ring-inset ${TONES[tone] || TONES.neutral} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? 'animate-pulse' : ''}`} />}
      {children}
    </span>
  )
}

export const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Info']
export const SEVERITY_COLOR = {
  critical: 'var(--color-sev-critical)',
  high: 'var(--color-sev-high)',
  medium: 'var(--color-sev-medium)',
  low: 'var(--color-sev-low)',
  info: 'var(--color-sev-info)',
}

// SeverityBadge shows the level with a colored square key.
export function SeverityBadge({ value, className = '' }) {
  const v = (value || 'info').toLowerCase()
  const label = v.charAt(0).toUpperCase() + v.slice(1)
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-fg ${className}`}>
      <span className="h-2 w-2 rounded-[2px]" style={{ background: SEVERITY_COLOR[v] || SEVERITY_COLOR.info }} />
      {label}
    </span>
  )
}

const SCAN = {
  queued: ['neutral', 'Queued', true],
  running: ['accent', 'Running', true],
  completed: ['good', 'Completed', false],
  failed: ['danger', 'Failed', false],
  canceled: ['neutral', 'Canceled', false],
}

export function ScanStatusBadge({ status }) {
  const [tone, label, pulse] = SCAN[status] || SCAN.queued
  return <Badge tone={tone} dot pulse={pulse}>{label}</Badge>
}

const FINDING = {
  new: ['danger', 'New'],
  acknowledged: ['warning', 'Acknowledged'],
  resolved: ['good', 'Resolved'],
  false_positive: ['neutral', 'False positive'],
}

export function FindingStatusBadge({ status }) {
  const [tone, label] = FINDING[status] || FINDING.new
  return <Badge tone={tone} dot>{label}</Badge>
}

const ALERT = { new: ['danger', 'New'], acknowledged: ['warning', 'Acknowledged'], resolved: ['good', 'Resolved'] }
export function AlertStatusBadge({ status }) {
  const [tone, label] = ALERT[status] || ALERT.resolved
  return <Badge tone={tone} dot>{label}</Badge>
}

// Kbd renders a keyboard key.
export function Kbd({ children }) {
  return <kbd className="rounded border border-line-strong bg-surface-2 px-1.5 py-px font-sans text-[0.65rem] text-fg-3">{children}</kbd>
}
