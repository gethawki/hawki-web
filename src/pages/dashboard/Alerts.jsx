import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useRefresh } from '../../lib/live.jsx'
import { ALERT_SEVERITIES, ALERT_STATUSES, ALERT_TYPES } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import { BellOff } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import { FilterSelect, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState } from '../../components/ui/Feedback.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import { AlertRow } from '../../components/dashboard/AlertBits.jsx'

const PAGE = 50
const any = (label) => [{ value: '', label }]

export default function Alerts() {
  const { currentOrg, can } = useAuth()
  const [params, setParams] = useSearchParams()
  const filters = { status: params.get('status') || '', severity: params.get('severity') || '', type: params.get('type') || '' }
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
  const [alerts, setAlerts] = useState(null)
  const [open, setOpen] = useState(0)
  const [next, setNext] = useState(0)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(
    async (before = 0) => {
      try {
        const d = await api(`/api/v1/orgs/${currentOrg.id}/alerts?limit=${PAGE}${query ? `&${query}` : ''}${before ? `&before=${before}` : ''}`)
        setAlerts((prev) => (before ? [...(prev || []), ...d.alerts] : d.alerts))
        setOpen(d.open)
        setNext(d.next_before || 0)
      } catch (err) {
        setError(errorMessage(err))
      }
    },
    [currentOrg.id, query],
  )
  useEffect(() => {
    load()
  }, [load])
  const reload = useCallback(() => load(), [load])
  useRefresh(['alert.created', 'alert.updated'], reload)

  function setFilter(key, value) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    setParams(p, { replace: true })
  }

  async function acknowledgeAll() {
    setBusy(true)
    try {
      await api(`/api/v1/orgs/${currentOrg.id}/alerts/acknowledge`, { method: 'POST' })
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Alerts"
        description="What needs attention across your projects. Alerts also go to the channels you set up."
        actions={
          <div className="flex flex-wrap gap-2">
            {can('alerts:update') && open > 0 && (
              <Button variant="ghost" size="sm" onClick={acknowledgeAll} busy={busy}>Acknowledge all ({open})</Button>
            )}
            {can('settings:read') && <Button variant="ghost" size="sm" to="/dashboard/alerts/channels">Channels</Button>}
          </div>
        }
      />
      {error && <Alert>{error}</Alert>}
      <Toolbar>
        <FilterSelect id="alert-status" label="Status" value={filters.status} onChange={(v) => setFilter('status', v)} options={[...any('Any status'), ...ALERT_STATUSES]} />
        <FilterSelect id="alert-severity" label="Severity" value={filters.severity} onChange={(v) => setFilter('severity', v)} options={[...any('Any severity'), ...ALERT_SEVERITIES]} />
        <FilterSelect id="alert-type" label="Source" value={filters.type} onChange={(v) => setFilter('type', v)} options={[...any('Any source'), ...ALERT_TYPES]} />
      </Toolbar>
      <Card flush>
        {!alerts ? <div className="h-40" /> : alerts.length === 0 ? (
          <EmptyState icon={BellOff} title={query ? 'No alerts match' : 'No alerts yet'}>{query ? 'Try other filters.' : 'Finished scans and billing events raise alerts here.'}</EmptyState>
        ) : (
          <>
            <div className="divide-y divide-line">{alerts.map((a) => <AlertRow key={a.id} alert={a} />)}</div>
            {next > 0 && <div className="border-t border-line px-5 py-3"><Button variant="ghost" size="sm" onClick={() => load(next)}>Load more</Button></div>}
          </>
        )}
      </Card>
    </div>
  )
}
