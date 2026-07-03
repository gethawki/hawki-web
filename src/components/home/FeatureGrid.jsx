import Reveal from '../common/Reveal.jsx'

const FEATURES = [
  {
    n: '01',
    title: 'Repository Security Analysis',
    body: 'Analyze projects to identify security risks across entire codebases.',
  },
  {
    n: '02',
    title: 'AI Security Reasoning',
    body: 'Use AI to explain findings, identify potential attack paths, and provide actionable recommendations.',
  },
  {
    n: '03',
    title: 'Static Security Analysis',
    body: 'Combine proven rule-based analysis with intelligent reasoning to improve detection quality.',
  },
  {
    n: '04',
    title: 'Exploit Simulation',
    body: 'Safely validate whether reported issues are practically exploitable through controlled simulations.',
  },
  {
    n: '05',
    title: 'Evidence-Based Reporting',
    body: 'Generate structured security reports with traceable findings and supporting evidence.',
  },
  {
    n: '06',
    title: 'Continuous Monitoring',
    body: 'Monitor projects over time and surface changes that may introduce new security risks.',
  },
]

export default function FeatureGrid() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
      <Reveal className="mb-4 flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase">03: What Hawk‑i does</span>
          <h2 className="font-display text-3xl md:text-4xl text-white mt-4">Security intelligence, end to end</h2>
        </div>
        <p className="text-[#77746C] max-w-xs text-sm leading-relaxed">
          Six capabilities that work independently, yet integrate into a single continuous workflow.
        </p>
      </Reveal>

      <div className="mt-8">
        {FEATURES.map((f, i) => (
          <Reveal key={f.n} delay={i * 0.04}>
            <div className="group grid md:grid-cols-12 gap-4 md:gap-8 items-baseline py-7 border-t border-[#1e1e1e] last:border-b hover:bg-white/[0.015] transition -mx-4 px-4">
              <span className="serif-num text-3xl md:col-span-1">{f.n}</span>
              <h3 className="md:col-span-4 text-xl text-white font-medium group-hover:text-[#a9bccd] transition">
                {f.title}
              </h3>
              <p className="md:col-span-6 md:col-start-7 text-[#8f8f8f] leading-relaxed">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
