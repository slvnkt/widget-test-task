import { CaretRight } from '@phosphor-icons/react'
import { Progress } from '@ds/components/Progress'
import { Table, TwoLineCell, type TableColumn, type TableSort } from '@ds/components/Table'
import { Tooltip } from '@ds/components/Tooltip'
import type { Period } from '../data/period'
import type { Campaign } from '../data/rows'
import { fmtGap, rowMetrics, type RowMetrics } from './bar'
import { StatusIcon } from './StatusIcon'

export const rowLabel = (c: Campaign) => `Open ${c.name}, ${c.brand}`

const PROGRESS_HINT = 'Delivered as % of guarantee. ▼ is where the plan expects delivery today. Includes preliminary smart-TV estimates for the last 7 days.'

/** Status glyph + label plus, for data conditions, one muted word. */
export function StatusCell({ c }: { c: Campaign }) {
  return (
    <StatusIcon status={c.m.status} label>
      {c.dataMarker && <span className="status-cell__marker">{c.dataMarker}</span>}
    </StatusIcon>
  )
}

/** "17.9 M of 48.0 M" or, for a window, "6.2 M of 6.2 M plan". */
function DeliveredCell({ r, windowed }: { r: RowMetrics; windowed: boolean }) {
  if (windowed && !r.hasData) return <span className="cell-secondary">—</span>
  return (
    <span className="delivered-cell">
      <span className="delivered-cell__value">{r.hasData ? `${r.delivered.toFixed(1)} M` : '—'}</span>
      <span className="delivered-cell__of"> of {r.target.toFixed(1)} M{windowed ? ' plan' : ''}</span>
    </span>
  )
}

// One solid segment (no confirmed/preliminary split: that lives in the drawer); bar end = guarantee or window plan.
function ProgressCell({ r }: { r: RowMetrics }) {
  const max = r.target > 0 ? r.target : 1
  return (
    <span className="ot-table-progress">
      <Progress
        size="md"
        max={max}
        segments={r.hasData && r.delivered > 0 ? [{ value: Math.min(r.delivered, max), label: `Delivered ${r.delivered.toFixed(1)} M` }] : []}
        markers={r.expected ? [{ value: r.expected, type: 'marker', label: 'Plan to date' }] : []}
        muted={r.muted}
        showLegend={false}
        showMarkerLabels={false}
        ariaLabel={r.aria}
      />
      <span className="ot-table-progress__value" aria-hidden="true">{r.pct === null ? '—' : `${r.pct}%`}</span>
    </span>
  )
}

function GapCell({ c, r }: { c: Campaign; r: RowMetrics }) {
  if (r.gap === null) return <span className="cell-secondary">—</span>
  const tone = c.m.status === 'at-risk' ? 'danger' : c.m.status === 'behind' || c.m.status === 'final-under' ? 'primary' : 'secondary'
  return <span className={`gap-cell gap-cell--${tone}`}>{fmtGap(r.gap)}</span>
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
  const windowed = period !== 'ftd'
  const columns: TableColumn<Campaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      width: 180,
      // All advertisers: the advertiser is a muted second line, not a column.
      render: c => {
        const name = <span className="cell-ellipsis campaign-name" title={c.name}>{c.name}</span>
        return showBrand ? <TwoLineCell primary={name} secondary={<span className="cell-ellipsis" title={c.brand}>{c.brand}</span>} /> : name
      },
    },
    { key: 'status', header: 'Status', width: 156, sortable: true, render: c => <StatusCell c={c} /> },
    { key: 'flight', header: 'Flight', width: 116, sortable: true, render: c => <span className="cell-secondary">{c.m.fmt(0)} – {c.m.fmt(41)}</span> },
    { key: 'delivered', header: 'Delivered', width: 156, align: 'right', sortable: true, render: c => <DeliveredCell r={rowMetrics(c, period)} windowed={windowed} /> },
    {
      key: 'progress',
      // Inside the DS sort button, so the trigger is not a second button: hover shows the tooltip, the sr-only text reads the definition.
      header: (
        <Tooltip text={PROGRESS_HINT} placement="bottom">
          <span className="ot-term">Progress<span className="sr-only">. {PROGRESS_HINT}</span></span>
        </Tooltip>
      ),
      width: 172,
      sortable: true,
      render: c => <ProgressCell r={rowMetrics(c, period)} />,
    },
    { key: 'gap', header: 'vs plan', width: 104, align: 'right', sortable: true, render: c => <GapCell c={c} r={rowMetrics(c, period)} /> },
    // Opens the drawer: a muted chevron says the row is a way in (the row itself is the button).
    { key: 'open', header: <span className="sr-only">Details</span>, width: 36, render: () => <span className="row-chevron" aria-hidden="true"><CaretRight /></span> },
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
