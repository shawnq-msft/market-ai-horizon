import assert from 'node:assert/strict'
import { test } from 'node:test'
import { companies } from '../data/companies.seed'
import { aggregateCompanyRows, createThemeRows, filterThemeRows, getTheme } from '../lib/filters'
import { quoteUrl } from '../lib/links'
import { historySymbol } from '../lib/stock-history'

test('Tesla and SpaceX each occur once and have distinct public stock identities', () => {
  assert.equal(new Set(companies.map((company) => company.id)).size, companies.length)
  for (const [id, ticker] of [['tesla', 'TSLA'], ['spacex', 'SPCX']]) {
    const matches = companies.filter((company) => company.id === id)
    assert.equal(matches.length, 1)
    assert.equal(matches[0].listed, true)
    assert.equal(matches[0].market, 'US')
    assert.equal(historySymbol(matches[0]), ticker)
    assert.ok(quoteUrl(matches[0]))
  }
})

test('SpaceX appears in its satellite theme and US market without duplicating views', () => {
  const company = companies.find((item) => item.id === 'spacex')!
  for (const exposure of company.themeExposures) {
    assert.equal(getTheme(exposure.themeId)?.layerId, exposure.layerId)
  }
  const rows = createThemeRows()
  const filtered = filterThemeRows({ rows, themeIds: ['space-satellite-compute'], market: 'US' })
  assert.deepEqual(aggregateCompanyRows(filtered, ['space-satellite-compute']).map((row) => row.company.id), ['spacex'])
  assert.equal(aggregateCompanyRows(rows, []).filter((row) => row.company.id === 'spacex').length, 1)
  assert.equal(filterThemeRows({ rows, themeIds: ['space-satellite-compute'], market: 'Private' }).length, 0)
})

test('SpaceX does not fabricate valuation, earnings, or operational orbital compute', () => {
  const company = companies.find((item) => item.id === 'spacex')!
  assert.equal(company.valuationLabel, 'Unknown')
  assert.equal(company.valuationValue, undefined)
  assert.equal(company.marketCapUsdBn, undefined)
  assert.equal(company.price, undefined)
  assert.equal(company.nextEarningsDate, undefined)
  assert.equal(company.dataCenterCapacityGw, undefined)
  assert.equal(company.updatedAt, '2026-09-07')
  assert.equal(company.dataQuality, 'estimated')
})