import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useLiveEvent } from '../../lib/live.jsx'
import { Severity } from './ScanBits.jsx'
import { AlertStatusBadge } from '../ui/Badge.jsx'
import { ago } from '../../lib/format.js'

export const AlertStatus = AlertStatusBadge

export const AlertSeverity = ({ value }) => <Severity value={value.charAt(0).toUpperCase() + value.slice(1)} />

export function AlertRow({ alert }) {
  return (
    <Link to={`/dashboard/alerts/${alert.id}`} className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-surface-2/70 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex w-44 shrink-0 items-center gap-3">
        <AlertSeverity value={alert.severity} />
        <AlertStatus status={alert.status} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${alert.status === 'new' ? 'text-fg font-medium' : 'text-fg-2'}`}>{alert.title}</div>
        <div className="text-xs text-fg-3 truncate">
          {ago(alert.created_at)}
          {alert.occurrences > 1 ? ` · seen ${alert.occurrences} times` : ''}
        </div>
      </div>
    </Link>
  )
}

// AlertBell shows how many alerts are new and follows them live.
export function AlertBell() {
  const { currentOrg } = useAuth()
  const [open, setOpen] = useState(null)
  const load = useCallback(() => {
    api(`/api/v1/orgs/${currentOrg.id}/alerts?status=new&limit=1`).then((d) => setOpen(d.open)).catch(() => setOpen(null))
  }, [currentOrg.id])
  useEffect(() => {
    load()
  }, [load])
  useLiveEvent(['alert.created', 'alert.updated'], load)
  const label = open ? `Alerts, ${open} new` : 'Alerts'
  return (
    <Link to="/dashboard/alerts?status=new" aria-label={label} title={label}
      className="relative grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-fg-2 transition hover:border-line-strong hover:text-fg">
      <Bell size={16} />
      {open > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] rounded-full bg-critical px-1 text-[0.62rem] font-semibold leading-[1.1rem] text-white text-center ring-2 ring-app">
          {open > 99 ? '99+' : open}
        </span>
      )}
    </Link>
  )
}
