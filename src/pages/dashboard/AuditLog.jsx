import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
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
    <div className="max-w-5xl grid gap-6">
      <PageHeader title="Audit log" description="Every change to this organization: who did it, when, and from where." />
      {error && <Alert>{error}</Alert>}
      <Panel>
        {!entries ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[0.65rem] uppercase tracking-wider text-grey">
                  <th className="pb-3 pr-4 font-normal">When</th>
                  <th className="pb-3 pr-4 font-normal">Action</th>
                  <th className="pb-3 pr-4 font-normal">Actor</th>
                  <th className="pb-3 font-normal">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2.5 pr-4 text-grey whitespace-nowrap">{formatDateTime(e.occurred_at)}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-white">{e.action}</td>
                    <td className="py-2.5 pr-4 text-[#cfcfcf] whitespace-nowrap">{e.actor_type === 'api_key' ? 'API key' : e.actor_type}</td>
                    <td className="py-2.5 font-mono text-xs text-grey">{e.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {more && <Button variant="ghost" className="mt-4" onClick={() => load(next)}>Load more</Button>}
      </Panel>
    </div>
  )
}
