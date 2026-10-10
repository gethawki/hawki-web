import Button from '../../components/common/Button.jsx'

export default function DashboardNotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl text-white">Nothing here yet</h1>
      <p className="mt-2 text-sm text-grey">This page does not exist, or that part of Hawk-i Cloud has not shipped yet.</p>
      <Button to="/dashboard" variant="ghost" className="mt-5">Back to the overview</Button>
    </div>
  )
}
