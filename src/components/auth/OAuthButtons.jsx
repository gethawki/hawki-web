import { useEffect, useState } from 'react'
import { api, oauthStartURL } from '../../lib/api.js'

const LABELS = { google: 'Google', github: 'GitHub' }

// OAuthButtons lists the sign-in providers the API has configured.
export default function OAuthButtons({ next }) {
  const [providers, setProviders] = useState([])
  useEffect(() => {
    api('/api/v1/auth/providers', { auth: false })
      .then((d) => setProviders(d.providers || []))
      .catch(() => setProviders([]))
  }, [])
  if (providers.length === 0) return null
  return (
    <>
      <div className="grid gap-2.5">
        {providers.map((p) => (
          <a
            key={p}
            href={oauthStartURL(p, next)}
            className="inline-flex items-center justify-center rounded-lg border border-panel-border px-4 py-2.5 text-sm text-[#e0e0e0] hover:border-steel hover:text-white transition"
          >
            Continue with {LABELS[p] || p}
          </a>
        ))}
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-grey">
        <span className="h-px flex-1 bg-panel-border" />
        or with email
        <span className="h-px flex-1 bg-panel-border" />
      </div>
    </>
  )
}
