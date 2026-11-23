// Widget and Campaigns page copy (handoff-table-drawer §2.3, §4.2, §4.3).
import type { BadgeVariant } from '@ds/components/Badge'
import { CAMPAIGN, fmtM, type Model, type Status } from '../data/campaign'

// Lifecycle and pace merged into one word. Green for good outcomes, red only for At risk, no amber.
// `rank` is the attention order used by the Status sort.
export const STATUS_BADGE: Record<Status, { label: string; variant: BadgeVariant; rank: number }> = {
  'at-risk': { label: 'At risk', variant: 'danger', rank: 1 },
  behind: { label: 'Behind', variant: 'neutral', rank: 2 },
  'final-under': { label: 'Under-delivered', variant: 'neutral', rank: 3 },
  paused: { label: 'Paused', variant: 'neutral', rank: 4 },
  finalizing: { label: 'Finalizing', variant: 'neutral', rank: 5 },
  'too-early': { label: 'Just launched', variant: 'neutral', rank: 6 },
  'on-track': { label: 'On track', variant: 'success', rank: 7 },
  ahead: { label: 'Ahead', variant: 'success', rank: 8 },
  scheduled: { label: 'Scheduled', variant: 'neutral', rank: 9 },
  'final-met': { label: 'Guarantee met', variant: 'success', rank: 10 },
  cancelled: { label: 'Cancelled', variant: 'neutral', rank: 11 },
  unknown: { label: 'No data yet', variant: 'neutral', rank: 12 },
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

/** The drawer's one explanatory line for states that need it (§4.2, §4.3); null otherwise. */
export function noteLine(m: Model): string | null {
  const { def } = m
  if (def.revised) {
    const by = def.revised.by * (m.guarantee / CAMPAIGN.guarantee)
    return `Revised down ${fmtM(by)} on ${m.fmt(def.revised.on)}: network logs replaced preliminary estimates for ${m.fmtRange(def.revised.from, def.revised.to)}.`
  }
  if (def.lateNetworks) return `${def.lateNetworks} networks have sent no logs since ${m.fmt(def.lastLogDay ?? -1)}. Simulmedia ops is following up.`
  if (m.prelimThrough === null && m.phase === 'live') return `No smart-TV estimates this week, so status uses network logs through ${m.confirmedThroughLabel} only.`
  if (m.status === 'behind' && def.makegood?.from !== undefined) {
    return `${m.makegoodSpots} makegood spots run ${m.fmt(def.makegood.from)} – ${m.fmt(def.makegood.to)} and add ${fmtM(m.makegoodImps)}.`
  }
  if (m.status === 'at-risk') return `Short by ${fmtM(m.guarantee - m.projection)} at flight end, no makegood scheduled yet. Your Simulmedia account manager will propose one.`
  if (m.status === 'final-under' && def.makegood) return `Makegood spots for ${fmtM(m.guarantee - m.delivered)} run by ${m.fmt(def.makegood.to)}.`
  return null
}
