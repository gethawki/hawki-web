import { AlertTriangle, Info } from 'lucide-react'

const TONES = {
  error: ['border-critical/40 bg-critical/[0.06] text-[#f3c7c7]', AlertTriangle],
  info: ['border-accent/30 bg-accent/[0.06] text-[#d3dde8]', Info],
}

export default function Alert({ tone = 'error', children }) {
  const [cls, Icon] = TONES[tone] || TONES.error
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm ${cls}`}>
      <Icon size={16} className="mt-0.5 shrink-0 opacity-80" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

// errorMessage turns an API error into text for the user.
export function errorMessage(err) {
  if (!err) return null
  if (err.code === 'rate_limited') return 'Too many attempts. Wait a few minutes and try again.'
  if (err.code === 'internal') return 'Something went wrong on our side. Please try again.'
  return err.message
}
