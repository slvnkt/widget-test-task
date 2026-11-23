import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CalendarBlank, ChartLine, GearSix, House, Question, Receipt, Television, UsersThree } from '@phosphor-icons/react'
import { Card } from '@ds/components/Card'
import { Select } from '@ds/components/Select'
import type { TableSort } from '@ds/components/Table'
import { CampaignsCard, type ListState, type ViewMode } from './campaigns/CampaignsCard'
import { rowLabel } from './campaigns/CampaignsTable'
import { sortCampaigns } from './campaigns/sort'
import { CAMPAIGN, dateOf, fmtM } from './data/campaign'
import { isPeriod, type Period } from './data/period'
import { CAMPAIGNS, type Campaign } from './data/rows'
import { Drawer } from './shell/Drawer'
import { PageHeader } from './shell/PageHeader'
import { SideNav, type NavLink } from './shell/SideNav'
import { DeliveryWidget, type DetailsState } from './widget/DeliveryWidget'

const NAV: NavLink[] = [
  { label: 'Overview', icon: <House />, href: '#overview' },
  { label: 'Campaigns', icon: <Television />, href: '#campaigns', current: true },
  { label: 'Planning', icon: <CalendarBlank />, href: '#planning' },
  { label: 'Audiences', icon: <UsersThree />, href: '#audiences' },
  { label: 'Reports', icon: <ChartLine />, href: '#reports' },
  { label: 'Billing', icon: <Receipt />, href: '#billing' },
]
const NAV_FOOTER: NavLink[] = [
  { label: 'Help', icon: <Question />, href: '#help' },
  { label: 'Settings', icon: <GearSix />, href: '#settings' },
]

// Prototype control: system states only; lifecycle and data states are the table rows.
type ProtoState = 'live' | 'loading' | 'error' | 'empty' | 'details-loading' | 'details-error'
const PROTO_OPTIONS: Array<{ value: ProtoState; label: string }> = [
  { value: 'live', label: 'Live data' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Error' },
  { value: 'empty', label: 'No campaigns' },
  { value: 'details-loading', label: 'Campaign details loading' },
  { value: 'details-error', label: 'Campaign details error' },
]
const LIST_STATE: Record<ProtoState, ListState> = { live: 'ready', loading: 'loading', error: 'error', empty: 'empty', 'details-loading': 'ready', 'details-error': 'ready' }
const DETAILS_STATE: Partial<Record<ProtoState, DetailsState>> = { 'details-loading': 'loading', 'details-error': 'error' }

/** `#period=7d&view=chart&campaign=northwind`; defaults (Flight to date, table, no drawer) are omitted. Unknown values are dropped. */
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1))
  const period = q.get('period')
  const id = q.get('campaign')
  return {
    period: isPeriod(period) ? period : ('ftd' as Period),
    view: (q.get('view') === 'chart' ? 'chart' : 'table') as ViewMode,
    campaignId: CAMPAIGNS.some(c => c.id === id) ? id : null,
  }
}

function writeHash(period: Period, view: ViewMode, campaignId: string | null) {
  const q = new URLSearchParams()
  if (period !== 'ftd') q.set('period', period)
  if (view !== 'table') q.set('view', view)
  if (campaignId) q.set('campaign', campaignId)
  const hash = q.toString()
  history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search)
}

function description(c: Campaign) {
  const { m } = c
  return [
    c.brand,
    `${fmtM(m.guarantee)} impressions guaranteed`,
    `${CAMPAIGN.demo}, ${CAMPAIGN.currency}`,
    `${m.fmt(0)} – ${m.fmt(CAMPAIGN.flightDays - 1)}, ${dateOf(CAMPAIGN.flightDays - 1 + c.startOffset).getFullYear()}`,
  ].join(' · ')
}

export function App() {
  const initial = useMemo(readHash, [])
  const [period, setPeriod] = useState<Period>(initial.period)
  const [view, setView] = useState<ViewMode>(initial.view)
  const [campaignId, setCampaignId] = useState<string | null>(initial.campaignId)
  const [sort, setSort] = useState<TableSort | null>(null)
  const [proto, setProto] = useState<ProtoState>('live')
  const titleRef = useRef<HTMLHeadingElement>(null)
  const returnTo = useRef<string | null>(null)

  const rows = useMemo(() => sortCampaigns(CAMPAIGNS, sort, period), [sort, period])
  const campaign = CAMPAIGNS.find(c => c.id === campaignId) ?? null

  useEffect(() => writeHash(period, view, campaignId), [period, view, campaignId])
  useEffect(() => {
    const on = () => {
      const h = readHash()
      setPeriod(h.period)
      setView(h.view)
      setCampaignId(h.campaignId)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  // Open or swap: focus the drawer title. Close: focus the row that opened it, in the current view.
  useLayoutEffect(() => {
    if (campaignId) {
      titleRef.current?.focus()
      return
    }
    const id = returnTo.current
    returnTo.current = null
    const c = CAMPAIGNS.find(x => x.id === id)
    if (!c) return
    const row = document.querySelector<HTMLElement>(`[data-campaign="${c.id}"], .campaigns-table tr[aria-label="${CSS.escape(rowLabel(c))}"]`)
    row?.focus()
  }, [campaignId])

  const close = useCallback(() => {
    setCampaignId(id => {
      returnTo.current = id
      return null
    })
  }, [])
  const retry = useCallback(() => setProto('live'), [])

  return (
    <div className="app">
      <SideNav brand="Simulmedia TV+" items={NAV} footerItems={NAV_FOOTER} />

      <main className="main">
        <PageHeader title="Campaigns" />
        <CampaignsCard
          rows={rows}
          state={LIST_STATE[proto]}
          period={period}
          onPeriodChange={setPeriod}
          view={view}
          onViewChange={setView}
          sort={sort}
          onSortChange={setSort}
          selectedId={campaignId}
          onOpen={setCampaignId}
          onRetry={retry}
        />
      </main>

      <Drawer open={campaign !== null} title={campaign?.name} description={campaign && description(campaign)} onClose={close} titleRef={titleRef}>
        {campaign && <DeliveryWidget c={campaign} period={period} state={DETAILS_STATE[proto] ?? 'ready'} onRetry={retry} />}
      </Drawer>

      <Card as="aside" variant="outlined" padding="md" className="proto" aria-label="Prototype controls">
        <Select
          size="sm"
          label="Prototype state"
          value={proto}
          onValueChange={v => setProto(v as ProtoState)}
          options={PROTO_OPTIONS}
        />
      </Card>
    </div>
  )
}
