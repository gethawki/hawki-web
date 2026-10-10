// Small form and feedback primitives for the Cloud app. They use the brand
// tokens from src/index.css (ink, panel, steel, copper, grey).
import { Link } from 'react-router-dom'

export function Logo({ to = '/app' }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <span className="w-2 h-2 rounded-full bg-steel" />
      <span className="font-display text-xl text-white tracking-tight">
        Hawk<span className="text-steel italic">i</span>
      </span>
      <span className="font-mono text-[0.6rem] tracking-wider text-grey border border-panel-border rounded-full px-1.5 py-0.5 uppercase">
        Cloud
      </span>
    </Link>
  )
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-3 text-grey" role="status">
      <span className="w-2 h-2 rounded-full bg-steel animate-pulse" />
      <span className="font-mono text-sm">{label}</span>
    </div>
  )
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink">
      <Spinner />
    </div>
  )
}

export function Field({ label, error, hint, id, ...input }) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-sm text-[#cfcfcf] mb-1.5">{label}</span>
      <input
        id={id}
        className={`w-full rounded-lg bg-ink-soft border px-3.5 py-2.5 text-sm text-white placeholder:text-grey outline-none transition focus:border-steel ${
          error ? 'border-copper' : 'border-panel-border'
        }`}
        aria-invalid={error ? 'true' : undefined}
        {...input}
      />
      {error ? (
        <span className="block mt-1.5 text-xs text-copper">{error}</span>
      ) : hint ? (
        <span className="block mt-1.5 text-xs text-grey">{hint}</span>
      ) : null}
    </label>
  )
}

export function Button({ children, variant = 'primary', busy, className = '', ...props }) {
  const styles = {
    primary: 'bg-steel text-ink hover:bg-steel-light',
    ghost: 'border border-panel-border text-[#e0e0e0] hover:border-steel hover:text-white',
    danger: 'border border-copper text-copper hover:bg-copper hover:text-ink',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </button>
  )
}

export function Alert({ tone = 'error', children }) {
  const tones = {
    error: 'border-copper/60 bg-copper/10 text-[#e6c9c5]',
    info: 'border-steel/60 bg-steel/10 text-[#d3dde8]',
    success: 'border-steel/60 bg-steel/10 text-[#d3dde8]',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3.5 py-2.5 text-sm ${tones[tone]}`}>
      {children}
    </div>
  )
}

// AuthCard is the centered frame for sign-in style pages.
export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <div className="px-6 py-6">
        <Logo to="/" />
      </div>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-panel-border bg-panel/80 p-7 sm:p-8">
            <h1 className="font-display text-2xl text-white">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-grey">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-sm text-grey">{footer}</div>}
        </div>
      </main>
    </div>
  )
}

// messageFor turns an ApiError into text for a form. Field errors are shown
// beside the field instead.
export function messageFor(err) {
  if (!err) return null
  if (err.code === 'rate_limited') return 'Too many attempts. Wait a few minutes and try again.'
  if (err.code === 'internal') return 'Something went wrong on our side. Please try again.'
  return err.message
}
