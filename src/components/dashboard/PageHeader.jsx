import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useDetailCrumb } from '../../lib/crumbs.jsx'

// PageHeader is the title block at the top of every dashboard page.
// `back` adds a link to the parent list; `meta` is a row of badges or facts
// under the title; `children` (usually Tabs) sits under the whole block.
export default function PageHeader({ title, description, actions, back, meta, icon: Icon, kpis, children }) {
  useDetailCrumb(back && typeof title === 'string' ? title : null)
  return (
    <div className="mb-6 grid gap-4 [.grid>&]:mb-0">
      {back && (
        <Link to={back.to} className="inline-flex w-fit items-center gap-1 text-xs text-fg-3 hover:text-fg">
          <ChevronLeft size={14} /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 gap-3.5">
          {Icon && <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-3 text-accent ring-1 ring-inset ring-accent/30 sm:grid"><Icon size={22} /></span>}
          <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-[1.55rem] break-words">{title}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-sm text-fg-3">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-fg-3">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {kpis && <KpiStrip items={kpis} />}
      {children}
    </div>
  )
}

// KpiStrip is the row of headline figures under a page title, as in the
// reference: label over value, separated by thin rules, scrolling sideways
// on phones rather than wrapping. items: [{ label, value, note, tone }].
export function KpiStrip({ items }) {
  const tones = { bad: 'text-bad', warn: 'text-warn', good: 'text-ok', accent: 'text-accent' }
  return (
    <div className="app-card overflow-x-auto rounded-2xl border border-line scrollbar-thin">
      <dl className="flex min-w-max divide-x divide-line">
        {items.filter(Boolean).map((k) => (
          <div key={k.label} className="min-w-[9.5rem] flex-1 px-5 py-3.5">
            <dt className="text-[0.7rem] font-medium uppercase tracking-wider text-fg-3">{k.label}</dt>
            <dd className={`mt-1 text-xl font-semibold tracking-tight tnum ${tones[k.tone] || 'text-fg'}`}>{k.value}</dd>
            {k.note && <dd className="mt-0.5 text-xs text-fg-3">{k.note}</dd>}
          </div>
        ))}
      </dl>
    </div>
  )
}

// Panel is a bordered dashboard card with an optional title.
export function Panel({ title, description, actions, children, className = '' }) {
  return (
    <section className={`app-card min-w-0 rounded-2xl border border-line p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-[0.95rem] font-semibold tracking-tight text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-fg-3">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
