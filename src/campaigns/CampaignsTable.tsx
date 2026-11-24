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

const pct = (v: number, of: number) => Math.round((v / of) * 100)

/** Hover/focus breakdown of the Delivered cell (handoff v8 §3). Live rows add plan, gap and projection; finalized rows show the gap vs goal. */
function deliveredRows(c: Campaign, r: RowMetrics, period: Period): TooltipRow[] {
  const { m } = c
  if (!r.hasData) return [{ label: 'Delivered', value: '—' }, period === 'ftd' ? { label: 'Goal', value: fmtM(r.target) } : { label: 'Plan', value: r.target > 0 ? fmtM(r.target) : '—' }]
  const split = [{ label: 'Confirmed', value: fmtM(r.confirmed) }, { label: 'Preliminary', value: fmtM(r.prelim) }]
  const gap = r.gap && { label: `Gap vs ${r.gap.vs === 'goal' ? 'goal' : 'plan'}`, value: signedM(r.gap.value) }
  if (period !== 'ftd') {
    return [
      { label: 'Delivered', value: `${fmtM(r.delivered)} (${pct(r.delivered, r.target)}% of plan)` },
      ...split,
      { label: `Plan, ${periodLabel(period).toLowerCase()}`, value: fmtM(r.target) },
      ...(gap ? [gap] : []),
    ]
  }
  const delivered = { label: 'Delivered', value: `${fmtM(r.delivered)} (${pct(r.delivered, r.target)}% of goal)` }
  const goal = { label: 'Goal', value: fmtM(r.target) }
  if (m.phase === 'ended' || m.phase === 'finalized') return [delivered, goal, ...(gap ? [gap] : [])]
  if (m.phase !== 'live') return [delivered, ...split, goal]
  const live: TooltipRow[] = [delivered, ...split]
  if (r.expected) live.push({ label: 'Plan to date', value: fmtM(r.expected) })
  if (gap) live.push(gap)
  live.push(goal)
  if (m.status !== 'too-early') live.push({ label: 'Projected', value: `${fmtM(m.projection)} (${Math.round(m.projPct)}%)` })
  return live
}

/** Ring + "17.9M of 48.0M"; the ring is not coloured by pace (the Status glyph does that). */
function DeliveredCell({ c, r, period }: { c: Campaign; r: RowMetrics; period: Period }) {
  const of = r.target > 0 ? <span className="delivered-cell__of"> of {fmtM(r.target)}</span> : null
  return (
    <Tooltip variant="light" title={c.name} rows={deliveredRows(c, r, period)} placement="bottom" anchorClassName="delivered-cell__anchor">
      {/* Focusable so keyboard users get the breakdown too; Enter here does not open the row (the DS row ignores bubbled keys). */}
      <span className="delivered-cell" tabIndex={0} aria-label={r.aria}>
        <ProgressRing value={r.hasData ? r.delivered : 0} max={r.target} muted={r.muted} />
        <span className="delivered-cell__text">
          {r.hasData ? <span className="delivered-cell__value">{fmtM(r.delivered)}</span> : <span className="delivered-cell__of">—</span>}
          {of}
        </span>
      </span>
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
      // Term look inside the DS sort button (a real Term button would nest buttons): hover shows the tooltip, the sr-only text reads it.
      header: (
        <Tooltip text={GAP_HINT} placement="bottom">
          <span className="ot-term">Gap<span className="sr-only">. {GAP_HINT}</span></span>
        </Tooltip>
      ),
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
      rowLabel={rowLabel}
      selectedKeys={selectedId ? [selectedId] : []}
      loading={loading}
      loadingRows={8}
    />
  )
}
