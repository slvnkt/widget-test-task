import type { BadgeVariant } from '@ds/components/Badge'
import type { AlertIntent } from '@ds/components/Alert'
import { CAMPAIGN, fmtDay, fmtM, type Model, type Status } from '../data/campaign'

const G = CAMPAIGN.guarantee
const pct = (v: number) => `${Math.round(v)}%`

export const STATUS: Record<Status, { label: string; variant: BadgeVariant; icon: 'check' | 'warn' | 'danger' | 'clock' | 'up' | 'pause' | 'stop' | 'info' }> = {
  scheduled: { label: 'Scheduled', variant: 'neutral', icon: 'clock' },
  'too-early': { label: 'Too early to tell', variant: 'neutral', icon: 'clock' },
  'on-track': { label: 'On track', variant: 'success', icon: 'check' },
  ahead: { label: 'Ahead', variant: 'info', icon: 'up' },
  behind: { label: 'Behind', variant: 'warning', icon: 'warn' },
  'at-risk': { label: 'At risk', variant: 'danger', icon: 'danger' },
  paused: { label: 'Paused', variant: 'neutral', icon: 'pause' },
  cancelled: { label: 'Cancelled', variant: 'neutral', icon: 'stop' },
  finalizing: { label: 'Finalizing', variant: 'neutral', icon: 'clock' },
  'final-met': { label: 'Guarantee met', variant: 'success', icon: 'check' },
  'final-under': { label: 'Under-delivered', variant: 'warning', icon: 'warn' },
  unknown: { label: 'Pace unknown', variant: 'neutral', icon: 'info' },
}

export const PHASE_LABEL: Record<Model['phase'], string> = {
  scheduled: 'Starts Nov 3',
  live: 'Live',
  paused: 'Paused',
  cancelled: 'Cancelled',
  ended: 'Ended',
  finalized: 'Finalized',
}

export function answerLine(m: Model): string {
  const gap = Math.abs(1 - m.pace) * 100
  switch (m.status) {
    case 'scheduled':
      return `Campaign starts Nov 3. ${CAMPAIGN.totalSpots} spots are planned across ${CAMPAIGN.networks} networks.`
    case 'too-early':
      return 'First spots are airing. Delivery numbers firm up over the next week.'
    case 'on-track':
      return 'On pace to meet the guarantee.'
    case 'ahead':
      return 'Delivering faster than planned. The guarantee may be met early.'
    case 'behind':
      return `${pct(gap)} behind expected. ${m.makegoodSpots} makegood spots are scheduled, so the guarantee holds.`
    case 'at-risk':
      return `Projected to fall ${fmtM(G - m.projection)} short. Your account manager is reviewing options.`
    case 'paused':
      return `Paused on ${fmtDay(m.def.stopDay ?? 0)}. Delivery resumes when the campaign restarts.`
    case 'cancelled':
      return `Stopped on ${fmtDay(m.def.stopDay ?? 0)}. ${fmtM(m.delivered)} impressions were delivered before the stop.`
    case 'finalizing':
      return 'Flight ended Dec 14. Final numbers are expected around Dec 28.'
    case 'final-met':
      return `Guarantee met: ${fmtM(m.delivered)} of ${fmtM(G)} impressions delivered.`
    case 'final-under':
      return `Delivered ${fmtM(m.delivered)} of ${fmtM(G)}. The remaining ${fmtM(G - m.delivered)} will be made up with extra spots ${m.def.makegood?.window}.`
    default:
      return 'Not enough data to judge the pace yet.'
  }
}

export function statusDetail(m: Model): string | null {
  if (['on-track', 'ahead', 'behind', 'at-risk'].includes(m.status)) {
    const diff = (m.pace - 1) * 100
    const word = diff >= 0 ? 'over' : 'under'
    return `${Math.abs(diff).toFixed(0)}% ${word} expected by today`
  }
  return null
}

export interface ContextAlert {
  intent: AlertIntent
  title?: string
  text: string
  action?: { label: string; target: 'overtime' | 'networks' | 'sources' }
  dismissible?: boolean
}

// One banner at a time, by priority: revised > logs late > ACR unavailable > makegood > phase notes > since last visit.
export function contextAlert(m: Model): ContextAlert | null {
  const d = m.def
  if (d.revised) {
    return {
      intent: 'info',
      title: 'Numbers revised',
      text: `Delivered changed from ${fmtM(m.delivered + d.revised.by)} to ${fmtM(m.delivered)} on ${fmtDay(d.revised.on)}: ${d.revised.reason}. This is normal and does not change the forecast much.`,
      action: { label: 'Why?', target: 'overtime' },
    }
  }
  if (d.lateNetworks) {
    return {
      intent: 'warning',
      text: `${d.lateNetworks} networks are late with their logs (none since Nov 2). Your account manager is following up. Their spots are counted as preliminary until logs arrive.`,
      action: { label: 'See networks', target: 'networks' },
    }
  }
  if (d.prelimThrough === null) {
    return {
      intent: 'neutral',
      text: `No preliminary smart-TV data for the last days. Pace is based on confirmed network logs through ${m.confirmedThroughLabel} only.`,
      action: { label: 'About sources', target: 'sources' },
    }
  }
  if (m.status === 'behind' && d.makegood) {
    return { intent: 'warning', title: 'Makegood scheduled', text: `${m.makegoodSpots} extra spots run ${d.makegood.window} and recover about ${fmtM(m.makegoodImps)} impressions.` }
  }
  if (m.status === 'final-under' && d.makegood) {
    return { intent: 'warning', title: 'Compensation in progress', text: `${m.makegoodSpots} makegood spots will run ${d.makegood.window} to cover the ${fmtM(G - m.delivered)} gap.` }
  }
  if (m.status === 'too-early') {
    return { intent: 'info', text: 'Network logs usually arrive 5–10 days after air. Until then the numbers are preliminary estimates from smart-TV data.' }
  }
  if (m.status === 'paused') return { intent: 'neutral', text: 'Pace and forecast are hidden while the campaign is paused.' }
  if (m.status === 'finalizing') {
    return { intent: 'info', text: `${CAMPAIGN.networks - m.logsReceived} networks have not sent logs for the last week yet. Preliminary numbers usually settle once they arrive.`, action: { label: 'See networks', target: 'networks' } }
  }
  if (m.sinceLastVisit !== null && d.lastVisit !== undefined) {
    return { intent: 'neutral', text: `Since your last visit on ${fmtDay(d.lastVisit)}: +${fmtM(m.sinceLastVisit)} delivered, status unchanged.`, dismissible: true }
  }
  return null
}

export const DEFINITIONS = {
  confirmed: 'Impressions from spots that networks confirmed in their logs (post-logs), valued in the guarantee currency. These are what the guarantee is measured on.',
  preliminary: 'An early estimate from smart-TV (ACR) data for days without network logs yet. It usually settles once logs arrive.',
  expected: 'How much should have been delivered by now, based on the spots planned to air so far. Most spots of this campaign are planned for December.',
  guarantee: `${fmtM(G)} impressions, ${CAMPAIGN.demo}, measured in ${CAMPAIGN.currency}.`,
  forecast: 'Delivered so far plus the remaining planned spots at the current pace, plus scheduled makegood spots. The range narrows as the flight goes on.',
  makegood: 'Extra spots Simulmedia adds at no cost to make up for a delivery gap.',
  preempted: 'Spots the network moved or dropped, for example for breaking news. They are rescheduled or replaced.',
}
