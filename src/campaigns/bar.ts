// Segmented Delivery bar for one campaign row (millions).
import type { ProgressMarker, ProgressSegment } from '@ds/components/Progress'
import { fmtM } from '../data/campaign'
import { deliveryIn, periodRange, type Delivery, type Period } from '../data/period'
import type { Campaign } from '../data/rows'

export interface Bar {
  d: Delivery
  segments: ProgressSegment[]
  markers: ProgressMarker[]
  max: number
  muted: boolean
  /** Delivered ÷ target, rounded; null renders "—". */
  pct: number | null
  aria: string
}

export function barFor(c: Campaign, period: Period): Bar {
  const d = deliveryIn(c, period)
  const ftd = period === 'ftd'
  // Flight to date: guarantee line at the same x in every row (max = 110%); windows: plan for the window, max = 120%.
  const max = (ftd ? 1.1 : 1.2) * d.target
  const segments: ProgressSegment[] = []
  if (d.confirmed > 0) segments.push({ value: d.confirmed, fill: 'solid', label: `Confirmed ${fmtM(d.confirmed)}` })
  if (d.prelim > 0) segments.push({ value: d.prelim, fill: 'hatch', label: `Preliminary ${fmtM(d.prelim)}` })
  const markers: ProgressMarker[] = []
  // Plan-to-date marker only while live.
  if (ftd && c.m.phase === 'live' && d.expected) markers.push({ value: d.expected, type: 'marker', label: `Plan to date ${fmtM(d.expected)}` })
  if (ftd || d.hasData) markers.push({ value: d.target, type: 'target', label: `${ftd ? 'Guarantee' : 'Plan'} ${fmtM(d.target)}` })

  const parts = [d.confirmed > 0 && `${fmtM(d.confirmed)} confirmed`, d.prelim > 0 && `${fmtM(d.prelim)} preliminary`].filter(Boolean).join(', ')
  const range = periodRange(period)
  let aria: string
  if (!d.hasData) aria = ftd ? `Not started. ${fmtM(d.target)} guarantee.` : `Nothing aired in ${range}.`
  else if (ftd) aria = `${fmtM(d.delivered)} delivered of ${fmtM(d.target)} guarantee: ${parts}.${d.expected && c.m.phase === 'live' ? ` Plan to date ${fmtM(d.expected)}.` : ''}`
  else aria = `${fmtM(d.delivered)} delivered in ${range} vs plan of ${fmtM(d.target)}${parts ? `: ${parts}` : ''}.`

  return {
    d,
    segments,
    markers,
    max,
    muted: c.m.phase === 'paused',
    pct: d.hasData ? Math.round((d.delivered / d.target) * 100) : null,
    aria,
  }
}
