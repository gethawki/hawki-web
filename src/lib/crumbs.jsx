import { createContext, useContext, useEffect, useState } from 'react'

// Detail pages name themselves in the top bar breadcrumb (a project, a scan)
// through this context; list pages get their crumb from the nav data.
const CrumbContext = createContext({ detail: null, setDetail: () => {} })

export function CrumbProvider({ children }) {
  const [detail, setDetail] = useState(null)
  return <CrumbContext.Provider value={{ detail, setDetail }}>{children}</CrumbContext.Provider>
}

export const useCrumbs = () => useContext(CrumbContext)

export function useDetailCrumb(label) {
  const { setDetail } = useContext(CrumbContext)
  useEffect(() => {
    if (!label) return
    setDetail(label)
    return () => setDetail(null)
  }, [label, setDetail])
}
