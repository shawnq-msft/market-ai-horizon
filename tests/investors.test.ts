import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as XLSX from 'xlsx'
import { investorFunds, investors, reviewedInvestorRecords } from '../data/investors'
import { companyForTicker, disclosureDate, fetchInvestorDataset, parseArkHoldings, parseArkTrades, reviewedHoldings } from '../lib/investor-provider'
import { filterInvestorRecords, holdingCompanyIds, latestFundHoldings } from '../lib/smart-money'
import { aggregateCompanyRows, createThemeRows, filterThemeRows } from '../lib/filters'

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
  assert.deepEqual(investors.map((item) => item.id).sort(), ['tom-lee', 'cathie-wood', 'warren-buffett', 'nancy-pelosi', 'nvidia', 'donald-trump', 'duan-yongping', 'bridgewater', 'alphabet', 'soros', 'peter-thiel'].sort())
  assert.equal(investors.find((item) => item.id === 'nvidia')?.entityType, 'company')
  assert.equal(investors.find((item) => item.id === 'alphabet')?.entityType, 'company')
  assert.equal(investors.find((item) => item.id === 'bridgewater')?.entityType, 'institution')
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
  assert.equal(result.records.length, 2 + reviewedHoldings().length)
  assert.equal(result.sources.filter((source) => source.status === 'unavailable').length, 6)
  assert.ok(result.records.filter((record) => record.investorId === 'cathie-wood').every((record) => record.kind === 'fund-trade'))
})

test('holdings filter excludes trades, unmapped and zero positions; keeps newest per account', () => {
  const [holding] = parseArkHoldings(holdings, fund, now)
  const records = [
    ...parseArkTrades(trades, now), holding,
    { ...holding, id: 'new', occurredAt: '2026-09-05', companyId: 'nvda' },
    { ...holding, id: 'zero', occurredAt: '2026-09-05', companyId: 'msft', shares: 0 },
    { ...holding, id: 'unmapped', occurredAt: '2026-09-05', companyId: undefined },
    { ...holding, id: 'other-fund', fundId: 'ARKW', companyId: 'amzn' },
  ]
  assert.deepEqual([...holdingCompanyIds(records, 'cathie-wood')].sort(), ['amzn', 'nvda'])
  assert.equal(holdingCompanyIds(records, 'donald-trump').size, 0)
  assert.equal(holdingCompanyIds(records, '').size, 0)
})

test('all six ARK equity ETF holdings feeds contribute independently to the selector', async (context) => {
  const funds = investorFunds.filter((item) => item.investorId === 'cathie-wood' && item.holdingsUrl)
  assert.deepEqual(funds.map((item) => item.id).sort(), ['ARKF', 'ARKG', 'ARKK', 'ARKQ', 'ARKW', 'ARKX'])
  context.mock.method(globalThis, 'fetch', async (url: string) => {
    const currentFund = funds.find((item) => item.holdingsUrl === url)
    if (!currentFund) return new Response('unavailable', { status: 503 })
    const row = [...holdings[1]]
    row[1] = currentFund.id
    if (currentFund.id === 'ARKX') {
      row[2] = 'SpaceX'
      row[3] = 'SPCX'
      row[4] = 'TEST-SPCX'
    }
    const worksheet = XLSX.utils.aoa_to_sheet([holdings[0], row])
    return new Response(XLSX.utils.sheet_to_csv(worksheet))
  })
  const result = await fetchInvestorDataset()
  const records = result.records.filter((record) => record.investorId === 'cathie-wood')
  assert.equal(records.length, 6)
  assert.equal(new Set(records.map((record) => record.fundId)).size, 6)
  assert.ok(records.every((record) => record.kind === 'holding' && record.evidence === 'official-disclosure'))
  assert.equal(result.sources.filter((source) => source.id.startsWith('holdings-') && source.status === 'ok').length, 6)
  assert.deepEqual([...holdingCompanyIds(records, 'cathie-wood')].sort(), ['spacex', 'tesla'])
})

test('latest report grouping separates investors even with shared account names', () => {
  const [holding] = parseArkHoldings(holdings, fund, now)
  const other = { ...holding, id: 'other-owner', investorId: 'another-investor', occurredAt: '2026-08-31' }
  assert.equal(latestFundHoldings([holding, other]).length, 2)
  assert.equal(latestFundHoldings([{ ...holding, fundId: undefined }]).length, 1)
})

test('reviewed portfolios preserve attribution, dates and exact share classes', () => {
  const records = reviewedHoldings()
  assert.equal(new Set(records.map((record) => record.id)).size, records.length)
  assert.ok(records.every((record) => record.kind === 'holding' && record.direction === undefined))
  assert.ok(records.every((record) => record.sourceUrl.startsWith('https://') && record.publishedAt! >= record.occurredAt))
  const berkshire = records.filter((record) => record.investorId === 'warren-buffett')
  assert.equal(berkshire.find((record) => record.ticker === 'AAPL')?.shares, 227917808)
  assert.equal(berkshire.find((record) => record.ticker === 'GOOG')?.companyId, undefined)
  assert.equal(holdingCompanyIds(records, 'donald-trump').size, 0)
  assert.ok(records.filter((record) => record.investorId === 'nvidia').every((record) => record.actor === 'NVIDIA Corporation'))
  assert.match(records.find((record) => record.investorId === 'alphabet' && record.ticker === 'GTLB')!.actor, /GV/)
  assert.equal(records.find((record) => record.investorId === 'soros' && record.ticker === 'NVDA')?.shares, 1064635)
})

test('Pelosi annual assets preserve ranges and unknown ownership, never fabricate shares', () => {
  const records = reviewedHoldings().filter((record) => record.investorId === 'nancy-pelosi')
  assert.equal(records.length, 4)
  for (const record of records) {
    assert.equal(record.shares, undefined)
    assert.equal(record.marketValueUsd, undefined)
    assert.equal(record.evidence, 'secondary-disclosure')
    assert.equal(record.occurredAt, '2025-12-31')
    assert.match(record.actor, /持有人未核实/)
    assert.deepEqual(record.valueRangeUsd, { min: 5000001, max: 25000000 })
  }
  assert.equal(holdingCompanyIds(records, 'nancy-pelosi').size, 4)
})

test('holdings intersect with dashboard themes and markets, never reset other filters', () => {
  const ids = holdingCompanyIds(reviewedHoldings(), 'duan-yongping')
  const all = createThemeRows()
  const visible = (market: 'US' | 'CN', themeIds: string[]) => aggregateCompanyRows(filterThemeRows({ rows: all, market, themeIds }), themeIds).filter((row) => ids.has(row.company.id))
  assert.equal(visible('US', []).length, 3)
  assert.equal(visible('CN', []).length, 0)
  const themeId = all.find((row) => row.company.id === 'nvda')!.exposure.themeId
  assert.ok(visible('US', [themeId]).every((row) => ids.has(row.company.id)))
})