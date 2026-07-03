import Reveal from '../common/Reveal.jsx'

export default function TrustedPrinciples() {
  return (
    <section className="relative z-10 max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
      <Reveal>
        <p className="text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase mb-8">Not another black box</p>
        <h2 className="font-display text-3xl md:text-5xl leading-[1.25] text-white">
          Hawk‑i combines deterministic security analysis with{' '}
          <em className="italic text-gradient font-medium">AI-assisted reasoning,</em> so you understand impact,
          not just an alert.
        </h2>
        <p className="text-[#77746C] mt-8 max-w-xl mx-auto leading-relaxed">
          Everything runs with transparency, reproducibility, and developer control in mind.
        </p>
      </Reveal>
    </section>
  )
}
