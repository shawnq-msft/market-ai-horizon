import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as XLSX from 'xlsx'
import { investorFunds, investors, reviewedInvestorRecords } from '../data/investors'
import { companyForTicker, disclosureDate, fetchInvestorDataset, parseArkHoldings, parseArkTrades } from '../lib/investor-provider'
import { filterInvestorRecords, latestFundHoldings } from '../lib/smart-money'

const now = '2026-09-07T12:00:00Z'
const trades = [
  ['Disclosure preamble'],
  ['FUND', 'Date', 'Direction', 'Ticker', 'ISIN', 'Name', 'Shares', '% of ETF'],
  ['ARKK', '2026/09/04', 'Buy', 'TSLA', 'US88160R1014', 'Tesla', 123, 0.02],
  ['ARKW', '2026/09/04', 'Sell', 'NVDA', 'US67066G1040', 'NVIDIA', 456, 0.01],
]
const holdings = [
  ['date', 'fund', 'company', 'ticker', 'cusip', 'shares', 'market value ($)', 'weight (%)'],
  ['09/04/2026', 'ARKK', 'TESLA INC', 'TSLA', '88160R101', '1,689,178', '$635,747,477.97', '9.62%'],
  ['09/04/2026', 'ARKK', 'Private security', '', 'PRIVATE1', '100', '$1,000', '0.01%'],
]
const fund = investorFunds.find((item) => item.id === 'ARKK')!

test('only requested investors enabled and no fabricated statements', () => {
  assert.deepEqual(investors.map((item) => item.id).sort(), ['cathie-wood', 'tom-lee'])
  assert.equal(reviewedInvestorRecords.length, 0)
  assert.ok(investorFunds.every((item) => investors.some((investor) => investor.id === item.investorId)))
})

test('dates normalize explicit formats and reject invalid dates', () => {
  assert.equal(disclosureDate('09/04/2026'), '2026-09-04')
  assert.equal(disclosureDate('2026/09/04'), '2026-09-04')
  assert.equal(disclosureDate('2026-09-04'), '2026-09-04')
  assert.equal(disclosureDate('02/30/2026'), undefined)
  assert.equal(disclosureDate('invalid'), undefined)
})

test('trades remain fund-owned with no fabricated execution price or publication date', () => {
  const records = parseArkTrades(trades, now)
  assert.equal(records.length, 2)
  assert.equal(records[0].kind, 'fund-trade')
  assert.equal(records[0].fundId, 'ARKK')
  assert.equal(records[0].companyId, 'tesla')
  assert.equal(records[0].shares, 123)
  assert.equal(records[0].publishedAt, undefined)
  assert.equal(records[0].marketValueUsd, undefined)
  assert.equal(records[0].weightPct, undefined, 'trade % is not a holding weight')
  assert.match(records[0].actor, /ARK 投资团队/)
  assert.equal(records[1].direction, 'sell')
})

test('holding quantities, dollars and percent points preserve the official units', () => {
  const records = parseArkHoldings(holdings, fund, now)
  assert.equal(records[0].shares, 1689178)
  assert.equal(records[0].marketValueUsd, 635747477.97)
  assert.equal(records[0].weightPct, 9.62)
  assert.equal(records[0].direction, undefined)
  assert.equal(records[0].kind, 'holding')
  assert.equal(records[1].companyId, undefined)
  assert.equal(records[1].securityId, 'PRIVATE1')
})

test('ticker mappings do not invent links or conflate share classes', () => {
  assert.equal(companyForTicker('TSLA'), 'tesla')
  assert.equal(companyForTicker('GOOG'), undefined)
  assert.equal(companyForTicker('GOOGL'), 'googl')
  assert.equal(companyForTicker(''), undefined)
  assert.equal(companyForTicker('-'), undefined)
})

test('empty or changed schemas and future data are rejected', () => {
  assert.throws(() => parseArkTrades([['unexpected']], now))
  assert.throws(() => parseArkHoldings([holdings[0]], fund, now))
  assert.throws(() => parseArkTrades([trades[1], ['ARKK', '2026/12/01', 'Buy', 'TSLA', '', 'Tesla', 5]], now))
  assert.throws(() => parseArkTrades([trades[1], ['ARKK', '2026/09/04', 'Buy', 'TSLA', '', 'Tesla', -5]], now))
})

test('duplicate notifications are not counted twice', () => {
  assert.equal(parseArkTrades([...trades, trades[2]], now).length, 2)
})

test('investor, company, fund, type and query filters combine without leaking records', () => {
  const records = [...parseArkTrades(trades, now), ...parseArkHoldings(holdings, fund, now)]
  assert.equal(filterInvestorRecords(records, { investorId: 'tom-lee' }).length, 0)
  assert.equal(filterInvestorRecords(records, { companyIds: [] }).length, 0)
  assert.equal(filterInvestorRecords(records, { companyIds: ['tesla'] }).length, 2)
  assert.equal(filterInvestorRecords(records, { kind: 'personal-trade' }).length, 0)
  assert.equal(filterInvestorRecords(records, { investorId: 'cathie-wood', companyIds: ['tesla'], fundId: 'ARKK', kind: 'holding', query: ' tsla ' }).length, 1)
})

test('holding snapshots use latest date per fund, never mix periods', () => {
  const records = parseArkHoldings(holdings, fund, now)
  const older = { ...records[0], id: 'old', occurredAt: '2026-08-31' }
  const otherFund = { ...older, id: 'other', fundId: 'ARKQ' }
  assert.deepEqual(latestFundHoldings([...records, older, otherFund]).map((item) => item.id), [...records.map((item) => item.id), 'other'])
})

test('provider isolates failures and retains valid sources without synthetic fallback', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url: string) => {
    if (!url.endsWith('.xls')) return new Response('unavailable', { status: 503 })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(trades), 'Trades')
    return new Response(XLSX.write(workbook, { type: 'buffer', bookType: 'xls' }))
  })
  const result = await fetchInvestorDataset()
  assert.equal(result.records.length, 2)
  assert.equal(result.sources.filter((source) => source.status === 'unavailable').length, 3)
  assert.ok(result.records.every((record) => record.kind === 'fund-trade'))
})