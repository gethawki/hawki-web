import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api.js'
import { errorMessage } from '../components/common/Alert.jsx'

// useApi loads a GET endpoint. While a new path loads, the previous data
// stays on screen (stale is true) so charts and tables do not flash.
// A null path loads nothing.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) })
  const seq = useRef(0)
  const load = useCallback(async () => {
    if (!path) return
    const n = ++seq.current
    setState((s) => ({ ...s, loading: true }))
    try {
      const data = await api(path)
      if (n === seq.current) setState({ data, error: null, loading: false })
    } catch (err) {
      if (n === seq.current) setState((s) => ({ ...s, error: errorMessage(err), loading: false }))
    }
  }, [path])
  useEffect(() => {
    load()
  }, [load])
  return { ...state, stale: state.loading && state.data != null, reload: load }
}
