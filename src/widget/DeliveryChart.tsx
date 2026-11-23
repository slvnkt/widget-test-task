import { useId, useLayoutEffect, useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts'
import { TooltipContent, type TooltipRow } from '@ds/components/Tooltip'
import { fmtM, type Model } from '../data/campaign'
import { ChartContainer, ChartTooltip, type ChartConfig } from './chart'
import { signedM } from './copy'

const HEIGHT = 300
const Y_TICKS = [0, 12, 24, 36, 48, 60]
const X_TICKS = ['Nov 3', 'Nov 10', 'Nov 17', 'Nov 24', 'Dec 1', 'Dec 8', 'Dec 14']
const PLAN_LABEL_AT = 'Dec 1'

const config: ChartConfig = {
  confirmed: { label: 'Confirmed', color: 'var(--ot-color-data-confirmed)' },
  prelim: { label: 'Preliminary', color: 'var(--ot-color-data-preliminary)' },
  plan: { label: 'Plan', color: 'var(--ot-color-chart-3)' },
  projection: { label: 'Forecast', color: 'var(--ot-color-data-projected)' },
}

type Row = Model['daily'][number] & { band?: [number, number] }

// Chart adapter: forecast band widens from zero at the last data point to the model's range at flight end.
function withBand(m: Model): Row[] {
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

interface LabelProps { viewBox?: { x: number; y: number }; text: string; anchor?: 'start' | 'middle' | 'end'; dx?: number; dy?: number; tone?: 'primary' | 'secondary'; type?: 'label' | 'body' }

// Direct label anchored at a ReferenceDot / ReferenceLine viewBox (replaces a legend).
function DirectLabel({ viewBox, text, anchor = 'end', dx = 0, dy = 0, tone = 'secondary', type = 'label' }: LabelProps) {
  if (!viewBox) return null
  // viewBox origin = dot centre (r 0), start of a horizontal line, top of a vertical line.
  const x = viewBox.x + dx
  const y = viewBox.y + dy
  return <text x={x} y={y} textAnchor={anchor} className={`chart__label chart__label--${type} chart__label--${tone}`}>{text}</text>
}

interface TickProps { x?: number; y?: number; payload?: { value: string } }

// First and last x ticks are anchored inward so "Dec 14" is not clipped at the right edge.
function XTick({ x = 0, y = 0, payload }: TickProps) {
  const value = payload?.value ?? ''
  const anchor = value === X_TICKS[X_TICKS.length - 1] ? 'end' : 'middle'
  return <text x={x} y={y} dy={12} textAnchor={anchor} className="chart__tick">{value}</text>
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

export function DeliveryChart({ m }: { m: Model }) {
  const hatchId = useId()
  const hatch = useHatchSize()
  const data = withBand(m)
  const lastConfirmed = [...data].reverse().find(r => r.confirmed !== undefined)
  const lastPrelim = m.prelim > 0 ? [...data].reverse().find(r => r.prelim !== undefined) : undefined
  const last = data[data.length - 1]
  const planAt = data.find(r => r.label === PLAN_LABEL_AT)
  const showToday = data.some(r => r.label === m.todayLabel)
  const step = hatch.width + hatch.gap

  return (
    <ChartContainer config={config} height={HEIGHT}>
      <ComposedChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <pattern id={hatchId} width={step} height={step} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={hatch.width} height={step} style={{ fill: 'var(--ot-pattern-hatch-color)' }} />
          </pattern>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--ot-color-chart-grid)" strokeWidth={1} />
        <XAxis dataKey="label" ticks={X_TICKS} interval={0} tickLine={false} axisLine={{ stroke: 'var(--ot-color-chart-grid)' }} tick={<XTick />} />
        <YAxis domain={[0, 60]} ticks={Y_TICKS} width={40} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v === 0 ? '0' : `${v}M`)} tick={{ className: 'chart__tick' }} />
        <ChartTooltip
          cursor={{ stroke: 'var(--ot-color-border-primary)', strokeWidth: 1 }}
          isAnimationActive={false}
          content={<DeliveryTooltip m={m} />}
        />

        <Area dataKey="band" stroke="none" fill="var(--ot-color-bg-tertiary)" fillOpacity={1} activeDot={false} isAnimationActive={false} />
        <ReferenceLine y={48} stroke="var(--ot-color-border-secondary)" strokeWidth={1} label={<DirectLabel text="Guarantee" anchor="start" dy={-6} />} />
        <Line dataKey="plan" type="linear" stroke="var(--color-plan)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} />
        <Area dataKey="confirmed" type="monotone" stroke="var(--color-confirmed)" strokeWidth={2} fill="var(--ot-color-data-track)" fillOpacity={1} activeDot={{ r: 4 }} isAnimationActive={false} />
        <Area dataKey="prelim" type="monotone" stroke="var(--color-prelim)" strokeWidth={2} strokeDasharray="2 3" strokeLinecap="round" fill={`url(#${hatchId})`} fillOpacity={1} activeDot={{ r: 4 }} isAnimationActive={false} />
        <Line dataKey="projection" type="linear" stroke="var(--color-projection)" strokeWidth={1.5} strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        {showToday && (
          <ReferenceLine x={m.todayLabel} stroke="var(--ot-color-border-secondary)" strokeWidth={1} label={<DirectLabel text="Today" anchor="middle" dy={-8} tone="primary" />} />
        )}

        {planAt && <ReferenceDot x={planAt.label} y={planAt.plan} r={0} label={<DirectLabel text="Plan" anchor="middle" dy={16} />} />}
        {lastConfirmed?.confirmed !== undefined && (
          <ReferenceDot x={lastConfirmed.label} y={lastConfirmed.confirmed} r={0} label={<DirectLabel text={`Confirmed ${fmtM(m.confirmed)}`} dy={-10} tone="primary" />} />
        )}
        {lastPrelim?.prelim !== undefined && (
          <ReferenceDot x={lastPrelim.label} y={lastPrelim.prelim} r={0} label={<DirectLabel text={`Preliminary ${signedM(m.prelim)}`} dy={-10} tone="primary" />} />
        )}
        {last.band && (
          <ReferenceDot x={last.label} y={last.band[1]} r={0} label={<DirectLabel text={`Forecast ${m.projLow.toFixed(1)}–${fmtM(m.projHigh)}`} dy={-8} type="body" />} />
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
