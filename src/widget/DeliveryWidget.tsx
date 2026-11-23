import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowClockwise, ArrowSquareOut, ArrowUp, CheckCircle, Clock, Copy, DotsThree, DownloadSimple,
  Info, Pause, Stop, Warning, WarningCircle,
} from '@phosphor-icons/react'
import { Alert } from '@ds/components/Alert'
import { Badge } from '@ds/components/Badge'
import { Button } from '@ds/components/Button'
import { Card, CardBody, CardDivider, CardFooter, CardHeader } from '@ds/components/Card'
import { Disclosure } from '@ds/components/Disclosure'
import { EmptyState } from '@ds/components/EmptyState'
import { IconButton } from '@ds/components/IconButton'
import { Menu } from '@ds/components/Menu'
import { Progress, type ProgressMarker, type ProgressSegment } from '@ds/components/Progress'
import { Skeleton } from '@ds/components/Skeleton'
import { Stat } from '@ds/components/Stat'
import { CAMPAIGN, fmtDay, fmtM, type Model } from '../data/campaign'
import { answerLine, contextAlert, DEFINITIONS, PHASE_LABEL, STATUS, statusDetail } from './copy'
import { Details, type DetailsTab } from './Details'

const G = CAMPAIGN.guarantee
const ICONS: Record<string, ReactNode> = {
  check: <CheckCircle weight="fill" />, warn: <Warning weight="fill" />, danger: <WarningCircle weight="fill" />,
  clock: <Clock weight="bold" />, up: <ArrowUp weight="bold" />, pause: <Pause weight="fill" />, stop: <Stop weight="fill" />, info: <Info weight="bold" />,
}

function MoreMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div className="more" ref={ref}>
      <IconButton variant="ghost" size="sm" icon={<DotsThree weight="bold" />} label="More actions" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(o => !o)} />
      {open && (
        <Menu
          className="more__menu"
          label="More actions"
          autoFocus
          onClose={() => setOpen(false)}
          onSelect={() => setOpen(false)}
          items={[
            { value: 'copy', label: 'Copy summary for a report', leadingIcon: <Copy /> },
            { value: 'export', label: 'Export CSV', leadingIcon: <DownloadSimple /> },
            { value: 'report', label: 'Open full report', leadingIcon: <ArrowSquareOut /> },
          ]}
        />
      )}
    </div>
  )
}

function Header({ m }: { m: Model }) {
  const live = m.phase === 'live'
  return (
    <CardHeader
      titleAs="h2"
      title={`${CAMPAIGN.brand} · ${CAMPAIGN.name}`}
      subtitle={`Nov 3 – Dec 14 · ${CAMPAIGN.networks} networks · ${CAMPAIGN.demo}${live ? ` · Day ${m.dayOfFlight} of ${CAMPAIGN.flightDays}` : ''}`}
      action={
        <div className="header-actions">
          <Badge variant={live ? 'brand' : 'neutral'} dot={live}>{PHASE_LABEL[m.phase]}</Badge>
          <MoreMenu />
        </div>
      }
    />
  )
}

function bar(m: Model) {
  const segments: ProgressSegment[] = []
  if (m.confirmed > 0) segments.push({ value: m.confirmed, fill: 'solid', label: `Confirmed ${fmtM(m.confirmed)}` })
  if (m.prelim > 0) segments.push({ value: m.prelim, fill: 'hatch', label: `Preliminary ${fmtM(m.prelim)}` })
  const markers: ProgressMarker[] = []
  const showPace = m.phase === 'live' && m.expected > 0 && m.status !== 'too-early'
  if (showPace) markers.push({ value: m.expected, type: 'marker', label: `Expected by today ${fmtM(m.expected)}` })
  markers.push({ value: G, type: 'target', label: `Guarantee ${fmtM(G)}` })
  const ghost = showPace && m.projection > m.delivered ? { from: m.delivered, to: m.projection, label: `Forecast ${fmtM(m.projection)}` } : undefined
  const max = Math.max(G, m.projHigh, m.delivered) * 1.06
  return { segments, markers, ghost, max }
}

