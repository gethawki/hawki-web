import Reveal from '../common/Reveal.jsx'

export default function WhyHawki() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
      <div className="hairline mb-16 md:mb-20" />
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <span className="text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase">01: Why Hawk‑i</span>
          <h2 className="font-display text-3xl md:text-4xl text-white mt-4 leading-[1.2]">
            Security tools often answer one question. Hawk‑i answers{' '}
            <em className="italic text-[#687F97] font-medium">many</em>.
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-6 lg:col-start-7 flex flex-col justify-center">
          <p className="text-[#b0b0b0] text-lg leading-relaxed">
            Instead of only reporting vulnerabilities, Hawk‑i helps you understand how they happen, where they
            originate, how they affect the rest of your project, and what evidence supports every finding.
          </p>
          <p className="text-[#77746C] mt-4 leading-relaxed">
            Whether you're reviewing a smart contract, a software repository, or preparing for an external audit,
            Hawk‑i brings security intelligence into a single workflow.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
