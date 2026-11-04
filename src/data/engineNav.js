// Sections of each engine in the workspace, grouped for the engine layout
// (components/dashboard/EngineLayout.jsx). Tab pages keep their ?tab= links.
import {
  Activity, AlertTriangle, BarChart3, Bell, Boxes, Crosshair, Eye, FileText, GitBranch, Gauge, History, Landmark, Lightbulb, ListChecks,
  PlusCircle, Radar, Rocket, Search, Settings, ShieldAlert, Skull, Target, TrendingDown, Users, Zap,
} from 'lucide-react'

export const INTEL_SECTIONS = [
  {
    title: 'Live intelligence',
    links: [
      { to: '/dashboard/intel?tab=insights', label: 'Insights', icon: Lightbulb, need: 'full', default: true },
      { to: '/dashboard/intel?tab=risk', label: 'Risk events', icon: AlertTriangle, need: 'full' },
      { to: '/dashboard/intel?tab=control', label: 'Upgrades and admin', icon: ShieldAlert, need: 'full' },
      { to: '/dashboard/intel?tab=deployments', label: 'Deployments', icon: Rocket, need: 'full' },
      { to: '/dashboard/intel?tab=governance', label: 'Governance', icon: Landmark, need: 'full' },
    ],
  },
  {
    title: 'Library',
    links: [
      { to: '/dashboard/intel?tab=exploits', label: 'Exploits', icon: Skull, need: 'basic' },
      { to: '/dashboard/intel?tab=protocols', label: 'Protocols', icon: Boxes, need: 'full' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { to: '/dashboard/intel/search', label: 'Search', icon: Search },
      { to: '/dashboard/intel/graph', label: 'Threat Graph', icon: GitBranch },
    ],
  },
]

export const HUNT_SECTIONS = [
  {
    title: 'Investigate',
    links: [
      { to: '/dashboard/hunt', label: 'Clusters', icon: Users, end: true },
      { to: '/dashboard/hunt?tab=watchlist', label: 'Watchlist', icon: Eye },
      { to: '/dashboard/hunt?tab=requests', label: 'Investigations', icon: Crosshair },
    ],
  },
  {
    title: 'Results',
    links: [
      { to: '/dashboard/hunt?tab=alerts', label: 'Alerts', icon: Bell },
      { to: '/dashboard/hunt?tab=reports', label: 'Reports', icon: FileText },
      { to: '/dashboard/hunt?tab=settings', label: 'Settings', icon: Settings },
    ],
  },
]

export const WATCH_SECTIONS = [
  {
    title: 'Monitor',
    links: [
      { to: '/dashboard/watch', label: 'Overview', icon: Gauge, end: true },
      { to: '/dashboard/watch?tab=violations', label: 'Violations', icon: AlertTriangle },
      { to: '/dashboard/watch?tab=risks', label: 'Economic risks', icon: TrendingDown },
      { to: '/dashboard/watch?tab=checks', label: 'Health checks', icon: ListChecks },
    ],
  },
  {
    title: 'Manage',
    links: [
      { to: '/dashboard/watch?tab=add', label: 'Add protocol', icon: PlusCircle },
      { to: '/dashboard/watch?tab=reports', label: 'Reports', icon: FileText },
      { to: '/dashboard/watch?tab=settings', label: 'Settings', icon: Settings },
    ],
  },
]

export const MEV_SECTIONS = [
  {
    title: 'Live',
    links: [
      { to: '/dashboard/mev', label: 'Live', icon: Activity, end: true },
      { to: '/dashboard/mev?tab=predictions', label: 'Predictions', icon: Zap },
      { to: '/dashboard/mev?tab=detections', label: 'Mined attacks', icon: Radar },
    ],
  },
  {
    title: 'Protect',
    links: [
      { to: '/dashboard/mev?tab=targets', label: 'Targets', icon: Target },
      { to: '/dashboard/mev?tab=analyses', label: 'Analyses', icon: History },
      { to: '/dashboard/mev?tab=accuracy', label: 'Accuracy', icon: BarChart3 },
      { to: '/dashboard/mev?tab=settings', label: 'Settings', icon: Settings },
    ],
  },
]
