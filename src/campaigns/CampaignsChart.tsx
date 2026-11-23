// Chart view: every campaign on one % axis, built from DS Progress rows plus a small local axis row (no chart library).
import type { CSSProperties } from 'react'
import { Progress } from '@ds/components/Progress'
import { Skeleton } from '@ds/components/Skeleton'
import { Tooltip, type TooltipRow } from '@ds/components/Tooltip'
import { fmtM } from '../data/campaign'
import { periodRange, type Period } from '../data/period'
import type { Campaign } from '../data/rows'
import { STATUS_BADGE } from '../widget/copy'
import { barFor, type Bar } from './bar'
import { rowLabel, StatusCell } from './CampaignsTable'

const TICKS = [0, 25, 50, 75, 100]

function Gridlines({ max }: { max: number }) {
  return (
    <>
      {TICKS.map(t => <span key={t} className="cchart__gridline" style={{ left: `${(t / max) * 100}%` }} aria-hidden="true" />)}
    </>
  )
}

function tooltipRows(c: Campaign, bar: Bar, period: Period): TooltipRow[] {
  const { d } = bar
  const rows: TooltipRow[] = [
    { label: 'Confirmed', value: fmtM(d.confirmed), color: 'var(--ot-color-data-confirmed)' },
    { label: 'Preliminary', value: fmtM(d.prelim), color: 'var(--ot-bg-hatch-pattern)' },
  ]
  if (period !== 'ftd') return [...rows, { label: `Plan for ${periodRange(period)}`, value: fmtM(d.target) }]
  if (c.m.phase === 'live' && d.expected) rows.push({ label: 'Plan to date', value: fmtM(d.expected) })
  return [...rows, { label: 'Guarantee', value: fmtM(d.target) }]
}

interface Props {
  rows: Campaign[]
  period: Period
  selectedId: string | null
  onOpen: (id: string) => void
  loading?: boolean
}

export function CampaignsChart({ rows, period, selectedId, onOpen, loading }: Props) {
  const max = period === 'ftd' ? 110 : 120
  const axis = (
    <div className="cchart__axis" aria-hidden="true">
      <span />
      <span className="cchart__bar">
        {TICKS.map(t => (
          <span key={t} className={['cchart__tick', t === 0 && 'cchart__tick--start'].filter(Boolean).join(' ')} style={{ left: `${(t / max) * 100}%` }}>
            {t === 100 ? (period === 'ftd' ? 'Guarantee' : 'Plan') : `${t}%`}
          </span>
        ))}
      </span>
      <span />
    </div>
  )

  if (loading) {
    return (
      <div className="cchart" aria-busy="true">
        {axis}
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="cchart__row cchart__row--skeleton">
            <Skeleton size="md" width="60%" />
            <span className="cchart__bar"><Skeleton shape="block" height={12} /></span>
            <span />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="cchart">
      {axis}
      <ul className="cchart__rows">
        {rows.map(c => {
          const bar = barFor(c, period, '%')
          const s = STATUS_BADGE[c.m.status]
          const end = Math.min(bar.d.delivered > 0 ? bar.d.delivered / bar.d.target : 0, max / 100) * (100 / max)
          return (
            <li key={c.id}>
              <Tooltip
                variant="light"
                title={c.name}
                rows={tooltipRows(c, bar, period)}
                anchorClassName="cchart__anchor"
                anchorStyle={{ '--_t': end } as CSSProperties}
              >
                <button
                  type="button"
                  className="cchart__row"
                  data-campaign={c.id}
                  data-selected={selectedId === c.id || undefined}
                  aria-label={`${rowLabel(c)}. ${s.label}${c.dataMarker ? `, ${c.dataMarker}` : ''}. ${bar.aria}`}
                  onClick={() => onOpen(c.id)}
                >
                  <span className="cchart__label">
                    <span className="cchart__name">{c.name}</span>
                    <StatusCell c={c} />
                  </span>
                  <span className="cchart__bar">
                    <Gridlines max={max} />
                    <Progress size="md" max={max} segments={bar.segments} markers={bar.markers} muted={bar.muted} showLegend={false} showMarkerLabels={false} ariaLabel={bar.aria} />
                  </span>
                  <span className="cchart__value">{bar.pct === null ? '—' : `${bar.pct}%`}</span>
                </button>
              </Tooltip>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
