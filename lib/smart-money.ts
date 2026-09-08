import type { InvestorRecord, InvestorRecordKind } from './investor-types'

export const recordKindLabels: Record<InvestorRecordKind, string> = {
  comment: '本人发言', 'personal-trade': '本人买卖', 'fund-trade': '基金买卖',
  holding: '披露持仓', 'holding-change': '持仓变化（非逐笔交易）',
}

export function filterInvestorRecords(records: InvestorRecord[], filters: {
  investorId?: string; companyIds?: string[]; kind?: InvestorRecordKind; fundId?: string; query?: string
}) {
  const ids = filters.companyIds === undefined ? undefined : new Set(filters.companyIds)
  const query = filters.query?.trim().toLowerCase()
  return records.filter((record) => {
    if (filters.investorId && record.investorId !== filters.investorId) return false
    if (ids && (!record.companyId || !ids.has(record.companyId))) return false
    if (filters.kind && record.kind !== filters.kind) return false
    if (filters.fundId && record.fundId !== filters.fundId) return false
    return !query || `${record.securityName} ${record.ticker ?? ''} ${record.actor} ${record.title}`.toLowerCase().includes(query)
  }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id))
}

export function latestFundHoldings(records: InvestorRecord[]) {
  const dates = new Map<string, string>()
  const key = (record: InvestorRecord) => JSON.stringify([record.investorId, record.fundId ?? record.actor])
  for (const record of records) {
    if (record.kind !== 'holding') continue
    dates.set(key(record), [dates.get(key(record)) ?? '', record.occurredAt].sort().at(-1)!)
  }
  return records.filter((record) => record.kind === 'holding' && record.occurredAt === dates.get(key(record)))
}

// Select newest available snapshot BEFORE mapping/searching stocks, so old
// positions do not reappear just because a newer snapshot contains different stocks.
export function holdingCompanyIds(records: InvestorRecord[], investorId: string): Set<string> {
  if (!investorId) return new Set()
  return new Set(latestFundHoldings(records.filter((record) => record.investorId === investorId))
    .filter((record) => record.companyId && (record.shares === undefined || record.shares > 0))
    .map((record) => record.companyId!))
}