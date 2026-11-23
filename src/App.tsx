import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CalendarBlank, ChartLine, GearSix, House, Question, Receipt, Television, UsersThree } from '@phosphor-icons/react'
import { Card } from '@ds/components/Card'
import { Select } from '@ds/components/Select'
import type { TableSort } from '@ds/components/Table'
import { CampaignsCard, type ListState } from './campaigns/CampaignsCard'
import { rowLabel } from './campaigns/CampaignsTable'
import { isStatusFilter, matchesStatus, type StatusFilter } from './campaigns/filter'
import { sortCampaigns } from './campaigns/sort'
import { CAMPAIGN, dateOf, fmtM } from './data/campaign'
import { isPeriod, type Period } from './data/period'
import { ADVERTISERS, CAMPAIGNS, type Campaign } from './data/rows'
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

// Account scope: brand marketers see one advertiser; agency users and Simulmedia AMs can pick All advertisers.
const ALL = 'all'
const DEFAULT_ADVERTISER = ADVERTISERS[0] // Northwind Coffee
const slug = (brand: string) => brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const ADVERTISER_OPTIONS = [...ADVERTISERS.map(b => ({ value: slug(b), label: b })), { value: ALL, label: 'All advertisers' }]
const advertiserName = (value: string) => ADVERTISERS.find(b => slug(b) === value)

/** `#advertiser=all&period=7d&status=live&campaign=northwind`; defaults (Northwind, Flight to date, all statuses, no drawer) are omitted. Unknown values (and the old `view`) are dropped. */
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1))
  const advertiser = q.get('advertiser') ?? ''
  const period = q.get('period')
  const status = q.get('status')
  const id = q.get('campaign')
  return {
    advertiser: advertiser === ALL || advertiserName(advertiser) ? advertiser : slug(DEFAULT_ADVERTISER),
    period: isPeriod(period) ? period : ('ftd' as Period),
    status: isStatusFilter(status) ? status : ('all' as StatusFilter),
    campaignId: CAMPAIGNS.some(c => c.id === id) ? id : null,
  }
}

function writeHash(advertiser: string, period: Period, status: StatusFilter, campaignId: string | null) {
  const q = new URLSearchParams()
  if (advertiser !== slug(DEFAULT_ADVERTISER)) q.set('advertiser', advertiser)
  if (period !== 'ftd') q.set('period', period)
  if (status !== 'all') q.set('status', status)
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
  const [advertiser, setAdvertiser] = useState(initial.advertiser)
  const [period, setPeriod] = useState<Period>(initial.period)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initial.status)
  const [campaignId, setCampaignId] = useState<string | null>(initial.campaignId)
  const [sort, setSort] = useState<TableSort | null>(null)
  const [proto, setProto] = useState<ProtoState>('live')
  const titleRef = useRef<HTMLHeadingElement>(null)
  const returnTo = useRef<string | null>(null)

  const brand = advertiserName(advertiser) // undefined = All advertisers
  const rows = useMemo(
    () => sortCampaigns(CAMPAIGNS.filter(c => (!brand || c.brand === brand) && matchesStatus(c, statusFilter)), sort, period),
    [brand, sort, period, statusFilter],
  )
  const campaign = CAMPAIGNS.find(c => c.id === campaignId) ?? null

  useEffect(() => writeHash(advertiser, period, statusFilter, campaignId), [advertiser, period, statusFilter, campaignId])
  useEffect(() => {
    const on = () => {
      const h = readHash()
      setAdvertiser(h.advertiser)
      setPeriod(h.period)
      setStatusFilter(h.status)
      setCampaignId(h.campaignId)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  // Open or swap: focus the drawer title. Close: focus the row that opened it.
  useLayoutEffect(() => {
    if (campaignId) {
      titleRef.current?.focus()
      return
    }
    const id = returnTo.current
    returnTo.current = null
    const c = CAMPAIGNS.find(x => x.id === id)
    if (!c) return
    const row = document.querySelector<HTMLElement>(`.campaigns-table tr[aria-label="${CSS.escape(rowLabel(c))}"]`)
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
      <SideNav
        brand="Simulmedia TV+"
        account={<Select size="sm" label="Advertiser" value={advertiser} onValueChange={setAdvertiser} options={ADVERTISER_OPTIONS} />}
        items={NAV}
        footerItems={NAV_FOOTER}
      />

      <main className="main">
        <PageHeader title="Campaigns" description={brand} />
        <CampaignsCard
          rows={rows}
          state={LIST_STATE[proto]}
          period={period}
          onPeriodChange={setPeriod}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          showBrand={!brand}
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
          aria-label="Prototype state"
          value={proto}
          onValueChange={v => setProto(v as ProtoState)}
          options={PROTO_OPTIONS}
        />
      </Card>
    </div>
  )
}
