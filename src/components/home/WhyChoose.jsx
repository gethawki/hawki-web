import Reveal from '../common/Reveal.jsx'

const PILLARS = [
  { n: '01', title: 'Developer First', body: 'Designed to fit naturally into modern development workflows.' },
  { n: '02', title: 'Privacy First', body: 'Run locally or self-host when privacy matters. Your code stays under your control.' },
  { n: '03', title: 'Explainable Results', body: 'Every finding is backed by evidence instead of an unexplained score.' },
  { n: '04', title: 'Open Source', body: 'The core platform is openly developed and community driven.' },
  { n: '05', title: 'Designed for Growth', body: 'Start local today. Scale into collaborative cloud intelligence tomorrow.' },
]

export default function WhyChoose() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
      <Reveal className="mb-14">
        <span className="text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase">05: Why teams choose Hawk‑i</span>
        <h2 className="font-display text-3xl md:text-4xl text-white mt-4">Built on principle, not hype</h2>
      </Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-10">
        {PILLARS.map((p, i) => (
          <Reveal key={p.n} delay={i * 0.06}>
            <span className="serif-num text-2xl">{p.n}</span>
            <h3 className="text-white font-medium mt-3 mb-2">{p.title}</h3>
            <p className="text-[#77746C] text-sm leading-relaxed">{p.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
