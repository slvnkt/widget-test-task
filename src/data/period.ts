// Period adapter for the Campaigns card and the drawer (not part of the model).
// Windows end yesterday: today has no data yet, so including it would make every window look short.
import { CAMPAIGN, dateOf, fmtDay } from './campaign'
import { TODAY, type Campaign } from './rows'

export type Period = 'ftd' | '7d' | '14d' | '30d'

export const PERIODS: Array<{ value: Period; label: string; days?: number }> = [
  { value: 'ftd', label: 'Flight to date' },
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '14d', label: 'Last 14 days', days: 14 },
  { value: '30d', label: 'Last 30 days', days: 30 },
]

export const isPeriod = (v: string | null): v is Period => PERIODS.some(p => p.value === v)

/** Window in real day indexes (Nov 3 = 0), or null for Flight to date. */
export function windowOf(period: Period) {
  const days = PERIODS.find(p => p.value === period)?.days
  return days ? { from: TODAY - days, to: TODAY - 1 } : null
}

/** "Nov 16 – 22" or "Oct 24 – Nov 22". */
export function periodRange(period: Period) {
  const w = windowOf(period)
  if (!w) return ''
  const a = dateOf(w.from)
  const b = dateOf(w.to)
  return a.getMonth() === b.getMonth() ? `${fmtDay(w.from)} – ${b.getDate()}` : `${fmtDay(w.from)} – ${fmtDay(w.to)}`
}

export const periodLabel = (period: Period) => PERIODS.find(p => p.value === period)!.label

export interface Delivery {
  confirmed: number
  prelim: number
  delivered: number
  /** Guarantee (Flight to date) or plan for the window. */
  target: number
  /** Plan to date, Flight to date only (the marker). */
  expected?: number
  /** False when nothing could air in the period: render "—". */
  hasData: boolean
}

const sum = (arr: number[], from: number, to: number) => {
  let s = 0
  for (let d = Math.max(0, from); d <= Math.min(arr.length - 1, to); d++) s += arr[d]
  return s
}

export function deliveryIn(c: Campaign, period: Period): Delivery {
  const { m } = c
  const w = windowOf(period)
  if (!w) {
    return { confirmed: m.confirmed, prelim: m.prelim, delivered: m.delivered, target: m.guarantee, expected: m.expected, hasData: m.phase !== 'scheduled' }
  }
  // Real days → this row's model days.
  const from = w.from - c.startOffset
  const to = w.to - c.startOffset
  const confirmed = sum(m.actual, from, Math.min(to, m.confirmedThrough))
  const prelim = m.prelimThrough === null ? 0 : sum(m.actual, Math.max(from, m.confirmedThrough + 1), Math.min(to, m.prelimThrough))
  // Plan counts only days that can have data: up to data-through and before the stop day (the model's `expected` rule).
  const planTo = Math.min(to, m.dataThrough, m.deliveryEnd)
  const target = sum(m.plan, from, planTo)
  return { confirmed, prelim, delivered: confirmed + prelim, target, hasData: planTo >= Math.max(0, from) && target > 0 }
}

/** Highlighted window in the drawer chart, as model day indexes clipped to the flight; null when they don't overlap. */
export function windowArea(c: Campaign, period: Period) {
  const w = windowOf(period)
  if (!w) return null
  const x1 = Math.max(0, w.from - c.startOffset)
  const x2 = Math.min(CAMPAIGN.flightDays - 1, w.to - c.startOffset)
  return x1 <= x2 ? { x1, x2 } : null
}
