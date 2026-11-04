import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, Check, ChevronsUpDown, LogOut, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Search, Settings, ShieldCheck, User, X,
} from 'lucide-react'
import { ADMIN_NAV, DASHBOARD_NAV, PLAN_LABELS, ROLE_LABELS } from '../../data/dashboardNav.js'
import { useAuth } from '../../lib/auth.jsx'
import { LiveProvider, useLive, useLiveEvent } from '../../lib/live.jsx'
import { CrumbProvider, useCrumbs } from '../../lib/crumbs.jsx'
import { api } from '../../lib/api.js'
import { formatCredits } from '../../lib/credits.js'
import { initials } from '../../lib/format.js'
import { hasAccess } from '../../lib/access.js'
import { AlertBell } from './AlertBits.jsx'
import CommandPalette from './CommandPalette.jsx'
import StatusBanner from '../common/StatusBanner.jsx'
import ImpersonationBanner from '../admin/ImpersonationBanner.jsx'
import Menu, { MenuDivider, MenuLabel, menuItem } from '../ui/Menu.jsx'
import Badge, { Kbd } from '../ui/Badge.jsx'
import { Meter } from '../charts/Small.jsx'

// DashboardLayout is the signed-in shell. The workspace (/dashboard) and the
// staff-only admin console (/admin) are two modes with their own sidebars;
// the admin mode is marked in the sidebar, the top bar and the page edge so
// staff always know when they are acting on the whole platform.

