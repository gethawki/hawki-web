import Navbar from '../layout/Navbar.jsx'

// AuthLayout frames the sign-in style pages with the site navbar so they read
// as part of the site, not a separate product.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 pt-6 pb-20">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-panel-border bg-panel/80 p-7 sm:p-8">
            <h1 className="font-display text-2xl text-white">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-grey">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-sm text-grey">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
