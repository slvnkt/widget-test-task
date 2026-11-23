import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CalendarBlank, ChartLine, GearSix, House, Question, Receipt, Television, UsersThree } from '@phosphor-icons/react'
import { Button } from '@ds/components/Button'
import { Card } from '@ds/components/Card'
import { Select } from '@ds/components/Select'
import type { TableSort } from '@ds/components/Table'
import { CampaignsCard, type ListState } from './campaigns/CampaignsCard'
import { rowLabel } from './campaigns/CampaignsTable'
import { isStatusFilter, matchesStatus, statusOptions, type StatusFilter } from './campaigns/filter'
import { sortCampaigns } from './campaigns/sort'
import { CAMPAIGN, dateOf, fmtM } from './data/campaign'
import { isPeriod, PERIODS, type Period } from './data/period'
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

const inScope = (c: Campaign, advertiser: string) => advertiser === ALL || c.brand === advertiserName(advertiser)
const PERIOD_OPTIONS = PERIODS.map(p => ({ value: p.value, label: p.label }))

/**
 * `#advertiser=all&period=7d&status=at-risk&campaign=northwind&open=northwind`: `campaign` filters the table, `open` is the drawer.
 * Defaults (Northwind, Flight to date, all statuses, all campaigns, no drawer) are omitted. Unknown values, the old `view`
 * and a campaign outside the advertiser are dropped; an old drawer link (`campaign=` only) lands filtered to that row.
 */
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1))
  const a = q.get('advertiser') ?? ''
  const advertiser = a === ALL || advertiserName(a) ? a : slug(DEFAULT_ADVERTISER)
  const period = q.get('period')
  const status = q.get('status')
  const filter = CAMPAIGNS.find(c => c.id === q.get('campaign'))
  const open = q.get('open')
  return {
    advertiser,
    period: isPeriod(period) ? period : ('ftd' as Period),
    status: isStatusFilter(status) ? status : ('all' as StatusFilter),
    campaignFilter: filter && inScope(filter, advertiser) ? filter.id : null,
    campaignId: CAMPAIGNS.some(c => c.id === open) ? open : null,
  }
}

function writeHash(advertiser: string, period: Period, status: StatusFilter, campaignFilter: string | null, campaignId: string | null) {
  const q = new URLSearchParams()
  if (advertiser !== slug(DEFAULT_ADVERTISER)) q.set('advertiser', advertiser)
  if (period !== 'ftd') q.set('period', period)
  if (status !== 'all') q.set('status', status)
  if (campaignFilter) q.set('campaign', campaignFilter)
  if (campaignId) q.set('open', campaignId)
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
  const [campaignFilter, setCampaignFilter] = useState<string | null>(initial.campaignFilter)
  const [campaignId, setCampaignId] = useState<string | null>(initial.campaignId)
  const [sort, setSort] = useState<TableSort | null>(null)
  const [proto, setProto] = useState<ProtoState>('live')
  const titleRef = useRef<HTMLHeadingElement>(null)
  const returnTo = useRef<string | null>(null)
  const appRef = useRef<HTMLDivElement>(null)
  const pageTopRef = useRef<HTMLDivElement>(null)

  const brand = advertiserName(advertiser) // undefined = All advertisers
  // Campaign options are the advertiser's campaigns A–Z, not narrowed by Status.
  const advertiserCampaigns = useMemo(() => CAMPAIGNS.filter(c => inScope(c, advertiser)).sort((a, b) => a.name.localeCompare(b.name)), [advertiser])
  const campaignOptions = useMemo(() => [{ value: ALL, label: 'All campaigns' }, ...advertiserCampaigns.map(c => ({ value: c.id, label: c.name }))], [advertiserCampaigns])
  // Status counts follow the advertiser and campaign filters (status itself does not depend on the period).
  const scoped = useMemo(() => advertiserCampaigns.filter(c => !campaignFilter || c.id === campaignFilter), [advertiserCampaigns, campaignFilter])
  const rows = useMemo(
    () => sortCampaigns(CAMPAIGNS.filter(c => scoped.includes(c) && matchesStatus(c, statusFilter)), sort, period),
    [scoped, sort, period, statusFilter],
  )
  const campaign = CAMPAIGNS.find(c => c.id === campaignId) ?? null
  const filtered = period !== 'ftd' || statusFilter !== 'all' || campaignFilter !== null

  const changeAdvertiser = (a: string) => {
    setAdvertiser(a)
    setCampaignFilter(id => (CAMPAIGNS.some(c => c.id === id && inScope(c, a)) ? id : null))
  }
  const clearFilters = useCallback(() => {
    setPeriod('ftd')
    setStatusFilter('all')
    setCampaignFilter(null)
  }, [])

  useEffect(() => writeHash(advertiser, period, statusFilter, campaignFilter, campaignId), [advertiser, period, statusFilter, campaignFilter, campaignId])
  useEffect(() => {
    const on = () => {
      const h = readHash()
      setAdvertiser(h.advertiser)
      setPeriod(h.period)
      setStatusFilter(h.status)
      setCampaignFilter(h.campaignFilter)
      setCampaignId(h.campaignId)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  // The drawer opens under the sticky page top (filter bar + its 12px bottom padding) so the filters stay usable with it open.
  useLayoutEffect(() => {
    const bar = pageTopRef.current
    const app = appRef.current
    if (!bar || !app) return
    const update = () => app.style.setProperty('--drawer-top', `${Math.max(0, bar.getBoundingClientRect().bottom)}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(bar)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Open or swap: focus the drawer title. Close: focus the row that opened it, or the card title if that row is filtered out.
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
    const target = row ?? document.querySelector<HTMLElement>('.campaigns .ot-card__title')
    if (target && !row) target.tabIndex = -1
    target?.focus()
  }, [campaignId])

  const close = useCallback(() => {
    setCampaignId(id => {
      returnTo.current = id
      return null
    })
  }, [])
  const retry = useCallback(() => setProto('live'), [])

  return (
    <div className="app" ref={appRef}>
      <SideNav
        brand="Simulmedia TV+"
        account={<Select size="sm" label="Advertiser" value={advertiser} onValueChange={changeAdvertiser} options={ADVERTISER_OPTIONS} />}
        items={NAV}
        footerItems={NAV_FOOTER}
      />

      <main className="main">
        {/* Sticky so the filters stay visible above the drawer at any scroll. */}
        <div className="page-top" ref={pageTopRef}>
          <PageHeader title="Campaigns" description={brand} />
          {(LIST_STATE[proto] === 'ready' || LIST_STATE[proto] === 'loading') && (
            <div className="filter-bar" role="group" aria-label="Filters">
              <Select size="sm" aria-label="Period" className="filter-bar__period" value={period} onValueChange={v => setPeriod(v as Period)} options={PERIOD_OPTIONS} />
              <Select size="sm" aria-label="Status" className="filter-bar__status" value={statusFilter} onValueChange={setStatusFilter} options={statusOptions(scoped)} />
              <Select size="sm" aria-label="Campaign" className="filter-bar__campaign" value={campaignFilter ?? ALL} onValueChange={v => setCampaignFilter(v === ALL ? null : v)} options={campaignOptions} />
              {filtered && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
            </div>
          )}
        </div>
        <CampaignsCard
          rows={rows}
          state={LIST_STATE[proto]}
          period={period}
          onClearFilters={clearFilters}
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
