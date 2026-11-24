// Single-campaign delivery widget, rendered as the Campaigns drawer body (the drawer is the container: no Card).
import type { ReactNode } from 'react'
import { Button } from '@ds/components/Button'
import { Card, CardHeader } from '@ds/components/Card'
import { EmptyState } from '@ds/components/EmptyState'
import { Skeleton } from '@ds/components/Skeleton'
import { Stat, type StatProps } from '@ds/components/Stat'
import { CAMPAIGN, fmtM, type Model } from '../data/campaign'
import { deliveryIn, periodLabel, windowArea, type Period } from '../data/period'
import type { Campaign } from '../data/rows'
import { StatusIcon } from '../campaigns/StatusIcon'
import { rowMetrics } from '../campaigns/bar'
import { HINTS, noteLine, signedM } from './copy'
import { DeliveryChart } from './DeliveryChart'
import { Details } from './Details'

export type DetailsState = 'ready' | 'loading' | 'error'

const pctOf = (v: number, of: number) => `${Math.round((v / of) * 100)}%`

/** Tile 1: lifecycle and pace in one Stat, the only status in the drawer (§4.2). */
function tile1(m: Model): StatProps {
  const withBadge = (text?: ReactNode) => (
    <span className="kpis__status">
      <StatusIcon status={m.status} label />
      {text && <span>{'\u00a0· '}{text}</span>}
    </span>
  )
  const N = CAMPAIGN.flightDays
  switch (m.status) {
    case 'scheduled':
      return { label: 'Starts in', value: -m.def.today, unit: 'days', secondary: withBadge() }
    case 'too-early':
      // tooEarly in the model lasts until day 3 of the flight
      return { label: 'Projected at flight end', value: '—', secondary: withBadge(`First forecast on ${m.fmt(3)}`), hint: HINTS.projected }
    case 'paused':
      return { label: 'Projected at flight end', value: '—', secondary: withBadge(`since ${m.fmt(m.def.stopDay ?? m.def.today)}`), hint: HINTS.projected }
    case 'cancelled':
      return { label: 'Stopped on', value: m.fmt(m.def.stopDay ?? m.def.today), secondary: withBadge() }
    case 'finalizing':
      // networks send logs 5–10 days after air: final numbers 10 days after the last flight day
      return { label: 'Delivered, awaiting final logs', value: pctOf(m.delivered, m.guarantee), unit: 'of goal', secondary: withBadge(`Final numbers by ${m.fmt(N - 1 + 10)}`) }
    case 'final-met':
    case 'final-under':
      return { label: 'Final delivery', value: pctOf(m.delivered, m.guarantee), unit: 'of goal', secondary: withBadge() }
    default:
      return {
        label: 'Projected at flight end',
        value: `${Math.round(m.projPct)}%`,
        unit: 'of goal',
        secondary: withBadge(`${fmtM(m.projection)} projected${m.status === 'behind' && m.makegoodImps > 0 ? ' with makegood' : ''}`),
        hint: HINTS.projected,
      }
  }
}

/** Tile 2: delivered in the selected period. The gap uses the table's rule (rowMetrics), so both show the same thing. */
function tile2(c: Campaign, period: Period): StatProps {
  const { m } = c
  if (m.status === 'scheduled') return { label: 'Delivered to date', value: '—' }
  const r = rowMetrics(c, period)
  const gap = r.gap
  if (period !== 'ftd') {
    const label = `Delivered, ${periodLabel(period).toLowerCase()}`
    if (!r.hasData) return { label, value: '—', secondary: 'Nothing aired in this period', hint: HINTS.delivered }
    const secondary = !gap ? `Plan ${fmtM(r.target)}` : gap.value === 0 ? `In line with plan (${fmtM(gap.ref)})` : `${signedM(gap.value)} vs plan (${fmtM(gap.ref)})`
    return { label, value: fmtM(r.delivered), secondary, hint: HINTS.delivered }
  }
  if (m.phase === 'finalized') {
    return { label: 'Delivered', value: fmtM(m.delivered), secondary: m.status === 'final-under' && gap ? `${fmtM(Math.abs(gap.value))} short of goal` : undefined, hint: HINTS.delivered }
  }
  const noGap: Partial<Record<Model['status'], string>> = {
    'too-early': 'Preliminary only',
    paused: `${pctOf(m.delivered, m.guarantee)} of goal`,
    cancelled: `${pctOf(m.delivered, m.guarantee)} of goal`,
  }
  return {
    label: 'Delivered to date',
    value: fmtM(m.delivered),
    secondary: gap ? `${signedM(gap.value)} vs ${gap.vs} (${fmtM(gap.ref)})` : noGap[m.status],
    hint: HINTS.delivered,
  }
}

