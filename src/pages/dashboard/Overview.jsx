import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bell, CheckCircle2, Circle, FolderGit2, KeyRound, Play, ScanLine, ShieldAlert, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useApi } from '../../lib/useApi.js'
import { useRefresh } from '../../lib/live.jsx'
import { change, dateTime, day, hours, num, pct, ago } from '../../lib/format.js'
import { formatCredits } from '../../lib/credits.js'
import { scoreBand } from '../../lib/dashboard.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import PageHeader, { KpiStrip } from '../../components/dashboard/PageHeader.jsx'
import { ScanRow } from '../../components/dashboard/ScanBits.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge, { ScanStatusBadge, SeverityBadge } from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { PillFilter, RANGES, Segmented } from '../../components/ui/Controls.jsx'
import { Donut, Expandable, Radar, ScoreRing, SummaryList, Timeline } from '../../components/ui/Viz.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import TimeChart from '../../components/charts/TimeChart.jsx'
import { SeverityBar } from '../../components/charts/Small.jsx'

const SEV_SERIES = [
  { key: 'low', label: 'Low', color: 'var(--color-sev-low)' },
  { key: 'medium', label: 'Medium', color: 'var(--color-sev-medium)' },
  { key: 'high', label: 'High', color: 'var(--color-sev-high)' },
  { key: 'critical', label: 'Critical', color: 'var(--color-sev-critical)' },
]

function VerifyBanner() {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  async function resend() {
    setState('sending')
    try {
      await api('/api/v1/auth/verify-email/resend', { method: 'POST' })
      setState('sent')
    } catch (err) {
      setError(errorMessage(err))
      setState('idle')
    }
  }
  return (
    <Alert tone="info">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="flex-1">
          {state === 'sent' ? 'A new confirmation link is on its way.' : 'Confirm your email address to keep your account secure.'}
          {error && <span className="mt-1 block text-bad">{error}</span>}
        </span>
        {state !== 'sent' && <Button variant="ghost" size="sm" onClick={resend} busy={state === 'sending'}>Resend link</Button>}
      </div>
    </Alert>
  )
}

