import { useEffect, useRef, useState } from 'react'
import { CaretRight } from '@phosphor-icons/react'
import { Table, TwoLineCell, type TableColumn, type TableSort } from '@ds/components/Table'
import { Tooltip, type TooltipRow } from '@ds/components/Tooltip'
import { fmtM } from '../data/campaign'
import { periodLabel, type Period } from '../data/period'
import type { Campaign } from '../data/rows'
import { signedM } from '../widget/copy'
import { rowMetrics, type RowMetrics } from './bar'
import { ProgressRing } from './ProgressRing'
import { StatusIcon } from './StatusIcon'

/** Row name prefix; the App finds the row by it to return focus after the drawer closes. */
export const rowLabel = (c: Campaign) => `Open ${c.name}, ${c.brand}`

const GAP_HINT = 'Delivered minus what the media plan expects by yesterday.'

/** Status glyph + label plus, for data conditions, one muted word. */
export function StatusCell({ c }: { c: Campaign }) {
  return (
    <StatusIcon status={c.m.status} label>
      {c.dataMarker && <span className="status-cell__marker cell-ellipsis" title={c.dataMarker}>{c.dataMarker}</span>}
    </StatusIcon>
  )
}

const round1 = (v: number) => Math.round(v * 10) / 10
const pct = (v: number, of: number) => Math.round((v / of) * 100)

/**
 * Breakdown of the Delivered cell (handoff v8 §3): the hover tooltip and the row's accessible name.
 * Live rows add plan, gap and projection; finalized rows show the gap vs goal. Zero rows are hidden, and
 * Preliminary is derived from the rounded values so Confirmed + Preliminary = Delivered as displayed.
 */
export function deliveredRows(c: Campaign, r: RowMetrics, period: Period): TooltipRow[] {
  const { m } = c
  if (!r.hasData) return [{ label: 'Delivered', value: '—' }, period === 'ftd' ? { label: 'Goal', value: fmtM(r.target) } : { label: 'Plan', value: r.target > 0 ? fmtM(r.target) : '—' }]
  const shown = round1(r.delivered)
  const confirmed = Math.min(round1(r.confirmed), shown)
  const prelim = round1(shown - confirmed)
  const split: TooltipRow[] = [
    ...(confirmed > 0 ? [{ label: 'Confirmed', value: fmtM(confirmed) }] : []),
    ...(prelim > 0 ? [{ label: 'Preliminary', value: fmtM(prelim) }] : []),
  ]
  const vs = r.gap?.vs === 'goal' ? 'goal' : 'plan'
  // Gap is already computed from rounded values (rowMetrics); zero reads like the drawer.
  const gap = r.gap && { label: `Gap vs ${vs}`, value: r.gap.value === 0 ? `In line with ${vs}` : signedM(r.gap.value) }
  if (period !== 'ftd') {
    return [
      { label: 'Delivered', value: `${fmtM(shown)} (${pct(r.delivered, r.target)}% of plan)` },
      ...split,
      { label: `Plan, ${periodLabel(period).toLowerCase()}`, value: fmtM(r.target) },
      ...(gap ? [gap] : []),
    ]
  }
  const delivered = { label: 'Delivered', value: `${fmtM(shown)} (${pct(r.delivered, r.target)}% of goal)` }
  const goal = { label: 'Goal', value: fmtM(r.target) }
  if (m.phase === 'ended' || m.phase === 'finalized') return [delivered, goal, ...(gap ? [gap] : [])]
  if (m.phase !== 'live') return [delivered, ...split, goal]
  const live: TooltipRow[] = [delivered, ...split]
  if (r.expected) live.push({ label: 'Plan to date', value: fmtM(r.expected) })
  if (gap) live.push(gap)
  live.push(goal)
  if (m.status !== 'too-early') {
    const withMakegood = m.status === 'behind' && m.makegoodImps > 0 ? ' with makegood' : ''
    live.push({ label: 'Projected', value: `${fmtM(m.projection)} (${Math.round(m.projPct)}%)${withMakegood}` })
  }
  return live
}

/** "Open Holiday Linear Q4, Northwind Coffee. Delivered 17.9M (37% of goal), Confirmed 12.6M, …" */
const rowAriaLabel = (c: Campaign, period: Period) =>
  `${rowLabel(c)}. ${deliveredRows(c, rowMetrics(c, period), period).map(row => `${row.label} ${row.value}`).join(', ')}`

