import { useAuth } from '../../lib/auth.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'

// The platform admin dashboard (orchestrator roadmap milestone 5). Only Hawk-i
// staff reach it; user, organization and system management screens are added
// here as their APIs ship.
export default function AdminConsole() {
  const { user } = useAuth()
  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader title="Admin console" description="Platform administration for Hawk-i staff." />
      <Panel title="Your access">
        <p className="text-sm text-grey">
          Signed in as <span className="text-white">{user.email}</span> with the platform admin role. You can open any
          organization with admin rights, and every action is recorded in that organization&apos;s audit log.
        </p>
      </Panel>
      <Panel title="Coming next">
        <ul className="grid gap-1.5 text-sm text-grey list-disc pl-5">
          <li>Users and organizations: search, suspend, change plans, adjust credits</li>
          <li>System health for every engine and data store</li>
          <li>Platform metrics: signups, scans, revenue</li>
        </ul>
      </Panel>
    </div>
  )
}
