import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { download } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ago, dateTime, pct } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card, { DefinitionList } from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Button from '../../components/common/Button.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import { ChainName, short } from '../../components/intel/IntelKit.jsx'
import { BandBadge, ClusterLink, HuntAddress, HuntError, HuntLocked, RULES, RuleTags, STATUS_TONE, useHunt, useHuntAccess } from '../../components/hunt/HuntKit.jsx'

const EVENT = { formed: 'Formed', updated: 'Changed', status: 'Status', retracted: 'Retracted by a reorg', restored: 'Restored', evidence: 'Evidence package written', merged: 'Joined a family', split: 'Left its family' }

// txOf picks the transaction hashes out of a rule's evidence.
function txOf(evidence) {
  const out = []
  const walk = (v, k) => {
    if (Array.isArray(v)) v.forEach((x) => walk(x, k))
    else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => walk(x, kk))
    else if (typeof v === 'string' && (k === 'tx' || k?.endsWith('_tx')) && v.length === 66) out.push(v)
  }
  walk(evidence, '')
  return [...new Set(out)]
}

export default function HuntCluster() {
  const { code } = useParams()
  const { currentOrg } = useAuth()
  const { pro } = useHuntAccess()
  const r = useHunt(`/clusters/${code}`)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(null)

  if (r.error) return <div><PageHeader title={code} back={{ to: '/dashboard/hunt', label: 'Hunt' }} /><Card><HuntError status={r.status} error={r.error} onRetry={r.reload} what="Funding clusters" /></Card></div>
  if (!r.data) return <PageSkeleton cards={3} />
  // The detail's contracts and members are the lists (the counts are on
  // the cluster list).
  const c = r.data

  async function evidence() {
    setError(null)
    try {
      await download(`/api/v1/orgs/${currentOrg.id}/hunt/clusters/${c.id}/evidence`, `${c.id}-v${c.evidence_version}.json`)
    } catch (err) {
      setError(err.status === 404 ? 'The evidence package is written within minutes of a change; try again shortly.' : errorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader back={{ to: '/dashboard/hunt', label: 'Hunt' }} title={`Funding cluster ${c.id}`}
        description={`${c.contracts.length} contracts on ${c.chain} from one ${c.key_kind === 'funder' ? 'funder\'s deployers' : 'deploying account whose funder Intel does not know'}.`}
        meta={<span className="flex flex-wrap items-center gap-2"><BandBadge band={c.band} points={c.points} /><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>{c.custom_points != null && <Badge tone="staff">your points {c.custom_points}</Badge>}</span>}
        actions={<Button size="sm" variant="ghost" onClick={evidence} disabled={!c.evidence_key}><Download size={14} aria-hidden /> Evidence package</Button>} />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 gap-4 lg:col-span-2">
          <Card flush title="Contracts" description="Every deployment in the cluster with the rules that fired on it. Open a row for the transactions each rule rests on.">
            <DataTable rows={c.contracts} rowKey={(x) => `${x.chain}:${x.contract}`}
              empty={<EmptyState compact title="No contracts" />}
              columns={[
                { key: 'c', header: 'Contract', cell: (x) => <HuntAddress chain={x.chain} address={x.contract} /> },
                { key: 'd', header: 'Deployer', hide: 'md', cell: (x) => <HuntAddress chain={x.chain} address={x.deployer} /> },
                { key: 'r', header: 'Rules', cell: (x) => (
                  <button type="button" className="text-left" onClick={() => setOpen(open === x.contract ? null : x.contract)} aria-expanded={open === x.contract}>
                    <RuleTags rules={x.rules_fired.map((h) => h.rule)} />
                    {open === x.contract && x.rules_fired.length > 0 && (
                      <ul className="mt-2 grid gap-1 text-xs">
                        {x.rules_fired.map((h) => (
                          <li key={h.rule}><span className="text-fg-2">{h.rule} {RULES[h.rule]} ({h.points}): </span>
                            <span className="font-mono text-fg-3">{txOf(h.evidence).map(short).join(', ') || 'see the evidence package'}</span></li>
                        ))}
                      </ul>
                    )}
                  </button>
                ) },
                { key: 'w', header: 'Deployed', align: 'right', hide: 'sm', cell: (x) => <span className="whitespace-nowrap text-fg-3" title={dateTime(x.deployed_at)}>{ago(x.deployed_at)}</span> },
              ]} />
          </Card>
          <Card title="Timeline">
            <ol className="grid gap-2 text-sm">
              {c.history.map((e, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-2">
                  <span className="w-32 shrink-0 text-xs text-fg-3" title={dateTime(e.at)}>{ago(e.at)}</span>
                  <span className="text-fg">{EVENT[e.kind] || e.kind}</span>
                  <span className="text-xs text-fg-3">version {e.version}{e.detail?.status ? `, ${e.detail.status}` : ''}{e.detail?.parent ? `, under ${e.detail.parent}` : ''}{e.detail?.contracts != null ? `, ${e.detail.contracts} contracts` : ''}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="grid min-w-0 gap-4">
          <Card title="Scoring">
            <DefinitionList columns={1} items={[
              ['Rules fired', <RuleTags key="r" rules={c.rules} />],
              ['Confidence', pct(c.confidence)],
              ['Most in one window', `${c.peak} deployments`],
              ['First deployment', dateTime(c.first_at)],
              ['Last active', dateTime(c.last_activity_at)],
            ]} />
          </Card>
          <Card title="Accounts">
            <ul className="grid gap-1.5 text-sm">
              {c.members.map((m) => <li key={`${m.role}:${m.address}`} className="flex items-center gap-2"><Badge tone={m.role === 'funder' ? 'danger' : 'neutral'}>{m.role}</Badge><HuntAddress chain={c.chain} address={m.address} /></li>)}
            </ul>
          </Card>
          <Card title="Family across chains" description="Clusters of one actor on several chains: the same funder, or tied by a bridge transfer between their accounts.">
            {!pro ? <HuntLocked need="pro" what="Families across chains" compact /> : !c.family?.length ? <p className="text-sm text-fg-3">This cluster stands alone.</p> : (
              <div className="grid gap-2 text-sm">
                <div className="flex flex-wrap gap-2">{c.family.map((f) => <ClusterLink key={f} code={f} />)}</div>
                <ul className="grid gap-1 text-xs text-fg-3">
                  {(c.ties || []).map((t) => <li key={`${t.a}:${t.b}:${t.reason}`}>{t.a} and {t.b}: {t.reason === 'bridge' ? `bridge transfer ${short(t.evidence.source_tx)} to ${short(t.evidence.dest_tx)}` : `same ${t.evidence.chains?.join(' and ') || ''} key`}</li>)}
                </ul>
              </div>
            )}
          </Card>
          <Card title="Key"><span className="flex flex-wrap items-center gap-2"><HuntAddress chain={c.chain} address={c.key} /><ChainName chain={c.chain} /></span></Card>
        </div>
      </div>
    </div>
  )
}
