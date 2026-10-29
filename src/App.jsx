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
const Intel = lazy(() => import('./pages/dashboard/Intel.jsx'))
const IntelAddress = lazy(() => import('./pages/dashboard/IntelAddress.jsx'))
const IntelExploit = lazy(() => import('./pages/dashboard/IntelExploit.jsx'))
const IntelProtocol = lazy(() => import('./pages/dashboard/IntelProtocol.jsx'))
const IntelProposal = lazy(() => import('./pages/dashboard/IntelProposal.jsx'))
const IntelSearch = lazy(() => import('./pages/dashboard/IntelSearch.jsx'))
const IntelInsight = lazy(() => import('./pages/dashboard/IntelInsight.jsx'))
const IntelGraph = lazy(() => import('./pages/dashboard/IntelGraph.jsx'))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview.jsx'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'))
const AdminUser = lazy(() => import('./pages/admin/AdminUser.jsx'))
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers.jsx'))
const AdminCustomer = lazy(() => import('./pages/admin/AdminCustomer.jsx'))
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments.jsx'))
const AdminRevenue = lazy(() => import('./pages/admin/AdminRevenue.jsx'))
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit.jsx'))
const AdminSwitches = lazy(() => import('./pages/admin/AdminSwitches.jsx'))
const IntelLayout = lazy(() => import('./components/admin/IntelOps.jsx').then((m) => ({ default: m.IntelLayout })))
const intelPage = (name) => lazy(() => import('./pages/admin/AdminIntel.jsx').then((m) => ({ default: m[name] })))
const enginePage = (name) => lazy(() => import('./components/admin/IntelEngines.jsx').then((m) => ({ default: m[name] })))
const IntelGraphAdmin = enginePage('AdminIntelGraph')
const IntelSearchAdmin = enginePage('AdminIntelSearch')
const IntelInsightsAdmin = enginePage('AdminIntelInsights')
const IntelOverview = intelPage('default')
const IntelChains = intelPage('IntelChains')
const IntelChain = intelPage('IntelChain')
const IntelIndexing = intelPage('IntelIndexing')
const IntelSources = intelPage('IntelSourcesPage')
const IntelAudit = intelPage('IntelAuditPage')
const IntelContracts = intelPage('IntelContractsPage')
const IntelTokens = intelPage('IntelTokensPage')
const IntelControl = intelPage('IntelControlPage')
const IntelGovernance = intelPage('IntelGovernancePage')
const IntelProtocols = intelPage('IntelProtocolsPage')
const IntelRisk = intelPage('IntelRiskPage')

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
            <Route path="/dashboard/intel" element={guarded('/dashboard/intel', <Intel />)} />
            <Route path="/dashboard/intel/address/:chain/:address" element={guarded('/dashboard/intel', <IntelAddress />)} />
            <Route path="/dashboard/intel/exploits/:id" element={guarded('/dashboard/intel', <IntelExploit />)} />
            <Route path="/dashboard/intel/protocols/:slug" element={guarded('/dashboard/intel', <IntelProtocol />)} />
            <Route path="/dashboard/intel/proposals/:chain/:governor/:id" element={guarded('/dashboard/intel', <IntelProposal />)} />
            <Route path="/dashboard/intel/search" element={guarded('/dashboard/intel', <IntelSearch />)} />
            <Route path="/dashboard/intel/insights/:id" element={guarded('/dashboard/intel', <IntelInsight />)} />
            <Route path="/dashboard/intel/graph" element={guarded('/dashboard/intel', <IntelGraph />)} />
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
            <Route path="/admin/intel" element={guarded('/admin/intel', <IntelLayout />)}>
              <Route index element={<IntelOverview />} />
              <Route path="chains" element={<IntelChains />} />
              <Route path="chains/:chain" element={<IntelChain />} />
              <Route path="indexing" element={<IntelIndexing />} />
              <Route path="sources" element={<IntelSources />} />
              <Route path="audit" element={<IntelAudit />} />
              <Route path="contracts" element={<IntelContracts />} />
              <Route path="tokens" element={<IntelTokens />} />
              <Route path="control" element={<IntelControl />} />
              <Route path="governance" element={<IntelGovernance />} />
              <Route path="protocols" element={<IntelProtocols />} />
              <Route path="risk" element={<IntelRisk />} />
              <Route path="graph" element={<IntelGraphAdmin />} />
              <Route path="search" element={<IntelSearchAdmin />} />
              <Route path="insights" element={<IntelInsightsAdmin />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
