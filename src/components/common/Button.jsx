import { Link } from 'react-router-dom'

const VARIANTS = {
  primary: 'bg-steel text-ink hover:bg-steel-light font-medium',
  ghost: 'border border-panel-border text-[#e0e0e0] hover:border-steel hover:text-white',
  danger: 'border border-copper/70 text-copper hover:bg-copper hover:text-ink',
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed'

// Button renders a <button>, or a router <Link> when `to` is given.
export default function Button({ variant = 'primary', busy, to, className = '', children, ...props }) {
  const cls = `${base} ${VARIANTS[variant]} ${className}`
  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <button className={cls} disabled={busy || props.disabled} {...props}>
      {busy && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </button>
  )
}
