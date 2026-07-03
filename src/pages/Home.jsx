import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import Ticker from '../components/layout/Ticker.jsx'
import { Helmet } from '../components/common/Helmet.jsx'
import Hero from '../components/home/Hero.jsx'
import TrustedPrinciples from '../components/home/TrustedPrinciples.jsx'
import WhyHawki from '../components/home/WhyHawki.jsx'
import AudienceGrid from '../components/home/AudienceGrid.jsx'
import FeatureGrid from '../components/home/FeatureGrid.jsx'
import ProductPreview from '../components/home/ProductPreview.jsx'
import WhyChoose from '../components/home/WhyChoose.jsx'
import CapabilitiesRoadmap from '../components/home/CapabilitiesRoadmap.jsx'
import OpenSourceBanner from '../components/home/OpenSourceBanner.jsx'
import DocsPreview from '../components/home/DocsPreview.jsx'
import Community from '../components/home/Community.jsx'
import FAQSection from '../components/home/FAQSection.jsx'
import FinalCTA from '../components/home/FinalCTA.jsx'

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <div className="grain-overlay fixed" style={{ opacity: 0.05 }} />
      <Helmet title="Hawk‑i · AI-Powered Security Intelligence for Software & Web3" />
      <Ticker />
      <Navbar />
      <Hero />
      <TrustedPrinciples />
      <WhyHawki />
      <AudienceGrid />
      <FeatureGrid />
      <ProductPreview />
      <WhyChoose />
      <CapabilitiesRoadmap />
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
