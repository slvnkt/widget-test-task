// Single-campaign delivery widget, rendered as the Campaigns drawer body (the drawer is the container: no Card).
import type { ReactNode } from 'react'
import { Badge } from '@ds/components/Badge'
import { Button } from '@ds/components/Button'
import { Divider } from '@ds/components/Divider'
import { EmptyState } from '@ds/components/EmptyState'
import { Skeleton } from '@ds/components/Skeleton'
import { Stat, type StatProps } from '@ds/components/Stat'
import { CAMPAIGN, fmtM, type Model } from '../data/campaign'
import { deliveryIn, periodLabel, windowArea, type Period } from '../data/period'
import type { Campaign } from '../data/rows'
import { HINTS, noteLine, signedM, STATUS_BADGE, UPDATED_AT } from './copy'
import { DeliveryChart } from './DeliveryChart'
import { Details } from './Details'

export type DetailsState = 'ready' | 'loading' | 'error'

function footnote(m: Model) {
  return [
    m.confirmedThroughLabel && `Confirmed by network logs through ${m.confirmedThroughLabel}`,
    m.prelimThroughLabel && `Preliminary through ${m.prelimThroughLabel}`,
    UPDATED_AT,
  ].filter(Boolean).join(' · ')
}

const pctOf = (v: number, of: number) => `${Math.round((v / of) * 100)}%`

/** Tile 1: lifecycle and pace in one Stat, the only status badge in the drawer (§4.2). */
function tile1(m: Model): StatProps {
  const badge = STATUS_BADGE[m.status]
  const withBadge = (text?: ReactNode) => (
    <span className="kpis__status">
      <Badge variant={badge.variant} size="sm" dot>{badge.label}</Badge>
      {text}
    </span>
  )
  const N = CAMPAIGN.flightDays
  switch (m.status) {
    case 'scheduled':
      return { label: 'Starts in', value: -m.def.today, unit: 'days', secondary: withBadge() }
    case 'too-early':
      // tooEarly in the model lasts until day 3 of the flight
      return { label: 'Projected final delivery', value: '—', secondary: withBadge(`First forecast on ${m.fmt(3)}`), hint: HINTS.projected }
    case 'paused':
      return { label: 'Paused since', value: m.fmt(m.def.stopDay ?? m.def.today), secondary: withBadge('Forecast hidden while paused') }
    case 'cancelled':
      return { label: 'Stopped on', value: m.fmt(m.def.stopDay ?? m.def.today), secondary: withBadge() }
    case 'finalizing':
      // networks send logs 5–10 days after air: final numbers 10 days after the last flight day
      return { label: 'Delivered, awaiting final logs', value: pctOf(m.delivered, m.guarantee), unit: 'of guarantee', secondary: withBadge(`Final numbers by ${m.fmt(N - 1 + 10)}`) }
    case 'final-met':
    case 'final-under':
      return { label: 'Final delivery', value: pctOf(m.delivered, m.guarantee), unit: 'of guarantee', secondary: withBadge() }
    default:
      return {
        label: 'Projected final delivery',
        value: `${Math.round(m.projPct)}%`,
        unit: 'of guarantee',
        secondary: withBadge(`${fmtM(m.projection)} projected${m.status === 'behind' && m.makegoodImps > 0 ? ' with makegood' : ''}`),
        hint: HINTS.projected,
      }
  }
}

