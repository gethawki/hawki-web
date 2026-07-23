import Reveal from './Reveal.jsx'
import Kicker from './Kicker.jsx'

const WIDTHS = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
}

export default function Section({
  id,
  num,
  kicker,
  title,
  intro,
  children,
  width = 'default',
  align = 'left',
  className = '',
  header = true,
}) {
  const max = WIDTHS[width] || WIDTHS.default
  const centered = align === 'center'

  return (
    <section id={id} className={`relative z-10 ${max} mx-auto px-6 py-20 md:py-28 ${className}`}>
      {header && (kicker || title) && (
        <Reveal className={`mb-12 md:mb-16 ${centered ? 'text-center' : ''}`}>
          {kicker && <Kicker num={num}>{kicker}</Kicker>}
          {title && (
            <h2 className="font-display text-3xl md:text-[2.6rem] leading-[1.15] text-white mt-5 tracking-tight">
              {title}
            </h2>
          )}
          {intro && (
            <p className={`text-[#8f8f8f] mt-4 leading-relaxed ${centered ? 'max-w-2xl mx-auto' : 'max-w-2xl'}`}>
              {intro}
            </p>
          )}
        </Reveal>
      )}
      {children}
    </section>
  )
}
