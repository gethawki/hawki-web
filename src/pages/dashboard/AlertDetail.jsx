import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useRefresh } from '../../lib/live.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { AlertSeverity, AlertStatus } from '../../components/dashboard/AlertBits.jsx'
import { formatDateTime } from './roles.js'

const DELIVERY_LABELS = { pending: 'Waiting', sending: 'Sending', sent: 'Sent', failed: 'Failed' }

function Deliveries({ deliveries }) {
  if (deliveries.length === 0) {
    return <p className="text-sm text-grey">Not sent to any channel. It may be below their severity, or the project is muted.</p>
  }
  return (
    <ul className="divide-y divide-panel-border text-sm">
      {deliveries.map((d) => (
        <li key={d.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span className="text-white min-w-40">{d.channel_name} <span className="text-grey capitalize">({d.channel_kind})</span></span>
          <span className={d.status === 'failed' ? 'text-copper' : d.status === 'sent' ? 'text-[#cfcfcf]' : 'text-steel'}>
            {DELIVERY_LABELS[d.status] || d.status}
            {d.digest && d.status !== 'sent' ? ` in the digest of ${formatDateTime(d.next_attempt_at)}` : ''}
            {d.status === 'sent' && d.sent_at ? ` ${formatDateTime(d.sent_at)}` : ''}
          </span>
          {d.last_error && <span className="text-xs text-grey sm:ml-auto max-w-sm">{d.last_error}</span>}
        </li>
      ))}
    </ul>
  )
}

export default function AlertDetail() {
  const { alertId } = useParams()
  const { currentOrg, can } = useAuth()
  const [alert, setAlert] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    try {
      setAlert(await api(`/api/v1/orgs/${currentOrg.id}/alerts/${alertId}`))
    } catch (err) {
      setError(err.status === 404 ? 'This alert does not exist in this organization.' : errorMessage(err))
    }
  }, [currentOrg.id, alertId])
  useEffect(() => {
    load()
  }, [load])
  useRefresh(['alert.updated'], load, { poll: Boolean(alert?.deliveries?.some((d) => d.status === 'pending' || d.status === 'sending')), pollMs: 5000 })

  async function setStatus(status) {
    setBusy(status)
    try {
      await api(`/api/v1/orgs/${currentOrg.id}/alerts/${alertId}`, { method: 'PATCH', body: { status } })
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(null)
  }

  if (error) return <div className="max-w-5xl"><Alert>{error}</Alert></div>
  if (!alert) return <Spinner />
  const canUpdate = can('alerts:update')
  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader
        title={alert.title}
        description={`${alert.project_name ? `${alert.project_name} · ` : ''}raised ${formatDateTime(alert.created_at)}${alert.occurrences > 1 ? `, seen ${alert.occurrences} times, last ${formatDateTime(alert.last_seen_at)}` : ''}`}
        actions={canUpdate && (
          <div className="flex flex-wrap gap-2">
            {alert.status === 'new' && <Button variant="ghost" busy={busy === 'acknowledged'} onClick={() => setStatus('acknowledged')}>Acknowledge</Button>}
            {alert.status !== 'resolved' && <Button busy={busy === 'resolved'} onClick={() => setStatus('resolved')}>Resolve</Button>}
            {alert.status !== 'new' && <Button variant="ghost" busy={busy === 'new'} onClick={() => setStatus('new')}>Reopen</Button>}
          </div>
        )}
      />
      <Panel>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <AlertSeverity value={alert.severity} />
          <AlertStatus status={alert.status} />
          <span className="text-xs text-grey capitalize">{alert.type} · {alert.source}</span>
        </div>
        {alert.description && <p className="text-sm text-[#cfcfcf] whitespace-pre-line">{alert.description}</p>}
        {alert.ref_type === 'scan' && alert.ref_id && (
          <Link to={`/dashboard/scans/${alert.ref_id}`} className="mt-4 inline-block text-sm text-steel hover:text-steel-light">Open the scan</Link>
        )}
        {(alert.acknowledged_at || alert.resolved_at) && (
          <p className="mt-4 text-xs text-grey">
            {alert.acknowledged_at && `Acknowledged ${formatDateTime(alert.acknowledged_at)}. `}
            {alert.resolved_at && `Resolved ${formatDateTime(alert.resolved_at)}.`}
          </p>
        )}
      </Panel>
      <Panel title="Delivery">
        <Deliveries deliveries={alert.deliveries || []} />
      </Panel>
      <p className="text-xs text-grey"><Link to="/dashboard/alerts" className="hover:text-white">All alerts</Link></p>
    </div>
  )
}
