import { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutList, PanelLeftClose, Pin, PinOff, X } from 'lucide-react'
import { PageSkeleton } from '../ui/Feedback.jsx'

// EngineLayout frames an engine (Intel, Hunt, Watch, MEV) in the workspace
// or the console. The sections of the current group sit in a strip of tabs
// under the engine bar; every section is one click away in a panel that is
// revealed on demand ("All sections") and can be pinned beside the page.
// The app's main sidebar stays the only permanent one.
//
// sections: [{ title, links: [{ to, label, icon, end }] }]. A link's `to`
// may carry a query (?tab=x): it is active when the path and that query
// match, so tab pages and nested routes work alike.

const PIN_KEY = 'hawki.enginePanel.pinned'

function readPinned() {
  try {
    return localStorage.getItem(PIN_KEY) === '1'
  } catch {
    return false
  }
}

export function isActive(link, loc) {
  const [path, query] = link.to.split('?')
  const pathOk = link.end ? loc.pathname === path : loc.pathname === path || loc.pathname.startsWith(`${path}/`)
  if (!pathOk) return false
  if (!query) return true
  const want = new URLSearchParams(query)
  const have = new URLSearchParams(loc.search)
  return [...want].every(([k, v]) => have.get(k) === v)
}

// best picks the most specific active link, so /x/y beats /x and a link
// with a query beats one without.
function best(sections, loc) {
  const all = sections.flatMap((s) => s.links.map((l) => ({ ...l, group: s.title })))
  const hits = all.filter((l) => isActive(l, loc))
  if (!hits.length) {
    const def = all.find((l) => l.default)
    return def || all[0]
  }
  return hits.sort((a, b) => b.to.length - a.to.length)[0]
}

function SectionLinks({ sections, current, onPick }) {
  return (
    <nav className="grid gap-4">
      {sections.map((s) => (
        <div key={s.title}>
          <div className="mb-1 px-2.5 text-[0.68rem] font-semibold uppercase tracking-wider text-fg-3">{s.title}</div>
          <ul className="grid gap-0.5">
            {s.links.map((l) => {
              const on = current?.to === l.to
              return (
                <li key={l.to}>
                  <Link to={l.to} onClick={onPick} aria-current={on ? 'page' : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${on ? 'bg-accent/15 text-fg ring-1 ring-inset ring-accent/40' : 'text-fg-2 hover:bg-surface-2 hover:text-fg'}`}>
                    {l.icon && <l.icon size={15} className="shrink-0" aria-hidden />}
                    <span className="truncate">{l.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export default function EngineLayout({ name, icon: Icon, sections, status, children }) {
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(readPinned)
  useEffect(() => setOpen(false), [loc.pathname, loc.search])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const current = best(sections, loc)
  const group = sections.find((s) => s.title === current?.group) || sections[0]
  const multi = sections.length > 1
  const pin = (v) => {
    setPinned(v)
    setOpen(false)
    try {
      localStorage.setItem(PIN_KEY, v ? '1' : '0')
    } catch {
      // the choice lasts for this page only
    }
  }

  const bar = (
    <div className="app-card mb-5 rounded-2xl border border-line">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {Icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-3 text-accent ring-1 ring-inset ring-accent/30"><Icon size={18} /></span>}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-fg">{name}</div>
          <div className="truncate text-xs text-fg-3">{multi ? `${group.title} · ${current?.label}` : current?.label}</div>
        </div>
        {status}
        {!pinned && (
          <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="engine-panel"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface-2/70 px-3 text-xs font-medium text-fg-2 transition hover:border-accent/50 hover:text-fg">
            <LayoutList size={14} /> All sections
          </button>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 scrollbar-thin" role="tablist" aria-label={`${name} sections`}>
        {(pinned ? [] : group.links).map((l) => {
          const on = current?.to === l.to
          return (
            <Link key={l.to} to={l.to} role="tab" aria-selected={on}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${on ? 'bg-accent/15 text-fg ring-1 ring-inset ring-accent/40' : 'text-fg-3 hover:bg-surface-2 hover:text-fg'}`}>
              {l.icon && <l.icon size={13} aria-hidden />}{l.label}
            </Link>
          )
        })}
        {multi && !pinned && sections.filter((s) => s !== group).map((s) => (
          <Link key={s.title} to={s.links[0].to} className="ml-1 inline-flex shrink-0 items-center rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs text-fg-3 hover:border-line-strong hover:text-fg">
            {s.title}
          </Link>
        ))}
        {pinned && <span className="px-2 py-1.5 text-xs text-fg-3">Sections are pinned on the left.</span>}
      </div>
    </div>
  )

  const content = <Suspense fallback={<PageSkeleton cards={4} />}>{children ?? <Outlet />}</Suspense>

  return (
    <div>
      {bar}
      {pinned ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="app-card hidden self-start rounded-2xl border border-line p-3 lg:sticky lg:top-20 lg:block">
            <button type="button" onClick={() => pin(false)} className="mb-3 flex w-full items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-2 text-xs font-medium text-fg-2 hover:text-fg">
              <PanelLeftClose size={14} /> Hide panel
            </button>
            <SectionLinks sections={sections} current={current} />
          </aside>
          <div className="min-w-0">
            <div className="mb-4 lg:hidden">
              <button type="button" onClick={() => pin(false)} className="text-xs text-fg-3 underline">Unpin sections</button>
            </div>
            {content}
          </div>
        </div>
      ) : content}

      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`${name} sections`}>
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-label="Close sections" onClick={() => setOpen(false)} />
          <aside id="engine-panel" className="absolute inset-y-0 right-0 flex w-[19rem] max-w-[88vw] flex-col border-l border-line bg-sidebar shadow-2xl">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              {Icon && <Icon size={16} className="text-accent" />}
              <span className="flex-1 text-sm font-semibold text-fg">{name}</span>
              <button type="button" onClick={() => pin(true)} title="Pin beside the page" className="hidden rounded-md p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg lg:inline-flex" aria-label="Pin sections">
                <Pin size={15} />
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg" aria-label="Close sections"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
              <SectionLinks sections={sections} current={current} onPick={() => setOpen(false)} />
            </div>
            <div className="hidden border-t border-line p-3 text-[0.7rem] text-fg-3 lg:block"><PinOff size={12} className="mr-1 inline" />Pin keeps this list beside the page.</div>
          </aside>
        </div>
      )}
    </div>
  )
}
