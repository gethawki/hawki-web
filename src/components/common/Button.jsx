import { Link } from 'react-router-dom'

const VARIANTS = {
  primary: 'bg-accent text-on-accent font-medium hover:bg-accent-strong shadow-sm',
  ghost: 'border border-line-strong bg-surface text-fg hover:bg-surface-2 hover:border-[#3d3d44]',
  subtle: 'text-fg-2 hover:bg-surface-2 hover:text-fg',
  danger: 'border border-critical/50 text-bad hover:bg-critical hover:text-white hover:border-critical',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
}

// Button renders a <button>, or a router <Link> when `to` is given.
export default function Button({ variant = 'primary', size = 'md', busy, to, className = '', children, ...props }) {
  const cls = `inline-flex items-center justify-center whitespace-nowrap rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`
  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <button className={cls} disabled={busy || props.disabled} {...props}>
      {busy && <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
