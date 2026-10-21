import { Link } from 'react-router-dom'
import { ago, dateTime } from '../../lib/format.js'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../ui/Feedback.jsx'
import Button from '../common/Button.jsx'
import { ScoreSection, SeverityTag } from '../admin/intelBits.jsx'
import { ControllerTag } from '../admin/IntelWallets.jsx'
import { SimilarContracts, Vulnerability } from '../../pages/dashboard/IntelAddress.jsx'
import { IntelError, Locked, addressPath, useIntel, useIntelAccess } from './IntelKit.jsx'

// ProjectIntel is what Intel knows about a project's deployed contract:
// its risk score, control, risk events, past incidents and clones.
export default function ProjectIntel({ chain, address }) {
  const addr = address.toLowerCase()
  const { access, full, basic, error, status, reload } = useIntelAccess()
  const base = `/addresses/${chain}/${addr}`
  const profile = useIntel(full ? base : null)
  const vuln = useIntel(basic ? `${base}/vulnerability` : null)
  const similar = useIntel(basic ? `/contracts/${chain}/${addr}/similar` : null)

  if (error) return <IntelError status={status} error={error} onRetry={reload} />
  if (!access || (full && profile.loading && !profile.data)) return <PageSkeleton cards={2} />
  if (!basic) return <Card><Locked need="basic" what="Intel on your contracts" /></Card>

  const p = profile.data
  const ctl = p?.control
  const unseen = full && profile.status === 404
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <div className="grid min-w-0 gap-4 lg:col-span-2">
        {unseen && <Card><EmptyState title="Intel has not seen this contract yet">{access.chains?.includes(chain) ? `It appears once it is created or used on ${chain}.` : `Intel does not follow ${chain} yet.`}</EmptyState></Card>}
        {full && profile.error && !unseen && <IntelError status={profile.status} error={profile.error} onRetry={profile.reload} />}
        {p && (
          <Card flush title="Risk events" description="Upgrades, control changes and other findings on this contract. Full Intel plans also get them as alerts."
            actions={<Button size="sm" variant="ghost" to={addressPath(chain, addr)}>Full profile</Button>}>
            <DataTable rows={p.risk_events} dense rowKey={(e) => e.id} empty={<EmptyState compact title="No risk event on this contract" />} columns={[
              { key: 's', header: 'Severity', className: 'w-28', cell: (e) => <SeverityTag severity={e.severity} /> },
              { key: 't', header: 'Event', cell: (e) => <span className="text-fg">{e.title}</span> },
              { key: 'w', header: 'When', align: 'right', cell: (e) => <span className="whitespace-nowrap text-fg-3" title={dateTime(e.created_at)}>{ago(e.created_at)}</span> },
            ]} />
          </Card>
        )}
        {ctl && (
          <Card title="Who controls it">
            <div className="grid gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2"><span className="w-28 text-xs text-fg-3">Owner</span>{ctl.renounced ? <Badge tone="good">Renounced</Badge> : <ControllerTag address={ctl.owner} info={ctl.controllers?.[ctl.owner]} />}</div>
              {ctl.proxy_admin && <div className="flex flex-wrap items-center gap-2"><span className="w-28 text-xs text-fg-3">Proxy admin</span><ControllerTag address={ctl.proxy_admin} info={ctl.controllers?.[ctl.proxy_admin]} /></div>}
              <div className="flex flex-wrap items-center gap-2"><span className="w-28 text-xs text-fg-3">Upgrades seen</span><span className="text-fg tnum">{ctl.upgrades}</span></div>
            </div>
          </Card>
        )}
        {similar.data && <SimilarContracts chain={chain} rows={similar.data.similar.slice(0, 10)} total={similar.data.contract.clone_group - 1} />}
        {!full && <Card><Locked need="full" what="Risk events, control and the risk score" compact /></Card>}
      </div>
      <div className="grid min-w-0 gap-4">
        {p?.score && <div className="rounded-lg bg-surface"><ScoreSection score={p.score} /></div>}
        {vuln.data ? <Vulnerability v={vuln.data} /> : vuln.error && <IntelError status={vuln.status} error={vuln.error} onRetry={vuln.reload} />}
        {p?.protocols?.length > 0 && (
          <Card title="Protocol">
            <div className="flex flex-wrap gap-1.5">{p.protocols.map((pc) => <Link key={pc.protocol} to={`/dashboard/intel/protocols/${pc.protocol}`}><Badge tone="accent">{pc.protocol_name} · {pc.role}</Badge></Link>)}</div>
          </Card>
        )}
      </div>
    </div>
  )
}
