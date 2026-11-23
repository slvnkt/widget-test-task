// shadcn/ui chart primitives (ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent),
// same API as ui.shadcn.com/charts, rebuilt without Tailwind. Colors come from Omnitaki DS tokens,
// and the tooltip surface is the DS TooltipContent, as the DS "Chart tooltip content" story recommends.
import { createContext, useContext, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { TooltipContent } from '@ds/components/Tooltip'

export type ChartConfig = Record<string, { label: ReactNode; color: string }>

const ChartContext = createContext<ChartConfig>({})

export function ChartContainer({ config, children, height = 240, className }: { config: ChartConfig; children: ReactElement; height?: number; className?: string }) {
  const vars = Object.fromEntries(Object.entries(config).map(([k, v]) => [`--color-${k}`, v.color])) as CSSProperties
  return (
    <ChartContext.Provider value={config}>
      <div className={['chart', className].filter(Boolean).join(' ')} style={{ ...vars, height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

export const ChartTooltip = RechartsTooltip

interface Payload { dataKey?: string | number; value?: number | string; payload?: Record<string, unknown> }

export function ChartTooltipContent({ active, payload, label, format = (v: number) => `${v.toFixed(1)}M`, titleKey }: {
  active?: boolean
  payload?: Payload[]
  label?: ReactNode
  format?: (v: number) => string
  titleKey?: string
}) {
  const config = useContext(ChartContext)
  if (!active || !payload?.length) return null
  const seen = new Set<string>()
  const rows = payload
    .filter(p => p.value !== undefined && p.value !== null && config[String(p.dataKey)])
    .filter(p => (seen.has(String(p.dataKey)) ? false : (seen.add(String(p.dataKey)), true)))
    .map(p => ({ label: config[String(p.dataKey)].label, value: format(Number(p.value)), color: `var(--color-${String(p.dataKey)})` }))
  const title = titleKey && payload[0]?.payload ? String(payload[0].payload[titleKey]) : label
  return <TooltipContent variant="light" title={title} rows={rows} />
}
