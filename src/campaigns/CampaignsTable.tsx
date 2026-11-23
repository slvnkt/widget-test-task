import { CaretRight } from '@phosphor-icons/react'
import { Badge } from '@ds/components/Badge'
import { NumberCell, Table, TwoLineCell, type TableColumn, type TableSort } from '@ds/components/Table'
import type { Period } from '../data/period'
import type { Campaign } from '../data/rows'
import { STATUS_BADGE } from '../widget/copy'
import { barFor } from './bar'
import { SegmentedProgressCell } from './SegmentedProgressCell'

export const rowLabel = (c: Campaign) => `Open ${c.name}, ${c.brand}`

/** One Badge per row plus, for data conditions, one muted word. */
export function StatusCell({ c }: { c: Campaign }) {
  const s = STATUS_BADGE[c.m.status]
  return (
    <span className="status-cell">
      <Badge variant={s.variant} size="sm" dot>{s.label}</Badge>
      {c.dataMarker && <span className="status-cell__marker">{c.dataMarker}</span>}
    </span>
  )
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
      width: 200,
      sortable: true,
      // All advertisers: the advertiser is a muted second line, not a column.
      render: c => {
        const name = <span className="cell-ellipsis campaign-name" title={c.name}>{c.name}</span>
        return showBrand ? <TwoLineCell primary={name} secondary={<span className="cell-ellipsis" title={c.brand}>{c.brand}</span>} /> : name
      },
    },
    { key: 'status', header: 'Status', width: 168, sortable: true, render: c => <StatusCell c={c} /> },
    { key: 'flight', header: 'Flight', width: 128, sortable: true, render: c => <span className="cell-secondary">{c.m.fmt(0)} – {c.m.fmt(41)}</span> },
    { key: 'guarantee', header: 'Guarantee', width: 96, align: 'right', sortable: true, render: c => <NumberCell value={c.guarantee.toFixed(1)} unit="M" /> },
    { key: 'delivery', header: period === 'ftd' ? 'Delivery' : 'Delivery vs plan', sortable: true, render: c => <SegmentedProgressCell bar={barFor(c, period)} windowed={period !== 'ftd'} /> },
    // Opens the drawer: a muted chevron says the row is a way in (the row itself is the button).
    { key: 'open', header: <span className="sr-only">Details</span>, width: 40, render: () => <span className="row-chevron" aria-hidden="true"><CaretRight /></span> },
  ]

  return (
    <Table
      className={['campaigns-table', period !== 'ftd' && 'campaigns-table--windowed'].filter(Boolean).join(' ')}
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
