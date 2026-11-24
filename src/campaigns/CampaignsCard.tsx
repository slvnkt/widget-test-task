import { Button } from '@ds/components/Button'
import { Card, CardHeader } from '@ds/components/Card'
import { EmptyState } from '@ds/components/EmptyState'
import type { TableSort } from '@ds/components/Table'
import type { Period } from '../data/period'
import type { Campaign } from '../data/rows'
import { UPDATED_AT } from '../widget/copy'
import { CampaignsTable } from './CampaignsTable'
import { Pagination } from './Pagination'

export type ListState = 'ready' | 'loading' | 'error' | 'empty'

interface Props {
  rows: Campaign[]
  state: ListState
  period: Period
  /** All advertisers: show the advertiser under each campaign name. */
  showBrand: boolean
  sort: TableSort | null
  onSortChange: (s: TableSort) => void
  selectedId: string | null
  onOpen: (id: string) => void
  onRetry: () => void
  onClearFilters: () => void
  /** Search text, for the no-match message. */
  query: string
}

export function CampaignsCard({ rows, state, period, showBrand, sort, onSortChange, selectedId, onOpen, onRetry, onClearFilters, query }: Props) {
  const loading = state === 'loading'

  return (
    <Card variant="default" padding="lg" className="campaigns">
      {/* Fixed 24px row: the update time sits inline after the title and its absence never shifts the layout. */}
      <CardHeader
        className="campaigns__header"
        title="Delivery by campaign"
        titleAs="h2"
        action={state === 'ready' && <span className="campaigns__updated">{UPDATED_AT}</span>}
      />

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
          <EmptyState size="compact" title={query ? `No campaigns match "${query}"` : 'No campaigns match these filters'} actions={<Button variant="secondary" size="sm" onClick={onClearFilters}>Clear filters</Button>} />
        ) : (
          <>
            <CampaignsTable rows={rows} period={period} sort={sort} onSortChange={onSortChange} selectedId={selectedId} onOpen={onOpen} loading={loading} showBrand={showBrand} />
            {!loading && <Pagination total={rows.length} />}
          </>
        )}
      </div>
    </Card>
  )
}
