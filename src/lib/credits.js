// Credits are stored in millicredits (1 credit = 1000) so daily Watch charges
// stay exact. Show whole credits where possible.
export const MILLI = 1000

export function formatCredits(mc) {
  const n = (mc || 0) / MILLI
  return n.toLocaleString(undefined, { maximumFractionDigits: Number.isInteger(n) ? 0 : 1 })
}

export const creditsLabel = (mc) => `${formatCredits(mc)} ${Math.abs(mc) === MILLI ? 'credit' : 'credits'}`

export const formatPrice = (cents) =>
  (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 })

// paymentMessage explains a refused charge (HTTP 402) in plain words.
export function paymentMessage(err) {
  if (err?.code === 'monthly_cap_reached') return "This would go over your plan's monthly credit limit."
  if (err?.code === 'insufficient_credits') return 'Your organization does not have enough credits for this.'
  return null
}
