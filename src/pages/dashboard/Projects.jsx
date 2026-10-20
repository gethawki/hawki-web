import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FolderGit2, Plus } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useApi } from '../../lib/useApi.js'
import { useRefresh } from '../../lib/live.jsx'
import { ago } from '../../lib/format.js'
import { projectSource } from '../../lib/dashboard.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import { SeverityCounts } from '../../components/dashboard/ScanBits.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge, { ScanStatusBadge } from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { SearchInput, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState } from '../../components/ui/Feedback.jsx'

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
    <form onSubmit={submit} className="grid gap-4">
      {error && <Alert>{error}</Alert>}
      <Field id="p-name" label="Name" value={form.name} error={fieldErrors.name} onChange={set('name')} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_12rem]">
        <Field id="p-repo" label="Repository" placeholder="https://github.com/acme/contracts" value={form.repository_url}
          error={fieldErrors.repository_url} hint="Public https Git URL." onChange={set('repository_url')} />
        <Field id="p-ref" label="Branch or tag" placeholder="default branch" value={form.default_ref} error={fieldErrors.default_ref} onChange={set('default_ref')} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[12rem_1fr]">
        <SelectField id="p-chain" label="Chain" value={form.chain} error={fieldErrors.chain} onChange={set('chain')}
          options={[{ value: '', label: 'None' }, ...chains.map((c) => ({ value: c, label: c }))]} />
        <Field id="p-address" label="Deployed contract (optional)" placeholder="0x..." value={form.contract_address}
          error={fieldErrors.contract_address} onChange={set('contract_address')} />
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" busy={busy}>Create project</Button>
      </div>
    </form>
  )
}

const FREQ = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

export default function Projects() {
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useApi(`/api/v1/orgs/${currentOrg.id}/projects`)
  useRefresh(['scan.updated'], reload)
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const rows = data?.projects.filter((p) => !needle || `${p.name} ${projectSource(p)}`.toLowerCase().includes(needle))

  return (
    <div>
      <PageHeader
        title="Projects"
        description="A project is a codebase or deployed contract you scan over time. Findings are tracked per project across scans."
        meta={data && <span>{data.projects.length} {data.projects.length === 1 ? 'project' : 'projects'}</span>}
        actions={can('projects:write') && <Button size="sm" onClick={() => setCreating(true)}><Plus size={14} /> New project</Button>}
      />
      <div className="grid gap-4">
        <Toolbar>
          <SearchInput className="w-full sm:w-72" value={q} onChange={setQ} placeholder="Search projects" />
        </Toolbar>
        {error && <ErrorState onRetry={reload}>{error}</ErrorState>}
        <Card flush>
          <DataTable rows={rows} loading={loading} rowHref={(p) => `/dashboard/projects/${p.id}`}
            empty={<EmptyState icon={FolderGit2} title={needle ? 'No projects match' : 'No projects yet'}
              action={!needle && can('projects:write') && <Button size="sm" onClick={() => setCreating(true)}><Plus size={14} /> New project</Button>}>
              {needle ? 'Try another search.' : 'Add a repository or a deployed contract to run your first cloud scan.'}</EmptyState>}
            columns={[
              {
                key: 'name', header: 'Project', cell: (p) => (
                  <div className="min-w-0">
                    <Link to={`/dashboard/projects/${p.id}`} className="font-medium text-fg hover:underline">{p.name}</Link>
                    <div className="max-w-[22rem] truncate text-xs text-fg-3">{projectSource(p)}</div>
                  </div>
                ),
              },
              { key: 'status', header: 'Last scan', cell: (p) => p.last_scan ? <ScanStatusBadge status={p.last_scan.status} /> : <span className="text-xs text-fg-3">Not scanned</span> },
              { key: 'result', header: 'Findings in last scan', hide: 'md', cell: (p) => p.last_scan?.status === 'completed' ? <SeverityCounts summary={p.last_scan.summary} /> : <span className="text-xs text-fg-3">-</span> },
              { key: 'schedule', header: 'Schedule', hide: 'lg', cell: (p) => FREQ[p.scan_frequency] ? <Badge tone="accent">{FREQ[p.scan_frequency]}</Badge> : <span className="text-xs text-fg-3">Manual</span> },
              { key: 'when', header: 'Scanned', align: 'right', cell: (p) => <span className="text-fg-3">{p.last_scan ? ago(p.last_scan.created_at) : '-'}</span> },
            ]} />
        </Card>
      </div>
      <Modal open={creating} onClose={() => setCreating(false)} title="New project" description="A public https Git repository, a deployed contract, or both.">
        {data && <NewProject orgId={currentOrg.id} chains={data.chains} onCancel={() => setCreating(false)}
          onCreated={(p) => { setCreating(false); navigate(`/dashboard/projects/${p.id}`) }} />}
      </Modal>
    </div>
  )
}
