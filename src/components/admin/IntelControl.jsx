import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { ago, dateTime, num } from '../../lib/format.js'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import { Profile, CONTROLLER } from './IntelWallets.jsx'

const short = (a) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : '-')
const ZERO = '0x0000000000000000000000000000000000000000'

export const CONTROL_KIND = {
  upgraded: ['warning', 'Upgraded'], beacon_upgraded: ['warning', 'Beacon upgraded'], diamond_cut: ['warning', 'Diamond cut'],
  admin_changed: ['warning', 'Admin changed'], ownership_transferred: ['accent', 'Owner changed'], ownership_transfer_started: ['accent', 'Owner handover started'],
  role_granted: ['accent', 'Role granted'], role_revoked: ['neutral', 'Role revoked'], role_admin_changed: ['accent', 'Role admin changed'],
  timelock_scheduled: ['neutral', 'Timelock queued'], timelock_executed: ['good', 'Timelock executed'], timelock_cancelled: ['neutral', 'Timelock cancelled'],
  timelock_delay_changed: ['warning', 'Timelock delay changed'],
}

// What changed, in words.
export function change(e) {
  const to = (a) => (a === ZERO ? 'nobody' : short(a))
  const kind = e.new_kind ? ` (${CONTROLLER[e.new_kind] || e.new_kind})` : ''
  switch (e.kind) {
    case 'upgraded': return `implementation ${short(e.new)}`
    case 'beacon_upgraded': return `beacon ${short(e.new)}`
    case 'admin_changed': return `admin ${e.old ? `${short(e.old)} → ` : ''}${short(e.new)}${kind}`
    case 'ownership_transferred': return e.new === ZERO ? `${short(e.old)} renounced ownership` : `${short(e.old)} → ${to(e.new)}${kind}`
    case 'ownership_transfer_started': return `${short(e.old)} → ${short(e.new)} pending acceptance`
    case 'role_granted': return `${e.role_name || short(e.role)} to ${short(e.account)}${kind}`
    case 'role_revoked': return `${e.role_name || short(e.role)} from ${short(e.account)}`
    case 'role_admin_changed': return `${e.role_name || short(e.role)} now administered by ${short(e.new)}`
    case 'timelock_scheduled': case 'timelock_executed': case 'timelock_cancelled': return `operation ${short(e.op_id)}${e.account ? ` on ${short(e.account)}` : ''}`
    case 'timelock_delay_changed': return 'minimum delay changed'
    case 'diamond_cut': return 'facets changed'
    default: return ''
  }
}

// IntelControl is the feed of control changes on followed chains:
// upgrades, admin and owner changes, roles and timelock operations.
export default function IntelControl({ stats, changes }) {
  const [open, setOpen] = useState(null)
  return (
    <Card title={<span className="flex items-center gap-2"><ShieldAlert className="size-4 text-fg-3" aria-hidden />Upgrades and admin changes</span>}
      description="Who controls contracts and how that changes. Owners, admins and role members are classified as EOA, multisig, timelock or contract. Ownership set at deployment is left out of the feed." flush>
      <DataTable rows={stats} rowKey={(s) => s.chain} dense empty={<EmptyState compact title="No control changes yet" />} columns={[
        { key: 'chain', header: 'Chain', cell: (s) => <span className="capitalize text-fg">{s.chain}</span> },
        { key: 'u', header: 'Upgrades 24h', align: 'right', cell: (s) => <span className="tnum">{num(s.upgrades_24h)}</span> },
        { key: 'o', header: 'Owner changes', align: 'right', cell: (s) => <span className="tnum" title={`${num(s.renounced_24h)} renounced`}>{num(s.owner_changes_24h)}</span> },
        { key: 'r', header: 'Role changes', align: 'right', hide: 'sm', cell: (s) => <span className="tnum">{num(s.role_changes_24h)}</span> },
        { key: 't', header: 'Timelock ops', align: 'right', hide: 'md', cell: (s) => <span className="tnum">{num(s.timelock_ops_24h)}</span> },
        { key: 'c', header: 'Controllers', align: 'right', hide: 'md', cell: (s) => <span className="tnum" title={`${num(s.multisigs)} multisigs, ${num(s.timelocks)} timelocks, ${num(s.controllers_queue)} waiting to be classified`}>{num(s.controllers)}</span> },
      ]} />
      <div className="border-t border-line px-5 pb-1 pt-4 text-xs text-fg-3">Latest changes</div>
      <DataTable rows={changes} rowKey={(e) => `${e.chain}:${e.tx_hash}:${e.kind}:${e.contract}:${e.account}:${e.new}`} dense empty={<EmptyState compact title="Nothing yet" />} columns={[
        { key: 'k', header: 'Change', cell: (e) => { const [tone, label] = CONTROL_KIND[e.kind] || ['neutral', e.kind]; return <Badge tone={tone}>{label}</Badge> } },
        { key: 'c', header: 'Contract', cell: (e) => (
          <button type="button" className="text-left hover:underline" onClick={() => setOpen({ chain: e.chain, address: e.contract })} aria-label={`Open contract ${e.contract} on ${e.chain}`}>
            <span className="font-mono text-xs text-fg">{short(e.contract)}</span>
            {e.labels[0] && <span className="ml-2 text-xs text-fg-2">{e.labels[0]}</span>}
          </button>
        ) },
        { key: 'd', header: 'Detail', hide: 'sm', cell: (e) => <span className="text-xs text-fg-2">{change(e)}</span> },
        { key: 'chain', header: 'Chain', hide: 'md', cell: (e) => <span className="capitalize text-fg-2">{e.chain}</span> },
        { key: 'w', header: 'When', align: 'right', cell: (e) => <span className="whitespace-nowrap text-fg-3" title={dateTime(e.at)}>{ago(e.at)}</span> },
      ]} />
      <Profile target={open} onClose={() => setOpen(null)} />
    </Card>
  )
}
