// Table sort (controlled, so rows arrive pre-sorted).
import type { TableSort } from '@ds/components/Table'
import type { Period } from '../data/period'
import type { Campaign } from '../data/rows'
import { rowMetrics } from './bar'
import { STATUS } from './status'

const byName = (a: Campaign, b: Campaign) => a.name.localeCompare(b.name)

export function sortCampaigns(rows: Campaign[], sort: TableSort | null, period: Period): Campaign[] {
  if (!sort) return rows
  // Rows without a value ("—") sort below every number.
  const metric = (pick: (c: Campaign) => number | null) => (a: Campaign, b: Campaign) => (pick(a) ?? -Infinity) - (pick(b) ?? -Infinity) || byName(a, b)
  const compare: Record<string, (a: Campaign, b: Campaign) => number> = {
    status: (a, b) => STATUS[a.m.status].rank - STATUS[b.m.status].rank || byName(a, b),
    flight: (a, b) => a.startOffset - b.startOffset || byName(a, b),
    delivered: metric(c => { const r = rowMetrics(c, period); return r.hasData ? r.delivered : null }),
    progress: metric(c => rowMetrics(c, period).pct),
    gap: metric(c => rowMetrics(c, period).gap?.value ?? null),
  }
  const fn = compare[sort.key] ?? (() => 0)
  const dir = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => fn(a, b) * dir)
}
