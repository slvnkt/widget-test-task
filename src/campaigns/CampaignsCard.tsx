import { Button } from '@ds/components/Button'
import { Card, CardHeader } from '@ds/components/Card'
import { EmptyState } from '@ds/components/EmptyState'
import { Select } from '@ds/components/Select'
import type { TableSort } from '@ds/components/Table'
import { periodRange, PERIODS, type Period } from '../data/period'
import type { Campaign } from '../data/rows'
import { UPDATED_AT } from '../widget/copy'
import { CampaignsTable } from './CampaignsTable'
import { STATUS_FILTERS, type StatusFilter } from './filter'

export type ListState = 'ready' | 'loading' | 'error' | 'empty'

function Legend({ period }: { period: Period }) {
  type Item = [swatch: string | null, text: string]
  const plan: Item[] = period === 'ftd' ? [['marker', 'Plan to date'], ['target', 'Guarantee']] : [['target', `Plan for ${periodRange(period)}`]]
  const items: Item[] = [['solid', 'Confirmed by network logs'], ['hatch', 'Preliminary smart-TV estimate'], ...plan, [null, UPDATED_AT]]
  // DS Progress legend classes: the one legend for the table.
  return (
    <ul className="ot-progress ot-progress__legend campaigns__legend">
      {items.map(([swatch, text]) => (
        <li key={text} className="ot-progress__legend-item">
          {swatch && <span className={`ot-progress__swatch ot-progress__swatch--${swatch}`} aria-hidden="true" />}
          <span className="ot-progress__legend-label">{text}</span>
        </li>
      ))}
    </ul>
  )
}

interface Props {
  rows: Campaign[]
  state: ListState
  period: Period
  onPeriodChange: (p: Period) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (f: StatusFilter) => void
  /** All advertisers: show the advertiser under each campaign name. */
  showBrand: boolean
  sort: TableSort | null
  onSortChange: (s: TableSort) => void
  selectedId: string | null
  onOpen: (id: string) => void
  onRetry: () => void
}

export function CampaignsCard({ rows, state, period, onPeriodChange, statusFilter, onStatusFilterChange, showBrand, sort, onSortChange, selectedId, onOpen, onRetry }: Props) {
  const showFilters = state === 'ready' || state === 'loading'
  const loading = state === 'loading'

  return (
    <Card variant="default" padding="lg" className="campaigns">
      <CardHeader title="Delivery by campaign" titleAs="h2" />

      {/* Filters sit on the left so they stay usable while the 720px drawer covers the right of the card. */}
      {showFilters && (
        <div className="campaigns__filters" role="group" aria-label="Filters">
          <Select
            size="sm"
            aria-label="Period"
            className="campaigns__filter"
            value={period}
            onValueChange={v => onPeriodChange(v as Period)}
            options={PERIODS.map(p => ({ value: p.value, label: p.label }))}
          />
          <Select
            size="sm"
            aria-label="Status"
            className="campaigns__filter"
            value={statusFilter}
            onValueChange={v => onStatusFilterChange(v as StatusFilter)}
            options={STATUS_FILTERS}
          />
        </div>
      )}

      <div className="campaigns__content">
        <div className="campaigns__body">
          {state === 'error' ? (
            <EmptyState
              variant="error"
              title="Couldn't load campaigns"
              description="Check your connection and try again."
              actions={<Button variant="secondary" onClick={onRetry}>Retry</Button>}
            />
          ) : state === 'empty' ? (
            <EmptyState variant="no-data" title="No campaigns yet" description="Campaigns appear here once a media plan is booked." />
          ) : !loading && rows.length === 0 ? (
            <EmptyState size="compact" title="No campaigns match" description="Try another status filter." />
          ) : (
            <CampaignsTable rows={rows} period={period} sort={sort} onSortChange={onSortChange} selectedId={selectedId} onOpen={onOpen} loading={loading} showBrand={showBrand} />
          )}
        </div>
        {state === 'ready' && <Legend period={period} />}
      </div>
    </Card>
  )
}
