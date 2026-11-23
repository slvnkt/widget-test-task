// TEMP stand-in until Omnitaki DS ships ProgressCell with segments, markers and muted; replace then.
// Same composition and classes as the DS ProgressCell, but passes the full segmented Progress through.
import { Progress } from '@ds/components/Progress'
import type { Bar } from './bar'

export function SegmentedProgressCell({ bar, windowed }: { bar: Bar; windowed?: boolean }) {
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
      {/* Delivered and % in one value: "17.9 M · 37%", or "6.2 M · 102% of plan" for a window. */}
      <span className="ot-table-progress__value" aria-hidden="true">
        {bar.pct === null ? '—' : (
          <>
            <span className="delivery-value">{bar.d.delivered.toFixed(1)} M</span> · {bar.pct}%{windowed ? ' of plan' : ''}
          </>
        )}
      </span>
    </span>
  )
}
