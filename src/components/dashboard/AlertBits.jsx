import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useLiveEvent } from '../../lib/live.jsx'
import { Severity } from './ScanBits.jsx'

const STATUS = {
  new: 'text-copper border-copper/60',
  acknowledged: 'text-steel border-steel/60',
  resolved: 'text-grey border-panel-border',
}

export function AlertStatus({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider ${STATUS[status] || STATUS.resolved}`}>
      {status}
    </span>
  )
}

export const AlertSeverity = ({ value }) => <Severity value={value.charAt(0).toUpperCase() + value.slice(1)} />

export function AlertRow({ alert }) {
  return (
    <Link to={`/dashboard/alerts/${alert.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 first:pt-0 last:pb-0 hover:text-white">
      <div className="flex items-center gap-2 shrink-0">
        <AlertSeverity value={alert.severity} />
        <AlertStatus status={alert.status} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${alert.status === 'new' ? 'text-white' : 'text-[#cfcfcf]'}`}>{alert.title}</div>
        <div className="text-xs text-grey truncate">
          {new Date(alert.created_at).toLocaleString()}
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
      className="relative grid h-9 w-9 place-items-center rounded-full border border-panel-border text-[#cfcfcf] hover:border-steel hover:text-white transition">
      <Bell size={16} />
      {open > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[1.15rem] h-[1.15rem] rounded-full bg-copper px-1 text-[0.65rem] leading-[1.15rem] text-white text-center">
          {open > 99 ? '99+' : open}
        </span>
      )}
    </Link>
  )
}