/** Tile 2: delivered in the selected period; Flight to date keeps the per-state secondary line. */
function tile2(c: Campaign, period: Period): StatProps {
  const { m } = c
  if (m.status === 'scheduled') return { label: 'Delivered to date', value: '—' }
  if (period !== 'ftd') {
    const d = deliveryIn(c, period)
    const label = `Delivered, ${periodLabel(period).toLowerCase()}`
    if (!d.hasData) return { label, value: '—', secondary: 'Nothing aired in this period', hint: HINTS.delivered }
    const gap = Math.round((d.delivered - d.target) * 10) / 10
    const secondary = gap === 0 ? `In line with plan of ${fmtM(d.target)}` : `${signedM(gap)} vs plan of ${fmtM(d.target)}`
    return { label, value: fmtM(d.delivered), secondary, hint: HINTS.delivered }
  }
  const secondary: Partial<Record<Model['status'], string | undefined>> = {
    'too-early': 'Preliminary only',
    paused: `${pctOf(m.delivered, m.guarantee)} of guarantee`,
    cancelled: `${pctOf(m.delivered, m.guarantee)} of guarantee`,
    finalizing: undefined,
    'final-met': `${signedM(m.delivered - m.guarantee)} over guarantee`,
    'final-under': `${signedM(m.delivered - m.guarantee)} short`,
  }
  return {
    label: 'Delivered to date',
    value: fmtM(m.delivered),
    secondary: m.status in secondary ? secondary[m.status] : `${signedM(m.delivered - m.expected)} vs plan of ${fmtM(m.expected)}`,
    hint: HINTS.delivered,
  }
}

function tile3(m: Model): StatProps {
  if (m.status === 'scheduled') return { label: 'Spots aired', value: '—' }
  return {
    label: 'Spots aired',
    value: m.spotsAired,
    unit: `/ ${m.spotsPlannedToDate}`,
    secondary: `${m.preempted} preempted`,
    hint: `Spots scheduled through ${m.fmt(Math.min(m.def.today - 1, m.deliveryEnd))}.`,
  }
}

function tile4(m: Model): StatProps {
  if (m.status === 'scheduled') return { label: 'Network logs', value: '—' }
  const late = m.def.lateNetworks ?? 0
  const pending = m.networksTotal - m.logsReceived - late
  const secondary =
    m.status === 'too-early' ? 'Logs start in 5–10 days'
      : pending + late === 0 ? 'All received'
        : late > 0 ? `${pending} pending, ${late} late`
          : `${pending} pending`
  return { label: 'Network logs', value: m.logsReceived, unit: `/ ${m.networksTotal}`, secondary, hint: HINTS.logs }
}

function Kpis({ tiles }: { tiles: StatProps[] }) {
  const cell = (t: StatProps, i: number) => (
    <div className="kpis__cell" key={i}>
      <Stat size="md" {...t} />
    </div>
  )
  return (
    <div className="kpis">
      {cell(tiles[0], 0)}
      <Divider orientation="vertical" />
      {cell(tiles[1], 1)}
      <Divider className="kpis__row-divider" />
      {cell(tiles[2], 2)}
      <Divider orientation="vertical" />
      {cell(tiles[3], 3)}
    </div>
  )
}

export function DeliveryWidget({ c, period, state, onRetry }: { c: Campaign; period: Period; state: DetailsState; onRetry: () => void }) {
  if (state === 'error') {
    return (
      <EmptyState
        variant="error"
        size="compact"
        title="Couldn't load this campaign"
        description="The list is fine; only this campaign's details failed."
        actions={<Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
      />
    )
  }

  if (state === 'loading') {
    const loading = { label: 'Loading', value: '', loading: true }
    return (
      <div className="delivery" aria-busy="true">
        <Kpis tiles={[loading, loading, loading, loading]} />
        <Divider spacing="lg" />
        <h3 className="delivery__chart-title">Cumulative impressions</h3>
        <Skeleton shape="block" height={240} />
        <p className="delivery__footnote"><Skeleton size="sm" width={320} /></p>
      </div>
    )
  }

  const { m } = c
  const note = noteLine(m)
  return (
    <div className="delivery">
      <Kpis tiles={[tile1(m), tile2(c, period), tile3(m), tile4(m)]} />
      {note && <p className="delivery__note">{note}</p>}
      <Divider spacing="lg" />
      <h3 className="delivery__chart-title">Cumulative impressions</h3>
      <DeliveryChart m={m} area={windowArea(c, period)} areaLabel={periodLabel(period)} />
      <p className="delivery__footnote">{footnote(m)}</p>
      {m.status !== 'scheduled' && <Details m={m} />}
    </div>
  )
}
