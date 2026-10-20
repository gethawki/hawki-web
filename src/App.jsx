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
const ConfirmEmail = lazy(() => import('./pages/auth/ConfirmEmail.jsx'))
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
const Alerts = lazy(() => import('./pages/dashboard/Alerts.jsx'))
const AlertDetail = lazy(() => import('./pages/dashboard/AlertDetail.jsx'))
const AlertChannels = lazy(() => import('./pages/dashboard/AlertChannels.jsx'))
const Reports = lazy(() => import('./pages/dashboard/Reports.jsx'))
const ReportDetail = lazy(() => import('./pages/dashboard/ReportDetail.jsx'))
const SharedReport = lazy(() => import('./pages/SharedReport.jsx'))
const Billing = lazy(() => import('./pages/dashboard/Billing.jsx'))
const AuditLog = lazy(() => import('./pages/dashboard/AuditLog.jsx'))
const OrgSettings = lazy(() => import('./pages/dashboard/OrgSettings.jsx'))
const Profile = lazy(() => import('./pages/dashboard/Profile.jsx'))
const DashboardNotFound = lazy(() => import('./pages/dashboard/DashboardNotFound.jsx'))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview.jsx'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'))
const AdminUser = lazy(() => import('./pages/admin/AdminUser.jsx'))
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers.jsx'))
const AdminCustomer = lazy(() => import('./pages/admin/AdminCustomer.jsx'))
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments.jsx'))
const AdminRevenue = lazy(() => import('./pages/admin/AdminRevenue.jsx'))
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit.jsx'))
const AdminSwitches = lazy(() => import('./pages/admin/AdminSwitches.jsx'))

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
          <Route path="/confirm-email" element={<ConfirmEmail />} />
          <Route path="/r/:token" element={<SharedReport />} />

          <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
            <Route path="/dashboard" element={<Overview />} />
            <Route path="/dashboard/projects" element={guarded('/dashboard/projects', <Projects />)} />
            <Route path="/dashboard/projects/:projectId" element={guarded('/dashboard/projects', <ProjectDetail />)} />
            <Route path="/dashboard/scans" element={guarded('/dashboard/scans', <Scans />)} />
            <Route path="/dashboard/scans/:scanId" element={guarded('/dashboard/scans', <ScanDetail />)} />
            <Route path="/dashboard/findings" element={guarded('/dashboard/findings', <Findings />)} />
            <Route path="/dashboard/findings/:findingId" element={guarded('/dashboard/findings', <FindingDetail />)} />
            <Route path="/dashboard/reports" element={guarded('/dashboard/reports', <Reports />)} />
            <Route path="/dashboard/reports/:reportId" element={guarded('/dashboard/reports', <ReportDetail />)} />
            <Route path="/dashboard/alerts" element={guarded('/dashboard/alerts', <Alerts />)} />
            <Route path="/dashboard/alerts/channels" element={guarded('/dashboard/settings', <AlertChannels />)} />
            <Route path="/dashboard/alerts/:alertId" element={guarded('/dashboard/alerts', <AlertDetail />)} />
            <Route path="/dashboard/members" element={guarded('/dashboard/members', <Members />)} />
            <Route path="/dashboard/api-keys" element={guarded('/dashboard/api-keys', <ApiKeys />)} />
            <Route path="/dashboard/billing" element={guarded('/dashboard/billing', <Billing />)} />
            <Route path="/dashboard/audit-log" element={guarded('/dashboard/audit-log', <AuditLog />)} />
            <Route path="/dashboard/settings" element={guarded('/dashboard/settings', <OrgSettings />)} />
            <Route path="/dashboard/profile" element={<Profile />} />
            <Route path="/dashboard/*" element={<DashboardNotFound />} />
            <Route path="/admin" element={guarded('/admin', <AdminOverview />)} />
            <Route path="/admin/users" element={guarded('/admin/users', <AdminUsers />)} />
            <Route path="/admin/users/:userId" element={guarded('/admin/users', <AdminUser />)} />
            <Route path="/admin/customers" element={guarded('/admin/customers', <AdminCustomers />)} />
            <Route path="/admin/customers/:orgId" element={guarded('/admin/customers', <AdminCustomer />)} />
            <Route path="/admin/payments" element={guarded('/admin/payments', <AdminPayments />)} />
            <Route path="/admin/revenue" element={guarded('/admin/revenue', <AdminRevenue />)} />
            <Route path="/admin/audit" element={guarded('/admin/audit', <AdminAudit />)} />
            <Route path="/admin/switches" element={guarded('/admin/switches', <AdminSwitches />)} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
