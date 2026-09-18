import assert from 'node:assert/strict'
import { test } from 'node:test'
import { updateSeedProperties } from '../scripts/seed-source'
import { parseEarningsDate } from '../scripts/update-earnings-calendar'
import { mergeBenchmarks, parseSweBenchVerified } from '../scripts/update-model-benchmarks'
import { sessionChange } from '../scripts/update-market-data'
import { isUpcomingEarnings } from '../lib/format'
import { createPreviewServer } from '../scripts/preview-static'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

test('seed updates add absent fields and preserve nested dates and other companies', () => {
  const source = "const updatedAt = '2026-09-07'; const companies = [seed({ id: 'spacex', label: 'Unknown', modelBenchmarks: [{ updatedAt: '2026-09-01' }] }), seed({ id: 'other', price: 1 })]"
  const result = updateSeedProperties(source, 'spacex', { price: '150', week: '2', updatedAt: "'2026-09-18'" })
  assert.match(result, /price: 150, week: 2, updatedAt: '2026-09-18'/)
  assert.ok(result.includes("modelBenchmarks: [{ updatedAt: '2026-09-01' }]"))
  assert.ok(result.includes("const updatedAt = '2026-09-07'"))
  assert.ok(result.includes("seed({ id: 'other', price: 1 })"))
})

test('seed updates replace only top-level properties and remove stale fields', () => {
  const source = "seed({ id: 'company', price: 10, earnings: '2026-01-01', extra: [{ price: 99 }], updatedAt: 'old' })"
  const result = updateSeedProperties(source, 'company', { price: '20', earnings: undefined, updatedAt: "'new'" })
  assert.equal(result, "seed({ id: 'company', price: 20, extra: [{ price: 99 }], updatedAt: 'new' })")
  assert.throws(() => updateSeedProperties(source, 'missing', { price: '20' }), /Missing seed/)
})

test('earnings estimates retain uncertainty and reject expired or impossible dates', () => {
  const payload = (date: string) => ({ data: { reportText: `Company is estimated to report earnings on ${date}.` } })
  assert.deepEqual(parseEarningsDate(payload('11/04/2026'), '2026-09-18'), { date: '2026-11-04', confirmed: false })
  assert.equal(parseEarningsDate(payload('09/01/2026'), '2026-09-18'), undefined)
  assert.equal(parseEarningsDate(payload('02/30/2027'), '2026-09-18'), undefined)
  assert.equal(parseEarningsDate(null, '2026-09-18'), undefined)
})

test('SWE-bench parses only Verified results without inventing ranks from document order', () => {
  const html = `<script type="application/json" id="leaderboard-data">${JSON.stringify([
    { name: 'Lite', results: [{ name: 'wrong model', resolved: 99 }] },
    { name: 'Verified', results: [{ name: 'Agent + Model', resolved: 75 }, { name: 'Bad', resolved: 150 }] },
  ])}</script>`
  const rows = parseSweBenchVerified(html)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].modelName, 'Agent + Model')
  assert.equal(rows[0].score, 75)
  assert.equal(rows[0].rank, undefined)
  assert.throws(() => parseSweBenchVerified('<html/>'))
})

test('benchmark merging preserves unavailable providers and strips fabricated catalog usage', () => {
  const base = { sourceName: 'Test', sourceUrl: 'https://example.com', modelName: 'Model', updatedAt: '2026-09-01' }
  const result = mergeBenchmarks([
    { ...base, provider: 'coding', score: 50 },
    { ...base, provider: 'openrouter', sourceUrl: 'https://openrouter.ai/api/v1/models', usageRank: 5, usageSharePct: 10 },
  ], [{ ...base, provider: 'agent', score: 80, updatedAt: '2026-09-18' }])
  assert.equal(result.find((metric) => metric.provider === 'coding')?.updatedAt, '2026-09-01')
  assert.equal(result.find((metric) => metric.provider === 'openrouter')?.usageRank, undefined)
  assert.equal(result.find((metric) => metric.provider === 'openrouter')?.usageSharePct, undefined)
  assert.equal(result.find((metric) => metric.provider === 'agent')?.score, 80)
})

test('market returns reject invalid quotes and leave missing reference data unknown', () => {
  assert.equal(sessionChange(110, 100), 10)
  assert.equal(sessionChange(100), undefined)
  assert.throws(() => sessionChange(NaN, 100))
  assert.throws(() => sessionChange(-1, 100))
  assert.throws(() => sessionChange(100, 0))
})

test('earnings summary counts only the rolling next 30 days', () => {
  const now = new Date('2026-09-18T12:00:00Z')
  assert.equal(isUpcomingEarnings('2026-06-15', now), false)
  assert.equal(isUpcomingEarnings('2026-09-18', now), true)
  assert.equal(isUpcomingEarnings('2026-10-18', now), true)
  assert.equal(isUpcomingEarnings('2026-10-19', now), false)
  assert.equal(isUpcomingEarnings(undefined, now), false)
})

test('static preview serves base-prefixed files and rejects missing paths and writes', async (context) => {
  const server = createPreviewServer('data')
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  context.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}/market-ai-horizon`
  assert.equal((await fetch(`${base}/companies.seed.ts`)).status, 200)
  assert.equal((await fetch(`${base}/missing-file`)).status, 404)
  assert.equal((await fetch(`${base}/companies.seed.ts`, { method: 'POST' })).status, 405)
  assert.equal((await fetch(`${base}/%2e%2e%2fpackage.json`)).status, 403)
})

test('static preview resolves sibling HTML when a Next route asset directory exists', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'market-preview-'))
  await mkdir(path.join(directory, 'companies', 'example'), { recursive: true })
  await writeFile(path.join(directory, 'companies', 'example.html'), '<h1>Company</h1>')
  const server = createPreviewServer(directory)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  context.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await rm(directory, { recursive: true, force: true })
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const response = await fetch(`http://127.0.0.1:${address.port}/market-ai-horizon/companies/example`)
  assert.equal(response.status, 200)
  assert.equal(await response.text(), '<h1>Company</h1>')
})