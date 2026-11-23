// TEMP stand-in until Omnitaki DS ships ProgressCell with segments, markers and muted; replace then.
// Same composition and classes as the DS ProgressCell, but passes the full segmented Progress through.
import { Progress } from '@ds/components/Progress'
import type { Bar } from './bar'

export function SegmentedProgressCell({ bar }: { bar: Bar }) {
  return (
    <span className="ot-table-progress">
      <Progress
        size="sm"
        max={bar.max}
        segments={bar.segments}
        markers={bar.markers}
        muted={bar.muted}
        showLegend={false}
        showMarkerLabels={false}
        ariaLabel={bar.aria}
      />
      <span className="ot-table-progress__value" aria-hidden="true">{bar.pct === null ? '—' : `${bar.pct}%`}</span>
    </span>
  )
}
