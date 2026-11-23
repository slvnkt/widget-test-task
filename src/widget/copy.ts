// Widget and Campaigns page copy (handoff-table-drawer §2.3, §4.2, §4.3).
import { CAMPAIGN, fmtM, type Model } from '../data/campaign'

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

/** "+0.4M" / "−0.2M" with a true minus sign; zero has no sign. */
export const signedM = (v: number) => {
  const r = Math.round(v * 10) / 10
  if (r === 0) return '0.0M'
  return r < 0 ? `−${Math.abs(r).toFixed(1)}M` : `+${r.toFixed(1)}M`
}

/** The drawer's one explanatory line for states that need it (§4.2, §4.3); null otherwise. */
export function noteLine(m: Model): string | null {
  const { def } = m
  if (def.revised) {
    const by = def.revised.by * (m.guarantee / CAMPAIGN.guarantee)
    return `Revised down ${fmtM(by)} on ${m.fmt(def.revised.on)}: network logs replaced preliminary estimates for ${m.fmtRange(def.revised.from, def.revised.to)}.`
  }
  if (def.lateNetworks) {
    const names = m.networks.filter(n => n.status === 'late').map(n => n.name)
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
    return `No logs from ${list} since ${m.fmt(def.lastLogDay ?? -1)}. Simulmedia ops is following up.`
  }
  if (m.prelimThrough === null && m.phase === 'live') return `No smart-TV estimates this week, so status uses network logs through ${m.confirmedThroughLabel} only.`
  if (m.status === 'behind' && def.makegood?.from !== undefined) {
    return `${m.makegoodSpots} makegood spots run ${m.fmt(def.makegood.from)} – ${m.fmt(def.makegood.to)} and add ${fmtM(m.makegoodImps)}.`
  }
  if (m.status === 'at-risk') return 'No makegood scheduled yet. Your Simulmedia account manager will propose one.'
  if (m.status === 'final-under' && def.makegood) return `Makegood spots for ${fmtM(m.guarantee - m.delivered)} run by ${m.fmt(def.makegood.to)}.`
  return null
}
