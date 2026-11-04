const control = (error) =>
  `w-full h-9 rounded-lg bg-surface border px-3 text-sm text-fg placeholder:text-fg-3 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/15 disabled:opacity-60 ${
    error ? 'border-critical/70' : 'border-line-strong'
  }`

function Wrap({ id, label, error, hint, children }) {
  return (
    <label htmlFor={id} className="block">
      {label && <span className="block text-[0.8rem] font-medium text-fg-2 mb-1.5">{label}</span>}
      {children}
      {error ? (
        <span className="block mt-1.5 text-xs text-bad">{error}</span>
      ) : hint ? (
        <span className="block mt-1.5 text-xs text-fg-3">{hint}</span>
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

export function TextArea({ label, error, hint, id, ...input }) {
  return (
    <Wrap id={id} label={label} error={error} hint={hint}>
      <textarea id={id} className={`${control(error)} h-auto py-2`} {...input} />
    </Wrap>
  )
}
