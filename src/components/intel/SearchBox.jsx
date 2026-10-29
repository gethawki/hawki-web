import { useEffect, useId, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Button from '../common/Button.jsx'

const TYPE = { contract: 'Contract', token: 'Token', address: 'Account', protocol: 'Protocol', exploit: 'Incident', proposal: 'Proposal', risk_event: 'Risk event' }

// useSuggest completes what is being typed from the search engine, after a
// short pause. Without the search engine it answers nothing.
export function useSuggest(term, enabled = true) {
  const { currentOrg } = useAuth()
  const [list, setList] = useState([])
  useEffect(() => {
    const t = term.trim()
    if (!enabled || !currentOrg || t.length < 2) { setList([]); return }
    let live = true
    const timer = setTimeout(() => {
      api(`/api/v1/orgs/${currentOrg.id}/intel/search/suggest?q=${encodeURIComponent(t)}`)
        .then((d) => live && setList(d.suggestions || []), () => live && setList([]))
    }, 150)
    return () => { live = false; clearTimeout(timer) }
  }, [term, enabled, currentOrg])
  return list
}

export const suggestionChain = (s) => (Array.isArray(s.chain) ? s.chain.slice(0, 2).join(', ') : s.chain || '')

// SearchBox is the Intel search field with autocomplete: Enter searches,
// arrows and Enter on a suggestion open it.
export default function SearchBox({ initial = '', onSearch, onPick, autoFocus, placeholder = 'Search addresses, contracts, tokens, protocols, incidents' }) {
  const [term, setTerm] = useState(initial)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const list = useSuggest(term, open)
  const id = useId()
  const input = useRef(null)
  useEffect(() => { setTerm(initial) }, [initial])
  useEffect(() => { if (autoFocus) input.current?.focus() }, [autoFocus])

  function onKey(e) {
    if (e.key === 'ArrowDown' && list.length) { e.preventDefault(); setOpen(true); setActive((a) => Math.min(list.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp' && list.length) { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)) }
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Enter' && active >= 0 && open && list[active]) { e.preventDefault(); setOpen(false); onPick?.(list[active]) }
  }
  const showList = open && list.length > 0
  return (
    <form role="search" className="relative flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setOpen(false); onSearch(term) }}>
      <div className="relative min-w-0 flex-1">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" aria-hidden />
        <input ref={input} type="search" value={term} placeholder={placeholder} aria-label="Search Intel" role="combobox" aria-expanded={showList}
          aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); setActive(-1) }} onKeyDown={onKey}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-fg-3 outline-none transition focus:border-accent/60" />
        {showList && (
          <ul id={`${id}-list`} role="listbox" className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-lg border border-line-strong bg-surface-2 py-1 shadow-xl shadow-black/50">
            {list.map((s, i) => (
              <li key={`${s.id}:${i}`} id={`${id}-${i}`} role="option" aria-selected={i === active}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); onPick?.(s) }} onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${i === active ? 'bg-surface-3 text-fg' : 'text-fg-2'}`}>
                  <span className="w-20 shrink-0 text-xs text-fg-3">{TYPE[s.type] || s.type}</span>
                  <span className="min-w-0 flex-1 truncate">{s.text}</span>
                  <span className="shrink-0 text-xs capitalize text-fg-3">{suggestionChain(s)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button type="submit" disabled={term.trim().length < 2}>Search</Button>
    </form>
  )
}
