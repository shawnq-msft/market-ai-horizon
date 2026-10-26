import assert from 'node:assert/strict'
import { test } from 'node:test'
import { companies } from '../data/companies.seed'
import { marketSnapshot } from '../lib/market-snapshot'

test('published snapshot uses explicit nulls and does not relabel legacy estimates as verified valuations', () => {
  const snapshot = marketSnapshot(companies, '2026-10-26T08:00:00Z')
  assert.equal(snapshot.generatedAt, '2026-10-26T08:00:00Z')
  assert.equal(snapshot.companies.length, companies.length)
  assert.equal(new Set(snapshot.companies.map(c => c.id)).size, companies.length)
  const privateCompany = snapshot.companies.find(c => c.market === 'Private')!
  assert.equal(privateCompany.price, null)
  assert.equal(privateCompany.weekChangePct, null)
  assert.equal(privateCompany.nextEarningsDate, null)
  for (const c of snapshot.companies) {
    assert.ok('valuation' in c && 'quoteSourceUrl' in c)
    assert.equal(c.measuredRevenueElasticity, null)
    if (c.valuation !== null) {
      assert.ok(c.valuation.sourceUrl.startsWith('https://'))
      assert.match(c.valuation.asOf, /^\d{4}-\d{2}-\d{2}$/)
    }
    if (c.nextEarningsDate !== null) assert.ok(c.nextEarningsDate >= '2026-10-26')
  }
})

test('snapshot retains separate quote and valuation dates and discards expired calendars', () => {
  const c = { ...companies.find(c => c.listed)!, quoteSourceUrl: 'https://example.com/quote', valuationSourceUrl: 'https://example.com/value', valuationUpdatedAt: '2026-10-01', updatedAt: '2026-10-23', valuationMetric: 'PE' as const, valuationValue: 20, nextEarningsDate: '2026-10-20' }
  const row = marketSnapshot([c], '2026-10-26T08:00:00Z').companies[0]
  assert.equal(row.quoteAsOf, '2026-10-23')
  assert.equal(row.valuation?.asOf, '2026-10-01')
  assert.equal(row.nextEarningsDate, null)
})
