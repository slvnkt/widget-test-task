// Campaigns page rows: 13 fictional campaigns, one per scenario of the shared model.
// Every row shares the real today (Nov 23): its flight starts `startOffset` days after Nov 3.
import { buildModel, CAMPAIGN, SCENARIOS, type Model } from './campaign'

export type DataMarker = 'Revised' | 'Logs late' | 'No smart-TV data'

export interface CampaignRow {
  id: string
  brand: string
  name: string
  scenarioId: string
  guarantee: number // millions
  dataMarker?: DataMarker
}

export interface Campaign extends CampaignRow {
  startOffset: number
  m: Model
}

// The page is scoped to one advertiser: Northwind Coffee owns most rows so its own view covers the main states.
// Default order: Northwind's flagship first, then attention rank.
const ROWS: CampaignRow[] = [
  { id: 'northwind', brand: 'Northwind Coffee', name: 'Holiday Linear Q4', scenarioId: 'on-track', guarantee: 48 },
  { id: 'winter-blend', brand: 'Northwind Coffee', name: 'Winter Blend Launch', scenarioId: 'at-risk', guarantee: 24 },
  { id: 'gift-cards', brand: 'Northwind Coffee', name: 'Year-End Gift Cards', scenarioId: 'behind', guarantee: 60 },
  { id: 'meridian', brand: 'Meridian Grocery', name: 'Fall Harvest', scenarioId: 'final-under', guarantee: 42 },
  { id: 'morning-ritual', brand: 'Northwind Coffee', name: 'Morning Ritual', scenarioId: 'paused', guarantee: 72 },
  { id: 'juniper', brand: 'Juniper Health', name: 'Open Enrollment', scenarioId: 'ended', guarantee: 54 },
  { id: 'gift-guide', brand: 'Northwind Coffee', name: 'Holiday Gift Guide', scenarioId: 'just-launched', guarantee: 36 },
  { id: 'peppermint', brand: 'Northwind Coffee', name: 'Peppermint Mocha', scenarioId: 'revised', guarantee: 44, dataMarker: 'Revised' },
  { id: 'pinecrest', brand: 'Pinecrest Travel', name: 'Winter Getaways', scenarioId: 'logs-late', guarantee: 28, dataMarker: 'Logs late' },
  { id: 'ostara', brand: 'Ostara Bakery', name: 'Winter Comfort', scenarioId: 'acr-unavailable', guarantee: 50, dataMarker: 'No smart-TV data' },
  { id: 'brightline', brand: 'Brightline Mobile', name: 'Black Friday Push', scenarioId: 'ahead', guarantee: 32 },
  { id: 'new-year', brand: 'Northwind Coffee', name: 'New Year Mornings', scenarioId: 'scheduled', guarantee: 40 },
  { id: 'pumpkin-spice', brand: 'Northwind Coffee', name: 'Pumpkin Spice Fall', scenarioId: 'final-met', guarantee: 30 },
]

/** Day index of the real today (Nov 23) on the Nov 3 calendar. */
export const TODAY = 20

export const CAMPAIGNS: Campaign[] = ROWS.map(row => {
  const def = SCENARIOS.find(s => s.id === row.scenarioId)!
  const startOffset = TODAY - def.today
  return { ...row, startOffset, m: buildModel(def, { scale: row.guarantee / CAMPAIGN.guarantee, startOffset }) }
})

/** Advertisers in the data, in first-appearance order (Northwind first). */
export const ADVERTISERS = [...new Set(ROWS.map(r => r.brand))]
