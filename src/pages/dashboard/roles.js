import { ROLE_LABELS } from '../../data/dashboardNav.js'

const RANK = { viewer: 1, member: 2, org_admin: 3 }

// roleOptions lists the roles a caller may grant: never more than their own
// (the API enforces the same rule).
export function roleOptions(callerRole) {
  return Object.keys(RANK)
    .filter((r) => RANK[r] <= (RANK[callerRole] || 0))
    .map((r) => ({ value: r, label: ROLE_LABELS[r] }))
}

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'never'

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
