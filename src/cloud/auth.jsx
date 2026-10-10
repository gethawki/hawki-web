import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, refresh, setAccessToken } from './api.js'

const AuthContext = createContext(null)

const ORG_KEY = 'hawki.cloud.org'

function readStoredOrg() {
  try {
    return localStorage.getItem(ORG_KEY)
  } catch {
    return null
  }
}

function storeOrg(id) {
  try {
    if (id) localStorage.setItem(ORG_KEY, id)
    else localStorage.removeItem(ORG_KEY)
  } catch {
    // storage can be unavailable (private mode); the choice just will not persist
  }
}

// AuthProvider restores the session from the refresh cookie on load and keeps
// the signed-in user, their organizations and the selected organization.
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, orgs: [] })
  const [orgId, setOrgId] = useState(readStoredOrg)

  const loadMe = useCallback(async () => {
    const me = await api('/api/v1/me')
    setState({ status: 'authed', user: me.user, orgs: me.organizations })
    return me
  }, [])

  useEffect(() => {
    let cancelled = false
    refresh()
      .then(() => loadMe())
      .catch(() => {
        if (!cancelled) setState({ status: 'anon', user: null, orgs: [] })
      })
    return () => {
      cancelled = true
    }
  }, [loadMe])

  const signIn = useCallback(
    async (path, body) => {
      const data = await api(path, { method: 'POST', body, auth: false })
      setAccessToken(data.access_token)
      if (data.organization) {
        setOrgId(data.organization.id)
        storeOrg(data.organization.id)
      }
      return loadMe()
    },
    [loadMe],
  )

  const login = useCallback((email, password) => signIn('/api/v1/auth/login', { email, password }), [signIn])
  const signup = useCallback((name, email, password) => signIn('/api/v1/auth/signup', { name, email, password }), [signIn])

  const logout = useCallback(async () => {
    try {
      await api('/api/v1/auth/logout', { method: 'POST' })
    } catch {
      // the local session is cleared either way
    }
    setAccessToken(null)
    setState({ status: 'anon', user: null, orgs: [] })
  }, [])

  const selectOrg = useCallback((id) => {
    setOrgId(id)
    storeOrg(id)
  }, [])

  const currentOrg = useMemo(
    () => state.orgs.find((o) => o.id === orgId) || state.orgs[0] || null,
    [state.orgs, orgId],
  )

  const value = useMemo(
    () => ({ ...state, currentOrg, login, signup, logout, reload: loadMe, selectOrg }),
    [state, currentOrg, login, signup, logout, loadMe, selectOrg],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
