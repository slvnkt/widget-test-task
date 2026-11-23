// Status filter for the Campaigns card.
import type { Campaign } from '../data/rows'
import { STATUS_BADGE } from '../widget/copy'

export type StatusFilter = 'all' | 'attention' | 'live' | 'scheduled' | 'ended' | 'paused'

export const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'live', label: 'Live' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'ended', label: 'Ended / Finalized' },
  { value: 'paused', label: 'Paused' },
]

export const isStatusFilter = (v: string | null): v is StatusFilter => STATUS_FILTERS.some(f => f.value === v)

/** Needs attention = the three attention ranks (At risk, Behind, Under-delivered) or any data condition. */
export function matchesStatus(c: Campaign, f: StatusFilter) {
  const { phase, status } = c.m
  switch (f) {
    case 'attention': return STATUS_BADGE[status].rank <= 3 || c.dataMarker !== undefined
    case 'live': return phase === 'live'
    case 'scheduled': return phase === 'scheduled'
    case 'ended': return phase === 'ended' || phase === 'finalized' || phase === 'cancelled'
    case 'paused': return phase === 'paused'
    default: return true
  }
}
