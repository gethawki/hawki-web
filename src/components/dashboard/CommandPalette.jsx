import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, FolderGit2, Search, ShieldCheck } from 'lucide-react'
import { ADMIN_NAV, DASHBOARD_NAV } from '../../data/dashboardNav.js'
import { useAuth } from '../../lib/auth.jsx'
import { hasAccess } from '../../lib/access.js'
import { api } from '../../lib/api.js'
import { Kbd } from '../ui/Badge.jsx'

// CommandPalette (Ctrl or Cmd + K) jumps to any page the user may open, any
// project in the current organization and, for staff, the admin console.
export default function CommandPalette({ open, onClose }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [projects, setProjects] = useState([])
  const inputRef = useRef(null)
  const orgId = auth.currentOrg?.id
  const canProjects = auth.can('projects:read')

  useEffect(() => {
    if (!open) return
    setQ('')
    setActive(0)
    inputRef.current?.focus()
    if (orgId && canProjects) {
      api(`/api/v1/orgs/${orgId}/projects`).then((d) => setProjects(d.projects || [])).catch(() => setProjects([]))
    }
  }, [open, orgId, canProjects])

  const items = useMemo(() => {
    const pages = DASHBOARD_NAV.flatMap((s) => s.links.filter((l) => l.to && hasAccess(auth, l.access)).map((l) => ({ group: 'Pages', label: l.label, hint: s.title, to: l.to, icon: l.icon })))
    const admin = auth.isPlatformAdmin
      ? ADMIN_NAV.flatMap((s) => s.links.map((l) => ({ group: 'Admin console', label: l.label, hint: 'Staff', to: l.to, icon: l.icon || ShieldCheck })))
      : []
    const projs = projects.map((p) => ({ group: 'Projects', label: p.name, hint: p.repository_url?.replace(/^https?:\/\//, '') || p.contract_address, to: `/dashboard/projects/${p.id}`, icon: FolderGit2 }))
    const all = [...pages, ...projs, ...admin]
    const needle = q.trim().toLowerCase()
    return needle ? all.filter((i) => `${i.label} ${i.hint || ''} ${i.group}`.toLowerCase().includes(needle)) : all
  }, [auth, projects, q])

  if (!open) return null
  const go = (i) => {
    if (!i) return
    onClose()
    navigate(i.to)
  }
  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[active]) }
    else if (e.key === 'Escape') onClose()
  }

  let lastGroup = null
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search and jump">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-label="Close search" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line-strong bg-surface-2 shadow-2xl shadow-black/60">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={16} className="text-fg-3" />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setActive(0) }} onKeyDown={onKey}
            placeholder="Search pages and projects" aria-label="Search pages and projects"
            className="h-12 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-3 outline-none" />
          <Kbd>Esc</Kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1.5 scrollbar-thin" role="listbox">
          {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-fg-3">No matches.</li>}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? (lastGroup = it.group) : null
            const Icon = it.icon
            return (
              <li key={`${it.group}-${it.to}`}>
                {header && <div className="px-2.5 pb-1 pt-2.5 text-[0.7rem] font-medium text-fg-3">{header}</div>}
                <button type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(it)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm ${i === active ? 'bg-surface-3 text-fg' : 'text-fg-2'}`}>
                  <Icon size={15} className={it.group === 'Admin console' ? 'text-staff' : 'text-fg-3'} />
                  <span className="truncate">{it.label}</span>
                  {it.hint && <span className="ml-auto truncate pl-3 text-xs text-fg-3">{it.hint}</span>}
                  {i === active && <CornerDownLeft size={13} className="shrink-0 text-fg-3" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
