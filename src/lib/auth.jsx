// Session state for the whole site. The marketing pages, the sign-in pages and
// the dashboards all read the same AuthProvider, so the navbar knows when you
// are signed in and the dashboard knows what you may see.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getImpersonation, onImpersonation, refresh, setAccessToken, setImpersonation } from './api.js'
import { isPrivatePath } from '../data/seo.js'

const AuthContext = createContext(null)

const ORG_KEY = 'hawki.org'
// Set after a successful sign-in so public pages only check the session for
// people who have one; anonymous visitors never call the API.
const HINT_KEY = 'hawki.signedIn'

function storage(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key)
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // storage can be unavailable (private mode); nothing persists then
  }
  return null
}

const ANON = { status: 'anon', user: null, orgs: [] }

export function AuthProvider({ children }) {
  // 'loading' renders like signed-out, which keeps prerendered HTML and the
  // first client render identical.
  const [session, setSession] = useState({ status: 'loading', user: null, orgs: [] })
  const [orgId, setOrgId] = useState(null)
  const [orgDetail, setOrgDetail] = useState(null)
  const [impersonating, setImpersonating] = useState(null)

  const loadMe = useCallback(async () => {
    const me = await api('/api/v1/me')
    setSession({ status: 'authed', user: me.user, orgs: me.organizations })
    storage(HINT_KEY, '1')
    return me
  }, [])

  // A view as a user that ends by itself (expiry, sign-out elsewhere)
  // brings the staff session back.
  useEffect(() => onImpersonation((imp) => {
    setImpersonating(imp)
    if (!imp) {
      setOrgId(storage(ORG_KEY))
      loadMe().catch(() => setSession(ANON))
    }
  }), [loadMe])

  useEffect(() => {
    setImpersonating(getImpersonation())
    setOrgId(getImpersonation()?.org_id || storage(ORG_KEY))
    if (!storage(HINT_KEY) && !isPrivatePath(window.location.pathname)) {
      setSession(ANON)
      return
    }
    let cancelled = false
    refresh()
      .then(loadMe)
      .catch(() => {
        storage(HINT_KEY, null)
        if (!cancelled) setSession(ANON)
      })
    return () => {
      cancelled = true
    }
  }, [loadMe])

  const currentOrg = useMemo(
    () => session.orgs.find((o) => o.id === orgId) || session.orgs[0] || null,
    [session.orgs, orgId],
  )

  // The org endpoint returns the caller's permissions there; the dashboard
  // navigation and route guards are driven by them.
  const reloadOrg = useCallback(async () => {
    if (!currentOrg) return setOrgDetail(null)
    const detail = await api(`/api/v1/orgs/${currentOrg.id}`)
    setOrgDetail(detail)
    return detail
  }, [currentOrg])

  useEffect(() => {
    if (session.status !== 'authed') return setOrgDetail(null)
    reloadOrg().catch(() => setOrgDetail(null))
  }, [session.status, reloadOrg])

  const signIn = useCallback(
    async (path, body) => {
      const data = await api(path, { method: 'POST', body, auth: false })
      // Two-factor accounts get a challenge instead of a session.
      if (data.mfa_required) return { mfaToken: data.mfa_token }
      setAccessToken(data.access_token)
      if (data.organization) {
        setOrgId(data.organization.id)
        storage(ORG_KEY, data.organization.id)
      }
      return loadMe()
    },
    [loadMe],
  )

  const value = useMemo(() => {
    const permissions = new Set(orgDetail?.id === currentOrg?.id ? orgDetail?.permissions || [] : [])
    const isPlatformAdmin = session.user?.role === 'admin'
    return {
      ...session,
      currentOrg: orgDetail && orgDetail.id === currentOrg?.id ? { ...currentOrg, ...orgDetail } : currentOrg,
      permissionsReady: !currentOrg || orgDetail?.id === currentOrg.id,
      isPlatformAdmin,
      // can answers whether the current user holds a permission in the
      // selected organization (see hawki-cloud identity/rbac.go).
      can: (perm) => permissions.has(perm),
      login: (email, password) => signIn('/api/v1/auth/login', { email, password }),
      signup: (name, email, password) => signIn('/api/v1/auth/signup', { name, email, password }),
      completeMFA: (mfaToken, code) => signIn('/api/v1/auth/mfa', { mfa_token: mfaToken, code }),
      logout: async () => {
        if (getImpersonation()) {
          // Signing out of a view as a user only ends the view.
          await api('/api/v1/admin/impersonation/stop', { method: 'POST' }).catch(() => {})
          setImpersonation(null)
          return
        }
        try {
          await api('/api/v1/auth/logout', { method: 'POST' })
        } catch {
          // the local session is cleared either way
        }
        setAccessToken(null)
        storage(HINT_KEY, null)
        setSession(ANON)
      },
      reload: loadMe,
      reloadOrg,
      impersonating,
      // startImpersonation opens a read-only view of the app as a user.
      startImpersonation: async (userId, reason) => {
        const imp = await api(`/api/v1/admin/users/${userId}/impersonate`, { method: 'POST', body: { reason } })
        const view = { token: imp.access_token, expires_at: imp.expires_at, user: { id: imp.user.id, email: imp.user.email, name: imp.user.name } }
        setImpersonation(view)
        const me = await loadMe()
        const org = me.organizations?.[0]?.id || null
        setImpersonation({ ...view, org_id: org })
        setOrgId(org)
        return me
      },
      stopImpersonation: async () => {
        const back = impersonating?.user?.id
        try {
          await api('/api/v1/admin/impersonation/stop', { method: 'POST' })
        } catch {
          // an expired view ends either way
        }
        setImpersonation(null)
        return back
      },
      selectOrg: (id) => {
        setOrgId(id)
        storage(ORG_KEY, id)
      },
    }
  }, [session, currentOrg, orgDetail, signIn, loadMe, reloadOrg, impersonating])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
