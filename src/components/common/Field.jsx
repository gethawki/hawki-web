const control = (error) =>
  `w-full rounded-lg bg-ink-soft border px-3.5 py-2.5 text-sm text-white placeholder:text-grey outline-none transition focus:border-steel disabled:opacity-60 ${
    error ? 'border-copper' : 'border-panel-border'
  }`

function Wrap({ id, label, error, hint, children }) {
  return (
    <label htmlFor={id} className="block">
      {label && <span className="block text-sm text-[#cfcfcf] mb-1.5">{label}</span>}
      {children}
      {error ? (
        <span className="block mt-1.5 text-xs text-copper">{error}</span>
      ) : hint ? (
        <span className="block mt-1.5 text-xs text-grey">{hint}</span>
      ) : null}
    </label>
  )
}

// Field is a labelled text input with an optional error or hint line.
export default function Field({ label, error, hint, id, ...input }) {
  return (
    <Wrap id={id} label={label} error={error} hint={hint}>
      <input id={id} className={control(error)} aria-invalid={error ? 'true' : undefined} {...input} />
    </Wrap>
  )
}

export function SelectField({ label, error, hint, id, options, ...select }) {
  return (
    <Wrap id={id} label={label} error={error} hint={hint}>
      <select id={id} className={control(error)} {...select}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  )
}
