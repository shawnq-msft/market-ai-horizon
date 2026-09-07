import assert from 'node:assert/strict'
import { test } from 'node:test'
import { companies } from '../data/companies.seed'
import { historySymbol, parseYahooHistory } from '../lib/stock-history'
import type { PriceBar } from '../lib/stock-history'
import { aggregateWeekly, movingAverage, volumeSignals } from '../lib/technical-indicators'
import { GET } from '../app/api/companies/[id]/history.json/route'

const company = companies.find((item) => item.id === 'apple')!
const timestamp = (date: string) => Date.parse(`${date}T14:30:00Z`) / 1000
const now = new Date('2026-09-07T20:00:00Z')
const bar = (time: string, overrides: Partial<PriceBar> = {}): PriceBar => ({ time, open: 10, high: 12, low: 8, close: 11, volume: 100, ...overrides })
const payload = (overrides: Record<string, unknown> = {}, times = [timestamp('2026-09-04')]) => ({
  chart: { result: [{ meta: { currency: 'USD', exchangeTimezoneName: 'America/New_York' }, timestamp: times, indicators: { quote: [{ open: [10], high: [12], low: [8], close: [11], volume: [100], ...overrides }] } }], error: null },
})

test('historical symbols map international and dual listings correctly', () => {
  for (const [market, ticker, expected] of [
    ['US', 'NVDA', 'NVDA'], ['HK', '0981.HK / 688981.SH', '0981.HK'],
    ['HK', '00700', '0700.HK'], ['CN', '688981.SH', '688981.SS'], ['CN', '002916.SZ', '002916.SZ'],
    ['TW', '5274.TWO', '5274.TWO'], ['JP', '8035.T', '8035.T'], ['KR', '005930.KS', '005930.KS'],
    ['EU', 'ASML', 'ASML'], ['ETF', 'SMH', 'SMH'],
  ] as const) assert.equal(historySymbol({ ...company, market, ticker }), expected)
  assert.equal(historySymbol({ ...company, market: 'Private' }), undefined)
  assert.equal(historySymbol({ ...company, ticker: undefined }), undefined)
})

test('history retains OHLC, currency, provenance and unknown volume', () => {
  const result = parseYahooHistory(payload({ volume: [null] }), 'MSFT', now)
  assert.deepEqual(result.bars, [bar('2026-09-04', { volume: null })])
  assert.equal(result.currency, 'USD')
  assert.equal(result.source, 'Yahoo Finance')
  assert.equal(result.fetchedAt, now.toISOString())
  assert.equal(parseYahooHistory(payload({ volume: [0] }), 'MSFT', now).bars[0].volume, 0)
})

test('history rejects empty, malformed, non-finite and inconsistent OHLC', () => {
  for (const body of [null, {}, { chart: { error: { description: 'not found' } } }, payload({ open: [null] }), payload({ close: [Infinity] }), payload({ high: [9] }), payload({ low: [0] }), payload({ low: [11] })]) {
    assert.throws(() => parseYahooHistory(body, 'MSFT', now))
  }
  assert.throws(() => parseYahooHistory(payload({}, [timestamp('2026-09-08')]), 'MSFT', now))
})

test('history sorts, deduplicates dates and skips gaps without shifting OHLC', () => {
  const result = parseYahooHistory(payload({
    open: [10, null, 10, 10], high: [12, 12, 12, 13], low: [8, 8, 8, 8], close: [11, 11, 10, 12], volume: [100, 100, 100, 200],
  }, [timestamp('2026-09-04'), timestamp('2026-09-02'), timestamp('2026-09-03'), timestamp('2026-09-04')]), 'MSFT', now)
  assert.deepEqual(result.bars.map((item) => [item.time, item.close]), [['2026-09-03', 10], ['2026-09-04', 12]])
})

test('history uses exchange-local trading dates', () => {
  const body = payload({}, [Date.parse('2026-09-04T01:00:00Z') / 1000])
  assert.equal(parseYahooHistory(body, 'MSFT', now).bars[0].time, '2026-09-03')
})

test('weekly bars use first open, last close, extremes and summed volume', () => {
  const input = [bar('2025-12-29'), bar('2026-01-02', { open: 11, high: 15, low: 9, close: 14, volume: 200 }), bar('2026-01-05')]
  const weekly = aggregateWeekly(input)
  assert.deepEqual(weekly[0], bar('2025-12-29', { high: 15, close: 14, volume: 300 }))
  assert.equal(weekly.length, 2)
  assert.equal(input[0].close, 11, 'aggregation must not mutate daily history')
})

test('weekly volume stays unknown if any trading day volume is missing', () => {
  assert.equal(aggregateWeekly([bar('2026-09-01'), bar('2026-09-02', { volume: null })])[0].volume, null)
})

test('moving averages require a full period and retain warmup history', () => {
  const bars = [1, 2, 3, 4, 5, 6].map((close, index) => bar(`2026-09-0${index + 1}`, { close }))
  assert.deepEqual(movingAverage(bars, 5), [{ time: '2026-09-05', value: 3 }, { time: '2026-09-06', value: 4 }])
  assert.deepEqual(movingAverage(bars, 20), [])
  assert.throws(() => movingAverage(bars, 0))
})

test('CMF measures close-position volume and RVOL excludes the latest day', () => {
  const bars = Array.from({ length: 21 }, () => bar('2026-09-01', { close: 12 }))
  bars[20].volume = 200
  assert.deepEqual(volumeSignals(bars), { cmf20: 1, relativeVolume: 2 })
  assert.equal(volumeSignals(bars.map((item) => ({ ...item, close: 8 }))).cmf20, -1)
})

test('volume signals handle short histories, gaps, flat candles and zero volume', () => {
  assert.deepEqual(volumeSignals([]), { cmf20: null, relativeVolume: null })
  const flat = Array.from({ length: 21 }, () => bar('2026-09-01', { open: 10, high: 10, low: 10, close: 10 }))
  assert.equal(volumeSignals(flat).cmf20, 0)
  assert.deepEqual(volumeSignals(flat.map((item) => ({ ...item, volume: 0 }))), { cmf20: null, relativeVolume: null })
  flat[20].volume = 0
  assert.equal(volumeSignals(flat).relativeVolume, 0)
  flat[20].volume = null
  assert.deepEqual(volumeSignals(flat), { cmf20: null, relativeVolume: null })
})

test('history API validates companies without calling the upstream provider', async (context) => {
  const mock = context.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not fetch') })
  const request = new Request('http://localhost/api/companies/unknown/history')
  assert.equal((await GET(request, { params: Promise.resolve({ id: 'unknown' }) })).status, 404)
  assert.equal((await GET(request, { params: Promise.resolve({ id: 'openai' }) })).status, 422)
  assert.equal(mock.mock.callCount(), 0)
})

test('history API returns normalized data and bounded cache policy', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.match(url, /chart\/AAPL\?range=1y&interval=1d/)
    return Response.json(payload({}, [timestamp('2025-01-02')]))
  })
  const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: 'apple' }) })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control')!, /s-maxage=900/)
  const body = await response.json()
  assert.equal(body.symbol, 'AAPL')
  assert.equal(body.bars.length, 1)
})

test('history API returns a safe, uncached error on upstream failures', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('rate limited', { status: 429 }))
  const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: 'apple' }) })
  assert.equal(response.status, 502)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(typeof (await response.json()).error, 'string')
})