const COLLAPSE_KEY = 'hawki.sidebar.collapsed'
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function NavItem({ link, collapsed, onNavigate, staff }) {
  const { to, label, icon: Icon, end, soon } = link
  if (soon) {
    return (
      <span className="flex items-center gap-3 rounded-lg px-2.5 py-[7px] text-sm text-fg-3/70" aria-disabled="true" title={collapsed ? `${label} (soon)` : undefined}>
        <Icon size={16} className="shrink-0" />
        {!collapsed && <><span className="truncate">{label}</span><span className="ml-auto text-[0.62rem] uppercase tracking-wider">soon</span></>}
      </span>
    )
  }
  return (
    <NavLink to={to} end={end} onClick={onNavigate} title={collapsed ? label : undefined}
      className={({ isActive }) => `group relative flex items-center gap-3 rounded-lg px-2.5 py-[7px] text-sm transition ${
        isActive ? 'bg-surface-3 font-medium text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg'}`}>
      {({ isActive }) => (
        <>
          {isActive && staff && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-staff" />}
          <Icon size={16} className={`shrink-0 ${isActive ? (staff ? 'text-staff' : 'text-accent') : 'text-fg-3 group-hover:text-fg-2'}`} />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  )
}

function NavSections({ sections, collapsed, onNavigate, staff }) {
  const auth = useAuth()
  return (
    <nav aria-label={staff ? 'Admin console' : 'Workspace'} className="grid gap-5">
      {sections.map((section) => {
        const links = section.links.filter((l) => hasAccess(auth, l.access))
        if (links.length === 0) return null
        return (
          <div key={section.title}>
            {!collapsed && <div className="mb-1.5 px-2.5 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-fg-3">{section.title}</div>}
            <ul className="grid gap-px">
              {links.map((l) => <li key={l.label}><NavItem link={l} collapsed={collapsed} onNavigate={onNavigate} staff={staff} /></li>)}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

function OrgAvatar({ name, size = 'h-7 w-7' }) {
  return <span className={`grid ${size} shrink-0 place-items-center rounded-md bg-gradient-to-br from-steel to-steel-dark text-[0.65rem] font-semibold text-white`}>{initials(name)}</span>
}

function WorkspaceSwitcher({ collapsed }) {
  const { orgs, currentOrg, selectOrg, can } = useAuth()
  if (!currentOrg) return null
  return (
    <Menu align="left" width="w-64" label="Switch organization" trigger={({ toggle, props }) => (
      <button type="button" onClick={toggle} {...props}
        className={`flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface px-2 py-1.5 text-left transition hover:border-line-strong ${collapsed ? 'justify-center px-1' : ''}`}>
        <OrgAvatar name={currentOrg.name} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-fg">{currentOrg.name}</span>
              <span className="block truncate text-[0.7rem] text-fg-3">{PLAN_LABELS[currentOrg.plan] || currentOrg.plan} · {ROLE_LABELS[currentOrg.role] || currentOrg.role}</span>
            </span>
            <ChevronsUpDown size={14} className="text-fg-3" />
          </>
        )}
      </button>
    )}>
      <MenuLabel>Organizations</MenuLabel>
      {orgs.map((o) => (
        <button key={o.id} type="button" role="menuitem" onClick={() => selectOrg(o.id)} className={menuItem}>
          <OrgAvatar name={o.name} size="h-6 w-6" />
          <span className="min-w-0 flex-1 truncate">{o.name}</span>
          {o.id === currentOrg.id && <Check size={14} className="text-accent" />}
        </button>
      ))}
      {can('settings:read') && (
        <>
          <MenuDivider />
          <Link role="menuitem" to="/dashboard/settings" className={menuItem}><Settings size={15} /> Organization settings</Link>
        </>
      )}
    </Menu>
  )
}

// Usage shows credits left this period, or that the organization is never
// charged.
function Usage() {
  const { currentOrg, can } = useAuth()
  const [b, setB] = useState(null)
  const [v, setV] = useState(0)
  useLiveEvent(['billing.updated'], () => setV((x) => x + 1))
  const ok = Boolean(currentOrg) && can('billing:read')
  useEffect(() => {
    if (!ok) return
    api(`/api/v1/orgs/${currentOrg.id}/billing`).then(setB).catch(() => setB(null))
  }, [ok, currentOrg?.id, v])
  if (!ok || !b) return null
  const plan = (b.plan?.monthly_credits || 0) * 1000
  return (
    <Link to="/dashboard/billing" className="block rounded-lg border border-line bg-surface px-3 py-2.5 transition hover:border-line-strong">
      <div className="flex items-center justify-between text-xs">
        <span className="text-fg-3">Credits</span>
        {b.exempt ? <Badge tone="good">Unlimited</Badge> : <span className="tnum text-fg">{formatCredits(b.total_remaining_mc)} left</span>}
      </div>
      {!b.exempt && plan > 0 && <div className="mt-2"><Meter value={b.monthly_remaining_mc} max={plan} invert label="Plan credits left this period" /></div>}
      <div className="mt-1.5 text-[0.7rem] text-fg-3">{b.exempt ? 'Exempt from billing' : `${b.plan?.name || ''} plan`}</div>
    </Link>
  )
}

// StatusCard is the sidebar's footer status, as in the reference: whether
// live updates are connected and which environment this is.
function StatusCard({ staff }) {
  const { connected } = useLive()
  return (
    <div className="rounded-xl border border-line bg-surface/70 px-3 py-2.5 text-xs">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${connected ? 'bg-good shadow-[0_0_8px_var(--color-good)]' : 'bg-fg-3'}`} />
        <span className={connected ? 'font-medium text-ok' : 'text-fg-3'}>{connected ? 'Connected' : 'Reconnecting'}</span>
      </div>
      <div className="mt-1.5 flex justify-between gap-2 text-fg-3"><span>Mode</span><span className="text-fg-2">{staff ? 'Platform admin' : 'Workspace'}</span></div>
    </div>
  )
}

function Sidebar({ staff, collapsed, onToggle, onNavigate }) {
  const auth = useAuth()
  return (
    <div className="flex h-full flex-col">
      <div className={`flex h-14 shrink-0 items-center gap-2 border-b border-line px-4 ${collapsed ? 'justify-center px-2' : ''}`}>
        <Link to={staff ? '/admin' : '/dashboard'} className="flex items-center gap-2.5" onClick={onNavigate}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-steel to-steel-dark text-white"><ShieldCheck size={17} /></span>
          {!collapsed && <span className="font-display text-lg text-white tracking-tight">Hawk<span className="text-accent italic">i</span></span>}
        </Link>
        {!collapsed && (staff ? <Badge tone="staff">Admin</Badge> : <span className="text-[0.7rem] text-fg-3">Cloud</span>)}
      </div>

      <div className={`flex-1 overflow-y-auto scrollbar-thin ${collapsed ? 'px-2' : 'px-3'} py-4 grid grid-cols-1 content-start gap-5 [&>*]:min-w-0`}>
        {staff ? (
          <>
            {!collapsed && (
              <div className="rounded-lg border border-staff/30 bg-staff/[0.06] px-3 py-2.5 text-xs text-fg-2">
                <div className="flex items-center gap-1.5 font-medium text-staff"><ShieldCheck size={13} /> Platform admin</div>
                <p className="mt-1 text-fg-3">Actions here affect every customer and are audited.</p>
              </div>
            )}
            <NavSections sections={ADMIN_NAV} collapsed={collapsed} onNavigate={onNavigate} staff />
          </>
        ) : (
          <>
            <WorkspaceSwitcher collapsed={collapsed} />
            <NavSections sections={DASHBOARD_NAV} collapsed={collapsed} onNavigate={onNavigate} />
          </>
        )}
      </div>

      <div className={`grid gap-2 border-t border-line ${collapsed ? 'p-2' : 'p-3'}`}>
        {!collapsed && <StatusCard staff={staff} />}
        {!staff && !collapsed && <Usage />}
        {auth.isPlatformAdmin && (
          <Link to={staff ? '/dashboard' : '/admin'} onClick={onNavigate} title={collapsed ? (staff ? 'Back to workspace' : 'Admin console') : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${staff ? 'text-fg-2 hover:bg-surface-2 hover:text-fg' : 'text-staff hover:bg-staff/10'} ${collapsed ? 'justify-center' : ''}`}>
            {staff ? <ArrowLeft size={16} /> : <ShieldCheck size={16} />}
            {!collapsed && (staff ? 'Back to workspace' : 'Admin console')}
          </Link>
        )}
        {onToggle && (
          <button type="button" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg-3 transition hover:bg-surface-2 hover:text-fg ${collapsed ? 'justify-center' : ''}`}>
            {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> Collapse</>}
          </button>
        )}
      </div>
    </div>
  )
}

function Breadcrumbs({ staff }) {
  const { pathname } = useLocation()
  const { detail } = useCrumbs()
  const all = (staff ? ADMIN_NAV : DASHBOARD_NAV).flatMap((s) => s.links.filter((l) => l.to).map((l) => ({ ...l, section: s.title })))
  const match = all.filter((l) => (l.end ? pathname === l.to : pathname === l.to || pathname.startsWith(`${l.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0]
  const crumbs = [staff ? 'Admin' : 'Workspace']
  if (match) crumbs.push(match.section !== crumbs[0] && match.section !== 'Platform' ? match.section : null, match)
  if (detail && match && pathname !== match.to) crumbs.push(detail)
  const shown = crumbs.filter(Boolean)
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {shown.map((c, i) => {
          const last = i === shown.length - 1
          const label = typeof c === 'string' ? c : c.label
          return (
            <li key={i} className={`flex min-w-0 items-center gap-1.5 ${i < shown.length - 2 ? 'hidden md:flex' : ''}`}>
              {i > 0 && <span className="text-fg-3/60">/</span>}
              {typeof c !== 'string' && !last
                ? <Link to={c.to} className="truncate text-fg-3 hover:text-fg">{label}</Link>
                : <span className={`truncate ${last ? 'text-fg' : 'text-fg-3'}`} aria-current={last ? 'page' : undefined}>{label}</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function LiveDot() {
  const { connected } = useLive()
  return (
    <span className="hidden items-center gap-1.5 text-xs text-fg-3 md:inline-flex" title={connected ? 'Live updates on' : 'Live updates reconnecting'}>
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-good' : 'bg-fg-3'}`} />
      {connected ? 'Live' : 'Offline'}
    </span>
  )
}

function UserMenu() {
  const { user, logout, isPlatformAdmin } = useAuth()
  return (
    <Menu label="Account" trigger={({ toggle, props }) => (
      <button type="button" onClick={toggle} {...props} className="grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-[0.7rem] font-semibold text-fg ring-1 ring-line-strong transition hover:ring-accent/60">
        {initials(user.name || user.email)}
      </button>
    )}>
      <div className="px-2.5 py-2">
        <div className="truncate text-sm font-medium text-fg">{user.name || 'Your account'}</div>
        <div className="truncate text-xs text-fg-3">{user.email}</div>
        {isPlatformAdmin && <div className="mt-2"><Badge tone="staff">Platform admin</Badge></div>}
      </div>
      <MenuDivider />
      <Link role="menuitem" to="/dashboard/profile" className={menuItem}><User size={15} /> Profile and security</Link>
      {isPlatformAdmin && <Link role="menuitem" to="/admin" className={menuItem}><ShieldCheck size={15} /> Admin console</Link>}
      <Link role="menuitem" to="/docs" className={menuItem}><BookOpen size={15} /> Documentation</Link>
      <MenuDivider />
      <button role="menuitem" type="button" onClick={logout} className={menuItem}><LogOut size={15} /> Sign out</button>
    </Menu>
  )
}

export default function DashboardLayout() {
  const { currentOrg, can } = useAuth()
  const location = useLocation()
  const staff = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  useEffect(() => setDrawer(false), [location.pathname])
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        // storage blocked: the choice lasts for this page only
      }
      return !c
    })
  }, [])

  return (
    <LiveProvider orgId={currentOrg?.id}>
      <CrumbProvider>
        <div className={`app-root min-h-screen lg:grid ${collapsed ? 'lg:grid-cols-[4rem_1fr]' : 'lg:grid-cols-[15.5rem_1fr]'}`}>
          {staff && <div className="fixed inset-x-0 top-0 z-[70] h-[2px] bg-staff" aria-hidden="true" />}
          <aside className="sticky top-0 hidden h-screen border-r border-line bg-sidebar/95 lg:block">
            <Sidebar staff={staff} collapsed={collapsed} onToggle={toggle} />
          </aside>

          {drawer && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setDrawer(false)} />
              <aside className="absolute inset-y-0 left-0 w-72 border-r border-line bg-sidebar">
                <Sidebar staff={staff} onNavigate={() => setDrawer(false)} />
              </aside>
            </div>
          )}

          <div className="flex min-w-0 flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-app/75 px-4 backdrop-blur-md sm:px-6">
              <button className="-ml-1 p-1.5 text-fg-2 lg:hidden" aria-label="Open menu" onClick={() => setDrawer((v) => !v)}>
                {drawer ? <X size={20} /> : <MenuIcon size={20} />}
              </button>
              <Breadcrumbs staff={staff} />
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <button type="button" onClick={() => setPalette(true)} aria-label="Search and jump"
                  className="flex h-8 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg-3 transition hover:border-line-strong hover:text-fg-2">
                  <Search size={14} />
                  <span className="hidden md:inline">Search</span>
                  <span className="hidden md:inline-flex"><Kbd>Ctrl K</Kbd></span>
                </button>
                {!staff && <LiveDot />}
                {currentOrg && can('alerts:read') && <AlertBell key={currentOrg.id} />}
                <UserMenu />
              </div>
            </header>
            <ImpersonationBanner />
            <StatusBanner />
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {/* keyed by org so every page starts fresh after switching organization */}
              <div key={currentOrg?.id || 'none'} className="mx-auto w-full max-w-[1400px]">
                <Outlet />
              </div>
            </main>
          </div>
          <CommandPalette open={palette} onClose={() => setPalette(false)} />
        </div>
      </CrumbProvider>
    </LiveProvider>
  )
}
