import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useDetailCrumb } from '../../lib/crumbs.jsx'

// PageHeader is the title block at the top of every dashboard page.
// `back` adds a link to the parent list; `meta` is a row of badges or facts
// under the title; `children` (usually Tabs) sits under the whole block.
export default function PageHeader({ title, description, actions, back, meta, children }) {
  useDetailCrumb(back && typeof title === 'string' ? title : null)
  return (
    <div className="mb-6 grid gap-4 [.grid>&]:mb-0">
      {back && (
        <Link to={back.to} className="inline-flex w-fit items-center gap-1 text-xs text-fg-3 hover:text-fg">
          <ChevronLeft size={14} /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-[1.55rem] break-words">{title}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-sm text-fg-3">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-fg-3">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

// Panel is a bordered dashboard card with an optional title.
export function Panel({ title, description, actions, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-xl border border-line bg-surface p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-[0.95rem] font-medium text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-fg-3">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
