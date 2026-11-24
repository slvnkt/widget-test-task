// One status vocabulary for the table cell, the Status filter, the Status sort and the drawer tile 1.
import type { Status } from '../data/campaign'

export type StatusGlyph = 'dashed' | 'quarter' | 'half' | 'three-quarter' | 'arrow-up' | 'arrow-down' | 'warning' | 'pause' | 'check' | 'minus' | 'x'

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

// Shape = stage, colour = verdict (handoff v8 §2): every listed status has its own glyph + colour pair.
// TEMP: raw palette values (lime, warning-600/700, info-500, neutral-800) until DS ships --ot-color-status-icon-{status}
// semantic tokens (StatusIcon request C7). All 11 colours are distinct and >= 3:1 on white (lowest: cancelled 3.12, behind 3.14).
export const STATUS: Record<Status, StatusDef> = {
  'at-risk': { id: 'at-risk', label: 'At risk', rank: 1, glyph: 'warning', color: 'var(--ot-color-status-danger-primary)' },
  behind: { id: 'behind', label: 'Behind', rank: 2, glyph: 'arrow-down', color: 'var(--ot-palette-warning-600)' }, // amber 3.14:1, temp raw palette,
  'final-under': { id: 'under-goal', label: 'Under goal', rank: 3, glyph: 'minus', color: 'var(--ot-palette-warning-700)' }, // dark amber, temp raw palette,
  paused: { id: 'paused', label: 'Paused', rank: 4, glyph: 'pause', color: 'var(--ot-palette-neutral-800)' }, // darker than Scheduled's grey, temp raw palette,
  finalizing: { id: 'finalizing', label: 'Finalizing', rank: 5, glyph: 'three-quarter', color: 'var(--ot-palette-info-500)' }, // light blue, temp raw palette
  'too-early': { id: 'just-launched', label: 'Just launched', rank: 6, glyph: 'quarter', color: 'var(--ot-palette-lime-600)' }, // lime, temp raw palette
  'on-track': { id: 'on-track', label: 'On track', rank: 7, glyph: 'half', color: 'var(--ot-color-status-success-primary)' },
  ahead: { id: 'ahead', label: 'Ahead', rank: 8, glyph: 'arrow-up', color: 'var(--ot-color-brand-primary)' },
  scheduled: { id: 'scheduled', label: 'Scheduled', rank: 9, glyph: 'dashed', color: 'var(--ot-color-text-tertiary)' },
  'final-met': { id: 'goal-met', label: 'Goal met', rank: 10, glyph: 'check', color: 'var(--ot-color-status-info-primary)' },
  cancelled: { id: 'cancelled', label: 'Cancelled', rank: 11, glyph: 'x', color: 'var(--ot-color-text-disabled)' },
  // Not one of the 11 (no row has it; the filter lists it only when one does).
  unknown: { id: 'no-data', label: 'No data yet', rank: 12, glyph: 'dashed', color: 'var(--ot-color-text-tertiary)' },
}

/** Statuses in rank order. */
export const STATUS_ORDER = (Object.keys(STATUS) as Status[]).sort((a, b) => STATUS[a].rank - STATUS[b].rank)

export const statusById = (id: string | null) => STATUS_ORDER.find(s => STATUS[s].id === id)
