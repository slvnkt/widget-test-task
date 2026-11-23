// Page-level Status filter: the STATUS vocabulary with live counts.
import { createElement } from 'react'
import type { SelectOption } from '@ds/components/Select'
import type { Status } from '../data/campaign'
import { CAMPAIGNS, type Campaign } from '../data/rows'
import { STATUS, STATUS_ORDER } from './status'
import { StatusIcon } from './StatusIcon'

/** 'all' or a STATUS id. */
export type StatusFilter = string

// Cancelled and No data yet are options only when such a row exists.
const OPTIONAL: Status[] = ['cancelled', 'unknown']
const LISTED = STATUS_ORDER.filter(s => !OPTIONAL.includes(s) || CAMPAIGNS.some(c => c.m.status === s))

export const isStatusFilter = (v: string | null): v is StatusFilter => v === 'all' || LISTED.some(s => STATUS[s].id === v)

export const matchesStatus = (c: Campaign, f: StatusFilter) => f === 'all' || STATUS[c.m.status].id === f

/** "At risk · 1"; zero counts are disabled. `scope` = rows after the advertiser and campaign filters. */
export function statusOptions(scope: Campaign[]): SelectOption[] {
  return [
    { value: 'all', label: 'All statuses' },
    ...LISTED.map(s => {
      const n = scope.filter(c => c.m.status === s).length
      return { value: STATUS[s].id, label: `${STATUS[s].label} · ${n}`, icon: createElement(StatusIcon, { status: s }), disabled: n === 0 }
    }),
  ]
}
