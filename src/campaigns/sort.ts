// Table sort (controlled, so rows arrive pre-sorted). The Delivery column sorts by % of target.
import type { TableSort } from '@ds/components/Table'
import type { Period } from '../data/period'
import type { Campaign } from '../data/rows'
import { STATUS_BADGE } from '../widget/copy'
import { barFor } from './bar'

const byName = (a: Campaign, b: Campaign) => a.name.localeCompare(b.name)

export function sortCampaigns(rows: Campaign[], sort: TableSort | null, period: Period): Campaign[] {
  if (!sort) return rows
  const pct = (c: Campaign) => barFor(c, period).pct ?? -1
  const compare: Record<string, (a: Campaign, b: Campaign) => number> = {
    name: byName,
    status: (a, b) => STATUS_BADGE[a.m.status].rank - STATUS_BADGE[b.m.status].rank || byName(a, b),
    flight: (a, b) => a.startOffset - b.startOffset,
    guarantee: (a, b) => a.guarantee - b.guarantee,
    delivery: (a, b) => pct(a) - pct(b),
  }
  const fn = compare[sort.key] ?? (() => 0)
  const dir = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => fn(a, b) * dir)
}
