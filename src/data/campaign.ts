// Mock campaign model. Every number in the widget is derived here from one daily plan,
// so all states of the same campaign stay consistent with each other.

export const CAMPAIGN = {
  brand: 'Northwind Coffee',
  name: 'Holiday Linear Q4',
  demo: 'A25-54',
  currency: 'Nielsen C3',
  guarantee: 48.0, // millions of impressions
  networks: 20,
  totalSpots: 640,
  flightDays: 42, // Nov 3 – Dec 14, 2026
  flight2Start: 21, // heavier holiday flight starts Nov 24
}

const START = new Date(2026, 10, 3)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const dateOf = (day: number) => new Date(START.getFullYear(), START.getMonth(), START.getDate() + day)
export const fmtDay = (day: number) => {
  const d = dateOf(day)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}
export const fmtM = (v: number, digits = 1) => `${v.toFixed(digits)}M`

// Daily plan: light first flight, heavy holiday flight, softer weekends.
const weights = Array.from({ length: CAMPAIGN.flightDays }, (_, d) => {
  const weekday = dateOf(d).getDay()
  const weekend = weekday === 0 || weekday === 6 ? 0.85 : 1
  return (d < CAMPAIGN.flight2Start ? 1 : 1.6) * weekend
})
const wSum = weights.reduce((a, b) => a + b, 0)
export const PLAN = weights.map(w => (w / wSum) * CAMPAIGN.guarantee)
export const PLAN_SPOTS = weights.map(w => (w / wSum) * CAMPAIGN.totalSpots)

const sum = (arr: number[], from: number, to: number) => {
  let s = 0
  for (let d = Math.max(0, from); d <= Math.min(arr.length - 1, to); d++) s += arr[d]
  return s
}
const noise = (d: number) => 1 + 0.04 * Math.sin(d * 1.7) + 0.02 * Math.cos(d * 3.1)

export const NETWORK_NAMES = [
  'ESPN', 'CNN', 'HGTV', 'Food Network', 'TLC', 'Discovery', 'AMC', 'TNT', 'TBS', 'USA Network',
  'Bravo', 'A&E', 'History', 'Lifetime', 'Hallmark', 'MSNBC', 'FX', 'Comedy Central', 'Paramount Network', 'Travel Channel',
]

export type Phase = 'scheduled' | 'live' | 'paused' | 'cancelled' | 'ended' | 'finalized'
export type Status =
  | 'scheduled' | 'too-early' | 'on-track' | 'ahead' | 'behind' | 'at-risk'
  | 'paused' | 'cancelled' | 'finalizing' | 'final-met' | 'final-under' | 'unknown'
export type View = 'normal' | 'loading' | 'error-cache' | 'error-empty' | 'no-data'

export interface ScenarioDef {
  id: string
  group: 'Campaign phase' | 'Data condition' | 'System'
  label: string
  note: string // what the reviewer should notice
  today: number // day index of "today"
  phase: Phase
  factor?: number // delivery vs plan
  confirmedThrough?: number // last day covered by network logs
  prelimThrough?: number | null // last day covered by ACR estimate (null = ACR unavailable)
  logsReceived?: number
  lateNetworks?: number
  makegood?: { window: string; afterFlight?: boolean }
  revised?: { by: number; on: number; reason: string }
  stopDay?: number // pause or cancel day
  lastVisit?: number
  view?: View
}

