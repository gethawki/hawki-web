import { Link } from 'react-router-dom'

export default function AppNotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl text-white">Nothing here yet</h1>
      <p className="mt-2 text-sm text-grey">This part of Hawk-i Cloud does not exist, or has not shipped yet.</p>
      <Link to="/app" className="mt-5 inline-block text-sm text-steel hover:text-steel-light">
        Back to the overview
      </Link>
    </div>
  )
}
