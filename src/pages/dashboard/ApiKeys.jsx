import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ROLE_LABELS } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { formatDate, roleOptions } from './roles.js'

const EXPIRY = [
  { value: '90', label: '90 days' },
  { value: '30', label: '30 days' },
  { value: '365', label: '1 year' },
  { value: '0', label: 'Never' },
]

export default function ApiKeys() {
  const { currentOrg, can } = useAuth()
  const canManage = can('apikeys:write')
  const [keys, setKeys] = useState(null)
  const [form, setForm] = useState({ name: '', role: 'viewer', expires: '90' })
  const [created, setCreated] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setKeys((await api(`/api/v1/orgs/${currentOrg.id}/api-keys`)).api_keys)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [currentOrg.id])

  useEffect(() => {
    load()
  }, [load])

  async function create(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const k = await api(`/api/v1/orgs/${currentOrg.id}/api-keys`, {
        method: 'POST',
        body: { name: form.name, role: form.role, expires_in_days: Number(form.expires) },
      })
      setCreated(k)
      setForm({ ...form, name: '' })
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  async function revoke(k) {
    setError(null)
    try {
      await api(`/api/v1/orgs/${currentOrg.id}/api-keys/${k.id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader title="API keys" description="Keys let CI pipelines and scripts call Hawk-i Cloud for this organization. Each key has a role, like a member." />
      {error && <Alert>{error}</Alert>}
      {canManage && (
        <Panel title="Create a key">
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-[1fr_9rem_9rem_auto] sm:items-end">
            <Field id="key-name" label="Name" placeholder="CI pipeline" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <SelectField id="key-role" label="Role" value={form.role} options={roleOptions(currentOrg.role)} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <SelectField id="key-expiry" label="Expires" value={form.expires} options={EXPIRY} onChange={(e) => setForm({ ...form, expires: e.target.value })} />
            <Button type="submit" busy={busy}>Create key</Button>
          </form>
          {created && (
            <div className="mt-4 grid gap-2">
              <Alert tone="info">Copy this key now. It is shown only once.</Alert>
              <code className="block overflow-x-auto rounded-lg border border-panel-border bg-ink px-3 py-2 font-mono text-xs text-[#d9d9d9]">{created.key}</code>
            </div>
          )}
        </Panel>
      )}
      <Panel>
        {!keys ? (
          <Spinner />
        ) : keys.length === 0 ? (
          <p className="text-sm text-grey">No API keys yet.</p>
        ) : (
          <ul className="divide-y divide-panel-border">
            {keys.map((k) => (
              <li key={k.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">{k.name} <span className="font-mono text-xs text-grey">{k.prefix}...</span></div>
                  <div className="text-xs text-grey">
                    {ROLE_LABELS[k.role]} · created {formatDate(k.created_at)} · last used {formatDate(k.last_used_at)}
                    {k.expires_at && ` · expires ${formatDate(k.expires_at)}`}
                  </div>
                </div>
                {k.revoked_at ? (
                  <span className="font-mono text-xs uppercase tracking-wider text-copper">revoked</span>
                ) : (
                  canManage && <Button variant="danger" className="py-1.5" onClick={() => revoke(k)}>Revoke</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
