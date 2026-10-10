// Navigation for the signed-in dashboards, with the access each entry needs.
// The sidebar shows only what the user can open, and App.jsx guards the same
// routes with the same rules (lib/access.js), so a hidden link is also a
// closed door.
//
// access:
//   undefined                 any signed-in user
//   { permission: 'x:y' }     needs that permission in the selected
//                             organization (hawki-cloud identity/rbac.go)
//   { platformAdmin: true }   Hawk-i staff only
//
// `soon` marks sections that are planned but not built yet; they are shown
// greyed out to users who will be able to open them.
import {
  Bell, Crosshair, FileText, FolderGit2, KeyRound, LayoutDashboard, Radar, ScanLine, ScrollText,
  Settings, ShieldAlert, ShieldCheck, User, Users,
} from 'lucide-react'

export const DASHBOARD_NAV = [
  {
    title: 'Workspace',
    links: [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/dashboard/projects', label: 'Projects', icon: FolderGit2, access: { permission: 'projects:read' } },
      { to: '/dashboard/scans', label: 'Scans', icon: ScanLine, access: { permission: 'scans:read' } },
      { to: '/dashboard/findings', label: 'Findings', icon: ShieldAlert, access: { permission: 'findings:read' } },
      { label: 'Reports', icon: FileText, soon: true, access: { permission: 'reports:read' } },
      { label: 'Alerts', icon: Bell, soon: true, access: { permission: 'projects:read' } },
      { label: 'Hunt', icon: Crosshair, soon: true, access: { permission: 'hunt:read' } },
      { label: 'Watch', icon: Radar, soon: true, access: { permission: 'watch:read' } },
    ],
  },
  {
    title: 'Organization',
    links: [
      { to: '/dashboard/members', label: 'Members', icon: Users, access: { permission: 'members:read' } },
      { to: '/dashboard/api-keys', label: 'API keys', icon: KeyRound, access: { permission: 'apikeys:read' } },
      { to: '/dashboard/audit-log', label: 'Audit log', icon: ScrollText, access: { permission: 'audit:read' } },
      { to: '/dashboard/settings', label: 'Settings', icon: Settings, access: { permission: 'settings:read' } },
    ],
  },
  {
    title: 'Account',
    links: [{ to: '/dashboard/profile', label: 'Profile', icon: User }],
  },
  {
    title: 'Platform',
    links: [{ to: '/admin', label: 'Admin console', icon: ShieldCheck, end: true, access: { platformAdmin: true } }],
  },
]

export const SCAN_TYPES = [
  { value: 'quick', label: 'Quick', hint: 'Static rules only. Fast.' },
  { value: 'full', label: 'Full', hint: 'Adds AI reasoning and the security modules.' },
  { value: 'deep', label: 'Deep', hint: 'Full scan plus a bounded Deep Agent run.' },
]

export const FINDING_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'false_positive', label: 'False positive' },
]

export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info']

export const ROLE_LABELS = { org_admin: 'Admin', member: 'Member', viewer: 'Viewer' }
export const PLAN_LABELS = {
  community: 'Community',
  builder: 'Builder',
  professional: 'Professional',
  security: 'Security',
  enterprise: 'Enterprise',
}

// accessFor returns the access rule of the nav entry for a route, so the
// route guards in App.jsx and the sidebar can never disagree.
export function accessFor(to) {
  for (const section of DASHBOARD_NAV) {
    const link = section.links.find((l) => l.to === to)
    if (link) return link.access
  }
  throw new Error(`no dashboard nav entry for ${to}`)
}