export const SCENARIOS: ScenarioDef[] = [
  { id: 'scheduled', group: 'Campaign phase', label: 'P1 · Scheduled', note: 'Before launch: the guarantee and the plan, no zeros and no red. Details are hidden because there is nothing to explain yet.', today: -4, phase: 'scheduled' },
  { id: 'just-launched', group: 'Campaign phase', label: 'P2 · Just launched', note: 'First 72 hours: "Too early to tell" instead of a pace verdict. Only hatched preliminary data, no network logs yet.', today: 2, phase: 'live', factor: 0.95, confirmedThrough: -1, prelimThrough: 1, logsReceived: 0 },
  { id: 'on-track', group: 'Campaign phase', label: 'P3 · Live · On track', note: 'The main state. Expected-by-today follows the spot plan, so it is well below 50% even though half the flight has passed.', today: 20, phase: 'live', factor: 1.02, confirmedThrough: 13, prelimThrough: 19, logsReceived: 17, lastVisit: 13 },
  { id: 'ahead', group: 'Campaign phase', label: 'P4 · Live · Ahead', note: 'Over-delivery is information, not an alarm. The bar scale extends past the guarantee so the forecast never clips.', today: 20, phase: 'live', factor: 1.16, confirmedThrough: 13, prelimThrough: 19, logsReceived: 18 },
  { id: 'behind', group: 'Campaign phase', label: 'P5 · Live · Behind, recovering', note: 'Behind always comes with the fix: makegood spots are scheduled, so the forecast including makegood still meets the guarantee.', today: 20, phase: 'live', factor: 0.88, confirmedThrough: 13, prelimThrough: 19, logsReceived: 17, makegood: { window: 'Nov 24 – Dec 7' } },
  { id: 'at-risk', group: 'Campaign phase', label: 'P6 · Live · At risk', note: 'The only red state while live: the forecast misses the guarantee and no fix is scheduled yet. It names the owner of the next step.', today: 20, phase: 'live', factor: 0.84, confirmedThrough: 13, prelimThrough: 19, logsReceived: 17 },
  { id: 'paused', group: 'Campaign phase', label: 'P7 · Paused', note: 'Status is frozen and the card is muted. Pace and forecast are hidden because they would be misleading.', today: 20, phase: 'paused', factor: 0.98, confirmedThrough: 13, prelimThrough: 16, logsReceived: 18, stopDay: 17 },
  { id: 'cancelled', group: 'Campaign phase', label: 'P8 · Cancelled', note: 'Stopped early: facts only, no "behind", no expected marker, no forecast.', today: 20, phase: 'cancelled', factor: 0.98, confirmedThrough: 13, prelimThrough: 14, logsReceived: 19, stopDay: 15 },
  { id: 'ended', group: 'Campaign phase', label: 'P9 · Ended · awaiting logs', note: 'Flight is over but the last week is still preliminary. The widget says when final numbers are expected.', today: 45, phase: 'ended', factor: 1.02, confirmedThrough: 36, prelimThrough: 41, logsReceived: 12 },
  { id: 'final-met', group: 'Campaign phase', label: 'P10 · Finalized · Met', note: 'Closing state: everything confirmed, the guarantee is met. One sentence the marketer can forward.', today: 62, phase: 'finalized', factor: 1.03, confirmedThrough: 41, prelimThrough: 41, logsReceived: 20 },
  { id: 'final-under', group: 'Campaign phase', label: 'P11 · Finalized · Under', note: 'Under-delivered after reconciliation: the gap and the compensation plan are shown together.', today: 62, phase: 'finalized', factor: 0.96, confirmedThrough: 41, prelimThrough: 41, logsReceived: 20, makegood: { window: 'by Jan 10', afterFlight: true } },
  { id: 'logs-late', group: 'Data condition', label: 'D4 · Logs late', note: 'Expected log delay is neutral. Only an unusual delay gets a warning, and it says who is following up.', today: 20, phase: 'live', factor: 1.02, confirmedThrough: 13, prelimThrough: 19, logsReceived: 15, lateNetworks: 2 },
  { id: 'acr-unavailable', group: 'Data condition', label: 'D5 · ACR unavailable', note: 'No preliminary data: the hatched part disappears and the status is based on confirmed data only, and says so.', today: 20, phase: 'live', factor: 1.02, confirmedThrough: 13, prelimThrough: null, logsReceived: 17 },
  { id: 'revised', group: 'Data condition', label: 'D6 · Revised down', note: 'The number went down since yesterday. The widget explains it before the client asks: before, after, when and why.', today: 20, phase: 'live', factor: 1.02, confirmedThrough: 13, prelimThrough: 19, logsReceived: 17, revised: { by: 1.1, on: 19, reason: 'network logs replaced preliminary estimates for Nov 14–16' } },
  { id: 'loading', group: 'System', label: 'D7 · Loading', note: 'Skeleton repeats the real layout so nothing jumps when data arrives.', today: 20, phase: 'live', view: 'loading' },
  { id: 'error-cache', group: 'System', label: 'D8 · Error, cached data', note: 'Refresh failed: last known data stays visible but muted, with the time it is from and Retry.', today: 20, phase: 'live', factor: 1.02, confirmedThrough: 13, prelimThrough: 19, logsReceived: 17, view: 'error-cache' },
  { id: 'error-empty', group: 'System', label: 'D8 · Error, no data', note: 'Refresh failed and nothing is cached: an error, not an empty state.', today: 20, phase: 'live', view: 'error-empty' },
  { id: 'no-data', group: 'System', label: 'D9 · No access', note: 'No permission for this campaign: explained, with who to contact.', today: 20, phase: 'live', view: 'no-data' },
]

