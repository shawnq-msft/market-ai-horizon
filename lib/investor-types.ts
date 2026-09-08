export type Investor = {
  id: string
  name: string
  nameZh: string
  organization: string
  entityType: 'person' | 'institution' | 'company'
  holdingsCoverage: 'live' | 'reviewed-partial' | 'unavailable'
  role: string
  description: string
  coverageNote: string
  sources: { label: string; url: string }[]
}

export type InvestorFund = {
  id: string
  investorId: string
  name: string
  holdingsUrl?: string
  sourceUrl: string
  relationship: string
  coverageNote?: string
}

export type InvestorRecordKind = 'comment' | 'personal-trade' | 'fund-trade' | 'holding' | 'holding-change'
export type InvestorRecord = {
  id: string
  investorId: string
  kind: InvestorRecordKind
  fundId?: string
  actor: string
  companyId?: string
  securityName: string
  ticker?: string
  securityId?: string
  occurredAt: string
  publishedAt?: string
  retrievedAt: string
  title: string
  summary: string
  direction?: 'buy' | 'sell' | 'increase' | 'decrease'
  shares?: number
  marketValueUsd?: number
  weightPct?: number
  sourceUrl: string
  sourceName: string
  evidence: 'official-disclosure' | 'primary-statement' | 'media-report' | 'secondary-disclosure'
  valueRangeUsd?: { min: number; max: number }
  disclosureNote: string
}

export type InvestorDataset = {
  records: InvestorRecord[]
  fetchedAt: string
  sources: { id: string; label: string; url: string; status: 'ok' | 'unavailable'; count: number; error?: string }[]
}