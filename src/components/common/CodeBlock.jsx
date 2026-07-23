import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

function highlightLine(line, key) {
  const trimmed = line.trimStart()
  const indent = line.slice(0, line.length - trimmed.length)

  if (trimmed.startsWith('$ ')) {
    return (
      <div key={key}>
        {indent}
        <span className="text-[#687F97]">$</span> {trimmed.slice(2)}
      </div>
    )
  }
  if (trimmed.startsWith('#')) {
    return (
      <div key={key} className="text-[#77746C]">
        {line}
      </div>
    )
  }
  if (/^(✓|✅)/.test(trimmed)) {
    return (
      <div key={key} className="text-emerald-500">
        {line}
      </div>
    )
  }
  if (/^(⚠|❌|!)/.test(trimmed)) {
    return (
      <div key={key} className="text-[#986C67]">
        {line}
      </div>
    )
  }
  if (trimmed.startsWith('→')) {
    return (
      <div key={key} className="text-[#687F97]">
        {line}
      </div>
    )
  }
  return <div key={key}>{line || '\u00A0'}</div>
}

export default function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable, silently ignore */
    }
  }

  const lines = code.split('\n')

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute top-2 right-2 p-1.5 rounded-md bg-black/40 border border-[#333] text-[#77746C] opacity-0 group-hover:opacity-100 hover:text-white transition"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre>
        <code>{lines.map((line, i) => highlightLine(line, i))}</code>
      </pre>
    </div>
  )
}
