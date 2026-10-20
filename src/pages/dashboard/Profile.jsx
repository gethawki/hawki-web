import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field from '../../components/common/Field.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { MIN_PASSWORD } from '../auth/shared.js'
import Badge from '../../components/ui/Badge.jsx'
import { ButtonTabs } from '../../components/ui/Controls.jsx'
import { DeleteAccountPanel, EmailPanel, SessionsPanel, TwoFactorPanel, useSecurity } from '../../components/account/Security.jsx'

function ProfileForm() {
  const { user, reload } = useAuth()
  const [name, setName] = useState(user.name)
  const [state, setState] = useState({ busy: false, error: null, saved: false })
  async function save(e) {
    e.preventDefault()
    setState({ busy: true, error: null, saved: false })
    try {
      await api('/api/v1/me', { method: 'PATCH', body: { name } })
      await reload()
      setState({ busy: false, error: null, saved: true })
    } catch (err) {
      setState({ busy: false, error: errorMessage(err), saved: false })
    }
  }
  return (
    <Panel title="Profile">
      <form onSubmit={save} className="grid gap-4">
        {state.error && <Alert>{state.error}</Alert>}
        {state.saved && <Alert tone="info">Saved.</Alert>}
        <Field id="profile-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field id="profile-email" label="Email" value={user.email} disabled hint={user.email_verified ? 'Confirmed.' : 'Not confirmed yet.'} />
        <div><Button type="submit" busy={state.busy}>Save</Button></div>
      </form>
    </Panel>
  )
}

function PasswordForm() {
  const [form, setForm] = useState({ current: '', next: '' })
  const [state, setState] = useState({ busy: false, error: null, saved: false })
  async function save(e) {
    e.preventDefault()
    if (form.next.length < MIN_PASSWORD) return setState({ busy: false, error: `Use at least ${MIN_PASSWORD} characters.`, saved: false })
    setState({ busy: true, error: null, saved: false })
    try {
      await api('/api/v1/me/password', { method: 'POST', body: { current_password: form.current, new_password: form.next } })
      setForm({ current: '', next: '' })
      setState({ busy: false, error: null, saved: true })
    } catch (err) {
      setState({ busy: false, error: err.code === 'invalid_credentials' ? 'Your current password is not right.' : errorMessage(err), saved: false })
    }
  }
  return (
    <Panel title="Password">
      <form onSubmit={save} className="grid gap-4">
        {state.error && <Alert>{state.error}</Alert>}
        {state.saved && <Alert tone="info">Password changed. Your other sessions were signed out.</Alert>}
        <Field id="pw-current" label="Current password" type="password" autoComplete="current-password" value={form.current}
          hint="Leave empty if you signed up with Google or GitHub and never set one." onChange={(e) => setForm({ ...form, current: e.target.value })} />
        <Field id="pw-next" label="New password" type="password" autoComplete="new-password" value={form.next}
          onChange={(e) => setForm({ ...form, next: e.target.value })} />
        <div><Button type="submit" busy={state.busy}>Change password</Button></div>
      </form>
    </Panel>
  )
}

const TABS = [
  { value: 'general', label: 'General' },
  { value: 'security', label: 'Password and two-factor' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'delete', label: 'Delete account' },
]

export default function Profile() {
  const { user } = useAuth()
  const [security, reloadSecurity] = useSecurity()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'general'
  return (
    <div className="max-w-3xl">
      <PageHeader title="Your account" description="Profile, sign-in and security for your Hawk-i account across every organization."
        meta={security && (
          <>
            <Badge tone={user.email_verified ? 'good' : 'warning'} dot>{user.email_verified ? 'Email confirmed' : 'Email not confirmed'}</Badge>
            <Badge tone={security.two_factor_enabled ? 'good' : 'warning'} dot>{security.two_factor_enabled ? 'Two-factor on' : 'Two-factor off'}</Badge>
          </>
        )}>
        <ButtonTabs tabs={TABS} value={tab} onChange={(v) => setParams(v === 'general' ? {} : { tab: v }, { replace: true })} />
      </PageHeader>
      <div className="grid gap-4">
        {tab === 'general' && <><ProfileForm /><EmailPanel security={security} onChanged={reloadSecurity} /></>}
        {tab === 'security' && <><PasswordForm /><TwoFactorPanel security={security} onChanged={reloadSecurity} /></>}
        {tab === 'sessions' && <SessionsPanel />}
        {tab === 'delete' && <DeleteAccountPanel security={security} />}
      </div>
    </div>
  )
}
