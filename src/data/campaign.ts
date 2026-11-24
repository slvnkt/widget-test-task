// Mock campaign model. Every number in the widget is derived here from one daily plan,
// so all states of the same campaign stay consistent with each other.
// Other campaigns reuse the same plan: impressions and spots scale with the guarantee,
// and date labels shift with the flight start (`ModelOptions`); the day-index maths is unchanged.

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
/** "Nov 14–16" within a month, "Oct 30–Nov 2" across months (unspaced, for running text). */
export const fmtDayRange = (from: number, to: number) => {
  const a = dateOf(from)
  const b = dateOf(to)
  return a.getMonth() === b.getMonth() ? `${fmtDay(from)}–${b.getDate()}` : `${fmtDay(from)}–${fmtDay(to)}`
}

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

export interface ScenarioDef {
  id: string
  today: number // day index of "today"
  phase: Phase
  factor?: number // delivery vs plan
  confirmedThrough?: number // last day covered by network logs
  prelimThrough?: number | null // last day covered by ACR estimate (null = ACR unavailable)
  logsReceived?: number
  lateNetworks?: number
  makegood?: { from?: number; to: number; afterFlight?: boolean } // day indexes; only `to` = "by" date
  revised?: { by: number; on: number; from: number; to: number } // by: M at 48M scale; logs replaced preliminary for days from–to
  lastLogDay?: number // late networks have sent nothing after this day
  stopDay?: number // pause or cancel day
  lastVisit?: number
}

export const SCENARIOS: ScenarioDef[] = [
  { id: 'scheduled', today: -4, phase: 'scheduled' },
  { id: 'just-launched', today: 2, phase: 'live', factor: 0.95, confirmedThrough: -1, prelimThrough: 1, logsReceived: 0 },
  { id: 'on-track', today: 20, phase: 'live', factor: 1.02, confirmedThrough: 13, prelimThrough: 19, logsReceived: 17, lastVisit: 13 },
  { id: 'ahead', today: 20, phase: 'live', factor: 1.16, confirmedThrough: 13, prelimThrough: 19, logsReceived: 18 },
  { id: 'behind', today: 20, phase: 'live', factor: 0.88, confirmedThrough: 13, prelimThrough: 19, logsReceived: 17, makegood: { from: 21, to: 34 } },
  { id: 'at-risk', today: 20, phase: 'live', factor: 0.84, confirmedThrough: 13, prelimThrough: 19, logsReceived: 17 },
  { id: 'paused', today: 20, phase: 'paused', factor: 0.98, confirmedThrough: 13, prelimThrough: 16, logsReceived: 18, stopDay: 17 },
  { id: 'cancelled', today: 20, phase: 'cancelled', factor: 0.98, confirmedThrough: 13, prelimThrough: 14, logsReceived: 19, stopDay: 15 },
  { id: 'ended', today: 45, phase: 'ended', factor: 1.02, confirmedThrough: 36, prelimThrough: 41, logsReceived: 12 },
  { id: 'final-met', today: 62, phase: 'finalized', factor: 1.03, confirmedThrough: 41, prelimThrough: 41, logsReceived: 20 },
  { id: 'final-under', today: 62, phase: 'finalized', factor: 0.96, confirmedThrough: 41, prelimThrough: 41, logsReceived: 20, makegood: { to: 68, afterFlight: true } },
  { id: 'logs-late', today: 20, phase: 'live', factor: 1.02, confirmedThrough: 13, prelimThrough: 19, logsReceived: 15, lateNetworks: 2, lastLogDay: -1 },
  { id: 'acr-unavailable', today: 20, phase: 'live', factor: 1.02, confirmedThrough: 13, prelimThrough: null, logsReceived: 17 },
  { id: 'revised', today: 20, phase: 'live', factor: 1.02, confirmedThrough: 13, prelimThrough: 19, logsReceived: 17, revised: { by: 1.1, on: 19, from: 11, to: 13 } },
]

export interface ModelOptions {
  /** guarantee / 48: multiplies every impression value and the spot plan. @default 1 */
  scale?: number
  /** Days the flight starts after Nov 3; shifts date labels only. @default 0 */
  startOffset?: number
}

