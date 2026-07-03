import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function Pager({ basePath, prev, next }) {
  if (!prev && !next) return null

  return (
    <div className="grid sm:grid-cols-2 gap-4 mt-16 pt-10 border-t border-[#161616]">
      {prev ? (
        <Link
          to={`${basePath}/${prev.href}`}
          className="group glass-panel rounded-xl p-5 flex flex-col hover:border-[#687F97]/40 transition"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#666] uppercase tracking-wide mb-2">
            <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-0.5" />
            Previous
          </span>
          <span className="text-white font-medium group-hover:text-[#a9bccd] transition">{prev.label}</span>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          to={`${basePath}/${next.href}`}
          className="group glass-panel rounded-xl p-5 flex flex-col sm:items-end sm:text-right hover:border-[#687F97]/40 transition"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#666] uppercase tracking-wide mb-2">
            Next
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="text-white font-medium group-hover:text-[#a9bccd] transition">{next.label}</span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  )
}
