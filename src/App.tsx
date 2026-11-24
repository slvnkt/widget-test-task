import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CalendarBlank, ChartLine, GearSix, House, Moon, Question, Receipt, Sun, Television, UsersThree } from '@phosphor-icons/react'
import { Button } from '@ds/components/Button'
import { IconButton } from '@ds/components/IconButton'
import { Select } from '@ds/components/Select'
import { Term } from '@ds/components/Tooltip'
import type { TableSort } from '@ds/components/Table'
import { CampaignsCard, type ListState } from './campaigns/CampaignsCard'
import { SearchField } from './campaigns/SearchField'
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
  { label: 'Dashboard', icon: <House />, href: '#dashboard', current: true },
  { label: 'Campaigns', icon: <Television />, href: '#campaigns' },
  { label: 'Planning', icon: <CalendarBlank />, href: '#planning' },
  { label: 'Audiences', icon: <UsersThree />, href: '#audiences' },
  { label: 'Reports', icon: <ChartLine />, href: '#reports' },
  { label: 'Billing', icon: <Receipt />, href: '#billing' },
]
const NAV_FOOTER: NavLink[] = [
  { label: 'Help', icon: <Question />, href: '#help' },
  { label: 'Settings', icon: <GearSix />, href: '#settings' },
]

// Theme: light by default, remembered per browser. Set before the first render so there is no flash.
type Theme = 'light' | 'dark'
const THEME_KEY = 'theme'
function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
document.documentElement.dataset.theme = readTheme()

// Prototype control: system states only; lifecycle and data states are the table rows.
type ProtoState = 'live' | 'loading' | 'error' | 'empty' | 'stale' | 'details-loading' | 'details-error'
const PROTO_OPTIONS: Array<{ value: ProtoState; label: string }> = [
  { value: 'live', label: 'Live data' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Error' },
  { value: 'empty', label: 'No campaigns' },
  { value: 'stale', label: "Couldn't refresh" },
  { value: 'details-loading', label: 'Campaign details loading' },
  { value: 'details-error', label: 'Campaign details error' },
]
const LIST_STATE: Record<ProtoState, ListState> = { live: 'ready', loading: 'loading', error: 'error', empty: 'empty', stale: 'stale', 'details-loading': 'ready', 'details-error': 'ready' }
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
 * `#advertiser=all&period=7d&status=at-risk&q=winter&open=northwind`: `q` searches campaign names, `open` is the drawer.
 * Defaults (Northwind, Flight to date, all statuses, no search, no drawer) are omitted. Unknown values are dropped.
 */
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1))
  const a = q.get('advertiser') ?? ''
  const advertiser = a === ALL || advertiserName(a) ? a : slug(DEFAULT_ADVERTISER)
  const period = q.get('period')
  const status = q.get('status')
  const st: StatusFilter = isStatusFilter(status) ? status : 'all'
  const query = q.get('q') ?? ''
  // The drawer opens only for a campaign that is a visible row.
  const open = CAMPAIGNS.find(c => c.id === q.get('open'))
  const visible = open && inScope(open, advertiser) && matchesStatus(open, st) && matchesQuery(open, query)
  return {
    advertiser,
    period: isPeriod(period) ? period : ('ftd' as Period),
    status: st,
    query,
    campaignId: visible ? open.id : null,
  }
}

function writeHash(advertiser: string, period: Period, status: StatusFilter, query: string, campaignId: string | null) {
  const q = new URLSearchParams()
  if (advertiser !== slug(DEFAULT_ADVERTISER)) q.set('advertiser', advertiser)
  if (period !== 'ftd') q.set('period', period)
  if (status !== 'all') q.set('status', status)
  if (query) q.set('q', query)
  if (campaignId) q.set('open', campaignId)
  const hash = q.toString()
  history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search)
}

/** Live case-insensitive substring match on the campaign name. */
const matchesQuery = (c: Campaign, query: string) => c.name.toLowerCase().includes(query.trim().toLowerCase())

const AUDIENCE_HINT = 'Audience measured with Nielsen C3 ratings: live viewing plus 3 days of playback, during commercials.'

/** "48.0M impressions booked · Adults 25–54 · Nov 3 – Dec 14, 2026" (the advertiser is in the sidebar). */
function description(c: Campaign) {
  const { m } = c
  return (
    <>
      {fmtM(m.guarantee)} impressions booked · <Term definition={AUDIENCE_HINT} placement="bottom">Adults 25–54</Term> ·{' '}
      {m.fmt(0)} – {m.fmt(CAMPAIGN.flightDays - 1)}, {dateOf(CAMPAIGN.flightDays - 1 + c.startOffset).getFullYear()}
    </>
  )
}

