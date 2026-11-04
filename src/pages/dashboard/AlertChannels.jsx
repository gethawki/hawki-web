import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ALERT_SEVERITIES, CHANNEL_KINDS } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { formatDateTime } from './roles.js'

const MODES = [
  { value: 'immediate', label: 'Right away' },
  { value: 'daily_digest', label: 'Daily digest (08:00 UTC)' },
]
const SEVERITY_OPTIONS = ALERT_SEVERITIES.map((s) => ({ value: s.value, label: `${s.label} and above` }))
const EMPTY = { kind: 'slack', name: '', min_severity: 'high', mode: 'immediate', url: '', bot_token: '', chat_id: '', routing_key: '', recipients: [] }

function NewChannel({ orgId, members, onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [secret, setSecret] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const kind = CHANNEL_KINDS.find((k) => k.value === form.kind)

  function toggleRecipient(email) {
    const has = form.recipients.includes(email)
    setForm({ ...form, recipients: has ? form.recipients.filter((r) => r !== email) : [...form.recipients, email] })
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setError(null)
    setSecret(null)
    const config = form.kind === 'email' ? { recipients: form.recipients }
      : form.kind === 'telegram' ? { bot_token: form.bot_token, chat_id: form.chat_id }
      : form.kind === 'pagerduty' ? { routing_key: form.routing_key }
      : { url: form.url }
    try {
      const d = await api(`/api/v1/orgs/${orgId}/alert-channels`, {
        method: 'POST',
        body: { kind: form.kind, name: form.name, min_severity: form.min_severity, mode: form.kind === 'webhook' ? 'immediate' : form.mode, config },
      })
      if (d.signing_secret) setSecret(d.signing_secret)
      setForm({ ...EMPTY, kind: form.kind })
      onCreated()
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message.replace(/^\w+: /, '') })
      else setError(errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <Panel title="Add a channel">
      <form onSubmit={submit} className="grid gap-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField id="channel-kind" label="Type" value={form.kind} onChange={(e) => setForm({ ...EMPTY, kind: e.target.value, name: form.name })}
            options={CHANNEL_KINDS} hint={kind.hint} error={errors.kind} />
          <Field id="channel-name" label="Name" placeholder="Security team" value={form.name} onChange={set('name')} error={errors.name} />
        </div>
        {form.kind === 'email' && (
          <fieldset>
            <legend className="text-sm text-fg-2 mb-1.5">Recipients</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {members.map((m) => (
                <label key={m.user_id} className="flex items-center gap-2 text-sm text-fg-2">
                  <input type="checkbox" checked={form.recipients.includes(m.email)} onChange={() => toggleRecipient(m.email)} />
                  <span className="truncate">{m.name ? `${m.name} (${m.email})` : m.email}</span>
                </label>
              ))}
            </div>
            {errors.recipients && <span className="block mt-1.5 text-xs text-bad">{errors.recipients}</span>}
          </fieldset>
        )}
        {(form.kind === 'slack' || form.kind === 'discord' || form.kind === 'webhook') && (
          <Field id="channel-url" label={form.kind === 'webhook' ? 'Endpoint URL' : 'Webhook URL'} type="url" autoComplete="off"
            placeholder={form.kind === 'slack' ? 'https://hooks.slack.com/services/...' : form.kind === 'discord' ? 'https://discord.com/api/webhooks/...' : 'https://example.com/hawki'}
            value={form.url} onChange={set('url')} error={errors.url} />
        )}
        {form.kind === 'pagerduty' && (
          <Field id="channel-routing" label="Integration key" autoComplete="off" placeholder="32 characters from the PagerDuty service integration"
            value={form.routing_key} onChange={set('routing_key')} error={errors.routing_key} />
        )}
        {form.kind === 'telegram' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="channel-token" label="Bot token" autoComplete="off" value={form.bot_token} onChange={set('bot_token')} error={errors.bot_token} />
            <Field id="channel-chat" label="Chat ID" placeholder="-1001234567890 or @channel" value={form.chat_id} onChange={set('chat_id')} error={errors.chat_id} />
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField id="channel-severity" label="Send" value={form.min_severity} onChange={set('min_severity')} options={SEVERITY_OPTIONS} error={errors.min_severity} />
          {form.kind !== 'webhook' && (
            <SelectField id="channel-mode" label="When" value={form.mode} onChange={set('mode')} options={MODES} error={errors.mode} />
          )}
        </div>
        <div><Button type="submit" busy={busy}>Add channel</Button></div>
        {secret && (
          <div className="grid gap-2">
            <Alert tone="info">
              Copy the signing secret now. It is shown only once. Each request carries
              X-Hawki-Signature: t=timestamp,v1=HMAC-SHA256 of &quot;timestamp.body&quot; with this secret.
            </Alert>
            <code className="block overflow-x-auto rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-fg-2">{secret}</code>
          </div>
        )}
      </form>
    </Panel>
  )
}

function ChannelRow({ orgId, channel, canWrite, onChanged }) {
  const [busy, setBusy] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function patch(body) {
    setError(null)
    try {
      await api(`/api/v1/orgs/${orgId}/alert-channels/${channel.id}`, { method: 'PATCH', body })
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  async function test() {
    setBusy('test')
    setResult(null)
    try {
      const d = await api(`/api/v1/orgs/${orgId}/alert-channels/${channel.id}/test`, { method: 'POST' })
      setResult(d.ok ? { ok: true, text: 'Test message sent.' } : { ok: false, text: d.error })
      onChanged()
    } catch (err) {
      setResult({ ok: false, text: errorMessage(err) })
    }
    setBusy(null)
  }
  async function remove() {
    if (!window.confirm(`Delete the ${channel.name} channel?`)) return
    setBusy('delete')
    try {
      await api(`/api/v1/orgs/${orgId}/alert-channels/${channel.id}`, { method: 'DELETE' })
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(null)
    }
  }

  const kind = CHANNEL_KINDS.find((k) => k.value === channel.kind)?.label || channel.kind
  return (
    <li className="py-4 first:pt-0 last:pb-0 grid gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-fg">{channel.name}</span>
        <span className="text-xs text-fg-3">{kind} · {channel.display}</span>
        {!channel.enabled && <span className="text-xs text-bad">off</span>}
      </div>
      <div className="text-xs text-fg-3">
        {channel.last_error ? <span className="text-bad">Last attempt failed: {channel.last_error}</span>
          : channel.last_delivery_at ? `Last delivered ${formatDateTime(channel.last_delivery_at)}` : 'Nothing delivered yet.'}
      </div>
      {canWrite ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-fg-3">
            <span className="sr-only">Severity for {channel.name}</span>
            <select value={channel.min_severity} onChange={(e) => patch({ min_severity: e.target.value })}
              className="rounded-lg bg-surface border border-line px-2.5 py-1.5 text-sm text-fg">
              {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          {channel.kind !== 'webhook' && (
            <label className="text-xs text-fg-3">
              <span className="sr-only">When to send to {channel.name}</span>
              <select value={channel.mode} onChange={(e) => patch({ mode: e.target.value })}
                className="rounded-lg bg-surface border border-line px-2.5 py-1.5 text-sm text-fg">
                {MODES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-fg-2">
            <input type="checkbox" checked={channel.enabled} onChange={(e) => patch({ enabled: e.target.checked })} /> On
          </label>
          <Button variant="ghost" className="py-1.5" busy={busy === 'test'} onClick={test}>Send test</Button>
          <Button variant="danger" className="py-1.5" busy={busy === 'delete'} onClick={remove}>Delete</Button>
        </div>
      ) : (
        <div className="text-xs text-fg-3">
          {SEVERITY_OPTIONS.find((o) => o.value === channel.min_severity)?.label}, {MODES.find((m) => m.value === channel.mode)?.label.toLowerCase()}
        </div>
      )}
      {result && <Alert tone={result.ok ? 'info' : 'error'}>{result.text}</Alert>}
      {error && <Alert>{error}</Alert>}
    </li>
  )
}

export default function AlertChannels() {
  const { currentOrg, can } = useAuth()
  const [channels, setChannels] = useState(null)
  const [members, setMembers] = useState([])
  const [error, setError] = useState(null)
  const canWrite = can('settings:write')

  const load = useCallback(async () => {
    try {
      setChannels((await api(`/api/v1/orgs/${currentOrg.id}/alert-channels`)).channels)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [currentOrg.id])
  useEffect(() => {
    load()
    if (canWrite) api(`/api/v1/orgs/${currentOrg.id}/members`).then((d) => setMembers(d.members)).catch(() => setMembers([]))
  }, [load, canWrite, currentOrg.id])

  return (
    <div className="grid gap-6">
      <PageHeader back={{ to: '/dashboard/alerts', label: 'Alerts' }} title="Alert channels" description="Where alerts go besides this dashboard. Each project can narrow this list or mute it in its settings." />
      {error && <Alert>{error}</Alert>}
      <Panel>
        {!channels ? <Spinner /> : channels.length === 0 ? (
          <p className="text-sm text-fg-3">No channels yet. Alerts only show in the dashboard.</p>
        ) : (
          <ul className="divide-y divide-line">
            {channels.map((c) => <ChannelRow key={c.id} orgId={currentOrg.id} channel={c} canWrite={canWrite} onChanged={load} />)}
          </ul>
        )}
      </Panel>
      {canWrite && <NewChannel orgId={currentOrg.id} members={members} onCreated={load} />}
    </div>
  )
}
