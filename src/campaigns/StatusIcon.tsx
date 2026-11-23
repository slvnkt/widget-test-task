// TEMP stand-in until Omnitaki DS ships StatusIcon; replace then.
// Linear-style stage glyph (pie fill is fixed per stage, not delivered %), optionally followed by the label.
import { CheckCircle, MinusCircle, PauseCircle, XCircle } from '@phosphor-icons/react'
import type { CSSProperties, ReactNode } from 'react'
import type { Status } from '../data/campaign'
import { STATUS, type StatusGlyph } from './status'

const PIE: Partial<Record<StatusGlyph, string>> = {
  quarter: 'M7 7V3.75A3.25 3.25 0 0 1 10.25 7Z',
  half: 'M7 7V3.75A3.25 3.25 0 0 1 7 10.25Z',
  'three-quarter': 'M7 7V3.75A3.25 3.25 0 1 1 3.75 7Z',
}

function Glyph({ glyph }: { glyph: StatusGlyph }) {
  switch (glyph) {
    case 'pause': return <PauseCircle weight="bold" />
    case 'check': return <CheckCircle weight="fill" />
    case 'minus': return <MinusCircle weight="fill" />
    case 'x': return <XCircle weight="bold" />
  }
  const pie = PIE[glyph]
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.75" stroke="currentColor" strokeWidth="1.5" strokeDasharray={glyph === 'dashed' ? '2.2 2' : undefined} strokeLinecap={glyph === 'dashed' ? 'round' : undefined} />
      {pie && <path d={pie} fill="currentColor" />}
    </svg>
  )
}

interface Props {
  status: Status
  size?: 12 | 14 | 16
  /** Show the status name after the glyph. */
  label?: boolean
  /** Muted text after the label (data markers: "Revised"). */
  children?: ReactNode
}

export function StatusIcon({ status, size = 14, label, children }: Props) {
  const s = STATUS[status]
  const glyph = (
    <span className="status-icon__glyph" style={{ '--_size': `${size}px`, color: s.color } as CSSProperties} aria-hidden="true">
      <Glyph glyph={s.glyph} />
    </span>
  )
  if (!label) return glyph
  return (
    <span className="status-icon">
      {glyph}
      <span className="status-icon__label">{s.label}</span>
      {children}
    </span>
  )
}