export interface Model {
  def: ScenarioDef
  phase: Phase
  status: Status
  guarantee: number
  networksTotal: number
  /** Date label of a model day index, shifted to this campaign's flight. */
  fmt: (day: number) => string
  fmtRange: (from: number, to: number) => string
  /** Day-level series for period maths (millions, scaled). */
  plan: number[]
  actual: number[]
  confirmedThrough: number
  prelimThrough: number | null
  dataThrough: number
  deliveryEnd: number
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

export function buildModel(def: ScenarioDef, { scale = 1, startOffset = 0 }: ModelOptions = {}): Model {
  const G = CAMPAIGN.guarantee * scale
  const N = CAMPAIGN.flightDays
  const fmt = (day: number) => fmtDay(day + startOffset)
  const plan = PLAN.map(p => p * scale)
  const today = def.today
  const factor = def.factor ?? 1
  const deliveryEnd = Math.min(N - 1, today - 1, def.stopDay !== undefined ? def.stopDay - 1 : Infinity)
  const actual = plan.map((p, d) => (d <= deliveryEnd ? p * factor * noise(d) : 0))

  const confirmedThrough = def.confirmedThrough ?? -1
  const prelimThrough = def.prelimThrough === null ? confirmedThrough : (def.prelimThrough ?? confirmedThrough)
  const confirmed = sum(actual, 0, confirmedThrough)
  const prelim = def.prelimThrough === null ? 0 : sum(actual, confirmedThrough + 1, prelimThrough)
  const delivered = confirmed + prelim
  const dataThrough = Math.max(confirmedThrough, prelimThrough)

  const expected = sum(plan, 0, Math.min(dataThrough, deliveryEnd))
  const pace = expected > 0 ? delivered / expected : 0
  const active = def.phase === 'live'
  const remaining = active ? sum(plan, today, N - 1) : 0
  const paceAdj = Math.min(1.1, Math.max(0.8, pace || 1))
  // Not-yet-reported days still in the flight are assumed to deliver at the same pace.
  const unreported = def.phase === 'ended' ? 0 : active ? sum(plan, dataThrough + 1, today - 1) * paceAdj : 0
  let makegoodImps = 0
  if (def.makegood && !def.makegood.afterFlight) {
    const base = delivered + unreported + remaining * paceAdj
    makegoodImps = Math.max(0, G - base) + 0.4 * scale
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

  const spotsPlannedToDate = Math.round(sum(PLAN_SPOTS, 0, Math.min(today - 1, deliveryEnd)) * scale)
  const preempted = spotsPlannedToDate > 40 ? 4 : spotsPlannedToDate > 0 ? 1 : 0
  const spotsAired = Math.max(0, spotsPlannedToDate - preempted)

  // Chart series (cumulative, millions).
  const daily: Model['daily'] = []
  let planCum = 0
  let actCum = 0
  const projStart = active ? Math.max(dataThrough, 0) : -1
  const deliveredAtProjStart = sum(actual, 0, projStart)
  for (let d = 0; d < N; d++) {
    planCum += plan[d]
    actCum += actual[d]
    const row: Model['daily'][number] = { day: d, label: fmt(d), plan: +planCum.toFixed(3) }
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
    weekly.push({ week: `${fmt(from)} – ${fmt(to)}`, planned: sum(plan, from, to), confirmed: c, prelim: p, cumulative: cum, pct: (cum / G) * 100 })
  }

  // Smaller campaigns buy fewer networks: the network count and logs received scale with the guarantee.
  const networksTotal = Math.min(CAMPAIGN.networks, Math.round(CAMPAIGN.networks * scale))
  const late = def.lateNetworks ?? 0
  const logsReceived = Math.min(networksTotal - late, Math.round(((def.logsReceived ?? 0) / CAMPAIGN.networks) * networksTotal))
  const names = NETWORK_NAMES.slice(0, networksTotal)
  // Split spotsPlannedToDate across networks by weight (largest remainder), so the table sums to tile 3.
  const netW = names.map((_, i) => 0.7 + ((i * 37) % 60) / 100)
  const netWSum = netW.reduce((a, b) => a + b, 0)
  const rawShare = netW.map(w => (spotsPlannedToDate * w) / netWSum)
  const netSpots = rawShare.map(Math.floor)
  const leftover = spotsPlannedToDate - netSpots.reduce((a, b) => a + b, 0)
  rawShare.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac).slice(0, leftover).forEach(({ i }) => netSpots[i]++)
  const rank = { late: 0, pending: 1, received: 2 } as const
  const networks: Model['networks'] = names.map((name, i): Model['networks'][number] => {
    const scheduled = netSpots[i]
    const pre = i < preempted ? Math.min(1, scheduled) : 0
    if (i >= networksTotal - late) return { name, status: 'late', through: (def.lastLogDay ?? -1) < 0 ? 'No logs yet' : `No logs since ${fmt(def.lastLogDay ?? -1)}`, aired: scheduled - pre, scheduled, preempted: pre }
    if (i >= logsReceived) return { name, status: 'pending', through: confirmedThrough >= 3 ? fmt(confirmedThrough - 3) : '—', aired: scheduled - pre, scheduled, preempted: pre }
    return { name, status: 'received', through: fmt(confirmedThrough), aired: scheduled - pre, scheduled, preempted: pre }
  }).sort((a, b) => rank[a.status] - rank[b.status])

  const sinceLastVisit = def.lastVisit !== undefined ? delivered - sum(actual, 0, def.lastVisit - 1) : null

  return {
    def,
    phase: def.phase,
    status,
    guarantee: G,
    networksTotal,
    fmt,
    fmtRange: (from: number, to: number) => fmtDayRange(from + startOffset, to + startOffset),
    plan,
    actual,
    confirmedThrough,
    prelimThrough: def.prelimThrough === null ? null : prelimThrough,
    dataThrough,
    deliveryEnd,
    todayLabel: today >= 0 && today < N ? fmt(today) : fmt(today),
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
    confirmedThroughLabel: confirmedThrough >= 0 ? fmt(confirmedThrough) : null,
    prelimThroughLabel: def.prelimThrough === null || prelimThrough <= confirmedThrough ? null : fmt(prelimThrough),
    logsReceived,
    sinceLastVisit,
    daily,
    weekly,
    networks,
  }
}
