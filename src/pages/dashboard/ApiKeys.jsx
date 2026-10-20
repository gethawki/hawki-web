import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ROLE_LABELS } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import { KeyRound } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState } from '../../components/ui/Feedback.jsx'
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
    <div className="grid gap-6">
      <PageHeader title="API keys" description="Keys let CI pipelines and scripts call Hawk-i Cloud for this organization. Each key has a role, like a member." />
      {error && <Alert>{error}</Alert>}
      {canManage && (
        <Panel title="Create a key">
          <form onSubmit={create} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem_9rem_auto] sm:items-end">
            <Field id="key-name" label="Name" placeholder="CI pipeline" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <SelectField id="key-role" label="Role" value={form.role} options={roleOptions(currentOrg.role)} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <SelectField id="key-expiry" label="Expires" value={form.expires} options={EXPIRY} onChange={(e) => setForm({ ...form, expires: e.target.value })} />
            <Button type="submit" busy={busy}>Create key</Button>
          </form>
          {created && (
            <div className="mt-4 grid gap-2">
              <Alert tone="info">Copy this key now. It is shown only once.</Alert>
              <code className="block overflow-x-auto rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-fg-2">{created.key}</code>
            </div>
          )}
        </Panel>
      )}
      <Card flush>
        <DataTable rows={keys} loading={!keys}
          empty={<EmptyState compact icon={KeyRound} title="No API keys yet">{canManage ? 'Create one above for CI pipelines and scripts.' : 'An admin can create keys for CI.'}</EmptyState>}
          columns={[
            { key: 'name', header: 'Key', cell: (k) => <div><div className="font-medium text-fg">{k.name}</div><div className="font-mono text-xs text-fg-3">{k.prefix}...</div></div> },
            { key: 'role', header: 'Role', cell: (k) => <Badge>{ROLE_LABELS[k.role]}</Badge> },
            { key: 'used', header: 'Last used', hide: 'md', cell: (k) => <span className="text-fg-3">{k.last_used_at ? formatDate(k.last_used_at) : 'Never'}</span> },
            { key: 'exp', header: 'Expires', hide: 'lg', cell: (k) => <span className="text-fg-3">{k.expires_at ? formatDate(k.expires_at) : 'Never'}</span> },
            {
              key: 'state', header: '', align: 'right', cell: (k) => k.revoked_at ? <Badge tone="danger">Revoked</Badge>
                : canManage && <Button variant="danger" size="sm" onClick={() => revoke(k)}>Revoke</Button>,
            },
          ]} />
      </Card>
    </div>
  )
}
