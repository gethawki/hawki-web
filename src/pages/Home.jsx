import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import Ticker from '../components/layout/Ticker.jsx'
import { Helmet } from '../components/common/Helmet.jsx'
import Hero from '../components/home/Hero.jsx'
import LiveTerminal from '../components/home/LiveTerminal.jsx'
import DeepAgent from '../components/home/DeepAgent.jsx'
import SecurityModules from '../components/home/SecurityModules.jsx'
import MultiChain from '../components/home/MultiChain.jsx'
import ScoreReport from '../components/home/ScoreReport.jsx'
import WhyHawki from '../components/home/WhyHawki.jsx'
import AudienceGrid from '../components/home/AudienceGrid.jsx'
import OpenSourceBanner from '../components/home/OpenSourceBanner.jsx'
import DocsPreview from '../components/home/DocsPreview.jsx'
import Community from '../components/home/Community.jsx'
import FAQSection from '../components/home/FAQSection.jsx'
import FinalCTA from '../components/home/FinalCTA.jsx'

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <div className="grain-overlay fixed" style={{ opacity: 0.05 }} />
      <Helmet title="Hawk-i · Security intelligence for Web3 smart contracts" />
      <Ticker />
      <Navbar />
      <Hero />
      <LiveTerminal />
      <DeepAgent />
      <SecurityModules />
      <MultiChain />
      <ScoreReport />
      <WhyHawki />
      <AudienceGrid />
      <OpenSourceBanner />
      <DocsPreview />
      <Community />
      <FAQSection />
      <FinalCTA />
      <Ticker />
      <Footer />
    </div>
  )
}
