import { Badge } from '@ds/components/Badge'
import { Card, CardHeader } from '@ds/components/Card'
import { Divider } from '@ds/components/Divider'
import { Stat } from '@ds/components/Stat'
import { CAMPAIGN, fmtDay, fmtM, type Model } from '../data/campaign'
import { HINTS, signedM, STATUS_BADGE, UPDATED_AT } from './copy'
import { DeliveryChart } from './DeliveryChart'
import { Details } from './Details'

function footnote(m: Model) {
  return [
    m.confirmedThroughLabel && `Confirmed by network logs through ${m.confirmedThroughLabel}`,
    m.prelimThroughLabel && `Preliminary through ${m.prelimThroughLabel}`,
    UPDATED_AT,
  ].filter(Boolean).join(' · ')
}

export function DeliveryWidget({ m }: { m: Model }) {
  const status = STATUS_BADGE[m.status]
  const pending = CAMPAIGN.networks - m.logsReceived

  return (
    <Card variant="default" padding="lg" className="delivery">
      <CardHeader title="Delivery" titleAs="h2" />

      <div className="delivery__body">
        <div className="kpis">
          <div className="kpis__cell">
            <Stat
              size="lg"
              label="Projected final delivery"
              value={`${Math.round(m.projPct)}%`}
              unit="of guarantee"
              secondary={
                <span className="kpis__status">
                  <Badge variant={status.variant} size="sm" dot>{status.label}</Badge>
                  {fmtM(m.projection)} projected
                </span>
              }
              hint={HINTS.projected}
            />
          </div>
          <Divider orientation="vertical" />
          <div className="kpis__cell">
            <Stat
              label="Delivered to date"
              value={fmtM(m.delivered)}
              secondary={`${signedM(m.delivered - m.expected)} vs plan of ${fmtM(m.expected)}`}
              hint={HINTS.delivered}
            />
          </div>
          <Divider orientation="vertical" />
          <div className="kpis__cell">
            <Stat
              label="Spots aired"
              value={m.spotsAired}
              unit={`/ ${m.spotsPlannedToDate}`}
              secondary={`${m.preempted} preempted`}
              hint={`Spots scheduled through ${fmtDay(m.def.today - 1)}.`}
            />
          </div>
          <Divider orientation="vertical" />
          <div className="kpis__cell">
            <Stat
              label="Network logs"
              value={m.logsReceived}
              unit={`/ ${CAMPAIGN.networks}`}
              secondary={`${pending} pending, usually 5–10 days`}
              hint={HINTS.logs}
            />
          </div>
        </div>

        <Divider spacing="lg" />

        <h3 className="delivery__chart-title">Cumulative impressions</h3>
        <DeliveryChart m={m} />
        <p className="delivery__footnote">{footnote(m)}</p>

        <Details m={m} />
      </div>
    </Card>
  )
}