export function App() {
  const initial = useMemo(readHash, [])
  const [advertiser, setAdvertiser] = useState(initial.advertiser)
  const [period, setPeriod] = useState<Period>(initial.period)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initial.status)
  const [query, setQuery] = useState(initial.query)
  const [campaignId, setCampaignId] = useState<string | null>(initial.campaignId)
  const [sort, setSort] = useState<TableSort | null>(null)
  const [proto, setProto] = useState<ProtoState>('live')
  const [theme, setTheme] = useState<Theme>(readTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // storage blocked: the choice lasts for this page only
    }
  }, [theme])
  const titleRef = useRef<HTMLHeadingElement>(null)
  const returnTo = useRef<string | null>(null)

  const brand = advertiserName(advertiser) // undefined = All advertisers
  // Status counts follow the advertiser and search (status itself does not depend on the period).
  const scoped = useMemo(() => CAMPAIGNS.filter(c => inScope(c, advertiser) && matchesQuery(c, query)), [advertiser, query])
  const rows = useMemo(
    () => sortCampaigns(CAMPAIGNS.filter(c => scoped.includes(c) && matchesStatus(c, statusFilter)), sort, period),
    [scoped, sort, period, statusFilter],
  )
  const campaign = CAMPAIGNS.find(c => c.id === campaignId) ?? null
  const filtered = period !== 'ftd' || statusFilter !== 'all' || query !== ''

  const clearFilters = useCallback(() => {
    setPeriod('ftd')
    setStatusFilter('all')
    setQuery('')
  }, [])

  useEffect(() => writeHash(advertiser, period, statusFilter, query, campaignId), [advertiser, period, statusFilter, query, campaignId])
  useEffect(() => {
    const on = () => {
      const h = readHash()
      setAdvertiser(h.advertiser)
      setPeriod(h.period)
      setStatusFilter(h.status)
      setQuery(h.query)
      setCampaignId(h.campaignId)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
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
    const row = document.querySelector<HTMLElement>(`.campaigns-table tr[aria-label^="${CSS.escape(`${rowLabel(c)}.`)}"]`)
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
  // A filter or advertiser change that hides the open campaign closes the drawer (focus goes to the card title).
  // So does switching the list to Error or No campaigns (there is no row to belong to).
  const listGone = LIST_STATE[proto] === 'error' || LIST_STATE[proto] === 'empty'
  useEffect(() => {
    if (campaignId && (listGone || !rows.some(c => c.id === campaignId))) close()
  }, [campaignId, rows, close, listGone])
  const retry = useCallback(() => setProto('live'), [])
  const filtersOff = LIST_STATE[proto] === 'error'

  return (
    <div className="app">
      <SideNav
        brand="Simulmedia TV+"
        account={<Select size="sm" label="Advertiser" value={advertiser} onValueChange={setAdvertiser} options={ADVERTISER_OPTIONS} />}
        items={NAV}
        footerItems={NAV_FOOTER}
        bottom={
          <>
            <div className="proto" role="group" aria-label="Prototype controls">
              <Select size="sm" aria-label="Prototype state" value={proto} onValueChange={v => setProto(v as ProtoState)} options={PROTO_OPTIONS} />
            </div>
            {/* Vertical pill; the active theme's button is the raised circle. */}
            <div className="theme-pill" role="group" aria-label="Theme">
              <IconButton variant="ghost" size="sm" icon={<Moon />} label="Dark theme" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')} />
              <IconButton variant="ghost" size="sm" icon={<Sun />} label="Light theme" aria-pressed={theme === 'light'} onClick={() => setTheme('light')} />
            </div>
          </>
        }
      />

      <main className="main">
        {/* Sticky so the filters stay visible at any scroll; the drawer layers above it. */}
        <div className="page-top">
          <PageHeader title="Dashboard" />
          {LIST_STATE[proto] !== 'empty' && (
            <div className="filter-bar" role="group" aria-label="Filters">
              {/* Error: the bar stays in place (no layout jump), disabled until the list loads. */}
              <SearchField className="filter-bar__search" value={query} onChange={setQuery} disabled={filtersOff} />
              <Select size="sm" aria-label="Period" className="filter-bar__period" value={period} onValueChange={v => setPeriod(v as Period)} options={PERIOD_OPTIONS} disabled={filtersOff} />
              <Select size="sm" aria-label="Status" className="filter-bar__status" value={statusFilter} onValueChange={setStatusFilter} options={statusOptions(scoped)} disabled={filtersOff} />
              {filtered && <Button variant="ghost" size="sm" onClick={clearFilters} disabled={filtersOff}>Clear filters</Button>}
            </div>
          )}
        </div>
        <CampaignsCard
          rows={rows}
          state={LIST_STATE[proto]}
          period={period}
          onClearFilters={clearFilters}
          query={query.trim()}
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

    </div>
  )
}
