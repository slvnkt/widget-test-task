import { useId, useLayoutEffect, useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts'
import { TooltipContent, type TooltipRow } from '@ds/components/Tooltip'
import { CAMPAIGN, fmtM, type Model } from '../data/campaign'
import { ChartContainer, ChartTooltip, type ChartConfig } from './chart'
import { signedM } from './copy'

const HEIGHT = 240
// At the drawer's ~630px plot, ticks every two weeks (weekly ticks would crowd).
const X_TICK_DAYS = [0, 14, 28, CAMPAIGN.flightDays - 1]

/** Round steps, at most 3 intervals (4 grid lines) covering the goal and the forecast; the goal line carries its own label. */
function yTicks(top: number) {
  const step = [5, 10, 20, 25, 50, 100].find(s => Math.ceil(top / s) <= 3) ?? 100
  const n = Math.max(2, Math.ceil(top / step))
  return { ticks: Array.from({ length: n + 1 }, (_, i) => i * step), max: n * step }
}

const config: ChartConfig = {
  confirmed: { label: 'Confirmed', color: 'var(--ot-color-data-confirmed)' },
  prelim: { label: 'Preliminary', color: 'var(--ot-color-data-preliminary)' },
  plan: { label: 'Plan', color: 'var(--ot-color-chart-3)' },
  projection: { label: 'Forecast', color: 'var(--ot-color-data-projected)' },
}

type Row = Model['daily'][number] & { band?: [number, number] }

// Chart adapter: forecast band widens from zero at the last data point to the model's range at flight end.
// No forecast while the campaign is too new to project.
function withBand(m: Model): Row[] {
  if (m.status === 'too-early') return m.daily.map(({ projection: _, ...r }) => r)
  const first = m.daily.find(r => r.projection !== undefined)
  const last = m.daily[m.daily.length - 1]
  if (!first || last.projection === undefined) return m.daily
  const spread = m.projHigh - m.projection
  const span = last.day - first.day || 1
  return m.daily.map(r => {
    if (r.projection === undefined) return r
    const half = spread * ((r.day - first.day) / span)
    return { ...r, band: [+(r.projection - half).toFixed(3), +(r.projection + half).toFixed(3)] }
  })
}

// Pattern size comes from the hatch tokens, which SVG attributes cannot read directly.
function useHatchSize() {
  const [size, setSize] = useState({ width: 2, gap: 4 })
  useLayoutEffect(() => {
    const css = getComputedStyle(document.documentElement)
    const px = (name: string) => parseFloat(css.getPropertyValue(name))
    const width = px('--ot-pattern-hatch-width')
    const gap = px('--ot-pattern-hatch-gap')
    if (width > 0 && gap > 0) setSize({ width, gap })
  }, [])
  return size
}

interface LabelProps { viewBox?: { x: number; y: number; width?: number }; text: string; /** Horizontal ReferenceLine: anchor at the line's right end. */ atEnd?: boolean; anchor?: 'start' | 'middle' | 'end'; dx?: number; dy?: number; tone?: 'primary' | 'secondary'; type?: 'label' | 'body' }

// Direct label anchored at a ReferenceDot / ReferenceLine viewBox (replaces a legend).
function DirectLabel({ viewBox, text, atEnd, anchor = 'end', dx = 0, dy = 0, tone = 'secondary', type = 'label' }: LabelProps) {
  if (!viewBox) return null
  // viewBox origin = dot centre (r 0), start of a horizontal line, top of a vertical line.
  const x = viewBox.x + (atEnd ? viewBox.width ?? 0 : 0) + dx
  const y = viewBox.y + dy
  return <text x={x} y={y} textAnchor={anchor} className={`chart__label chart__label--${type} chart__label--${tone}`}>{text}</text>
}

interface TickProps { x?: number; y?: number; payload?: { value: string } }

// The last x tick is anchored inward so the flight end date is not clipped at the right edge.
function XTick({ x = 0, y = 0, payload, last }: TickProps & { last?: string }) {
  const value = payload?.value ?? ''
  const anchor = value === last ? 'end' : 'middle'
  return <text x={x} y={y} dy={12} textAnchor={anchor} className="chart__tick">{value}</text>
}

// Window highlight label, top-left inside the area.
function AreaLabel({ viewBox, text }: { viewBox?: { x: number; y: number }; text: string }) {
  if (!viewBox) return null
  return <text x={viewBox.x + 4} y={viewBox.y + 14} className="chart__label chart__label--label chart__label--secondary">{text}</text>
}

function tooltipRows(r: Row, m: Model): TooltipRow[] {
  const plan = { label: 'Plan', value: fmtM(r.plan), color: 'var(--color-plan)' }
  if (r.confirmed !== undefined) {
    return [{ label: 'Confirmed', value: fmtM(r.confirmed), color: 'var(--color-confirmed)' }, plan, { label: 'Gap vs plan', value: signedM(r.confirmed - r.plan) }]
  }
  if (r.prelim !== undefined) {
    return [
      { label: `Confirmed (through ${m.confirmedThroughLabel})`, value: fmtM(m.confirmed), color: 'var(--color-confirmed)' },
      { label: 'Preliminary (smart-TV estimate)', value: signedM(r.prelim - m.confirmed), color: 'var(--ot-bg-hatch-pattern)' },
      plan,
      { label: 'Gap vs plan', value: signedM(r.prelim - r.plan) },
    ]
  }
  if (r.projection !== undefined && r.band) {
    return [
      { label: 'Forecast', value: fmtM(r.projection), color: 'var(--color-projection)' },
      { label: 'Range', value: `${r.band[0].toFixed(1)}–${fmtM(r.band[1])}` },
      plan,
    ]
  }
  return [plan]
}

function DeliveryTooltip({ active, payload, m }: { active?: boolean; payload?: Array<{ payload?: Row }>; m: Model }) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return <TooltipContent variant="light" title={row.label} rows={tooltipRows(row, m)} />
}