function Hero({ m }: { m: Model }) {
  if (m.status === 'scheduled') {
    return <Stat size="lg" label="Guaranteed impressions" value={G.toFixed(1)} unit="M" secondary={`${CAMPAIGN.demo} · ${CAMPAIGN.currency}`} hint={DEFINITIONS.guarantee} />
  }
  if (['paused', 'cancelled', 'finalizing', 'final-met', 'final-under'].includes(m.status)) {
    const final = m.phase === 'finalized'
    return (
      <Stat
        size="lg"
        label={final ? 'Final delivery' : m.phase === 'ended' ? 'Delivered, preliminary' : 'Delivered before stop'}
        value={Math.round((m.delivered / G) * 100)}
        unit="% of guarantee"
        secondary={`${fmtM(m.delivered)} of ${fmtM(G)} impressions`}
        hint={final ? 'Reconciled with all network logs.' : DEFINITIONS.preliminary}
      />
    )
  }
  if (m.status === 'too-early') {
    return <Stat size="lg" label="Spots aired so far" value={m.spotsAired} unit={`of ${m.spotsPlannedToDate} planned`} secondary={`${fmtM(m.delivered)} preliminary impressions`} hint="In the first days, aired spots are the most reliable signal. Impressions firm up over the next week." />
  }
  return (
    <Stat
      size="lg"
      label="Projected at end of flight"
      value={Math.round(m.projPct)}
      unit="% of guarantee"
      secondary={`${fmtM(m.projection)} of ${fmtM(G)} · range ${m.projLow.toFixed(1)}–${m.projHigh.toFixed(1)}M`}
      hint={DEFINITIONS.forecast}
    />
  )
}

function SupportRow({ m, onOpen }: { m: Model; onOpen: (t: DetailsTab) => void }) {
  if (m.status === 'scheduled') {
    return (
      <div className="stats">
        <Stat size="sm" label="Spots planned" value={CAMPAIGN.totalSpots} secondary="40% in the first 3 weeks" />
        <Stat size="sm" label="Networks" value={CAMPAIGN.networks} secondary="All with Nielsen ratings" />
        <Stat size="sm" label="Flight" value="6" unit="weeks" secondary="Heavier from Nov 24" />
        <Stat size="sm" label="First data" value="Nov 4" secondary="Preliminary, the day after air" />
      </div>
    )
  }
  const pending = CAMPAIGN.networks - m.logsReceived
  const mg = m.def.makegood
  return (
    <div className="stats">
      <Stat
        size="sm"
        label="Spots aired"
        value={m.spotsAired}
        unit={`/ ${m.spotsPlannedToDate}`}
        secondary={m.preempted ? `${m.preempted} preempted, rescheduled` : 'None preempted'}
        hint={DEFINITIONS.preempted}
      />
      <Stat
        size="sm"
        label="Logs received"
        value={m.logsReceived}
        unit={`/ ${CAMPAIGN.networks} networks`}
        secondary={pending ? `${pending} ${m.def.lateNetworks ? `pending, ${m.def.lateNetworks} late` : 'pending, on schedule'}` : 'All networks reported'}
        onClick={() => onOpen('networks')}
      />
      <Stat
        size="sm"
        label="Makegood"
        value={mg ? m.makegoodSpots : '—'}
        unit={mg ? 'spots' : undefined}
        secondary={mg ? `${mg.window} · ~${fmtM(m.makegoodImps)}` : 'None needed'}
        hint={DEFINITIONS.makegood}
      />
      {m.prelimThroughLabel === null && m.def.prelimThrough === null ? (
        <Stat size="sm" label="Data through" value={m.confirmedThroughLabel ?? '—'} secondary="Confirmed only, no ACR" onClick={() => onOpen('sources')} />
      ) : (
        <Stat
          size="sm"
          label="Data through"
          value={m.prelimThroughLabel ?? m.confirmedThroughLabel ?? '—'}
          secondary={m.confirmedThroughLabel ? `Confirmed through ${m.confirmedThroughLabel}` : 'No network logs yet'}
          onClick={() => onOpen('sources')}
        />
      )}
    </div>
  )
}

function LoadingBody() {
  return (
    <div className="widget-body" aria-busy="true">
      <div className="status-row"><Skeleton shape="block" width={96} height={24} /><Skeleton width={280} /></div>
      <Stat size="lg" label="Projected" value="" loading />
      <Progress size="lg" loading />
      <div className="stats">{[0, 1, 2, 3].map(i => <Stat key={i} size="sm" label="" value="" loading />)}</div>
    </div>
  )
}

