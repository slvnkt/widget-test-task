// Delivered / Progress / vs plan values for one campaign row (millions).
import { fmtM } from '../data/campaign'
import { deliveryIn, periodRange, type Period } from '../data/period'
import type { Campaign } from '../data/rows'

export interface RowMetrics {
  delivered: number
  /** Guarantee (Flight to date) or plan for the window: the bar's max. */
  target: number
  hasData: boolean
  /** Plan to date for the ▼ marker: Flight to date, live rows only. */
  expected?: number
  muted: boolean
  /** Delivered ÷ target, rounded; null renders "—". */
  pct: number | null
  /** Signed gap vs plan to date (live), guarantee (ended) or window plan; null renders "—". */
  gap: number | null
  aria: string
}

export function rowMetrics(c: Campaign, period: Period): RowMetrics {
  const { m } = c
  const d = deliveryIn(c, period)
  const ftd = period === 'ftd'
  const live = m.phase === 'live'
  const noGap = m.status === 'paused' || m.status === 'too-early' || m.status === 'scheduled' || m.status === 'cancelled' || !d.hasData
  let gap: number | null = null
  if (!noGap) {
    if (!ftd) gap = d.delivered - d.target
    else if (live && d.expected) gap = d.delivered - d.expected
    else if (m.phase === 'ended' || m.phase === 'finalized') gap = d.delivered - d.target
  }
  const expected = ftd && live && d.expected ? d.expected : undefined

  const range = periodRange(period)
  let aria: string
  if (!d.hasData) aria = ftd ? `Not started. ${fmtM(d.target)} guarantee.` : `Nothing aired in ${range}.`
  else if (ftd) aria = `${fmtM(d.delivered)} delivered of ${fmtM(d.target)} guarantee.${expected ? ` Plan to date ${fmtM(expected)}.` : ''}`
  else aria = `${fmtM(d.delivered)} delivered in ${range} of ${fmtM(d.target)} plan.`

  return {
    delivered: d.delivered,
    target: d.target,
    hasData: d.hasData,
    expected,
    muted: m.phase === 'paused',
    pct: d.hasData ? Math.round((d.delivered / d.target) * 100) : null,
    gap: gap === null ? null : Math.round(gap * 10) / 10,
    aria,
  }
}

/** "+0.4 M" / "−2.6 M" with a true minus sign. */
export const fmtGap = (v: number) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(1)} M`
