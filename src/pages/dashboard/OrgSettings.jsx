import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { PLAN_LABELS } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'

const PROVIDERS = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
]

// AIProvider manages the organization's own model provider key. Hawk-i never
// runs AI scans on a key of its own, and the key is never shown again.
function AIProvider({ orgId, editable }) {
  const [data, setData] = useState(null)
  const [form, setForm] = useState({ provider: 'gemini', model: '', api_key: '' })
  const [state, setState] = useState({ busy: false, error: null, saved: false })

  useEffect(() => {
    api(`/api/v1/orgs/${orgId}/llm-key`)
      .then((d) => {
        setData(d)
        if (d.llm_key.configured) setForm({ provider: d.llm_key.provider, model: d.llm_key.model, api_key: '' })
      })
      .catch((err) => setState((s) => ({ ...s, error: errorMessage(err) })))
  }, [orgId])

  async function save(e) {
    e.preventDefault()
    setState({ busy: true, error: null, saved: false })
    try {
      const d = await api(`/api/v1/orgs/${orgId}/llm-key`, { method: 'PUT', body: form })
      setData((prev) => ({ ...prev, llm_key: d.llm_key }))
      setForm({ provider: d.llm_key.provider, model: d.llm_key.model, api_key: '' })
      setState({ busy: false, error: null, saved: true })
    } catch (err) {
      setState({ busy: false, error: err.field ? err.message.replace(/^\w+: /, '') : errorMessage(err), saved: false })
    }
  }

  async function remove() {
    setState({ busy: true, error: null, saved: false })
    try {
      await api(`/api/v1/orgs/${orgId}/llm-key`, { method: 'DELETE' })
      setData((prev) => ({ ...prev, llm_key: { configured: false } }))
      setForm({ provider: 'gemini', model: '', api_key: '' })
      setState({ busy: false, error: null, saved: false })
    } catch (err) {
      setState({ busy: false, error: errorMessage(err), saved: false })
    }
  }

  const key = data?.llm_key
  const defaultModel = data?.default_models?.[form.provider]
  return (
    <Panel title="AI provider">
      <p className="text-sm text-grey mb-4 max-w-2xl">
        Full and deep scans use your own model provider account, so AI usage is billed by your provider, not by Hawk-i.
        The key is stored encrypted and is never shown again.
      </p>
      {key?.configured ? (
        <Alert tone="info">
          Using {PROVIDERS.find((p) => p.value === key.provider)?.label || key.provider}, model{' '}
          <span className="font-mono">{key.model}</span>, key <span className="font-mono">{key.key_hint}</span>.
        </Alert>
      ) : data ? (
        <Alert tone="info">No key yet. Quick scans work without one; full and deep scans need it.</Alert>
      ) : null}
      {editable ? (
        <form onSubmit={save} className="grid gap-4 mt-4">
          {state.error && <Alert>{state.error}</Alert>}
          {state.saved && <Alert tone="info">Saved.</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField id="llm-provider" label="Provider" value={form.provider} options={PROVIDERS}
              onChange={(e) => setForm({ ...form, provider: e.target.value, model: '' })} />
            <Field id="llm-model" label="Model" value={form.model} placeholder={defaultModel || 'provider/model-name'}
              hint={defaultModel ? `Leave empty for ${defaultModel}.` : 'Required for this provider.'}
              onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <Field id="llm-key" label="API key" type="password" autoComplete="off" value={form.api_key}
            placeholder={key?.configured ? 'Leave empty to keep the current key' : ''}
            onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" busy={state.busy}>{key?.configured ? 'Update' : 'Save key'}</Button>
            {key?.configured && <Button type="button" variant="danger" onClick={remove}>Remove key</Button>}
          </div>
        </form>
      ) : (
        <p className="mt-3 text-xs text-grey">Only organization admins can change the AI provider.</p>
      )}
    </Panel>
  )
}

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
      <AIProvider orgId={currentOrg.id} editable={editable} />
    </div>
  )
}
