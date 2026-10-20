import { duration } from './format.js'

// Helpers shared by several dashboard pages.

export const projectSource = (p) => p.repository_url?.replace(/^https?:\/\//, '') || [p.chain, p.contract_address].filter(Boolean).join(' ')

export const scanDuration = (s) =>
  s.started_at && s.finished_at ? duration((new Date(s.finished_at) - new Date(s.started_at)) / 1000) : s.status === 'running' ? 'Running' : '-'

// scoreBand names a posture score and picks its badge tone.
export function scoreBand(score) {
  if (score >= 90) return ['Strong', 'good']
  if (score >= 75) return ['Fair', 'accent']
  if (score >= 50) return ['At risk', 'warning']
  return ['Critical', 'danger']
}

// postureScore uses the scanner's report weights.
export const postureScore = (c) => Math.max(0, Math.min(100, 100 - 15 * (c.critical || 0) - 8 * (c.high || 0) - 4 * (c.medium || 0) - (c.low || 0)))
