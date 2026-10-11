// Live updates for the dashboards. One server-sent event stream per selected
// organization (GET /orgs/{org}/events) tells pages what changed; pages then
// reload through the normal API. Pages fall back to polling while the stream
// is down, so a blocked connection only makes updates slower.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { openStream } from './api.js'

const LiveContext = createContext({ connected: false, subscribe: () => () => {} })

export function LiveProvider({ orgId, children }) {
  const listeners = useRef(new Set())
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!orgId) return
    const ctl = new AbortController()
    let retry = 1000
    let timer = null

    async function connect() {
      try {
        const res = await openStream(`/api/v1/orgs/${orgId}/events`, ctl.signal)
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
        let buf = ''
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buf += value
          let end
          while ((end = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, end)
            buf = buf.slice(end + 2)
            let event = 'message'
            let data = ''
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) event = line.slice(6).trim()
              else if (line.startsWith('data:')) data += line.slice(5).trim()
            }
            if (event === 'ready') {
              setConnected(true)
              retry = 1000
            } else if (event === 'message' && data) {
              try {
                const msg = JSON.parse(data)
                listeners.current.forEach((fn) => fn(msg))
              } catch {
                // ignore a malformed notice
              }
            }
          }
        }
      } catch {
        // network error, expired session or aborted: retry below
      }
      setConnected(false)
      if (ctl.signal.aborted) return
      timer = setTimeout(connect, retry)
      retry = Math.min(retry * 2, 30000)
    }
    connect()
    return () => {
      ctl.abort()
      clearTimeout(timer)
      setConnected(false)
    }
  }, [orgId])

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn)
    return () => listeners.current.delete(fn)
  }, [])
  const value = useMemo(() => ({ connected, subscribe }), [connected, subscribe])
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>
}

export const useLive = () => useContext(LiveContext)

// useLiveEvent calls handler for notices whose type is in types. The handler
// may change between renders without resubscribing.
export function useLiveEvent(types, handler) {
  const { subscribe } = useLive()
  const ref = useRef(handler)
  ref.current = handler
  const key = types.join(',')
  useEffect(() => subscribe((msg) => key.split(',').includes(msg.type) && ref.current(msg)), [subscribe, key])
}

// useRefresh reloads when one of types arrives (and filter, if given,
// accepts it) and, while the stream is down, every pollMs as long as poll is
// true.
export function useRefresh(types, reload, { poll = false, pollMs = 3000, filter } = {}) {
  const { connected } = useLive()
  useLiveEvent(types, (msg) => (!filter || filter(msg)) && reload())
  useEffect(() => {
    if (connected || !poll) return
    const t = setInterval(reload, pollMs)
    return () => clearInterval(t)
  }, [connected, poll, pollMs, reload])
}
