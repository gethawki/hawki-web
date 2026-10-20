import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState } from '../../components/ui/Feedback.jsx'
import { ago } from '../../lib/format.js'
import { formatDateTime } from './roles.js'

const PAGE = 50

export default function AuditLog() {
  const { currentOrg } = useAuth()
  const [entries, setEntries] = useState(null)
  const [next, setNext] = useState(0)
  const [more, setMore] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(
    async (before = 0) => {
      try {
        const page = await api(`/api/v1/orgs/${currentOrg.id}/audit-logs?limit=${PAGE}${before ? `&before=${before}` : ''}`)
        setEntries((prev) => (before ? [...(prev || []), ...page.entries] : page.entries))
        setNext(page.next_before || 0)
        setMore(page.entries.length === PAGE)
      } catch (err) {
        setError(errorMessage(err))
      }
    },
    [currentOrg.id],
  )

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="grid gap-6">
      <PageHeader title="Audit log" description="Every change to this organization: who did it, when, and from where." />
      {error && <Alert>{error}</Alert>}
      <Card flush>
        <DataTable rows={entries} loading={!entries} dense
          empty={<EmptyState compact title="Nothing recorded yet" />}
          columns={[
            { key: 'when', header: 'When', cell: (e) => <span className="whitespace-nowrap text-fg-3" title={formatDateTime(e.occurred_at)}>{ago(e.occurred_at)}</span> },
            { key: 'action', header: 'Action', cell: (e) => <span className="font-mono text-xs text-fg">{e.action}</span> },
            {
              key: 'actor', header: 'By', cell: (e) => (
                <span className="text-fg-2">{e.actor_name || (e.actor_type === 'system' ? 'Hawk-i' : e.actor_type)}
                  {e.actor_type === 'api_key' && <Badge className="ml-2">API key</Badge>}</span>
              ),
            },
            { key: 'target', header: 'Target', hide: 'lg', cell: (e) => <span className="text-xs text-fg-3">{e.target_type}</span> },
            { key: 'ip', header: 'IP', hide: 'md', align: 'right', cell: (e) => <span className="font-mono text-xs text-fg-3">{e.ip}</span> },
          ]}
          footer={more && <Button variant="ghost" size="sm" onClick={() => load(next)}>Load more</Button>} />
      </Card>
    </div>
  )
}
