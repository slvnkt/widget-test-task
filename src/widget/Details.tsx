import { useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartLine, Table as TableIcon } from '@phosphor-icons/react'
import { Alert } from '@ds/components/Alert'
import { Badge } from '@ds/components/Badge'
import { NumberCell, Table, TwoLineCell, type TableColumn } from '@ds/components/Table'
import { Tabs } from '@ds/components/Tabs'
import { Term } from '@ds/components/Tooltip'
import { CAMPAIGN, fmtDay, fmtM, type Model } from '../data/campaign'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from './chart'
import { DEFINITIONS } from './copy'

const chartConfig: ChartConfig = {
  plan: { label: 'Planned (spot plan)', color: 'var(--ot-color-chart-3)' },
  confirmed: { label: 'Confirmed', color: 'var(--ot-color-data-confirmed)' },
  prelim: { label: 'Preliminary', color: 'var(--ot-color-data-preliminary)' },
  projection: { label: 'Forecast', color: 'var(--ot-color-data-projected)' },
}

function OverTimeChart({ m }: { m: Model }) {
  const today = m.def.today
  return (
    <ChartContainer config={chartConfig} height={260}>
      <ComposedChart data={m.daily} margin={{ top: 20, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--ot-pattern-hatch-bg)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ot-pattern-hatch-color)" strokeWidth="2" />
          </pattern>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--ot-color-chart-grid)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={6} tickMargin={8} tick={{ fill: 'var(--ot-color-chart-axis-text)', fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={v => `${v}M`} domain={[0, (max: number) => Math.ceil(Math.max(max, CAMPAIGN.guarantee * 1.08) / 10) * 10]} tick={{ fill: 'var(--ot-color-chart-axis-text)', fontSize: 12 }} />
        <ChartTooltip cursor={{ stroke: 'var(--ot-color-border-secondary)', strokeDasharray: '3 3' }} content={<ChartTooltipContent titleKey="label" />} />
        <Area type="stepAfter" dataKey="plan" stroke="var(--color-plan)" strokeDasharray="4 4" fill="none" strokeWidth={1.5} isAnimationActive={false} />
        <Area type="monotone" dataKey="confirmed" stroke="var(--color-confirmed)" fill="var(--color-confirmed)" fillOpacity={0.9} strokeWidth={2} isAnimationActive={false} connectNulls={false} />
        <Area type="monotone" dataKey="prelim" stroke="var(--color-confirmed)" fill="url(#hatch)" strokeWidth={2} strokeDasharray="2 2" isAnimationActive={false} connectNulls={false} />
        <Line type="linear" dataKey="projection" stroke="var(--color-projection)" strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
        <ReferenceLine y={CAMPAIGN.guarantee} stroke="var(--ot-color-data-expected)" strokeWidth={1.5} label={{ value: `Guarantee ${fmtM(CAMPAIGN.guarantee)}`, position: 'insideLeft', dy: -10, fill: 'var(--ot-color-text-secondary)', fontSize: 12 }} />
        {today >= 0 && today < CAMPAIGN.flightDays && (
          <ReferenceLine x={fmtDay(today)} stroke="var(--ot-color-border-strong)" strokeDasharray="3 3" label={{ value: 'Today', position: 'top', fill: 'var(--ot-color-text-secondary)', fontSize: 12 }} />
        )}
        {m.def.revised && (
          <ReferenceLine x={fmtDay(m.def.revised.on)} stroke="var(--ot-color-status-info-primary)" label={{ value: 'Revised', position: 'insideBottomRight', fill: 'var(--ot-color-status-info-secondary-text)', fontSize: 12 }} />
        )}
      </ComposedChart>
    </ChartContainer>
  )
}

type WeekRow = Model['weekly'][number]
const weekColumns: TableColumn<WeekRow>[] = [
  { key: 'week', header: 'Week', render: r => r.week },
  { key: 'planned', header: 'Planned', align: 'right', render: r => <NumberCell value={r.planned.toFixed(1)} unit="M" /> },
  { key: 'confirmed', header: 'Confirmed', align: 'right', render: r => <NumberCell value={r.confirmed ? r.confirmed.toFixed(1) : '—'} unit={r.confirmed ? 'M' : undefined} /> },
  { key: 'prelim', header: 'Preliminary', align: 'right', render: r => <NumberCell value={r.prelim ? r.prelim.toFixed(1) : '—'} unit={r.prelim ? 'M' : undefined} /> },
  { key: 'cumulative', header: 'Cumulative', align: 'right', render: r => <NumberCell value={r.cumulative.toFixed(1)} unit="M" /> },
  { key: 'pct', header: '% of guarantee', align: 'right', render: r => <NumberCell value={r.pct.toFixed(0)} unit="%" /> },
]

function OverTime({ m }: { m: Model }) {
  const [view, setView] = useState('chart')
  return (
    <div className="details-panel">
      <div className="details-panel__bar">
        <p className="details-panel__hint">Cumulative impressions. The dashed step line is the spot plan, so the expected curve is not a straight line.</p>
        <Tabs
          variant="filled"
          label="Chart or table view"
          value={view}
          onValueChange={setView}
          items={[
            { value: 'chart', label: 'Chart', icon: <ChartLine /> },
            { value: 'table', label: 'Table', icon: <TableIcon /> },
          ]}
        />
      </div>
      {view === 'chart' ? (
        <OverTimeChart m={m} />
      ) : (
        <Table columns={weekColumns} rows={m.weekly} getRowKey={r => r.week} caption="Delivery by week" hideCaption density="compact" />
      )}
    </div>
  )
}

function Sources({ m }: { m: Model }) {
  const k = m.prelim > 0 ? 1.18 : null
  return (
    <div className="details-panel">
      <div className="sources">
        <div className="source">
          <div className="source__head">
            <span className="swatch swatch--solid" aria-hidden="true" />
            <Term definition={DEFINITIONS.confirmed} title="Confirmed">Confirmed</Term>
            <span className="source__from">Network post-logs × {CAMPAIGN.currency}</span>
          </div>
          <p className="source__value">{fmtM(m.confirmed)} <span>through {m.confirmedThroughLabel ?? '—'} · {m.logsReceived} of {CAMPAIGN.networks} networks</span></p>
          <p className="source__text">What actually aired, from each network's log. Official and used for the guarantee, but arrives 5–10 days after air.</p>
        </div>
        <div className="source">
          <div className="source__head">
            <span className="swatch swatch--hatch" aria-hidden="true" />
            <Term definition={DEFINITIONS.preliminary} title="Preliminary">Preliminary</Term>
            <span className="source__from">Smart-TV ACR data, scaled to {CAMPAIGN.currency}</span>
          </div>
          <p className="source__value">
            {m.prelim > 0 ? fmtM(m.prelim) : 'No data'} <span>{m.prelimThroughLabel ? `${fmtDay(m.def.confirmedThrough! + 1)} – ${m.prelimThroughLabel}` : 'ACR unavailable for recent days'}{k ? ` · scaling factor ${k}` : ''}</span>
          </p>
          <p className="source__text">Smart TVs recognise the ad within a day. We convert TV-set counts to {CAMPAIGN.demo} impressions using this campaign's confirmed days, so both parts add up on one scale.</p>
        </div>
      </div>
      <div className="why">
        <p className="why__title">Why the two sources can differ</p>
        <ul>
          <li>Some networks have not sent logs yet ({CAMPAIGN.networks - m.logsReceived} pending).</li>
          <li>Smart-TV data does not see every TV: older sets, out-of-home viewing.</li>
          <li>The currency counts people in {CAMPAIGN.demo} with 3 days of playback; ACR counts TV sets.</li>
          <li>A network can move or drop a spot (<Term definition={DEFINITIONS.preempted}>preempted</Term>); the log shows it, ACR does not.</li>
        </ul>
      </div>
      <Alert intent="neutral" title="What to tell the client">
        Recent days are an early smart-TV estimate. They usually settle within a few percent once network logs arrive, and the guarantee is measured on confirmed numbers only.
      </Alert>
    </div>
  )
}

type NetRow = Model['networks'][number]
const netColumns: TableColumn<NetRow>[] = [
  { key: 'name', header: 'Network', sortable: true, sortValue: r => r.name, render: r => r.name },
  {
    key: 'status',
    header: 'Logs',
    sortable: true,
    sortValue: r => ({ late: 0, pending: 1, received: 2 })[r.status],
    render: r => <TwoLineCell primary={<Badge size="sm" variant={r.status === 'late' ? 'warning' : r.status === 'pending' ? 'neutral' : 'success'}>{r.status === 'late' ? 'Late' : r.status === 'pending' ? 'Pending' : 'Received'}</Badge>} secondary={r.status === 'received' ? `through ${r.through}` : r.through} />,
  },
  { key: 'spots', header: 'Spots aired', align: 'right', sortable: true, sortValue: r => r.aired, render: r => <NumberCell value={`${r.aired} / ${r.scheduled}`} /> },
  { key: 'pre', header: 'Preempted', align: 'right', sortable: true, sortValue: r => r.preempted, render: r => <NumberCell value={r.preempted || '—'} /> },
]

function Networks({ m }: { m: Model }) {
  return (
    <div className="details-panel">
      <Table columns={netColumns} rows={m.networks} getRowKey={r => r.name} caption="Post-log status by network" hideCaption density="compact" stickyHeader maxHeight={320} />
    </div>
  )
}

export type DetailsTab = 'overtime' | 'sources' | 'networks'

export function Details({ m, tab, onTab }: { m: Model; tab: DetailsTab; onTab: (t: DetailsTab) => void }) {
  return (
    <Tabs
      label="Delivery details"
      value={tab}
      onValueChange={v => onTab(v as DetailsTab)}
      items={[
        { value: 'overtime', label: 'Over time', content: <OverTime m={m} /> },
        { value: 'sources', label: 'Sources', content: <Sources m={m} /> },
        { value: 'networks', label: 'Networks', content: <Networks m={m} /> },
      ]}
    />
  )
}
