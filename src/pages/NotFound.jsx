import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-32">
        <ShieldAlert className="text-[#986C67] mb-6" size={48} strokeWidth={1.5} />
        <h1 className="text-5xl font-bold text-white mb-3">404</h1>
        <p className="text-[#77746C] max-w-md mb-8">
          This route wasn't found in the scan. Let's get you back to somewhere secure.
        </p>
        <Link
          to="/"
          className="bg-[#687F97] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#7a94af] transition"
        >
          Back to home
        </Link>
      </div>
      <Footer />
    </div>
  )
}
