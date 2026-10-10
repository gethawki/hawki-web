import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/layout/ScrollToTop.jsx'
import { Helmet } from './components/common/Helmet.jsx'
import Spinner from './components/common/Spinner.jsx'
import { AuthProvider } from './lib/auth.jsx'
import { GuestOnly, RequireAccess, RequireAuth } from './components/auth/RouteGuards.jsx'
import { accessFor } from './data/dashboardNav.js'

// Public site
const Home = lazy(() => import('./pages/Home.jsx'))
const Docs = lazy(() => import('./pages/Docs.jsx'))
const Changelog = lazy(() => import('./pages/Changelog.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

// Sign-in pages
const Login = lazy(() => import('./pages/auth/Login.jsx'))
const Signup = lazy(() => import('./pages/auth/Signup.jsx'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword.jsx'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail.jsx'))
const AcceptInvite = lazy(() => import('./pages/auth/AcceptInvite.jsx'))

// Dashboards (signed in). Which pages a user sees depends on their role:
// data/dashboardNav.js holds the access rule of each page.
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout.jsx'))
const Overview = lazy(() => import('./pages/dashboard/Overview.jsx'))
const Projects = lazy(() => import('./pages/dashboard/Projects.jsx'))
const ProjectDetail = lazy(() => import('./pages/dashboard/ProjectDetail.jsx'))
const Scans = lazy(() => import('./pages/dashboard/Scans.jsx'))
const ScanDetail = lazy(() => import('./pages/dashboard/ScanDetail.jsx'))
const Findings = lazy(() => import('./pages/dashboard/Findings.jsx'))
const FindingDetail = lazy(() => import('./pages/dashboard/FindingDetail.jsx'))
const Members = lazy(() => import('./pages/dashboard/Members.jsx'))
const ApiKeys = lazy(() => import('./pages/dashboard/ApiKeys.jsx'))
const AuditLog = lazy(() => import('./pages/dashboard/AuditLog.jsx'))
const OrgSettings = lazy(() => import('./pages/dashboard/OrgSettings.jsx'))
const Profile = lazy(() => import('./pages/dashboard/Profile.jsx'))
const DashboardNotFound = lazy(() => import('./pages/dashboard/DashboardNotFound.jsx'))
const AdminConsole = lazy(() => import('./pages/admin/AdminConsole.jsx'))

const guarded = (path, element) => <RequireAccess access={accessFor(path)}>{element}</RequireAccess>

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Helmet />
      <Suspense fallback={<Spinner fullPage />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/docs/:slug" element={<Docs />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/changelog/:slug" element={<Changelog />} />

          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/invite" element={<AcceptInvite />} />

          <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
            <Route path="/dashboard" element={<Overview />} />
            <Route path="/dashboard/projects" element={guarded('/dashboard/projects', <Projects />)} />
            <Route path="/dashboard/projects/:projectId" element={guarded('/dashboard/projects', <ProjectDetail />)} />
            <Route path="/dashboard/scans" element={guarded('/dashboard/scans', <Scans />)} />
            <Route path="/dashboard/scans/:scanId" element={guarded('/dashboard/scans', <ScanDetail />)} />
            <Route path="/dashboard/findings" element={guarded('/dashboard/findings', <Findings />)} />
            <Route path="/dashboard/findings/:findingId" element={guarded('/dashboard/findings', <FindingDetail />)} />
            <Route path="/dashboard/members" element={guarded('/dashboard/members', <Members />)} />
            <Route path="/dashboard/api-keys" element={guarded('/dashboard/api-keys', <ApiKeys />)} />
            <Route path="/dashboard/audit-log" element={guarded('/dashboard/audit-log', <AuditLog />)} />
            <Route path="/dashboard/settings" element={guarded('/dashboard/settings', <OrgSettings />)} />
            <Route path="/dashboard/profile" element={<Profile />} />
            <Route path="/dashboard/*" element={<DashboardNotFound />} />
            <Route path="/admin" element={guarded('/admin', <AdminConsole />)} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