export function DeliveryWidget({ m }: { m: Model }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [tab, setTab] = useState<DetailsTab>('overtime')
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => { setDismissed(false); setDetailsOpen(false); setTab('overtime') }, [m.def.id])

  const open = (t: DetailsTab) => { setTab(t); setDetailsOpen(true) }

  if (m.view === 'loading') {
    return (
      <Card padding="lg" className="widget">
        <CardHeader titleAs="h2" title={`${CAMPAIGN.brand} · ${CAMPAIGN.name}`} subtitle="Loading delivery…" />
        <CardBody><LoadingBody /></CardBody>
      </Card>
    )
  }
  if (m.view === 'error-empty' || m.view === 'no-data') {
    const err = m.view === 'error-empty'
    return (
      <Card padding="lg" className="widget">
        <Header m={m} />
        <CardBody>
          <EmptyState
            size="compact"
            variant={err ? 'error' : 'no-access'}
            title={err ? "Couldn't load delivery data" : "You don't have access to this campaign's delivery"}
            description={err ? 'This is on our side, not a problem with your campaign. Try again in a minute.' : 'Ask your Simulmedia account manager to add you to this campaign.'}
            actions={err ? <Button variant="secondary" size="sm" leadingIcon={<ArrowClockwise />}>Retry</Button> : <Button variant="secondary" size="sm">Contact account manager</Button>}
          />
        </CardBody>
      </Card>
    )
  }

  const st = STATUS[m.status]
  const detail = statusDetail(m)
  const alert = contextAlert(m)
  const { segments, markers, ghost, max } = bar(m)
  const stale = m.view === 'error-cache'
  const muted = m.phase === 'paused' || m.phase === 'cancelled' || stale

  return (
    <Card padding="lg" variant={muted ? 'muted' : 'default'} className="widget">
      <Header m={m} />
      <CardBody>
        <div className="widget-body">
          {stale && (
            <Alert intent="danger" title="Couldn't refresh" action={<Button variant="secondary" size="sm" leadingIcon={<ArrowClockwise />}>Retry</Button>}>
              Showing data from Nov 22, 6:10 AM.
            </Alert>
          )}

          <div className="answer">
            <div className="status-row">
              <Badge variant={st.variant} size="md" icon={ICONS[st.icon]} dot={false}>{st.label}</Badge>
              {detail && <span className="status-detail">{detail}</span>}
              {m.prelim > 0 && ['on-track', 'ahead', 'behind', 'at-risk'].includes(m.status) && <span className="status-detail">· includes preliminary data</span>}
            </div>
            <p className="answer__text">{answerLine(m)}</p>
          </div>

          <Hero m={m} />

          <Progress
            size="lg"
            max={max}
            label={m.status === 'scheduled' ? 'Nothing delivered yet' : `Delivered to date ${fmtM(m.delivered)}`}
            caption={m.status === 'scheduled' ? `Guarantee ${fmtM(G)}` : `${Math.round((m.delivered / G) * 100)}% of guarantee`}
            segments={segments}
            markers={markers}
            ghost={ghost}
            muted={muted}
            interactive={segments.length > 0}
          />

          <SupportRow m={m} onOpen={open} />

          {alert && !(alert.dismissible && dismissed) && (
            <Alert
              intent={alert.intent}
              title={alert.title}
              onDismiss={alert.dismissible ? () => setDismissed(true) : undefined}
              action={alert.action ? <Button variant="ghost" size="sm" onClick={() => open(alert.action!.target)}>{alert.action.label}</Button> : undefined}
            >
              {alert.text}
            </Alert>
          )}
        </div>

        {m.status !== 'scheduled' && (
          <>
            <CardDivider />
            <Disclosure label="Details" open={detailsOpen} onOpenChange={setDetailsOpen}>
              <Details m={m} tab={tab} onTab={setTab} />
            </Disclosure>
          </>
        )}
      </CardBody>
      <CardFooter meta={stale ? 'Last successful update Nov 22, 6:10 AM' : `Updated ${m.def.today >= 0 && m.def.today < 42 ? 'today' : fmtDay(m.def.today)}, 6:10 AM · ${CAMPAIGN.currency}, ${CAMPAIGN.demo}`}>
        <Button variant="ghost" size="sm" trailingIcon={<ArrowSquareOut />}>Open full report</Button>
      </CardFooter>
    </Card>
  )
}
