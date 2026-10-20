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
  Bell, Building2, CreditCard, Crosshair, FileText, History, Power, Receipt, TrendingUp, UserCog, FolderGit2, KeyRound, LayoutDashboard, Radar, ScanLine, ScrollText,
  Settings, ShieldAlert, User, Users,
} from 'lucide-react'

export const DASHBOARD_NAV = [
  {
    title: 'Workspace',
    links: [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/dashboard/projects', label: 'Projects', icon: FolderGit2, access: { permission: 'projects:read' } },
      { to: '/dashboard/scans', label: 'Scans', icon: ScanLine, access: { permission: 'scans:read' } },
      { to: '/dashboard/findings', label: 'Findings', icon: ShieldAlert, access: { permission: 'findings:read' } },
      { to: '/dashboard/reports', label: 'Reports', icon: FileText, access: { permission: 'reports:read' } },
      { to: '/dashboard/alerts', label: 'Alerts', icon: Bell, access: { permission: 'alerts:read' } },
      { label: 'Hunt', icon: Crosshair, soon: true, access: { permission: 'hunt:read' } },
      { label: 'Watch', icon: Radar, soon: true, access: { permission: 'watch:read' } },
    ],
  },
  {
    title: 'Organization',
    links: [
      { to: '/dashboard/members', label: 'Members', icon: Users, access: { permission: 'members:read' } },
      { to: '/dashboard/api-keys', label: 'API keys', icon: KeyRound, access: { permission: 'apikeys:read' } },
      { to: '/dashboard/billing', label: 'Billing', icon: CreditCard, access: { permission: 'billing:read' } },
      { to: '/dashboard/audit-log', label: 'Audit log', icon: ScrollText, access: { permission: 'audit:read' } },
      { to: '/dashboard/settings', label: 'Settings', icon: Settings, access: { permission: 'settings:read' } },
    ],
  },
  {
    title: 'Account',
    links: [{ to: '/dashboard/profile', label: 'Profile', icon: User }],
  },
]

// The admin console is its own mode with its own sidebar, so staff powers
// never mix with a customer's workspace navigation.
export const ADMIN_NAV = [
  {
    title: 'Platform',
    links: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true, access: { platformAdmin: true } },
      { to: '/admin/users', label: 'Users', icon: UserCog, access: { platformAdmin: true } },
      { to: '/admin/customers', label: 'Customers', icon: Building2, access: { platformAdmin: true } },
    ],
  },
  {
    title: 'Revenue',
    links: [
      { to: '/admin/revenue', label: 'Revenue', icon: TrendingUp, access: { platformAdmin: true } },
      { to: '/admin/payments', label: 'Payments', icon: Receipt, access: { platformAdmin: true } },
    ],
  },
  {
    title: 'Safety',
    links: [
      { to: '/admin/audit', label: 'Platform audit', icon: History, access: { platformAdmin: true } },
      { to: '/admin/switches', label: 'Emergency switches', icon: Power, access: { platformAdmin: true } },
    ],
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

// Alerts use lowercase severities (hawki-cloud alerts package).
export const ALERT_SEVERITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'info', label: 'Info' },
]

export const ALERT_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
]

export const ALERT_TYPES = [
  { value: 'finding', label: 'Findings' },
  { value: 'scan', label: 'Scans' },
  { value: 'watch', label: 'Watch' },
  { value: 'hunt', label: 'Hunt' },
  { value: 'mev', label: 'MEV' },
  { value: 'system', label: 'System' },
]

export const CHANNEL_KINDS = [
  { value: 'email', label: 'Email', hint: 'Sends to members of this organization.' },
  { value: 'slack', label: 'Slack', hint: 'An incoming webhook URL from your Slack workspace.' },
  { value: 'discord', label: 'Discord', hint: 'A webhook URL from your Discord channel settings.' },
  { value: 'telegram', label: 'Telegram', hint: 'A bot token from BotFather and the chat to post in.' },
  { value: 'webhook', label: 'Webhook', hint: 'A signed JSON POST to your own https endpoint.' },
]

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
  for (const section of [...DASHBOARD_NAV, ...ADMIN_NAV]) {
    const link = section.links.find((l) => l.to === to)
    if (link) return link.access
  }
  throw new Error(`no dashboard nav entry for ${to}`)
}