export interface Model {
  def: ScenarioDef
  view: View
  phase: Phase
  status: Status
  todayLabel: string
  dayOfFlight: number
  confirmed: number
  prelim: number
  delivered: number
  expected: number
  pace: number
  projection: number
  projLow: number
  projHigh: number
  projPct: number
  makegoodImps: number
  makegoodSpots: number
  spotsPlannedToDate: number
  spotsAired: number
  preempted: number
  confirmedThroughLabel: string | null
  prelimThroughLabel: string | null
  logsReceived: number
  sinceLastVisit: number | null
  daily: Array<{ day: number; label: string; plan: number; confirmed?: number; prelim?: number; projection?: number }>
  weekly: Array<{ week: string; planned: number; confirmed: number; prelim: number; cumulative: number; pct: number }>
  networks: Array<{ name: string; status: 'received' | 'pending' | 'late'; through: string; aired: number; scheduled: number; preempted: number }>
}

export function buildModel(def: ScenarioDef): Model {
  const G = CAMPAIGN.guarantee
  const N = CAMPAIGN.flightDays
  const today = def.today
  const factor = def.factor ?? 1
  const deliveryEnd = Math.min(N - 1, today - 1, def.stopDay !== undefined ? def.stopDay - 1 : Infinity)
  const actual = PLAN.map((p, d) => (d <= deliveryEnd ? p * factor * noise(d) : 0))

  const confirmedThrough = def.confirmedThrough ?? -1
  const prelimThrough = def.prelimThrough === null ? confirmedThrough : (def.prelimThrough ?? confirmedThrough)
  const confirmed = sum(actual, 0, confirmedThrough)
  const prelim = def.prelimThrough === null ? 0 : sum(actual, confirmedThrough + 1, prelimThrough)
  const delivered = confirmed + prelim
  const dataThrough = Math.max(confirmedThrough, prelimThrough)

  const expected = sum(PLAN, 0, Math.min(dataThrough, deliveryEnd))
  const pace = expected > 0 ? delivered / expected : 0
  const active = def.phase === 'live'
  const remaining = active ? sum(PLAN, today, N - 1) : 0
  const paceAdj = Math.min(1.1, Math.max(0.8, pace || 1))
  // Not-yet-reported days still in the flight are assumed to deliver at the same pace.
  const unreported = def.phase === 'ended' ? 0 : active ? sum(PLAN, dataThrough + 1, today - 1) * paceAdj : 0
  let makegoodImps = 0
  if (def.makegood && !def.makegood.afterFlight) {
    const base = delivered + unreported + remaining * paceAdj
    makegoodImps = Math.max(0, G - base) + 0.4
  }
  if (def.makegood?.afterFlight) makegoodImps = G - delivered
  const projection = def.phase === 'scheduled' ? G : delivered + unreported + remaining * paceAdj + (def.makegood?.afterFlight ? 0 : makegoodImps)
  const spread = def.phase === 'finalized' ? 0 : projection * 0.012 + (remaining + unreported) * 0.06
  const projPct = (projection / G) * 100

  const tooEarly = active && (today < 3 || expected < G * 0.05)
  let status: Status
  if (def.phase === 'scheduled') status = 'scheduled'
  else if (def.phase === 'paused') status = 'paused'
  else if (def.phase === 'cancelled') status = 'cancelled'
  else if (def.phase === 'ended') status = 'finalizing'
  else if (def.phase === 'finalized') status = delivered >= G ? 'final-met' : 'final-under'
  else if (delivered === 0) status = 'unknown'
  else if (tooEarly) status = 'too-early'
  else if (projection < G && !def.makegood) status = 'at-risk'
  else if (pace < 0.9) status = 'behind'
  else if (pace > 1.1) status = 'ahead'
  else status = 'on-track'

  const spotsPlannedToDate = Math.round(sum(PLAN_SPOTS, 0, Math.min(today - 1, deliveryEnd)))
  const preempted = spotsPlannedToDate > 40 ? 4 : spotsPlannedToDate > 0 ? 1 : 0
  const spotsAired = Math.max(0, spotsPlannedToDate - preempted)

  // Chart series (cumulative, millions).
  const daily: Model['daily'] = []
  let planCum = 0
  let actCum = 0
  const projStart = active ? Math.max(dataThrough, 0) : -1
  const deliveredAtProjStart = sum(actual, 0, projStart)
  for (let d = 0; d < N; d++) {
    planCum += PLAN[d]
    actCum += actual[d]
    const row: Model['daily'][number] = { day: d, label: fmtDay(d), plan: +planCum.toFixed(3) }
    if (d <= confirmedThrough) row.confirmed = +actCum.toFixed(3)
    if (def.prelimThrough !== null && d >= confirmedThrough && d <= prelimThrough && d > -1) row.prelim = +actCum.toFixed(3)
    if (active && d >= projStart && projStart >= 0) {
      const t = (d - projStart) / (N - 1 - projStart || 1)
      row.projection = +(deliveredAtProjStart + (projection - deliveredAtProjStart) * t).toFixed(3)
    }
    daily.push(row)
  }

  const weekly: Model['weekly'] = []
  let cum = 0
  for (let w = 0; w < 6; w++) {
    const from = w * 7
    const to = from + 6
    const c = sum(actual, from, Math.min(to, confirmedThrough))
    const p = def.prelimThrough === null ? 0 : sum(actual, Math.max(from, confirmedThrough + 1), Math.min(to, prelimThrough))
    cum += c + p
    weekly.push({ week: `${fmtDay(from)} – ${fmtDay(to)}`, planned: sum(PLAN, from, to), confirmed: c, prelim: p, cumulative: cum, pct: (cum / G) * 100 })
  }

  const logsReceived = def.logsReceived ?? 0
  const late = def.lateNetworks ?? 0
  const perNet = spotsPlannedToDate / CAMPAIGN.networks
  const rank = { late: 0, pending: 1, received: 2 } as const
  const networks: Model['networks'] = NETWORK_NAMES.map((name, i): Model['networks'][number] => {
    const scheduled = Math.round(perNet * (0.7 + ((i * 37) % 60) / 100))
    const pre = i < preempted ? 1 : 0
    if (i >= CAMPAIGN.networks - late) return { name, status: 'late', through: 'No logs since Nov 2', aired: scheduled - pre, scheduled, preempted: pre }
    if (i >= logsReceived) return { name, status: 'pending', through: confirmedThrough >= 3 ? `${fmtDay(confirmedThrough - 3)} · usually 5–10 days` : 'Expected in 5–10 days', aired: scheduled - pre, scheduled, preempted: pre }
    return { name, status: 'received', through: fmtDay(confirmedThrough), aired: scheduled - pre, scheduled, preempted: pre }
  }).sort((a, b) => rank[a.status] - rank[b.status])

  const sinceLastVisit = def.lastVisit !== undefined ? delivered - sum(actual, 0, def.lastVisit - 1) : null

  return {
    def,
    view: def.view ?? 'normal',
    phase: def.phase,
    status,
    todayLabel: today >= 0 && today < N ? fmtDay(today) : fmtDay(today),
    dayOfFlight: Math.min(N, Math.max(0, today + 1)),
    confirmed,
    prelim,
    delivered,
    expected,
    pace,
    projection,
    projLow: projection - spread,
    projHigh: projection + spread,
    projPct,
    makegoodImps,
    makegoodSpots: def.makegood ? Math.round(makegoodImps / 0.1) : 0,
    spotsPlannedToDate,
    spotsAired,
    preempted,
    confirmedThroughLabel: confirmedThrough >= 0 ? fmtDay(confirmedThrough) : null,
    prelimThroughLabel: def.prelimThrough === null || prelimThrough <= confirmedThrough ? null : fmtDay(prelimThrough),
    logsReceived,
    sinceLastVisit,
    daily,
    weekly,
    networks,
  }
}
