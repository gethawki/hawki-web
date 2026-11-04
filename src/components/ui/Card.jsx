import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

// Card is the surface every dashboard block sits on. `title` and `actions`
// make a header row; `icon` marks the title; `flush` drops the body padding
// for tables and lists; `more` ({ to, label }) ends the card with a full
// width "View all" bar.
export default function Card({ title, description, actions, footer, more, icon: Icon, flush, className = '', bodyClassName = '', children, as: Tag = 'section' }) {
  return (
    <Tag className={`app-card flex min-w-0 flex-col rounded-2xl border border-line ${className}`}>
      {(title || actions) && (
        <header className="flex items-start gap-3 px-5 pt-4 pb-3">
          {Icon && <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent ring-1 ring-inset ring-accent/20"><Icon size={15} /></span>}
          <div className="flex-1 min-w-0">
            {title && <h2 className="text-[0.95rem] font-semibold tracking-tight text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-fg-3">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
        </header>
      )}
      <div className={`flex-1 ${flush ? '' : title || actions ? 'px-5 pb-5' : 'p-5'} ${bodyClassName}`}>{children}</div>
      {footer && <footer className="border-t border-line px-5 py-3 text-xs text-fg-3">{footer}</footer>}
      {more && (
        <div className="px-4 pb-4">
          <Link to={more.to} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface-2/70 text-xs font-medium text-fg-2 transition hover:border-accent/40 hover:text-fg">
            {more.label || 'View all'} <ChevronRight size={13} />
          </Link>
        </div>
      )}
    </Tag>
  )
}

// CardLink is a quiet "View all" link for card headers.
export function CardLink({ to, children = 'View all' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium text-accent hover:bg-accent/10">
      {children} <ChevronRight size={13} />
    </Link>
  )
}

// DefinitionList shows label/value pairs in detail views.
export function DefinitionList({ items, columns = 2 }) {
  return (
    <dl className={`grid gap-x-6 gap-y-4 ${columns === 3 ? 'sm:grid-cols-3' : columns === 1 ? '' : 'sm:grid-cols-2'}`}>
      {items.filter(Boolean).map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-fg-3">{label}</dt>
          <dd className="mt-1 text-sm text-fg break-words">{value ?? '-'}</dd>
        </div>
      ))}
    </dl>
  )
}
