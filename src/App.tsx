import { useEffect, useMemo, useState } from 'react'
import { CalendarBlank, ChartLine, GearSix, House, Question, Receipt, Television, UsersThree } from '@phosphor-icons/react'
import { Badge } from '@ds/components/Badge'
import { Card } from '@ds/components/Card'
import { Select } from '@ds/components/Select'
import { buildModel, CAMPAIGN, fmtDay, SCENARIOS } from './data/campaign'
import { Breadcrumbs } from './shell/Breadcrumbs'
import { PageHeader } from './shell/PageHeader'
import { SideNav, type NavLink } from './shell/SideNav'
import { PHASE_LABEL } from './widget/copy'
import { DeliveryWidget } from './widget/DeliveryWidget'

const DEFAULT_STATE = 'on-track'

const fromHash = () => {
  const id = decodeURIComponent(location.hash.replace('#', ''))
  return SCENARIOS.some(s => s.id === id) ? id : DEFAULT_STATE
}

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

const description = [
  CAMPAIGN.brand,
  `${CAMPAIGN.guarantee.toFixed(1)}M impressions guaranteed`,
  `${CAMPAIGN.demo}, ${CAMPAIGN.currency}`,
  `${fmtDay(0)} – ${fmtDay(CAMPAIGN.flightDays - 1)}, 2026`,
].join(' · ')

export function App() {
  const [id, setId] = useState(fromHash)
  const models = useMemo(() => SCENARIOS.map(buildModel), [])
  const m = models.find(x => x.def.id === id)!

  useEffect(() => { history.replaceState(null, '', `#${id}`) }, [id])
  useEffect(() => {
    const on = () => setId(fromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  return (
    <div className="app">
      <SideNav brand="Simulmedia TV+" items={NAV} footerItems={NAV_FOOTER} />

      <main className="main">
        <Breadcrumbs items={[{ label: 'Campaigns', href: '#campaigns' }, { label: CAMPAIGN.brand, href: '#advertiser' }, { label: CAMPAIGN.name }]} />
        <PageHeader
          title={CAMPAIGN.name}
          status={<Badge variant="neutral" size="md" dot>{PHASE_LABEL[m.phase]}</Badge>}
          description={description}
        />
        <DeliveryWidget m={m} />
      </main>

      <Card as="aside" variant="outlined" padding="md" className="proto" aria-label="Prototype controls">
        <Select
          size="sm"
          label="Prototype state"
          value={id}
          onValueChange={setId}
          options={SCENARIOS.map(s => ({ value: s.id, label: s.label }))}
          helperText="Only P3 is designed so far"
        />
      </Card>
    </div>
  )
}
