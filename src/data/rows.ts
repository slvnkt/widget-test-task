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

// Default order: Northwind first (the primary row), then attention rank.
const ROWS: CampaignRow[] = [
  { id: 'northwind', brand: 'Northwind Coffee', name: 'Holiday Linear Q4', scenarioId: 'on-track', guarantee: 48 },
  { id: 'fernwood', brand: 'Fernwood Pet', name: 'Winter Wellness', scenarioId: 'at-risk', guarantee: 24 },
  { id: 'harbor', brand: 'Harbor Bank', name: 'Year-End Savings', scenarioId: 'behind', guarantee: 60 },
  { id: 'meridian', brand: 'Meridian Grocery', name: 'Fall Harvest', scenarioId: 'final-under', guarantee: 42 },
  { id: 'cobalt', brand: 'Cobalt Motors', name: 'Year-End Event', scenarioId: 'paused', guarantee: 72 },
  { id: 'juniper', brand: 'Juniper Health', name: 'Open Enrollment', scenarioId: 'ended', guarantee: 54 },
  { id: 'lumen', brand: 'Lumen Home', name: 'Holiday Gift Guide', scenarioId: 'just-launched', guarantee: 36 },
  { id: 'sable', brand: 'Sable Beverages', name: 'Holiday Spirits', scenarioId: 'revised', guarantee: 44, dataMarker: 'Revised' },
  { id: 'pinecrest', brand: 'Pinecrest Travel', name: 'Winter Getaways', scenarioId: 'logs-late', guarantee: 28, dataMarker: 'Logs late' },
  { id: 'ostara', brand: 'Ostara Bakery', name: 'Winter Comfort', scenarioId: 'acr-unavailable', guarantee: 50, dataMarker: 'No smart-TV data' },
  { id: 'brightline', brand: 'Brightline Mobile', name: 'Black Friday Push', scenarioId: 'ahead', guarantee: 32 },
  { id: 'alder', brand: 'Alder Outdoor', name: 'New Year Reset', scenarioId: 'scheduled', guarantee: 40 },
  { id: 'quill', brand: 'Quill Insurance', name: 'Fall Brand', scenarioId: 'final-met', guarantee: 30 },
]

/** Day index of the real today (Nov 23) on the Nov 3 calendar. */
export const TODAY = 20

export const CAMPAIGNS: Campaign[] = ROWS.map(row => {
  const def = SCENARIOS.find(s => s.id === row.scenarioId)!
  const startOffset = TODAY - def.today
  return { ...row, startOffset, m: buildModel(def, { scale: row.guarantee / CAMPAIGN.guarantee, startOffset }) }
})
