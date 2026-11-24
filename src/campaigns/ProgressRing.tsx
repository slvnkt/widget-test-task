// TEMP stand-in until Omnitaki DS ships ProgressRing; replace then.
// Decorative ring: track + arc from 12 o'clock, full at value >= max. The cell text carries the numbers.
import type { CSSProperties } from 'react'

interface Props {
  value: number
  max: number
  size?: 16 | 20 | 24
  /** Paused: arc in the tertiary text colour. */
  muted?: boolean
}

const STROKE = 3

export function ProgressRing({ value, max, size = 20, muted }: Props) {
  const r = (size - STROKE) / 2
  const c = 2 * Math.PI * r
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <svg className="progress-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ '--_size': `${size}px` } as CSSProperties}>
      <circle className="progress-ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={STROKE} fill="none" />
      {ratio > 0 && (
        <circle
          className={['progress-ring__arc', muted && 'progress-ring__arc--muted'].filter(Boolean).join(' ')}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${ratio * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  )
}