/** Ring + "17.9M of 48.0M" ("of 6.2M plan" in a period window); the ring is not coloured by pace (the Status glyph does that). */
function DeliveredCell({ c, r, period }: { c: Campaign; r: RowMetrics; period: Period }) {
  const of = r.target > 0 ? <span className="delivered-cell__of"> of {fmtM(r.target)}{period === 'ftd' ? '' : ' plan'}</span> : null
  return (
    // Hover only: no own tab stop (the row is the focus target and its accessible name carries the breakdown).
    <Tooltip variant="light" title={c.name} rows={deliveredRows(c, r, period)} placement="bottom" anchorClassName="delivered-cell__anchor">
      <span className="delivered-cell">
        <ProgressRing value={r.hasData ? r.delivered : 0} max={r.target} muted={r.muted} />
        <span className="delivered-cell__text">
          {r.hasData ? <span className="delivered-cell__value">{fmtM(r.delivered)}</span> : <span className="delivered-cell__of">—</span>}
          {of}
        </span>
      </span>
    </Tooltip>
  )
}

/**
 * Gap header: Term look inside the DS sort button (a real Term button would nest buttons). The sort button takes focus,
 * not this span, so focus is tracked on the document and opens the tooltip (controlled) while the button is focused.
 */
function GapHeader() {
  const ref = useRef<HTMLSpanElement>(null)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    const within = (t: EventTarget | null) => t instanceof Node && !!ref.current && t.contains(ref.current)
    const onIn = (e: FocusEvent) => setFocused(within(e.target))
    const onOut = (e: FocusEvent) => { if (!within(e.relatedTarget)) setFocused(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFocused(false) }
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('focusin', onIn)
      document.removeEventListener('focusout', onOut)
      document.removeEventListener('keydown', onKey)
    }
  }, [])
  return (
    // Fixed below and right-aligned to the term (see .gap-header CSS): centred, it ran past the viewport edge and shifted the page.
    <Tooltip text={GAP_HINT} placement="bottom" open={focused || undefined} anchorClassName="gap-header">
      <span ref={ref} className="ot-term">Gap<span className="sr-only">. {GAP_HINT}</span></span>
    </Tooltip>
  )
}

function GapCell({ c, r }: { c: Campaign; r: RowMetrics }) {
  if (r.gap === null) return <span className="cell-secondary">—</span>
  const tone = c.m.status === 'at-risk' ? 'danger' : c.m.status === 'behind' || c.m.status === 'final-under' ? 'primary' : 'secondary'
  return <span className={`gap-cell gap-cell--${tone}`}>{signedM(r.gap.value)}</span>
}

interface Props {
  rows: Campaign[]
  period: Period
  sort: TableSort | null
  onSortChange: (sort: TableSort) => void
  selectedId: string | null
  onOpen: (id: string) => void
  loading?: boolean
  showBrand?: boolean
}

export function CampaignsTable({ rows, period, sort, onSortChange, selectedId, onOpen, loading, showBrand }: Props) {
  const columns: TableColumn<Campaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      width: 240,
      // All advertisers: the advertiser is a muted second line, not a column.
      render: c => {
        const name = <span className="cell-ellipsis campaign-name" title={c.name}>{c.name}</span>
        return showBrand ? <TwoLineCell primary={name} secondary={<span className="cell-ellipsis" title={c.brand}>{c.brand}</span>} /> : name
      },
    },
    { key: 'status', header: 'Status', width: 176, sortable: true, render: c => <StatusCell c={c} /> },
    { key: 'flight', header: 'Flight', width: 128, sortable: true, render: c => <span className="cell-secondary">{c.m.fmt(0)} – {c.m.fmt(41)}</span> },
    { key: 'delivered', header: 'Delivered', width: 200, sortable: true, render: c => <DeliveredCell c={c} r={rowMetrics(c, period)} period={period} /> },
    {
      key: 'gap',
      header: <GapHeader />,
      width: 128,
      align: 'right',
      sortable: true,
      render: c => <GapCell c={c} r={rowMetrics(c, period)} />,
    },
    // Opens the drawer: a muted chevron says the row is a way in (the row itself is the button).
    { key: 'open', header: <span className="sr-only">Details</span>, width: 40, render: () => <span className="row-chevron" aria-hidden="true"><CaretRight /></span> },
  ]

  return (
    <Table
      className="campaigns-table"
      columns={columns}
      rows={rows}
      getRowKey={c => c.id}
      density="default"
      caption="Delivery by campaign"
      hideCaption
      sort={sort}
      onSortChange={onSortChange}
      onRowClick={c => onOpen(c.id)}
      rowLabel={c => rowAriaLabel(c, period)}
      selectedKeys={selectedId ? [selectedId] : []}
      loading={loading}
      loadingRows={8}
    />
  )
}
