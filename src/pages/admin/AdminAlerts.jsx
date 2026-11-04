import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BellOff } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { ago, dateTime } from '../../lib/format.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { ButtonTabs } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import { SeverityBadge } from '../../components/ui/Badge.jsx'
import { Badge } from '../../components/admin/bits.jsx'
import { serviceLabel } from '../../components/admin/platformBits.jsx'

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
]
const STATUS_TONE = { open: 'bad', acknowledged: 'warn', resolved: 'good' }

function subject(a) {
  if (!a.subject) return ''
  return a.rule.startsWith('service_') ? serviceLabel(a.subject) : a.subject
}

export default function AdminAlerts() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('status')) ? params.get('status') : 'active'
  const { data, error, reload, setData } = useApi(`/api/v1/admin/platform-alerts?status=${tab}`)
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    const t = setInterval(() => reload(), 30000)
    return () => clearInterval(t)
  }, [reload])

  async function ack(a) {
    setMsg(null)
    try {
      const next = await api(`/api/v1/admin/platform-alerts/${a.id}/ack`, { method: 'POST' })
      setData({ ...data, alerts: data.alerts.map((x) => (x.id === a.id ? next : x)) })
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  if (error) return <ErrorState>{error}</ErrorState>
  if (!data) return <PageSkeleton cards={2} />
  const open = data.alerts.filter((a) => a.status === 'open').length
  return (
    <div className="grid gap-4">
      <PageHeader title="Platform alerts" description="Raised for staff when a service goes down, the API slows or errors, resources run short or an engine falls behind. Checked every minute, emailed to platform admins once, resolved when the condition clears."
        meta={tab === 'active' && <span>{open} open, {data.alerts.length - open} acknowledged</span>}>
        <ButtonTabs tabs={TABS} value={tab} onChange={(v) => setParams(v === 'active' ? {} : { status: v }, { replace: true })} />
      </PageHeader>
      {msg && <Alert>{msg}</Alert>}
      <Card flush>
        <DataTable rows={data.alerts} empty={<EmptyState icon={BellOff} title={tab === 'active' ? 'Nothing needs attention' : 'No alerts'}>{tab === 'active' ? 'Every rule is within its limits.' : null}</EmptyState>}
          columns={[
            { key: 'sev', header: 'Severity', cell: (a) => <SeverityBadge value={a.severity} /> },
            {
              key: 'what', header: 'Alert', cell: (a) => (
                <div className="min-w-0">
                  <div className="font-medium text-fg">{a.title}{subject(a) && a.rule !== 'service_down' && a.rule !== 'service_degraded' ? <span className="text-fg-3"> · {subject(a)}</span> : null}</div>
                  {a.detail && <div className="max-w-[34rem] truncate text-xs text-fg-3" title={a.detail}>{a.detail}</div>}
                </div>
              ),
            },
            { key: 'opened', header: 'Opened', hide: 'sm', cell: (a) => <span className="whitespace-nowrap text-xs text-fg-2" title={dateTime(a.opened_at)}>{ago(a.opened_at)}</span> },
            {
              key: 'state', header: 'State', cell: (a) => (
                <div className="grid gap-0.5">
                  <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  {a.acknowledged_by_email && <span className="text-[0.68rem] text-fg-3">by {a.acknowledged_by_email}</span>}
                  {a.resolved_at && <span className="text-[0.68rem] text-fg-3">resolved {ago(a.resolved_at)}</span>}
                </div>
              ),
            },
            { key: 'act', header: '', align: 'right', cell: (a) => (a.status === 'open' ? <Button size="sm" variant="ghost" onClick={() => ack(a)}>Acknowledge</Button> : null) },
          ]} />
      </Card>
      <Card flush title="Rules" description="What each rule watches">
        <DataTable rows={data.rules} rowKey={(r) => r.rule} dense columns={[
          { key: 'r', header: 'Rule', cell: (r) => <span className="font-mono text-xs text-fg">{r.rule}</span> },
          { key: 's', header: 'Severity', cell: (r) => <SeverityBadge value={r.severity} /> },
          { key: 'w', header: 'Raised when', cell: (r) => <span className="text-xs text-fg-2">{r.when}</span> },
        ]} />
      </Card>
    </div>
  )
}
