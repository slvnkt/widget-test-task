// Widget copy. Only "P3 · Live · On track" is designed; other states reuse these strings with their own numbers.
import type { BadgeVariant } from '@ds/components/Badge'
import type { Phase, Status } from '../data/campaign'

export const STATUS_BADGE: Record<Status, { label: string; variant: BadgeVariant }> = {
  'on-track': { label: 'On track', variant: 'success' },
  ahead: { label: 'Ahead', variant: 'success' },
  behind: { label: 'Behind', variant: 'warning' },
  'at-risk': { label: 'At risk', variant: 'danger' },
  'too-early': { label: 'Too early to tell', variant: 'neutral' },
  scheduled: { label: 'Scheduled', variant: 'neutral' },
  paused: { label: 'Paused', variant: 'neutral' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
  finalizing: { label: 'Finalizing', variant: 'neutral' },
  'final-met': { label: 'Met', variant: 'success' },
  'final-under': { label: 'Under', variant: 'danger' },
  unknown: { label: 'No data yet', variant: 'neutral' },
}

export const PHASE_LABEL: Record<Phase, string> = {
  scheduled: 'Scheduled',
  live: 'Live',
  paused: 'Paused',
  cancelled: 'Cancelled',
  ended: 'Ended',
  finalized: 'Finalized',
}

export const HINTS = {
  projected: 'Forecast at flight end if the remaining spots air as planned and keep delivering at the current pace.',
  delivered: 'Network logs plus preliminary smart-TV estimates. The chart shows the split.',
  logs: 'Networks send post-logs 5–10 days after air. Until then, those days use preliminary estimates.',
}

// The model has no refresh timestamp, so freshness time is a copy constant.
export const UPDATED_AT = 'Updated today, 6:10 AM'

export const SOURCES = {
  logs: { source: 'Network post-logs', use: 'Final, used for billing', what: 'Aired spots matched to Nielsen C3 ratings. Networks send them 5–10 days after air.' },
  acr: { source: 'Smart-TV (ACR) estimate', use: 'Preliminary', what: 'Viewing measured on smart TVs and scaled to Nielsen C3. Replaced by network logs as they arrive, so these numbers can move.' },
  forecast: { source: 'Forecast', use: 'Projected', what: 'Remaining spots in the plan at the current delivery pace.' },
}

/** "+0.4M" / "−0.2M" with a true minus sign. */
export const signedM = (v: number) => {
  const r = Math.round(v * 10) / 10
  return r < 0 ? `−${Math.abs(r).toFixed(1)}M` : `+${r.toFixed(1)}M`
}
