import { useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Section from '../common/Section.jsx'
import Reveal from '../common/Reveal.jsx'
import CountUp from '../common/CountUp.jsx'
import RiskBadge from '../common/RiskBadge.jsx'
import SeverityChart from './SeverityChart.jsx'
import CoverageChart from './CoverageChart.jsx'

const SCORE = 72 // Moderate Risk band

function ScoreGauge() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const reduce = useReducedMotion()
  const R = 52
  const C = 2 * Math.PI * R
  const pct = SCORE / 100

  return (
    <div ref={ref} className="relative w-[150px] h-[150px]">
      <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
        <circle cx="65" cy="65" r={R} fill="none" stroke="#1e1e1e" strokeWidth="8" />
        <motion.circle
          cx="65"
          cy="65"
          r={R}
          fill="none"
          stroke="var(--color-risk-med)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={reduce ? false : { strokeDashoffset: C }}
          animate={inView ? { strokeDashoffset: C * (1 - pct) } : {}}
          transition={{ type: 'spring', stiffness: 45, damping: 16, delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl text-white leading-none">
          <CountUp to={SCORE} />
        </span>
        <span className="font-mono text-[0.6rem] text-[#5a5a5a] mt-1">/ 100</span>
      </div>
    </div>
  )
}

const REPORT_JSON = `{
  "score": 72,
  "risk_band": "Moderate Risk",
  "findings": [
    {
      "title": "Reentrancy in withdraw()",
      "severity": "High",
      "file": "Vault.sol",
      "line": 118,
      "rule": "reentrancy",
      "fix_snippet": "use checks-effects-interactions"
    }
  ]
}`

export default function ScoreReport() {
  const [view, setView] = useState('report')

  return (
    <Section
      id="report"
      num="05"
      kicker="Audit-grade evidence"
      title="A score you can trust, a report you can file"
      intro="Every scan yields a deterministic 0 to 100 score, a severity breakdown, and an audit or Immunefi-style report. The same findings always produce the same result."
      width="wide"
    >
      <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
        {/* score + severity */}
        <Reveal className="lg:col-span-5">
          <div className="panel p-6 md:p-8 h-full">
            <div className="flex items-center gap-6">
              <ScoreGauge />
              <div>
                <RiskBadge level="med" label="Moderate Risk" />
                <p className="text-[#8a8a8a] text-sm mt-3 leading-relaxed">
                  Start at 100, subtract severity-weighted deductions
                  (Critical 15, High 8, Medium 4, Low 1), clamp, map to a band.
                </p>
              </div>
            </div>
            <div className="mt-7 pt-6 border-t border-[#1c1c1c]">
              <div className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-[#77746C] mb-3">
                findings by severity
              </div>
              <SeverityChart />
            </div>
          </div>
        </Reveal>

        {/* report / JSON toggle */}
        <Reveal delay={0.1} className="lg:col-span-7">
          <div className="panel p-6 md:p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-[#77746C]">
                same finding, two surfaces
              </div>
              <div className="inline-flex rounded-lg border border-[#242424] p-0.5">
                {[
                  ['report', 'Immunefi report'],
                  ['json', 'JSON export'],
                ].map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setView(k)}
                    className={`px-3 py-1 rounded-md font-mono text-xs transition ${
                      view === k ? 'bg-[#687F97]/15 text-white' : 'text-[#7a7a7a] hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {view === 'report' ? (
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1c1c1c]">
                  <span className="text-white font-medium">Reentrancy in withdraw()</span>
                  <RiskBadge level="high" />
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ['Location', 'Vault.sol:118'],
                    ['Impact', 'Attacker re-enters before balance update and drains the vault.'],
                    ['Proof', 'Foundry PoC drains 1+ ETH in the sandbox.'],
                    ['Fix', 'Apply checks-effects-interactions or a reentrancy guard.'],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3">
                      <dt className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-[#5f5f5f] pt-0.5">
                        {k}
                      </dt>
                      <dd className="text-[#b0b0b0] leading-relaxed">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <motion.pre
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex-1 !mt-0 !mb-0 overflow-x-auto"
              >
                <code>{REPORT_JSON}</code>
              </motion.pre>
            )}
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.15}>
        <div className="panel p-6 md:p-8 mt-6">
          <div className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-[#77746C] mb-4">
            sample scan: detections by vulnerability class, static rules vs the Deep agent
          </div>
          <CoverageChart />
        </div>
      </Reveal>
    </Section>
  )
}
