import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, download } from '../../lib/api.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Table, td, when } from '../../components/admin/bits.jsx'

const PAGE = 100
const KEYS = ['action', 'actor', 'org', 'from', 'to']
const QUICK = [
  { label: 'Everything', action: '' },
  { label: 'Admin actions', action: 'admin.' },
  { label: 'Sign-ins', action: 'user.login' },
  { label: 'Security changes', action: 'user.' },
  { label: 'Scans', action: 'scan.' },
]
const input = 'h-8 w-full min-w-0 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-accent/60'

export default function AdminAudit() {
  const [params, setParams] = useSearchParams()
  const [form, setForm] = useState(Object.fromEntries(KEYS.map((k) => [k, params.get(k) || ''])))
  const [exporting, setExporting] = useState(null)
  const [entries, setEntries] = useState(null)
  const [next, setNext] = useState(0)
  const [open, setOpen] = useState(null)
  const [error, setError] = useState(null)
  const query = KEYS.map((k) => `${k}=${encodeURIComponent(params.get(k) || '')}`).join('&')

  async function exportAs(format) {
    setExporting(format)
    setError(null)
    try {
      await download(`/api/v1/admin/audit/export?${query}&format=${format}`, `hawki-audit-${new Date().toISOString().slice(0, 10)}.${format}`)
    } catch (err) {
      setError(errorMessage(err))
    }
    setExporting(null)
  }

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
    <div className="grid gap-6">
      <PageHeader title="Platform audit" description="Every recorded action on the platform: sign-ins, changes, admin actions and switches. Click a row for its details."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={!!exporting} onClick={() => exportAs('csv')}>{exporting === 'csv' ? 'Exporting' : 'Export CSV'}</Button>
            <Button variant="ghost" size="sm" disabled={!!exporting} onClick={() => exportAs('json')}>{exporting === 'json' ? 'Exporting' : 'Export JSON'}</Button>
          </div>
        } />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Quick filters">
        {QUICK.map((qf) => {
          const on = (params.get('action') || '') === qf.action && !params.get('actor') && !params.get('org') && !params.get('from') && !params.get('to')
          return (
            <button key={qf.label} type="button" role="radio" aria-checked={on}
              onClick={() => { setForm({ action: qf.action, actor: '', org: '', from: '', to: '' }); setParams(qf.action ? { action: qf.action } : {}, { replace: true }) }}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${on ? 'border-accent/60 bg-accent/10 text-fg' : 'border-line bg-surface text-fg-2 hover:border-line-strong hover:text-fg'}`}>
              {qf.label}
            </button>
          )
        })}
      </div>
      <form className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_9.5rem_9.5rem_auto] lg:items-center" onSubmit={(e) => {
        e.preventDefault()
        setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim())), { replace: true })
      }}>
        <input id="aud-action" aria-label="Action starts with" placeholder="Action starts with, e.g. admin." value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className={input} />
        <input id="aud-actor" aria-label="User ID" placeholder="User ID (actor or target)" value={form.actor} onChange={(e) => setForm({ ...form, actor: e.target.value })} className={input} />
        <input id="aud-org" aria-label="Organization ID" placeholder="Organization ID" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} className={input} />
        <input id="aud-from" type="date" aria-label="From day" title="From day" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className={input} />
        <input id="aud-to" type="date" aria-label="To day" title="To day (included)" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className={input} />
        <Button type="submit" variant="ghost" size="sm">Filter</Button>
      </form>
      {error && <Alert>{error}</Alert>}
      <Panel>
        {!entries ? <Spinner /> : (
          <>
            <Table head={['When', 'Action', 'By', 'Organization', 'Target', 'IP']}>
              {entries.map((a) => (
                <tr key={a.id} className="cursor-pointer" onClick={() => setOpen(open === a.id ? null : a.id)}>
                  <td className={`${td} whitespace-nowrap text-xs text-fg-3`}>{when(a.occurred_at)}</td>
                  <td className={`${td} font-mono text-xs ${a.action.startsWith('admin.') ? 'text-staff' : 'text-fg'}`}>
                    {a.action}
                    {open === a.id && <pre className="mt-2 whitespace-pre-wrap break-all text-fg-3">{JSON.stringify(a.metadata, null, 2)}</pre>}
                  </td>
                  <td className={`${td} text-xs`}>
                    {a.actor_type === 'user' ? <Link to={`/admin/users/${a.actor_id}`} onClick={(e) => e.stopPropagation()} className="text-fg-2 hover:text-fg">{a.actor_email || a.actor_id}</Link> : a.actor_type}
                  </td>
                  <td className={`${td} text-xs`}>{a.org_id ? <Link to={`/admin/customers/${a.org_id}`} onClick={(e) => e.stopPropagation()} className="text-fg-2 hover:text-fg">{a.org_name || a.org_id}</Link> : ''}</td>
                  <td className={`${td} text-xs text-fg-3`}>{a.target_type}</td>
                  <td className={`${td} text-xs text-fg-3`}>{a.ip}</td>
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
