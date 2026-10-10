const TONES = {
  error: 'border-copper/60 bg-copper/10 text-[#e6c9c5]',
  info: 'border-steel/60 bg-steel/10 text-[#d3dde8]',
}

export default function Alert({ tone = 'error', children }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3.5 py-2.5 text-sm ${TONES[tone]}`}>
      {children}
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
