import { useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { PLAN_LABELS } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field from '../../components/common/Field.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'

export default function OrgSettings() {
  const { currentOrg, can, reload, reloadOrg } = useAuth()
  const editable = can('settings:write')
  const [form, setForm] = useState({ name: currentOrg.name, slug: currentOrg.slug })
  const [state, setState] = useState({ busy: false, error: null, saved: false })

  async function save(e) {
    e.preventDefault()
    setState({ busy: true, error: null, saved: false })
    try {
      await api(`/api/v1/orgs/${currentOrg.id}`, { method: 'PATCH', body: form })
      await reload()
      await reloadOrg()
      setState({ busy: false, error: null, saved: true })
    } catch (err) {
      setState({ busy: false, error: err.code === 'slug_taken' ? 'That slug is taken.' : errorMessage(err), saved: false })
    }
  }

  return (
    <div className="max-w-3xl grid gap-6">
      <PageHeader title="Organization settings" description={`Plan: ${PLAN_LABELS[currentOrg.plan] || currentOrg.plan}.`} />
      <Panel>
        <form onSubmit={save} className="grid gap-4">
          {state.error && <Alert>{state.error}</Alert>}
          {state.saved && <Alert tone="info">Saved.</Alert>}
          <Field id="org-name" label="Name" value={form.name} disabled={!editable} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field id="org-slug" label="Slug" value={form.slug} disabled={!editable} hint="Lowercase letters, digits and hyphens."
            onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          {editable ? (
            <div><Button type="submit" busy={state.busy}>Save changes</Button></div>
          ) : (
            <p className="text-xs text-grey">Only organization admins can change these.</p>
          )}
        </form>
      </Panel>
    </div>
  )
}
