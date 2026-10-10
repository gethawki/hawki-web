import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderGit2 } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { ScanStatus, SeverityCounts } from '../../components/dashboard/ScanBits.jsx'

const EMPTY = { name: '', repository_url: '', default_ref: '', chain: '', contract_address: '' }

function NewProject({ orgId, chains, onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      const p = await api(`/api/v1/orgs/${orgId}/projects`, { method: 'POST', body: form })
      onCreated(p)
    } catch (err) {
      if (err.field) setFieldErrors({ [err.field]: err.message.replace(/^\w+: /, '') })
      else setError(err.code === 'project_name_taken' ? 'A project with this name already exists.' : errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Panel title="New project">
      <form onSubmit={submit} className="grid gap-4">
        {error && <Alert>{error}</Alert>}
        <Field id="p-name" label="Name" value={form.name} error={fieldErrors.name} onChange={set('name')} />
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <Field id="p-repo" label="Repository" placeholder="https://github.com/acme/contracts" value={form.repository_url}
            error={fieldErrors.repository_url} hint="Public https Git URL." onChange={set('repository_url')} />
          <Field id="p-ref" label="Branch or tag" placeholder="default branch" value={form.default_ref} error={fieldErrors.default_ref} onChange={set('default_ref')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <SelectField id="p-chain" label="Chain" value={form.chain} error={fieldErrors.chain} onChange={set('chain')}
            options={[{ value: '', label: 'None' }, ...chains.map((c) => ({ value: c, label: c }))]} />
          <Field id="p-address" label="Deployed contract (optional)" placeholder="0x..." value={form.contract_address}
            error={fieldErrors.contract_address} onChange={set('contract_address')} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" busy={busy}>Create project</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Panel>
  )
}

export default function Projects() {
  const { currentOrg, can } = useAuth()
  const [data, setData] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/v1/orgs/${currentOrg.id}/projects`))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [currentOrg.id])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader
        title="Projects"
        description="A project is a codebase or deployed contract you scan over time. Findings are tracked per project across scans."
        actions={can('projects:write') && !creating && <Button onClick={() => setCreating(true)}>New project</Button>}
      />
      {error && <Alert>{error}</Alert>}
      {creating && data && (
        <NewProject orgId={currentOrg.id} chains={data.chains} onCancel={() => setCreating(false)}
          onCreated={() => { setCreating(false); load() }} />
      )}
      {!data ? (
        <Spinner />
      ) : data.projects.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center text-center py-6">
            <FolderGit2 className="text-steel mb-3" size={28} strokeWidth={1.5} />
            <p className="text-white">No projects yet</p>
            <p className="mt-1 text-sm text-grey max-w-md">Add a repository or a deployed contract to run your first cloud scan.</p>
          </div>
        </Panel>
      ) : (
        <Panel>
          <ul className="divide-y divide-panel-border">
            {data.projects.map((p) => (
              <li key={p.id}>
                <Link to={`/dashboard/projects/${p.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3.5 hover:text-white">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{p.name}</div>
                    <div className="text-xs text-grey truncate">{p.repository_url || `${p.chain} ${p.contract_address}`}</div>
                  </div>
                  {p.last_scan ? (
                    <div className="flex items-center gap-3">
                      {p.last_scan.status === 'completed' && <SeverityCounts summary={p.last_scan.summary} />}
                      <ScanStatus status={p.last_scan.status} />
                    </div>
                  ) : (
                    <span className="text-xs text-grey">not scanned yet</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
