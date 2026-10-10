import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bell, Crosshair, FileText, FolderGit2, LayoutDashboard, LogOut, Menu, Radar, ScanLine, Settings, ShieldAlert, X,
} from 'lucide-react'
import { useAuth } from './auth.jsx'
import { Logo } from './ui.jsx'

// Sections arrive phase by phase (see the cloud roadmap); unbuilt ones are
// shown but disabled so the navigation does not jump around later.
const NAV = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { label: 'Projects', icon: FolderGit2, soon: true },
  { label: 'Scans', icon: ScanLine, soon: true },
  { label: 'Findings', icon: ShieldAlert, soon: true },
  { label: 'Reports', icon: FileText, soon: true },
  { label: 'Alerts', icon: Bell, soon: true },
  { label: 'Hunt', icon: Crosshair, soon: true },
  { label: 'Watch', icon: Radar, soon: true },
]

function NavItems({ onNavigate }) {
  return (
    <ul className="grid gap-0.5">
      {NAV.map(({ to, label, icon: Icon, end, soon }) => (
        <li key={label}>
          {soon ? (
            <span className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-grey/70 cursor-default" aria-disabled="true">
              <Icon size={16} />
              {label}
              <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-wider text-grey/60">soon</span>
            </span>
          ) : (
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-steel/15 text-white' : 'text-[#bdbdbd] hover:bg-panel hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          )}
        </li>
      ))}
    </ul>
  )
}

function OrgSwitcher() {
  const { orgs, currentOrg, selectOrg } = useAuth()
  if (!currentOrg) return null
  return (
    <label className="block">
      <span className="sr-only">Organization</span>
      <select
        value={currentOrg.id}
        onChange={(e) => selectOrg(e.target.value)}
        className="w-full rounded-lg bg-ink border border-panel-border px-3 py-2 text-sm text-white outline-none focus:border-steel"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-1 pt-1">
        <Logo />
      </div>
      <OrgSwitcher />
      <nav aria-label="Cloud">
        <NavItems onNavigate={onNavigate} />
      </nav>
      <div className="mt-auto">
        <span className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-grey/70" aria-disabled="true">
          <Settings size={16} />
          Settings
          <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-wider text-grey/60">soon</span>
        </span>
      </div>
    </div>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const initials = (user.name || user.email).split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full border border-panel-border pl-1 pr-3 py-1 hover:border-steel transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-steel-dark text-xs font-medium text-white">{initials}</span>
        <span className="hidden sm:block max-w-[12rem] truncate text-sm text-[#cfcfcf]">{user.name || user.email}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 rounded-xl border border-panel-border bg-panel p-2 shadow-xl z-40">
          <div className="px-3 py-2">
            <div className="text-sm text-white truncate">{user.name}</div>
            <div className="text-xs text-grey truncate">{user.email}</div>
          </div>
          <div className="my-1 h-px bg-panel-border" />
          <button
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#cfcfcf] hover:bg-ink hover:text-white"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppShell() {
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  useEffect(() => setDrawer(false), [location.pathname])

  return (
    <div className="min-h-screen bg-ink text-[#e0e0e0] lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block border-r border-panel-border bg-ink-soft min-h-screen sticky top-0">
        <Sidebar />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-panel-border bg-ink-soft">
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-panel-border bg-ink/85 backdrop-blur px-4 sm:px-6 py-3">
          <button className="lg:hidden -ml-1 p-1.5 text-[#e0e0e0]" aria-label="Open menu" onClick={() => setDrawer((v) => !v)}>
            {drawer ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
