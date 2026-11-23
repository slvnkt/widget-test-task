import { Info } from '@phosphor-icons/react'
import { NumberCell, Table, type TableColumn } from '@ds/components/Table'
import { Tabs } from '@ds/components/Tabs'
import { Tooltip } from '@ds/components/Tooltip'
import { CAMPAIGN, type Model } from '../data/campaign'
import { SOURCES } from './copy'

type NetworkRow = Model['networks'][number]
const LOGS_TEXT: Record<NetworkRow['status'], string> = { received: 'Received', pending: 'Pending', late: 'Late' }
const LOGS_RANK: Record<NetworkRow['status'], number> = { late: 0, pending: 1, received: 2 }

const networkColumns: TableColumn<NetworkRow>[] = [
  { key: 'name', header: 'Network', sortable: true, render: r => <span className="nowrap">{r.name}</span> },
  {
    key: 'status',
    header: 'Logs',
    sortable: true,
    sortValue: r => LOGS_RANK[r.status],
    render: r => <span className={r.status === 'pending' ? 'logs' : 'logs logs--primary'}>{LOGS_TEXT[r.status]}</span>,
  },
  { key: 'through', header: 'Logs through', render: r => <span className="nowrap">{r.through}</span> },
  { key: 'aired', header: 'Spots aired', align: 'right', sortable: true, render: r => <NumberCell value={`${r.aired} / ${r.scheduled}`} /> },
  { key: 'preempted', header: 'Preempted', align: 'right', sortable: true, render: r => <NumberCell value={r.preempted > 0 ? r.preempted : '—'} /> },
]

interface SourceRow { source: string; covers: string; use: string; what: string }
const sourceColumns: TableColumn<SourceRow>[] = [
  // One line per source; what the source is sits behind the info icon.
  {
    key: 'source',
    header: 'Source',
    render: r => (
      <span className="source-cell">
        {r.source}
        <Tooltip text={r.what} placement="right">
          <button type="button" className="source-cell__info" aria-label={`About ${r.source}`}><Info /></button>
        </Tooltip>
      </span>
    ),
  },
  { key: 'covers', header: 'Covers', render: r => <span className="nowrap">{r.covers}</span> },
  { key: 'use', header: 'Use', render: r => <span className="nowrap">{r.use}</span> },
]

function sourceRows(m: Model): SourceRow[] {
  const last = CAMPAIGN.flightDays - 1
  const confirmedThrough = m.daily.reduce((d, r) => (r.confirmed !== undefined ? r.day : d), -1)
  const prelimThrough = m.daily.reduce((d, r) => (r.prelim !== undefined ? r.day : d), -1)
  const rows: SourceRow[] = []
  if (confirmedThrough >= 0) rows.push({ ...SOURCES.logs, covers: `${m.fmt(0)} – ${m.fmt(confirmedThrough)}` })
  if (m.prelim > 0) rows.push({ ...SOURCES.acr, covers: `${m.fmt(confirmedThrough + 1)} – ${m.fmt(prelimThrough)}` })
  else if (m.prelimThrough === null) rows.push({ ...SOURCES.acr, covers: 'Unavailable' })
  if (m.phase === 'live' && m.status !== 'too-early' && m.def.today <= last) rows.push({ ...SOURCES.forecast, covers: `${m.fmt(Math.max(0, m.def.today))} – ${m.fmt(last)}` })
  return rows
}

export function Details({ m }: { m: Model }) {
  return (
    <Tabs
      className="details"
      variant="underline"
      defaultValue="networks"
      label="Delivery details"
      items={[
        {
          value: 'networks',
          label: 'Networks',
          content: (
            <Table
              columns={networkColumns}
              rows={m.networks}
              getRowKey={r => r.name}
              density="compact"
              stickyHeader
              caption="Network log status"
              hideCaption
              defaultSort={{ key: 'status', direction: 'asc' }}
            />
          ),
        },
        {
          value: 'sources',
          label: 'Sources',
          content: <Table className="details__sources" columns={sourceColumns} rows={sourceRows(m)} getRowKey={r => r.source} caption="Why the numbers differ" hideCaption />,
        },
      ]}
    />
  )
}
