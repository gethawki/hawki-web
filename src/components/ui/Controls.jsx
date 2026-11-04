import { NavLink } from 'react-router-dom'
import { Search } from 'lucide-react'

// Segmented is a compact single choice, for time ranges and views.
export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface-2/70 p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${value === o.value ? 'bg-surface-3 text-fg shadow-sm' : 'text-fg-3 hover:text-fg'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const RANGES = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
]

// Tabs is a row of links under a page header.
export function Tabs({ tabs }) {
  return (
    <nav className="-mb-px flex gap-5 overflow-x-auto border-b border-line scrollbar-thin" aria-label="Sections">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} replace={t.replace}
          className={({ isActive }) => `whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition ${isActive ? 'border-accent text-fg' : 'border-transparent text-fg-3 hover:text-fg'}`}>
          {t.label}{t.count != null && <span className="ml-1.5 rounded bg-surface-3 px-1.5 py-px text-[0.65rem] text-fg-2 tnum">{t.count}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

// ButtonTabs switches local state with the same look as Tabs.
export function ButtonTabs({ tabs, value, onChange }) {
  return (
    <div className="-mb-px flex gap-5 overflow-x-auto border-b border-line scrollbar-thin" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={`whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition ${value === t.value ? 'border-accent text-fg' : 'border-transparent text-fg-3 hover:text-fg'}`}>
          {t.label}{t.count != null && <span className="ml-1.5 rounded bg-surface-3 px-1.5 py-px text-[0.65rem] text-fg-2 tnum">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

// PillFilter is a row of filter chips with counts ("All 23", "High 6"),
// each with an optional colored dot. options: [{ value, label, count, color }].
export function PillFilter({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value === o.value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${on ? 'border-accent/60 bg-accent/15 text-fg' : 'border-line bg-surface-2/60 text-fg-2 hover:border-line-strong hover:text-fg'}`}>
            {o.color && <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />}
            {o.label}
            {o.count != null && <span className="tnum text-fg-3">({o.count})</span>}
          </button>
        )
      })}
    </div>
  )
}

const input = 'h-8 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg placeholder:text-fg-3 outline-none transition focus:border-accent/60'

export function SearchInput({ id, value, onChange, placeholder = 'Search', label, onSubmit, className = '' }) {
  return (
    <form role="search" className={`relative ${className}`} onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}>
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
      <input id={id} type="search" aria-label={label || placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`${input} w-full pl-8`} />
    </form>
  )
}

// FilterSelect is a compact labelled select for filter bars.
export function FilterSelect({ label, value, onChange, options, id }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-fg-3" htmlFor={id}>
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${input} pr-7`}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

// Toolbar is the single filter row above a table or chart group.
export function Toolbar({ children, right }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
