export const MIN_PASSWORD = 10

// withNext carries the post-sign-in destination between /login and /signup.
export const withNext = (path, next) =>
  next && next !== '/dashboard' ? `${path}?next=${encodeURIComponent(next)}` : path

export const linkClass = 'text-steel hover:text-steel-light'
