// Client for the Hawk-i Cloud API (solution/hawki-cloud), used by the sign-in
// pages and the dashboards.
//
// The access token lives only in memory. The refresh token is an httpOnly
// cookie the browser sends to /api/v1/auth; scripts never see it. When a call
// gets a 401 the client refreshes once and retries, and concurrent callers
// share that one refresh. Across tabs, refreshes are serialized with the Web
// Locks API so two tabs do not race to rotate the same cookie.

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')

let accessToken = null
let inflightRefresh = null

export class ApiError extends Error {
  constructor(status, code, message, field) {
    super(message)
    this.status = status
    this.code = code
    this.field = field
  }
}

export function setAccessToken(token) {
  accessToken = token
}

async function send(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`

  const init = { method, headers, credentials: 'include' }
  if (body !== undefined) init.body = JSON.stringify(body)

  let res
  try {
    res = await fetch(API_URL + path, init)
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach Hawk-i Cloud. Check your connection and try again.')
  }

  if (res.status === 204 || res.status === 202) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = data?.error || {}
    throw new ApiError(res.status, err.code || 'unknown', err.message || `Request failed (${res.status})`, err.field)
  }
  return data
}

function withTabLock(fn) {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('hawki-auth-refresh', fn)
  }
  return fn()
}

// refresh exchanges the cookie for a new access token. Resolves with the
// auth payload ({ user, access_token, ... }) or rejects with ApiError.
export function refresh() {
  if (!inflightRefresh) {
    inflightRefresh = withTabLock(async () => {
      const data = await send('/api/v1/auth/refresh', { method: 'POST', auth: false })
      setAccessToken(data.access_token)
      return data
    }).finally(() => {
      inflightRefresh = null
    })
  }
  return inflightRefresh
}

// api calls the API with the current access token, refreshing once on 401.
export async function api(path, opts = {}) {
  try {
    return await send(path, opts)
  } catch (err) {
    if (err.status === 401 && opts.auth !== false && accessToken) {
      await refresh()
      return send(path, opts)
    }
    throw err
  }
}

// download fetches an authenticated file (evidence) and saves it in the
// browser. Files are behind authorization, so a plain link cannot be used.
export async function download(path, filename) {
  const get = () => fetch(API_URL + path, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, credentials: 'include' })
  let res = await get()
  if (res.status === 401 && accessToken) {
    await refresh()
    res = await get()
  }
  if (!res.ok) throw new ApiError(res.status, 'download_failed', 'The file could not be downloaded.')
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const oauthStartURL = (provider, next) =>
  `${API_URL}/api/v1/auth/oauth/${encodeURIComponent(provider)}/start?redirect=${encodeURIComponent(next || '/dashboard')}`

// Messages for the ?error= codes the OAuth callback sends back.
export const OAUTH_ERRORS = {
  oauth_state: 'That sign-in link expired or was opened in another browser. Please try again.',
  oauth_expired: 'The sign-in took too long. Please try again.',
  oauth_denied: 'Sign-in was cancelled.',
  oauth_failed: 'We could not sign you in with that provider. Please try again.',
  email_unverified: 'Your provider has not verified that email address, so we cannot link it. Verify it there, or sign in with your password.',
  account_suspended: 'This account is suspended. Contact support if you think this is a mistake.',
}
