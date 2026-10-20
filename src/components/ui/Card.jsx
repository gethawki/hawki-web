import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

// Card is the surface every dashboard block sits on. `title` and `actions`
// make a header row; `flush` drops the body padding for tables and lists.
export default function Card({ title, description, actions, footer, flush, className = '', bodyClassName = '', children, as: Tag = 'section' }) {
  return (
    <Tag className={`min-w-0 rounded-xl border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <header className="flex items-start gap-3 px-5 pt-4 pb-3">
          <div className="flex-1 min-w-0">
            {title && <h2 className="text-[0.95rem] font-medium text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-fg-3">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`${flush ? '' : title || actions ? 'px-5 pb-5' : 'p-5'} ${bodyClassName}`}>{children}</div>
      {footer && <footer className="border-t border-line px-5 py-3 text-xs text-fg-3">{footer}</footer>}
    </Tag>
  )
}

// CardLink is a quiet "View all" link for card headers.
export function CardLink({ to, children = 'View all' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-0.5 text-xs text-fg-2 hover:text-fg">
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
