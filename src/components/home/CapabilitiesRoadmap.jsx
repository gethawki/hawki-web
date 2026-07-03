import Reveal from '../common/Reveal.jsx'

const CURRENT = [
  'Repository security analysis',
  'Static code analysis',
  'AI-assisted security reasoning',
  'Smart contract security analysis',
  'Evidence generation',
  'Security reporting',
  'Exploit validation',
  'Continuous monitoring foundations',
]

const NEXT = [
  'Threat Intelligence',
  'Intelligence Engine',
  'Knowledge Graphs',
  'Runtime Security',
  'Team Collaboration',
  'Cloud Platform',
  'Enterprise Workflows',
  'Security Automation',
  'API Platform',
  'Plugin Ecosystem',
]

export default function CapabilitiesRoadmap() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
      <Reveal className="mb-14">
        <span className="text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase">06: Roadmap</span>
        <h2 className="font-display text-3xl md:text-4xl text-white mt-4">Today, and what's next</h2>
        <p className="text-[#77746C] mt-3 max-w-xl">
          The platform continues to evolve through community contributions and ongoing research.
        </p>
      </Reveal>

      <div className="grid md:grid-cols-2 gap-12 md:gap-0 md:divide-x divide-[#1e1e1e]">
        <Reveal className="md:pr-14">
          <h3 className="text-white font-medium mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#687F97]" /> Available now
          </h3>
          <ul className="space-y-3.5">
            {CURRENT.map((item) => (
              <li key={item} className="text-[#b0b0b0] text-sm border-b border-[#161616] pb-3.5 last:border-0">
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="md:pl-14">
          <h3 className="text-[#8a8a8a] font-medium mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#986C67]" /> In progress
          </h3>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3.5">
            {NEXT.map((item) => (
              <li key={item} className="text-[#6f6f6f] text-sm">
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
