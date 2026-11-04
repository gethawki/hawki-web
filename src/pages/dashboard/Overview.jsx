import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCircle2, Circle, Clock, FolderGit2, KeyRound, Play, ScanLine, ShieldAlert, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useApi } from '../../lib/useApi.js'
import { useRefresh } from '../../lib/live.jsx'
import { change, day, hours, num, pct, ago } from '../../lib/format.js'
import { formatCredits } from '../../lib/credits.js'
import { scoreBand } from '../../lib/dashboard.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import { ScanRow } from '../../components/dashboard/ScanBits.jsx'
import Card, { CardLink } from '../../components/ui/Card.jsx'
import StatCard, { Delta } from '../../components/ui/Stat.jsx'
import Badge, { SeverityBadge } from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { RANGES, Segmented } from '../../components/ui/Controls.jsx'
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

function Posture({ a, stale }) {
  const [band, tone] = scoreBand(a.score)
  const first = a.daily[0]?.score ?? a.score
  const data = a.daily.map((d) => ({ label: day(d.date), score: d.score }))
  return (
    <Card className="lg:col-span-2" title="Security posture" description="Score of open findings: 100, minus 15 per critical, 8 per high, 4 per medium, 1 per low.">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[11rem_minmax(0,1fr)] md:items-end">
        <div>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-semibold tracking-tight text-fg tnum">{a.score}</span>
            <span className="mb-1.5 text-sm text-fg-3">/ 100</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={tone} dot>{band}</Badge>
            <span className="text-xs text-fg-3 tnum">{a.score - first >= 0 ? '+' : ''}{a.score - first} in {a.window.days} days</span>
          </div>
        </div>
        <TimeChart data={data} series={[{ key: 'score', label: 'Score', color: 'var(--color-series-1)' }]} area height={150} yMax={100}
          caption="Posture score per day" stale={stale} />
      </div>
    </Card>
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

function RecentScans({ orgId }) {
  const { data, reload } = useApi(`/api/v1/orgs/${orgId}/scans?limit=6`)
  useRefresh(['scan.updated', 'scan.created'], reload)
  return (
    <Card title="Recent scans" actions={<CardLink to="/dashboard/scans" />} flush>
      {!data ? <div className="h-40" /> : data.scans.length === 0
        ? <EmptyState compact icon={ScanLine} title="No scans yet">Run a scan from a project to see results here.</EmptyState>
        : <div className="divide-y divide-line border-t border-line">{data.scans.map((s) => <ScanRow key={s.id} scan={s} showProject />)}</div>}
    </Card>
  )
}

function Analytics({ orgId, days, auth }) {
  const { data: a, error, stale, reload } = useApi(`/api/v1/orgs/${orgId}/analytics?days=${days}`)
  useRefresh(['scan.updated', 'finding.updated'], reload)
  if (error && !a) return <ErrorState onRetry={reload}>{error}</ErrorState>
  if (!a) return <PageSkeleton />

  const openTotal = a.open.critical + a.open.high + a.open.medium + a.open.low
  const sparkResolved = a.daily.map((d) => d.resolved)
  const sparkScans = a.daily.map((d) => d.scans_completed + d.scans_failed)
  const sparkOpen = a.daily.map((d) => d.open.critical + d.open.high + d.open.medium + d.open.low)
  const period = `previous ${days} days`
  const hasProject = a.projects.length > 0
  const sevDaily = a.daily.map((d) => ({ label: day(d.date), ...d.open }))
  const flowDaily = a.daily.map((d) => ({ label: day(d.date), opened: d.opened, resolved: d.resolved }))
  const fixCrit = a.mttr_hours.critical ?? a.mttr_hours.high

  return (
    <div className="grid gap-4">
      {(!hasProject || a.current.scans + a.previous.scans === 0) && (
        <Onboarding hasProject={hasProject} hasScan={a.current.scans + a.previous.scans > 0} canProjects={auth.can('projects:write')}
          canSettings={auth.can('settings:write')} canAlerts={auth.can('settings:write')} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Posture a={a} stale={stale} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          <StatCard label="Open findings" icon={ShieldAlert} value={num(openTotal)} trend={sparkOpen} to="/dashboard/findings?status=new"
            sub={`${num(a.open.critical)} critical, ${num(a.open.high)} high`} />
          <StatCard label="Fixed" icon={ShieldCheck} value={num(a.current.resolved)} trend={sparkResolved}
            delta={<Delta value={change(a.current.resolved, a.previous.resolved)} period={period} />} sub={`${num(a.current.opened)} new in ${days} days`} />
          <StatCard label="Scans" icon={ScanLine} value={num(a.current.scans)} trend={sparkScans} to="/dashboard/scans"
            delta={<Delta value={change(a.current.scans, a.previous.scans)} period={period} />}
            sub={a.success_rate == null ? 'None finished yet' : `${pct(a.success_rate)} succeeded`} />
          <StatCard label="Time to fix" icon={Clock} value={hours(fixCrit)}
            sub={a.mttr_hours.critical != null ? 'Average for critical findings' : a.mttr_hours.high != null ? 'Average for high findings' : 'Resolve a critical or high finding to measure'} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="Open findings by severity" description="Open at the end of each day (UTC)">
          <TimeChart kind="stacked" data={sevDaily} series={SEV_SERIES} height={240} caption="Open findings by severity per day" stale={stale} />
        </Card>
        <Card className="xl:col-span-2" title="Found and fixed" description="Findings first seen and closed per day">
          <TimeChart data={flowDaily} series={[{ key: 'opened', label: 'Found', color: 'var(--color-series-1)' }, { key: 'resolved', label: 'Fixed', color: 'var(--color-series-2)' }]}
            height={240} caption="Findings found and fixed per day" stale={stale} />
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="Riskiest projects" description="Ranked by open findings, weighted by severity" actions={<CardLink to="/dashboard/projects" />} flush>
          <DataTable rows={a.projects} stale={stale} rowHref={(p) => `/dashboard/projects/${p.id}`}
            empty={<EmptyState compact icon={FolderGit2} title="No projects yet">Add a project to start tracking its risk.</EmptyState>}
            columns={[
              { key: 'name', header: 'Project', cell: (p) => <Link to={`/dashboard/projects/${p.id}`} className="font-medium text-fg hover:underline">{p.name}</Link> },
              { key: 'open', header: 'Open', cell: (p) => <div className="w-40"><SeverityBar counts={p.open} legend={false} height={6} /></div>, hide: 'sm' },
              { key: 'count', header: 'Findings', align: 'right', cell: (p) => num(p.open.critical + p.open.high + p.open.medium + p.open.low) },
              { key: 'score', header: 'Score', align: 'right', cell: (p) => <span className={p.score < 50 ? 'text-bad' : 'text-fg'}>{p.score}</span> },
              { key: 'last', header: 'Last scan', align: 'right', hide: 'md', cell: (p) => <span className="text-fg-3">{ago(p.last_scan_at)}</span> },
            ]} />
        </Card>
        <Card className="xl:col-span-2" title="Most common open issues" actions={<CardLink to="/dashboard/findings" />}>
          {a.top_issues.length === 0 ? <EmptyState compact icon={ShieldCheck} title="No open issues">Nothing above informational is open.</EmptyState> : (
            <ul className="divide-y divide-line">
              {a.top_issues.map((i) => (
                <li key={`${i.title}-${i.severity}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <SeverityBadge value={i.severity} className="w-20 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg" title={i.title}>{i.title}</span>
                  <span className="shrink-0 text-xs text-fg-3 tnum">{i.count} in {i.projects} {i.projects === 1 ? 'project' : 'projects'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3"><RecentScans orgId={orgId} /></div>
        <Card className="xl:col-span-2" title="Findings by status" description="Every finding ever recorded in this organization">
          <ul className="grid gap-3">
            {[['new', 'New', 'danger'], ['acknowledged', 'Acknowledged', 'warning'], ['resolved', 'Resolved', 'good'], ['false_positive', 'False positive', 'neutral']].map(([k, label, tone]) => {
              const total = Object.values(a.triage).reduce((x, y) => x + y, 0) || 1
              const v = a.triage[k] || 0
              return (
                <li key={k} className="grid gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <Badge tone={tone} dot>{label}</Badge>
                    <span className="text-fg-2 tnum">{num(v)} <span className="text-fg-3">· {pct(v / total)}</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-3"><div className="h-full rounded-full bg-fg-3" style={{ width: `${(v / total) * 100}%` }} /></div>
                </li>
              )
            })}
          </ul>
          {auth.can('billing:read') && a.current.credits_mc > 0 && (
            <p className="mt-5 border-t border-line pt-4 text-xs text-fg-3">{formatCredits(a.current.credits_mc)} credits spent in the last {days} days.</p>
          )}
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