function Onboarding({ hasProject, hasScan, canProjects, canSettings, canAlerts }) {
  const steps = [
    { done: hasProject, title: 'Add a project', body: 'Point Hawk-i at a repository or a deployed contract.', to: '/dashboard/projects', icon: FolderGit2, show: canProjects },
    { done: hasScan, title: 'Run your first scan', body: 'Quick scans use static rules; full and deep scans add AI reasoning.', to: '/dashboard/projects', icon: Play, show: canProjects },
    { done: false, title: 'Add your model provider key', body: 'Needed for full and deep scans. Stored encrypted.', to: '/dashboard/settings', icon: KeyRound, show: canSettings, optional: true },
    { done: false, title: 'Route alerts to your team', body: 'Email, Slack, Discord, Telegram or a signed webhook.', to: '/dashboard/alerts/channels', icon: Bell, show: canAlerts, optional: true },
  ].filter((s) => s.show)
  const done = steps.filter((s) => s.done).length
  return (
    <Card title="Get set up" description={`${done} of ${steps.length} done`}>
      <ol className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {steps.map((s) => (
          <li key={s.title}>
            <Link to={s.to} className="flex h-full gap-3 rounded-lg border border-line bg-surface-2/40 p-3.5 transition hover:border-line-strong hover:bg-surface-2">
              {s.done ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-good" /> : <Circle size={18} className="mt-0.5 shrink-0 text-fg-3" />}
              <span className="min-w-0">
                <span className={`block text-sm font-medium ${s.done ? 'text-fg-3 line-through' : 'text-fg'}`}>
                  {s.title}{s.optional && <span className="ml-2 text-xs font-normal text-fg-3">optional</span>}
                </span>
                <span className="mt-0.5 block text-xs text-fg-3">{s.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}

const SEV_KEYS = [
  ['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low'],
]

// Hero is the reference's top panel: who and what, the posture ring, the
// open risk, the scans and the latest scan's state, side by side.
function Hero({ a, org, scans }) {
  const [band] = scoreBand(a.score)
  const last = scans?.scans?.[0]
  const first = a.daily[0]?.score ?? a.score
  const projects = a.projects.length
  return (
    <section className="app-card grid grid-cols-1 divide-y divide-line rounded-2xl border border-line md:grid-cols-2 md:divide-y-0 xl:grid-cols-[1.25fr_auto_1fr_1fr_1fr] xl:divide-x">
      <div className="grid content-start gap-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-lg font-semibold text-fg">{org.name}</span>
          <Badge tone="good">{org.plan ? org.plan.charAt(0).toUpperCase() + org.plan.slice(1) : 'Workspace'}</Badge>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-fg-3">Projects</dt><dd className="text-fg tnum">{num(projects)}</dd>
          <dt className="text-fg-3">Open findings</dt><dd className="text-fg tnum">{num(a.open.critical + a.open.high + a.open.medium + a.open.low)}</dd>
          <dt className="text-fg-3">Window</dt><dd className="text-fg">Last {a.window.days} days</dd>
          <dt className="text-fg-3">Last scan</dt><dd className="text-fg">{last ? ago(last.created_at) : 'never'}</dd>
        </dl>
      </div>
      <div className="grid place-items-center p-5">
        <ScoreRing value={a.score} label="Security score" sub={`${band}, ${a.score - first >= 0 ? '+' : ''}${a.score - first} in ${a.window.days}d`} />
      </div>
      <div className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-fg">Risk summary</h3>
        <SummaryList items={SEV_KEYS.map(([k, l]) => ({ label: `${l} risk`, value: num(a.open[k]), color: `var(--color-sev-${k})` }))} />
      </div>
      <div className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-fg">Scans summary</h3>
        <SummaryList items={[
          { label: 'Scans run', value: num(a.current.scans) },
          { label: 'Succeeded', value: a.success_rate == null ? '-' : pct(a.success_rate), tone: 'good' },
          { label: 'Found', value: num(a.current.opened), tone: 'warn' },
          { label: 'Fixed', value: num(a.current.resolved), tone: 'good' },
        ]} />
      </div>
      <div className="grid content-start justify-items-center gap-2 p-5 text-center">
        <h3 className="justify-self-stretch text-left text-sm font-semibold text-fg">Latest scan</h3>
        {last ? (
          <>
            {last.status === 'completed' ? <ShieldCheck size={36} className="text-good" /> : last.status === 'failed' ? <ShieldAlert size={36} className="text-critical" /> : <ScanLine size={36} className="text-accent" />}
            <ScanStatusBadge status={last.status} />
            <span className="text-xs text-fg-3">{dateTime(last.created_at)}</span>
            <Link to={`/dashboard/scans/${last.id}`} className="text-xs text-accent hover:underline">Open the scan</Link>
          </>
        ) : <p className="text-sm text-fg-3">No scan yet.</p>}
      </div>
    </section>
  )
}

// breakdown turns the open findings and the activity into six 0 to 100
// axes; each is explained in the card so the radar is never a mystery.
function breakdown(a) {
  const triaged = Object.entries(a.triage).reduce((x, [k, v]) => x + (k === 'new' ? 0 : v), 0)
  const all = Object.values(a.triage).reduce((x, y) => x + y, 0)
  const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)))
  return [
    { label: 'Critical', value: clamp(100 - 15 * a.open.critical), why: '100 minus 15 per open critical' },
    { label: 'High', value: clamp(100 - 8 * a.open.high), why: '100 minus 8 per open high' },
    { label: 'Medium', value: clamp(100 - 4 * a.open.medium), why: '100 minus 4 per open medium' },
    { label: 'Low', value: clamp(100 - a.open.low), why: '100 minus 1 per open low' },
    { label: 'Triage', value: all ? clamp((triaged / all) * 100) : 100, why: 'share of findings looked at' },
    { label: 'Scan health', value: a.success_rate == null ? 100 : clamp(a.success_rate * 100), why: 'share of scans that finished' },
  ]
}

function TopIssues({ issues }) {
  const [sev, setSev] = useState('all')
  const counts = Object.fromEntries(SEV_KEYS.map(([k]) => [k, issues.filter((i) => i.severity.toLowerCase() === k).length]))
  const shown = issues.filter((i) => sev === 'all' || i.severity.toLowerCase() === sev)
  return (
    <Card title="Most common open issues" description="Grouped by title across your projects" more={{ to: '/dashboard/findings', label: 'View all findings' }}>
      <div className="mb-3">
        <PillFilter label="Severity" value={sev} onChange={setSev}
          options={[{ value: 'all', label: 'All', count: issues.length }, ...SEV_KEYS.filter(([k]) => counts[k]).map(([k, l]) => ({ value: k, label: l, count: counts[k], color: `var(--color-sev-${k})` }))]} />
      </div>
      <Expandable empty={<EmptyState compact icon={ShieldCheck} title="No open issues">Nothing above informational is open.</EmptyState>}
        items={shown.slice(0, 6).map((i) => ({
          key: `${i.title}-${i.severity}`,
          icon: <AlertTriangle size={16} style={{ color: `var(--color-sev-${i.severity.toLowerCase()})` }} />,
          title: i.title,
          badge: <SeverityBadge value={i.severity} />,
          sub: `${i.count} open in ${i.projects} ${i.projects === 1 ? 'project' : 'projects'}`,
          meta: `${i.count}×`,
          body: (
            <div className="flex flex-wrap items-center gap-3">
              <span>Open {i.count} times across {i.projects} {i.projects === 1 ? 'project' : 'projects'}.</span>
              <Link to={`/dashboard/findings?q=${encodeURIComponent(i.title)}&status=new`} className="text-accent hover:underline">See each finding</Link>
            </div>
          ),
        }))} />
    </Card>
  )
}

function Analytics({ orgId, days, auth }) {
  const { data: a, error, stale, reload } = useApi(`/api/v1/orgs/${orgId}/analytics?days=${days}`)
  const scans = useApi(`/api/v1/orgs/${orgId}/scans?limit=6`)
  useRefresh(['scan.updated', 'finding.updated'], reload)
  useRefresh(['scan.updated', 'scan.created'], scans.reload)
  const { currentOrg } = auth
  if (error && !a) return <ErrorState onRetry={reload}>{error}</ErrorState>
  if (!a) return <PageSkeleton />

  const openTotal = a.open.critical + a.open.high + a.open.medium + a.open.low
  const period = `previous ${days} days`
  const hasProject = a.projects.length > 0
  const sevDaily = a.daily.map((d) => ({ label: day(d.date), ...d.open }))
  const flowDaily = a.daily.map((d) => ({ label: day(d.date), opened: d.opened, resolved: d.resolved }))
  const fixCrit = a.mttr_hours.critical ?? a.mttr_hours.high
  const axes = breakdown(a)
  const resolvedDelta = change(a.current.resolved, a.previous.resolved)
  const scansDelta = change(a.current.scans, a.previous.scans)
  const signed = (v) => (v == null ? `no earlier data` : `${v >= 0 ? '+' : ''}${pct(v)} vs ${period}`)

  return (
    <div className="grid gap-4">
      {(!hasProject || a.current.scans + a.previous.scans === 0) && (
        <Onboarding hasProject={hasProject} hasScan={a.current.scans + a.previous.scans > 0} canProjects={auth.can('projects:write')}
          canSettings={auth.can('settings:write')} canAlerts={auth.can('settings:write')} />
      )}

      <KpiStrip items={[
        { label: 'Open findings', value: num(openTotal), note: `${num(a.open.critical)} critical, ${num(a.open.high)} high`, tone: a.open.critical ? 'bad' : undefined },
        { label: 'Security score', value: `${a.score} / 100`, note: scoreBand(a.score)[0] },
        { label: 'Fixed', value: num(a.current.resolved), note: signed(resolvedDelta), tone: 'good' },
        { label: 'Scans', value: num(a.current.scans), note: signed(scansDelta) },
        { label: 'Time to fix', value: hours(fixCrit), note: a.mttr_hours.critical != null ? 'critical findings' : a.mttr_hours.high != null ? 'high findings' : 'nothing fixed yet' },
        auth.can('billing:read') && { label: 'Credits spent', value: formatCredits(a.current.credits_mc), note: `last ${days} days` },
      ]} />

      <Hero a={a} org={currentOrg} scans={scans.data} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Open findings by severity" description="Open at the end of each day (UTC)" icon={ShieldAlert}>
          <TimeChart kind="stacked" data={sevDaily} series={SEV_SERIES} height={250} caption="Open findings by severity per day" stale={stale} />
        </Card>
        <Card title="Security score breakdown" description="Each axis out of 100" icon={ShieldCheck}>
          <Radar axes={axes} label="Your posture" />
          <ul className="mt-3 grid gap-1 text-[0.7rem] text-fg-3">
            {axes.map((x) => <li key={x.label}><span className="text-fg-2">{x.label}</span>: {x.why}</li>)}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2"><TopIssues issues={a.top_issues} /></div>
        <Card title="Found and fixed" description="Findings first seen and closed per day">
          <TimeChart data={flowDaily} series={[{ key: 'opened', label: 'Found', color: 'var(--color-series-1)' }, { key: 'resolved', label: 'Fixed', color: 'var(--color-series-2)' }]}
            height={230} caption="Findings found and fixed per day" stale={stale} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Riskiest projects" description="Ranked by open findings, weighted by severity" icon={FolderGit2} more={{ to: '/dashboard/projects', label: 'View all projects' }} flush>
          <DataTable rows={a.projects} stale={stale} rowHref={(p) => `/dashboard/projects/${p.id}`} pageSize={5}
            empty={<EmptyState compact icon={FolderGit2} title="No projects yet">Add a project to start tracking its risk.</EmptyState>}
            columns={[
              { key: 'name', header: 'Project', cell: (p) => <Link to={`/dashboard/projects/${p.id}`} className="font-medium text-fg hover:underline">{p.name}</Link> },
              { key: 'open', header: 'Open', cell: (p) => <div className="w-40"><SeverityBar counts={p.open} legend={false} height={6} /></div>, hide: 'sm' },
              { key: 'count', header: 'Findings', align: 'right', sort: (p) => p.open.critical + p.open.high + p.open.medium + p.open.low, cell: (p) => num(p.open.critical + p.open.high + p.open.medium + p.open.low) },
              { key: 'score', header: 'Score', align: 'right', cell: (p) => <span className={p.score < 50 ? 'text-bad' : 'text-fg'}>{p.score}</span> },
              { key: 'last', header: 'Last scan', align: 'right', hide: 'md', sort: (p) => p.last_scan_at || '', cell: (p) => <span className="text-fg-3">{ago(p.last_scan_at)}</span> },
            ]} />
        </Card>
        <Card title="Findings by status" description="Every finding ever recorded here">
          <Donut centerLabel="findings" parts={[
            { label: 'New', value: a.triage.new || 0, color: 'var(--color-critical)' },
            { label: 'Acknowledged', value: a.triage.acknowledged || 0, color: 'var(--color-warning)' },
            { label: 'Resolved', value: a.triage.resolved || 0, color: 'var(--color-good)' },
            { label: 'False positive', value: a.triage.false_positive || 0, color: 'var(--color-fg-3)' },
          ]} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Recent scans" icon={ScanLine} more={{ to: '/dashboard/scans', label: 'View all scans' }} flush>
          {!scans.data ? <div className="h-40" /> : scans.data.scans.length === 0
            ? <EmptyState compact icon={ScanLine} title="No scans yet">Run a scan from a project to see results here.</EmptyState>
            : <div className="divide-y divide-line border-t border-line">{scans.data.scans.map((x) => <ScanRow key={x.id} scan={x} showProject />)}</div>}
        </Card>
        <Card title="Activity timeline" description="The latest scans as they ran">
          <Timeline empty="No scans yet." items={(scans.data?.scans || []).slice(0, 6).map((x) => ({
            key: x.id,
            title: `${x.type ? x.type.charAt(0).toUpperCase() + x.type.slice(1) : 'Scan'} scan ${x.status}`,
            sub: x.project_name || '',
            at: ago(x.created_at),
            tone: x.status === 'failed' ? 'bad' : x.status === 'completed' ? 'good' : undefined,
            done: x.status === 'completed' || x.status === 'failed',
          }))} />
        </Card>
      </div>
    </div>
  )
}

export default function Overview() {
  const auth = useAuth()
  const { user, currentOrg } = auth
  const [days, setDays] = useState(30)
  const firstName = (user.name || '').split(/\s+/)[0]
  const canAnalytics = Boolean(currentOrg) && auth.can('findings:read')

  return (
    <div>
      {!user.email_verified && <div className="mb-5"><VerifyBanner /></div>}
      <PageHeader
        title="Overview"
        description={currentOrg ? `${firstName ? `Welcome back, ${firstName}. ` : ''}Security posture and activity for ${currentOrg.name}.` : 'Your Hawk-i Cloud workspace.'}
        actions={canAnalytics && (
          <>
            <Segmented label="Time range" options={RANGES} value={days} onChange={setDays} />
            {auth.can('scans:create') && <Button to="/dashboard/projects" size="sm"><Play size={14} /> Run a scan</Button>}
          </>
        )}
      />
      {canAnalytics ? <Analytics orgId={currentOrg.id} days={days} auth={auth} /> : (
        <Card>
          <EmptyState icon={ShieldCheck} title="Nothing to show for your role">Ask an admin of your organization for access to projects and findings.</EmptyState>
        </Card>
      )}
    </div>
  )
}
