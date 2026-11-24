// Delivered / Gap values for one campaign row (millions). Shared with the drawer's tile 2.
import { deliveryIn, type Period } from '../data/period'
import type { Campaign } from '../data/rows'

const round1 = (v: number) => Math.round(v * 10) / 10

export interface Gap {
  /** Signed, from the rounded display values, so "6.2M of 6.2M" never shows "+0.1M". */
  value: number
  /** What the gap is measured against. */
  vs: 'plan to date' | 'goal' | 'plan'
  ref: number
}

export interface RowMetrics {
  delivered: number
  confirmed: number
  prelim: number
  /** Goal (Flight to date) or plan for the window: the ring's max. */
  target: number
  hasData: boolean
  /** Plan to date for the plan marker: Flight to date, live rows only. */
  expected?: number
  muted: boolean
  /** null renders "—": paused, just launched, scheduled, cancelled, nothing aired in the window. */
  gap: Gap | null
}

export function rowMetrics(c: Campaign, period: Period): RowMetrics {
  const { m } = c
  const d = deliveryIn(c, period)
  const ftd = period === 'ftd'
  const live = m.phase === 'live'
  const expected = ftd && live && d.expected ? d.expected : undefined

  const noGap = m.status === 'paused' || m.status === 'too-early' || m.status === 'scheduled' || m.status === 'cancelled' || !d.hasData
  let ref: Pick<Gap, 'vs' | 'ref'> | null = null
  if (!noGap) {
    if (!ftd) ref = { vs: 'plan', ref: d.target }
    else if (expected) ref = { vs: 'plan to date', ref: expected }
    else if (m.phase === 'ended' || m.phase === 'finalized') ref = { vs: 'goal', ref: d.target }
  }
  const gap = ref && { ...ref, value: round1(round1(d.delivered) - round1(ref.ref)) }

  return {
    delivered: d.delivered,
    confirmed: d.confirmed,
    prelim: d.prelim,
    target: d.target,
    hasData: d.hasData,
    expected,
    muted: m.phase === 'paused',
    gap,
  }
}
