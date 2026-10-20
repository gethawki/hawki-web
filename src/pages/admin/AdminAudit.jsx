import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Table, td, when } from '../../components/admin/bits.jsx'

const PAGE = 100

export default function AdminAudit() {
  const [params, setParams] = useSearchParams()
  const [form, setForm] = useState({ action: params.get('action') || '', actor: params.get('actor') || '', org: params.get('org') || '' })
  const [entries, setEntries] = useState(null)
  const [next, setNext] = useState(0)
  const [open, setOpen] = useState(null)
  const [error, setError] = useState(null)
  const query = ['action', 'actor', 'org'].map((k) => `${k}=${encodeURIComponent(params.get(k) || '')}`).join('&')

  const load = useCallback(async (before = 0) => {
    try {
      const d = await api(`/api/v1/admin/audit?${query}&limit=${PAGE}${before ? `&before=${before}` : ''}`)
      setEntries((prev) => (before ? [...(prev || []), ...d.entries] : d.entries))
      setNext(d.entries.length === PAGE ? d.next_before : 0)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [query])
  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="max-w-6xl grid gap-6">
      <PageHeader title="Platform audit" description="Every recorded action on the platform: sign-ins, changes, admin actions and switches." />
      <form className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] items-end" onSubmit={(e) => {
        e.preventDefault()
        setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim())), { replace: true })
      }}>
        <Field id="aud-action" label="Action starts with" placeholder="admin. or user.login" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} />
        <Field id="aud-actor" label="User ID (actor or target)" value={form.actor} onChange={(e) => setForm({ ...form, actor: e.target.value })} />
        <Field id="aud-org" label="Organization ID" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} />
        <Button type="submit" variant="ghost">Filter</Button>
      </form>
      {error && <Alert>{error}</Alert>}
      <Panel>
        {!entries ? <Spinner /> : (
          <>
            <Table head={['When', 'Action', 'By', 'Organization', 'Target', 'IP']}>
              {entries.map((a) => (
                <tr key={a.id} className="cursor-pointer" onClick={() => setOpen(open === a.id ? null : a.id)}>
                  <td className={`${td} whitespace-nowrap text-xs text-grey`}>{when(a.occurred_at)}</td>
                  <td className={`${td} font-mono text-xs text-white`}>
                    {a.action}
                    {open === a.id && <pre className="mt-2 whitespace-pre-wrap break-all text-grey">{JSON.stringify(a.metadata, null, 2)}</pre>}
                  </td>
                  <td className={`${td} text-xs`}>
                    {a.actor_type === 'user' ? <Link to={`/admin/users/${a.actor_id}`} onClick={(e) => e.stopPropagation()} className="text-[#cfcfcf] hover:text-white">{a.actor_email || a.actor_id}</Link> : a.actor_type}
                  </td>
                  <td className={`${td} text-xs`}>{a.org_id ? <Link to={`/admin/customers/${a.org_id}`} onClick={(e) => e.stopPropagation()} className="text-[#cfcfcf] hover:text-white">{a.org_name || a.org_id}</Link> : ''}</td>
                  <td className={`${td} text-xs text-grey`}>{a.target_type}</td>
                  <td className={`${td} text-xs text-grey`}>{a.ip}</td>
                </tr>
              ))}
            </Table>
            {next > 0 && <div className="mt-4"><Button variant="ghost" onClick={() => load(next)}>Load more</Button></div>}
          </>
        )}
      </Panel>
    </div>
  )
}
