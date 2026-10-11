import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import Logo from '../components/common/Logo.jsx'
import Spinner from '../components/common/Spinner.jsx'
import ReportView from '../components/reports/ReportView.jsx'

// SharedReport shows a report opened through its public link, without
// sign-in. The page is served from the noindex app shell.
export default function SharedReport() {
  const { token } = useParams()
  const [doc, setDoc] = useState(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    api(`/api/v1/shared-reports/${encodeURIComponent(token)}`, { auth: false }).then(setDoc).catch(() => setMissing(true))
  }, [token])

  return (
    <div className="min-h-screen bg-ink text-[#e0e0e0]">
      <header className="no-print border-b border-panel-border px-4 sm:px-6 py-3 flex items-center gap-3">
        <Logo />
        <span className="ml-auto text-xs text-grey">Shared security report</span>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {missing ? (
          <div className="max-w-xl">
            <h1 className="font-display text-3xl text-white">This link does not work</h1>
            <p className="mt-3 text-sm text-grey">It may have expired or been revoked. Ask the person who shared it for a new one.</p>
          </div>
        ) : !doc ? <Spinner /> : (
          <>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-3xl text-white">{doc.title}</h1>
                <p className="mt-2 text-sm text-grey">Shared by {doc.organization}. Read only.</p>
              </div>
              <button type="button" onClick={() => window.print()}
                className="no-print rounded-lg border border-panel-border px-4 py-2.5 text-sm text-[#cfcfcf] hover:border-steel hover:text-white">
                Print or PDF
              </button>
            </div>
            <ReportView doc={doc} />
          </>
        )}
      </main>
    </div>
  )
}