/** `area`: highlighted period window in model day indexes (§3.3), drawn under the series. */
export function DeliveryChart({ m, area, areaLabel }: { m: Model; area?: { x1: number; x2: number } | null; areaLabel?: string }) {
  const hatchId = useId()
  const hatch = useHatchSize()
  const data = withBand(m)
  const last = data[data.length - 1]
  const xTicks = X_TICK_DAYS.map(d => data[d].label)
  const yAxis = yTicks(Math.max(m.guarantee * 1.1, m.projHigh, m.delivered))
  // Paused: a "Paused" line at the stop day replaces "Today".
  const vLine = m.phase === 'paused' && m.def.stopDay !== undefined
    ? { x: m.fmt(m.def.stopDay), text: 'Paused', day: m.def.stopDay }
    : data.some(r => r.label === m.todayLabel) ? { x: m.todayLabel, text: 'Today', day: m.def.today } : null
  // Today/Paused near the left edge would run into "Goal …": move the goal label to the right end.
  const goalAtEnd = !!vLine && vLine.day < 10
  const step = hatch.width + hatch.gap

  return (
    <>
    <ChartContainer config={config} height={HEIGHT}>
      <ComposedChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <pattern id={hatchId} width={step} height={step} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={hatch.width} height={step} style={{ fill: 'var(--ot-pattern-hatch-color)' }} />
          </pattern>
        </defs>
        <CartesianGrid vertical={false} horizontal stroke="var(--ot-color-chart-grid)" strokeWidth={1} />
        {area && (
          <ReferenceArea x1={data[area.x1].label} x2={data[area.x2].label} fill="var(--ot-color-bg-subtle-hover)" fillOpacity={1} stroke="none" label={<AreaLabel text={areaLabel ?? ''} />} />
        )}
        <XAxis dataKey="label" ticks={xTicks} interval={0} tickLine={false} axisLine={{ stroke: 'var(--ot-color-chart-grid)' }} tick={<XTick last={xTicks[xTicks.length - 1]} />} />
        <YAxis domain={[0, yAxis.max]} ticks={yAxis.ticks} width={40} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v === 0 ? '0' : `${v}M`)} tick={{ className: 'chart__tick' }} />
        <ChartTooltip
          cursor={{ stroke: 'var(--ot-color-border-primary)', strokeWidth: 1 }}
          isAnimationActive={false}
          content={<DeliveryTooltip m={m} />}
        />

        <Area dataKey="band" stroke="none" fill="var(--ot-color-bg-tertiary)" fillOpacity={1} activeDot={false} isAnimationActive={false} />
        <ReferenceLine y={m.guarantee} stroke="var(--ot-color-border-secondary)" strokeWidth={1} label={<DirectLabel text={`Goal ${+m.guarantee.toFixed(1)}M`} anchor={goalAtEnd ? 'end' : 'start'} atEnd={goalAtEnd} dy={-6} />} />
        <Line dataKey="plan" type="linear" stroke="var(--color-plan)" strokeWidth={1.5} strokeDasharray="1 3" strokeLinecap="round" dot={false} activeDot={false} isAnimationActive={false} />
        <Area dataKey="confirmed" type="monotone" stroke="var(--color-confirmed)" strokeWidth={2} fill="var(--ot-color-data-track)" fillOpacity={1} activeDot={{ r: 4 }} isAnimationActive={false} />
        <Area dataKey="prelim" type="monotone" stroke="var(--color-prelim)" strokeWidth={2} strokeDasharray="2 3" strokeLinecap="round" fill={`url(#${hatchId})`} fillOpacity={1} activeDot={{ r: 4 }} isAnimationActive={false} />
        <Line dataKey="projection" type="linear" stroke="var(--color-projection)" strokeWidth={1.5} strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        {vLine && (
          <ReferenceLine x={vLine.x} stroke="var(--ot-color-border-secondary)" strokeWidth={1} label={<DirectLabel text={vLine.text} anchor="middle" dy={-8} tone="primary" />} />
        )}

      </ComposedChart>
    </ChartContainer>
    <ul className="chart-legend" aria-label="Legend">
      {m.confirmed > 0 && <li><span className="chart-legend__swatch chart-legend__swatch--confirmed" aria-hidden="true" />Confirmed</li>}
      {m.prelim > 0 && <li><span className="chart-legend__swatch chart-legend__swatch--prelim" aria-hidden="true" />Preliminary</li>}
      <li><span className="chart-legend__swatch chart-legend__swatch--plan" aria-hidden="true" />Plan</li>
      {last.band && <li><span className="chart-legend__swatch chart-legend__swatch--forecast" aria-hidden="true" />Forecast {m.projLow.toFixed(1)}–{fmtM(m.projHigh)}</li>}
    </ul>
    </>
  )
}
