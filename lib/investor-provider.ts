import * as XLSX from 'xlsx'
import { companies } from '@/data/companies.seed'
import { investorFunds, reviewedInvestorRecords } from '@/data/investors'
import { holdingsReviewedAt, reviewedHoldingSnapshots } from '@/data/investor-holdings'
import type { Company } from './types'
import type { InvestorDataset, InvestorFund, InvestorRecord } from './investor-types'

export const arkTradesUrl = 'https://etfs.ark-funds.com/hubfs/idt/trades/ARK_Trades.xls'
const text = (value: unknown) => String(value ?? '').trim()
const numeric = (value: unknown) => {
  if (value === null || value === undefined || text(value) === '') return undefined
  const n = Number(text(value).replace(/[$,%\s]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function disclosureDate(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : undefined
  const str = text(value)
  const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const parts = ymd ? [ymd[1], ymd[2], ymd[3]] : mdy ? [mdy[3], mdy[1], mdy[2]] : undefined
  if (!parts) return undefined
  const date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
  const parsed = new Date(`${date}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : undefined
}

// Exact ticker mapping only. Never merge GOOG into GOOGL, ADR/local listings, or options.
export function companyForTicker(ticker: string, source: Company[] = companies) {
  if (!ticker || ticker === '-') return undefined
  const matches = source.filter((company) => company.listed && company.ticker?.split('/')[0].trim().toUpperCase() === ticker.toUpperCase())
  return matches.length === 1 ? matches[0].id : undefined
}

function table(rows: unknown[][], required: string[]) {
  const index = rows.findIndex((row) => required.every((name) => row.some((value) => text(value).toLowerCase() === name)))
  if (index < 0) throw new Error('Unexpected disclosure column schema')
  const headers = rows[index].map((value) => text(value).toLowerCase())
  return rows.slice(index + 1).map((row) => Object.fromEntries(headers.map((header, i) => [header, row[i]])))
}

export function parseArkTrades(rows: unknown[][], retrievedAt: string): InvestorRecord[] {
  const records: InvestorRecord[] = []
  const seen = new Set<string>()
  for (const row of table(rows, ['fund', 'date', 'direction', 'ticker', 'shares'])) {
    const fund = investorFunds.find((item) => item.id === text(row.fund))
    const occurredAt = disclosureDate(row.date)
    if (!fund) continue
    if (!occurredAt) throw new Error('Invalid trade date')
    const direction = text(row.direction).toLowerCase()
    const shares = numeric(row.shares)
    const ticker = text(row.ticker)
    if ((direction !== 'buy' && direction !== 'sell') || !ticker || shares === undefined || shares <= 0) throw new Error('Invalid trade row')
    if (occurredAt > retrievedAt.slice(0, 10)) throw new Error('Future disclosure date')
    const id = `ark-trade-${occurredAt}-${fund.id}-${ticker}-${direction}-${shares}`
    if (seen.has(id)) continue
    seen.add(id)
    records.push({
      id, investorId: fund.investorId, kind: 'fund-trade', fundId: fund.id, actor: `${fund.id} · ARK 投资团队`,
      companyId: companyForTicker(ticker), ticker, securityName: text(row.name) || ticker, securityId: text(row.isin),
      occurredAt, retrievedAt, direction, shares,
      title: `${fund.id} ${direction === 'buy' ? '买入' : '卖出'} ${ticker}`,
      summary: '官方交易通知中的基金组合调整；未披露成交价格和个人账户操作。',
      sourceName: 'ARK 官方交易通知', sourceUrl: arkTradesUrl, evidence: 'official-disclosure',
      disclosureNote: '非官方对账结果；不是全天完整交易清单，排除 IPO 与 ETF 申赎。文件上传时间不是成交时间，原链接会被最新文件覆盖。',
    })
  }
  return records
}

export function parseArkHoldings(rows: unknown[][], fund: InvestorFund, retrievedAt: string): InvestorRecord[] {
  const records: InvestorRecord[] = []
  for (const row of table(rows, ['date', 'fund', 'company', 'ticker', 'shares', 'market value ($)', 'weight (%)'])) {
    if (text(row.fund) !== fund.id) continue
    const occurredAt = disclosureDate(row.date)
    const shares = numeric(row.shares), marketValueUsd = numeric(row['market value ($)']), weightPct = numeric(row['weight (%)'])
    if (!occurredAt || occurredAt > retrievedAt.slice(0, 10) || shares === undefined || marketValueUsd === undefined || weightPct === undefined || weightPct > 100) throw new Error('Invalid holding row')
    const ticker = text(row.ticker), securityName = text(row.company), securityId = text(row.cusip)
    if (!securityName || (!ticker && !securityId)) throw new Error('Missing security identity')
    records.push({
      id: `ark-holding-${fund.id}-${occurredAt}-${securityId || ticker}`, investorId: fund.investorId,
      kind: 'holding', fundId: fund.id, actor: `${fund.id} · ARK 投资团队`,
      companyId: companyForTicker(ticker), ticker: ticker || undefined, securityName, securityId,
      occurredAt, retrievedAt, shares, marketValueUsd, weightPct,
      title: `${fund.id} 持有 ${ticker || securityName}`, summary: '基金官方持仓快照，不代表当天新增买入，也不是投资人个人持仓。',
      sourceName: `${fund.id} 官方完整持仓`, sourceUrl: fund.holdingsUrl!, evidence: 'official-disclosure',
      disclosureNote: '按持仓截至日展示。市值是快照估值而非买入成本；权重仅适用于该基金，不跨基金相加。未从快照推断买卖。',
    })
  }
  if (!records.length) throw new Error('Empty holdings disclosure')
  return records
}

export function reviewedHoldings(): InvestorRecord[] {
  return reviewedHoldingSnapshots.flatMap((snapshot) => snapshot.rows.map((row) => {
    const companyId = companyForTicker(row.ticker)
    return {
      id: `reviewed-${snapshot.portfolioId}-${snapshot.asOf}-${row.ticker}`,
      investorId: snapshot.investorId, kind: 'holding' as const, fundId: snapshot.portfolioId,
      actor: row.actor ?? snapshot.actor, companyId, ticker: row.ticker,
      securityName: companies.find((company) => company.id === companyId)?.nameEn ?? row.ticker,
      occurredAt: snapshot.asOf, publishedAt: snapshot.publishedAt, retrievedAt: holdingsReviewedAt,
      shares: row.shares, valueRangeUsd: row.valueRangeUsd,
      title: `${snapshot.actor} · ${row.ticker}`,
      summary: '人工核实的报告期持仓（可能仅覆盖部分条目），不是实时组合；不由买卖通知推算，不代表当日买入。',
      sourceUrl: snapshot.sourceUrl, sourceName: snapshot.sourceName, evidence: snapshot.evidence,
      disclosureNote: `${snapshot.note} 本快照需人工核实更新，不随 ARK 抓取自动更新；未录入的证券不代表未持有。`,
    }
  }))
}

export async function fetchInvestorDataset(): Promise<InvestorDataset> {
  const fetchedAt = new Date().toISOString()
  const definitions = [
    { id: 'ark-trades', label: 'ARK 最新交易文件（非完整历史）', url: arkTradesUrl, fund: undefined as InvestorFund | undefined },
    ...investorFunds.filter((fund) => fund.holdingsUrl).map((fund) => ({ id: `holdings-${fund.id}`, label: `${fund.id} 持仓`, url: fund.holdingsUrl!, fund })),
  ]
  const results = await Promise.all(definitions.map(async (source) => {
    try {
      const response = await fetch(source.url, { signal: AbortSignal.timeout(15000), next: { revalidate: 3600 } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const buffer = await response.arrayBuffer()
      if (buffer.byteLength > 5_000_000) throw new Error('Disclosure exceeds size limit')
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: true })
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: null })
      const records = source.fund ? parseArkHoldings(rows, source.fund, fetchedAt) : parseArkTrades(rows, fetchedAt)
      return { records, status: { id: source.id, label: source.label, url: source.url, status: 'ok' as const, count: records.length } }
    } catch {
      return { records: [], status: { id: source.id, label: source.label, url: source.url, status: 'unavailable' as const, count: 0, error: '抓取失败或数据结构发生变化；不使用估算记录替代。' } }
    }
  }))
  return {
    fetchedAt,
    records: [...reviewedInvestorRecords, ...reviewedHoldings(), ...results.flatMap((result) => result.records)],
    sources: [...results.map((result) => result.status), ...reviewedHoldingSnapshots.map((snapshot) => ({
      id: `reviewed-${snapshot.portfolioId}`, label: `${snapshot.actor} · 人工核实 ${holdingsReviewedAt} / 持仓截至 ${snapshot.asOf}`,
      url: snapshot.sourceUrl, status: 'ok' as const, count: snapshot.rows.length,
    }))],
  }
}