// Tiles 3 and 4 stay flight-level; with a period window they say so.
const flightLevel = (period: Period, text: string) => (period === 'ftd' ? text : `Flight to date · ${text}`)

function tile3(m: Model, period: Period): StatProps {
  if (m.status === 'scheduled') return { label: 'Spots planned', value: Math.round(CAMPAIGN.totalSpots * (m.guarantee / CAMPAIGN.guarantee)) }
  return {
    label: 'Spots aired',
    value: m.spotsAired,
    unit: `/ ${m.spotsPlannedToDate}`,
    secondary: flightLevel(period, `${m.preempted} preempted`),
    hint: `Spots scheduled through ${m.fmt(Math.min(m.def.today - 1, m.deliveryEnd))}.`,
  }
}

function tile4(m: Model, period: Period): StatProps {
  if (m.status === 'scheduled') return { label: 'Networks', value: m.networksTotal }
  const late = m.def.lateNetworks ?? 0
  const pending = m.networksTotal - m.logsReceived - late
  const secondary =
    m.status === 'too-early' ? 'Logs start in 5–10 days'
      : pending + late === 0 ? 'All received'
        : late > 0 ? `${pending} pending, ${late} late`
          : `${pending} pending`
  return { label: 'Network logs', value: m.logsReceived, unit: `/ ${m.networksTotal}`, secondary: flightLevel(period, secondary), hint: HINTS.logs }
}

// 2×2 outlined cards, equal heights (grid rows stretch).
function Kpis({ tiles }: { tiles: StatProps[] }) {
  return (
    <div className="kpis">
      {tiles.map((t, i) => (
        <Card key={i} variant="outlined" padding="md" className="kpis__card">
          <Stat size="md" {...t} />
        </Card>
      ))}
    </div>
  )
}

// ── 4. Chart in its own outlined card; the note sits under it, outside.
function ChartCard({ children }: { children: ReactNode }) {
  return (
    <Card variant="outlined" padding="md" className="delivery__chart">
      <CardHeader title="Cumulative impressions" titleAs="h3" />
      {children}
    </Card>
  )
}

export function DeliveryWidget({ c, period, state, onRetry }: { c: Campaign; period: Period; state: DetailsState; onRetry: () => void }) {
  if (state === 'error') {
    return (
      <EmptyState
        variant="error"
        size="compact"
        title="Couldn't load this campaign"
        description="Check your connection and try again."
        actions={<Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
      />
    )
  }

  if (state === 'loading') {
    const loading = { label: 'Loading', value: '', loading: true }
    return (
      <div className="delivery" aria-busy="true">
        <Kpis tiles={[loading, loading, loading, loading]} />
        <ChartCard><Skeleton shape="block" height={240} /></ChartCard>
      </div>
    )
  }

  const { m } = c
  const note = noteLine(m)
  return (
    <div className="delivery">
      <Kpis tiles={[tile1(m), tile2(c, period), tile3(m, period), tile4(m, period)]} />
      <ChartCard><DeliveryChart m={m} area={windowArea(c, period)} areaLabel={periodLabel(period)} /></ChartCard>
      {note && <p className="delivery__note">{note}</p>}
      {m.status !== 'scheduled' && <Details m={m} />}
    </div>
  )
}
