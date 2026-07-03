import { Eye, FlaskConical } from 'lucide-react'
import Reveal from '../common/Reveal.jsx'
import SeverityChart from './SeverityChart.jsx'
import CoverageChart from './CoverageChart.jsx'

export default function ProductPreview() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
      <Reveal className="mb-14 text-center">
        <span className="text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase">04: See it in action</span>
        <h2 className="font-display text-3xl md:text-4xl text-white mt-4">Live security intelligence</h2>
        <p className="text-[#77746C] mt-3 max-w-xl mx-auto">
          Real-time risk posture, detection coverage, and continuous monitoring, not a one-time score.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#1f1f1f]">
            <div className="p-5 sm:p-6 md:p-8 min-w-0">
              <span className="text-xs font-mono tracking-[0.15em] text-[#77746C] uppercase">Security score</span>
              <div className="flex items-end gap-2 mt-3">
                <span className="font-display text-5xl text-white">84</span>
                <span className="text-[#77746C] text-sm mb-1.5">/ 100</span>
              </div>
              <div className="w-full bg-[#1e1e1e] h-1 rounded-full mt-4">
                <div className="bg-[#687F97] h-1 rounded-full" style={{ width: '84%' }} />
              </div>
              <div className="mt-6 space-y-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-[#77746C]">complexity risk</span>
                  <span className="text-[#986C67]">high</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#77746C]">upgradeability</span>
                  <span className="text-[#e0e0e0]">medium</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#77746C]">dependencies</span>
                  <span className="text-[#687F97]">3 audited</span>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 md:p-8 md:col-span-2 min-w-0">
              <span className="text-xs font-mono tracking-[0.15em] text-[#77746C] uppercase">Findings by severity</span>
              <div className="mt-3">
                <SeverityChart />
              </div>
            </div>
          </div>

          <div className="border-t border-[#1f1f1f] p-5 sm:p-6 md:p-8 min-w-0">
            <span className="text-xs font-mono tracking-[0.15em] text-[#77746C] uppercase">
              Detection coverage — static vs. AI-assisted
            </span>
            <div className="mt-3">
              <CoverageChart />
            </div>
          </div>

          <div className="border-t border-[#1f1f1f] grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#1f1f1f]">
            <div className="p-5 sm:p-6 flex items-center gap-3 min-w-0">
              <Eye size={15} className="text-[#986C67] shrink-0" />
              <div className="text-sm min-w-0">
                <span className="text-[#e0e0e0] font-mono">12 commits behind:</span>
                <span className="text-[#77746C]"> re-scan recommended on PR #42</span>
              </div>
            </div>
            <div className="p-5 sm:p-6 flex items-center gap-3 min-w-0">
              <FlaskConical size={15} className="text-[#687F97] shrink-0" />
              <div className="text-sm min-w-0">
                <span className="text-[#e0e0e0] font-mono">3 PoCs generated:</span>
                <span className="text-[#77746C]">reentrancy · flash loan · governance</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}