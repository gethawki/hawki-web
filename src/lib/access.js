// hasAccess checks a dashboardNav access rule against the signed-in user
// (the value returned by useAuth()).
export function hasAccess(auth, access) {
  if (auth.status !== 'authed') return false
  if (!access) return true
  if (access.platformAdmin) return auth.isPlatformAdmin
  if (access.permission) return auth.can(access.permission)
  return false
}
