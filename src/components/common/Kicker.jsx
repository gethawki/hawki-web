export default function Kicker({ num, children }) {
  return (
    <span className="kicker">
      {num && <span className="kicker-num">{num}</span>}
      {children}
    </span>
  )
}
