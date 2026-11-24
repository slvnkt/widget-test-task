// Table sort (controlled, so rows arrive pre-sorted).
import type { TableSort } from '@ds/components/Table'
import type { Period } from '../data/period'
import type { Campaign } from '../data/rows'
import { rowMetrics } from './bar'
import { STATUS } from './status'

const byName = (a: Campaign, b: Campaign) => a.name.localeCompare(b.name)

export function sortCampaigns(rows: Campaign[], sort: TableSort | null, period: Period): Campaign[] {
  if (!sort) return rows
  const dir = sort.direction === 'asc' ? 1 : -1
  // Rows without a value ("—") sort last in both directions; ties fall back to the name A–Z.
  const metric = (pick: (c: Campaign) => number | null) => (a: Campaign, b: Campaign) => {
    const x = pick(a)
    const y = pick(b)
    if (x === null || y === null) return x === y ? byName(a, b) : x === null ? 1 : -1
    return (x - y) * dir || byName(a, b)
  }
  const compare: Record<string, (a: Campaign, b: Campaign) => number> = {
    status: (a, b) => (STATUS[a.m.status].rank - STATUS[b.m.status].rank) * dir || byName(a, b),
    flight: (a, b) => (a.startOffset - b.startOffset) * dir || byName(a, b),
    delivered: metric(c => { const r = rowMetrics(c, period); return r.hasData ? r.delivered : null }),
    gap: metric(c => rowMetrics(c, period).gap?.value ?? null),
  }
  const fn = compare[sort.key] ?? (() => 0)
  return [...rows].sort(fn)
}
