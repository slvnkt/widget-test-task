// One status vocabulary for the table cell, the Status filter, the Status sort and the drawer tile 1.
import type { Status } from '../data/campaign'

export type StatusGlyph = 'dashed' | 'quarter' | 'half' | 'three-quarter' | 'pause' | 'check' | 'minus' | 'x'

export interface StatusDef {
  /** URL value for `#status=` */
  id: string
  label: string
  /** Attention order: filter options and the Status sort. */
  rank: number
  glyph: StatusGlyph
  /** Glyph colour token. */
  color: string
}

export const STATUS: Record<Status, StatusDef> = {
  'at-risk': { id: 'at-risk', label: 'At risk', rank: 1, glyph: 'half', color: 'var(--ot-color-status-danger-primary)' },
  behind: { id: 'behind', label: 'Behind', rank: 2, glyph: 'half', color: 'var(--ot-color-brand-primary)' },
  'final-under': { id: 'under-delivered', label: 'Under-delivered', rank: 3, glyph: 'minus', color: 'var(--ot-color-text-secondary)' },
  paused: { id: 'paused', label: 'Paused', rank: 4, glyph: 'pause', color: 'var(--ot-color-text-secondary)' },
  finalizing: { id: 'finalizing', label: 'Finalizing', rank: 5, glyph: 'three-quarter', color: 'var(--ot-color-brand-primary)' },
  'too-early': { id: 'just-launched', label: 'Just launched', rank: 6, glyph: 'quarter', color: 'var(--ot-color-brand-primary)' },
  'on-track': { id: 'on-track', label: 'On track', rank: 7, glyph: 'half', color: 'var(--ot-color-status-success-primary)' },
  ahead: { id: 'ahead', label: 'Ahead', rank: 8, glyph: 'half', color: 'var(--ot-color-status-success-primary)' },
  scheduled: { id: 'scheduled', label: 'Scheduled', rank: 9, glyph: 'dashed', color: 'var(--ot-color-text-tertiary)' },
  'final-met': { id: 'guarantee-met', label: 'Guarantee met', rank: 10, glyph: 'check', color: 'var(--ot-color-status-success-primary)' },
  cancelled: { id: 'cancelled', label: 'Cancelled', rank: 11, glyph: 'x', color: 'var(--ot-color-text-tertiary)' },
  unknown: { id: 'no-data', label: 'No data yet', rank: 12, glyph: 'dashed', color: 'var(--ot-color-text-tertiary)' },
}

/** Statuses in rank order. */
export const STATUS_ORDER = (Object.keys(STATUS) as Status[]).sort((a, b) => STATUS[a].rank - STATUS[b].rank)

export const statusById = (id: string | null) => STATUS_ORDER.find(s => STATUS[s].id === id)
