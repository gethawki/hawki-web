import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { ScanRow, isActive } from '../../components/dashboard/ScanBits.jsx'

export default function Scans() {
  const { currentOrg } = useAuth()
  const [scans, setScans] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setScans((await api(`/api/v1/orgs/${currentOrg.id}/scans?limit=100`)).scans)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [currentOrg.id])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    if (!scans?.some(isActive)) return
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [scans, load])

  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader title="Scans" description="Every cloud scan in this organization, newest first." />
      {error && <Alert>{error}</Alert>}
      <Panel>
        {!scans ? <Spinner /> : scans.length === 0 ? (
          <p className="text-sm text-grey">No scans yet. Start one from a project.</p>
        ) : (
          <div className="divide-y divide-panel-border">{scans.map((s) => <ScanRow key={s.id} scan={s} showProject />)}</div>
        )}
      </Panel>
    </div>
  )
}
