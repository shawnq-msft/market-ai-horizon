import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { companies } from '../data/companies.seed'
import { modelCompanyMappings } from '../data/model-company-mapping'
import type { BenchmarkProvider, ModelBenchmarkMetric } from '../lib/types'

type RawMetric = Omit<ModelBenchmarkMetric, 'updatedAt'>

type UpdateOptions = {
  ids: string[]
}

const sourcePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/companies.seed.ts')
const today = new Date().toISOString().slice(0, 10)
const requestTimeoutMs = 12000

const mmluSources = [
  'https://datasets-server.huggingface.co/rows?dataset=TIGER-Lab%2FMMLU-Pro&config=default&split=test&offset=0&limit=100',
  'https://huggingface.co/spaces/TIGER-Lab/MMLU-Pro',
]

const agentSources = [
  'https://www.swebench.com/',
]

const codingSources = [
  'https://livecodebench.github.io/leaderboard.html',
  'https://lmarena.ai/leaderboard',
]

const openRouterSources = [
  'https://openrouter.ai/api/v1/models',
]

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const selectedCompanyIds = new Set(options.ids.length ? options.ids : modelCompanyMappings.map((mapping) => mapping.companyId))
  const metrics = await fetchAllMetrics()
  const byCompany = bestMetricsByCompany(metrics, selectedCompanyIds)

  let source = await readFile(sourcePath, 'utf8')
  source = source.replace(/const updatedAt = '\d{4}-\d{2}-\d{2}'/, `const updatedAt = '${today}'`)

  let updated = 0
  for (const [companyId, companyMetrics] of byCompany) {
    const nextSource = updateCompanyBenchmarks(source, companyId, companyMetrics)
    if (nextSource !== source) updated += 1
    source = nextSource
  }

  await writeFile(sourcePath, source)
  console.log(`Updated model benchmarks for ${updated} companies from ${metrics.length} source rows.`)
  console.log('Sources: MMLU-Pro, SWE-bench Verified, LiveCodeBench/arena coding, and OpenRouter public model data. Failed sources preserve old values.')
}

async function fetchAllMetrics() {
  const batches = await Promise.allSettled([
    fetchMmluProMetrics(),
    fetchAgentMetrics(),
    fetchCodingMetrics(),
    fetchOpenRouterMetrics(),
  ])

  return batches.flatMap((result) => {
    if (result.status === 'fulfilled') return result.value
    console.log(`Benchmark source skipped: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`)
    return []
  })
}

async function fetchMmluProMetrics(): Promise<RawMetric[]> {
  return fetchGenericLeaderboard('mmlu-pro', 'MMLU-Pro', mmluSources, ['score', 'average', 'avg', 'overall'])
}

async function fetchAgentMetrics(): Promise<RawMetric[]> {
  return fetchGenericLeaderboard('agent', 'SWE-bench Verified', agentSources, ['resolved', 'score', 'pass_rate'])
}

async function fetchCodingMetrics(): Promise<RawMetric[]> {
  return fetchGenericLeaderboard('coding', 'Coding benchmark', codingSources, ['score', 'pass_at_1', 'pass@1', 'elo'])
}

async function fetchOpenRouterMetrics(): Promise<RawMetric[]> {
  const json = await fetchJson<{ data?: unknown }>(openRouterSources[0])
  const rows: Array<Record<string, unknown>> = Array.isArray(json.data) ? json.data.filter(isRecord) : []
  return rows.flatMap((row, index): RawMetric[] => {
    const modelName = String(row.id ?? row.name ?? '')
    if (!modelName) return []
    return [{
      provider: 'openrouter',
      sourceName: 'OpenRouter Models',
      sourceUrl: openRouterSources[0],
      modelName,
      usageRank: index + 1,
      usageLabel: row.context_length ? `${Number(row.context_length).toLocaleString()} ctx` : undefined,
    }]
  })
}

async function fetchGenericLeaderboard(provider: BenchmarkProvider, sourceName: string, urls: string[], scoreKeys: string[]): Promise<RawMetric[]> {
  const errors: string[] = []

  for (const url of urls) {
    try {
      const text = await fetchText(url)
      const rows = url.endsWith('.html') || text.trim().startsWith('<') ? extractObjectsFromHtml(text) : extractObjects(JSON.parse(text))
      const metrics = normalizeRows(provider, sourceName, url, rows.filter(isRecord), scoreKeys)
      if (metrics.length) return metrics
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(`${sourceName} unavailable (${errors.join(' | ')})`)
}

function normalizeRows(provider: BenchmarkProvider, sourceName: string, sourceUrl: string, rows: Array<Record<string, unknown>>, scoreKeys: string[]): RawMetric[] {
  const metrics: RawMetric[] = []

  rows.forEach((row, index) => {
    const modelName = getString(row, ['model', 'model_name', 'name', 'Model', 'Model Name', 'system'])
    const score = getNumber(row, scoreKeys)
    const rank = getNumber(row, ['rank', 'Rank']) ?? (score !== undefined ? index + 1 : undefined)
    if (!modelName || (score === undefined && rank === undefined)) return
    metrics.push({
      provider,
      sourceName,
      sourceUrl,
      modelName,
      rank,
      score,
      scoreLabel: score === undefined ? undefined : `${round(score, 1)}`,
    })
  })

  return metrics.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
}

function bestMetricsByCompany(metrics: RawMetric[], selectedCompanyIds: Set<string>) {
  const byCompany = new Map<string, ModelBenchmarkMetric[]>()

  for (const mapping of modelCompanyMappings) {
    if (!selectedCompanyIds.has(mapping.companyId)) continue

    const matches = metrics.filter((metric) => matchesMapping(metric, mapping.keywords, mapping.openRouterIds))
    const bestByProvider = new Map<BenchmarkProvider, ModelBenchmarkMetric>()

    for (const metric of matches) {
      const current = bestByProvider.get(metric.provider)
      const candidate = { ...metric, updatedAt: today }
      if (!current || metricScore(candidate) > metricScore(current)) bestByProvider.set(metric.provider, candidate)
    }

    if (bestByProvider.size) byCompany.set(mapping.companyId, [...bestByProvider.values()].sort((a, b) => providerOrder(a.provider) - providerOrder(b.provider)))
  }

  return byCompany
}

function matchesMapping(metric: RawMetric, keywords: string[], openRouterIds?: string[]) {
  const value = metric.modelName.toLowerCase()
  if (metric.provider === 'openrouter' && openRouterIds?.some((id) => value.startsWith(id.toLowerCase()) || value.includes(id.toLowerCase()))) return true
  return keywords.some((keyword) => value.includes(keyword.toLowerCase()))
}

function metricScore(metric: ModelBenchmarkMetric) {
  if (metric.provider === 'openrouter') return metric.usageRank ? 10000 - metric.usageRank : 0
  if (metric.rank) return 10000 - metric.rank
  return metric.score ?? 0
}

function providerOrder(provider: BenchmarkProvider) {
  if (provider === 'mmlu-pro') return 0
  if (provider === 'agent') return 1
  if (provider === 'coding') return 2
  return 3
}

function updateCompanyBenchmarks(source: string, companyId: string, metrics: ModelBenchmarkMetric[]) {
  const company = companies.find((item) => item.id === companyId)
  if (!company) return source

  const pattern = new RegExp(`seed\\(\\{ id: '${escapeRegExp(companyId)}', .*? \\}\\),`)
  const match = source.match(pattern)
  if (!match) return source

  const property = `, modelBenchmarks: ${formatBenchmarks(metrics)}`
  const existing = /, modelBenchmarks: \[[\s\S]*?\](?=, metric:|, risks:|, related|, extra:| \}\),)/
  const line = existing.test(match[0])
    ? match[0].replace(existing, property)
    : match[0].replace(', metric:', `${property}, metric:`)
  return source.replace(match[0], line)
}

function formatBenchmarks(metrics: ModelBenchmarkMetric[]) {
  return `[${metrics.map((metric) => `{ provider: '${metric.provider}', sourceName: '${escapeString(metric.sourceName)}', sourceUrl: '${escapeString(metric.sourceUrl)}', modelName: '${escapeString(metric.modelName)}'${formatOptionalNumber('rank', metric.rank)}${formatOptionalNumber('score', metric.score)}${formatOptionalString('scoreLabel', metric.scoreLabel)}${formatOptionalNumber('usageRank', metric.usageRank)}${formatOptionalNumber('usageSharePct', metric.usageSharePct)}${formatOptionalString('usageLabel', metric.usageLabel)}, updatedAt: '${metric.updatedAt}' }`).join(', ')}]`
}

function formatOptionalNumber(property: string, value: number | undefined) {
  return value === undefined ? '' : `, ${property}: ${round(value, 2)}`
}

function formatOptionalString(property: string, value: string | undefined) {
  return value === undefined ? '' : `, ${property}: '${escapeString(value)}'`
}

function getString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function getNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value.replace('%', '').trim())
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

function extractObjects(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(extractObjects)
  if (!isRecord(value)) return []
  const children = Object.values(value).flatMap(extractObjects)
  return Object.keys(value).some((key) => /model|rank|score|resolved|elo/i.test(key)) ? [value, ...children] : children
}

function extractObjectsFromHtml(html: string) {
  const objects: Array<Record<string, unknown>> = []
  for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    const script = match[1]
    for (const jsonMatch of script.matchAll(/(\{[\s\S]*?\}|\[[\s\S]*?\])/g)) {
      try {
        objects.push(...extractObjects(JSON.parse(jsonMatch[0])))
      } catch {}
    }
  }
  return objects
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function fetchJson<T>(url: string): Promise<T> {
  return JSON.parse(await fetchText(url)) as T
}

async function fetchText(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json,text/html;q=0.9,*/*;q=0.8' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

function parseOptions(args: string[]): UpdateOptions {
  const ids = args.find((arg) => arg.startsWith('--ids='))?.split('=')[1]?.split(',').map((value) => value.trim()).filter(Boolean) ?? []
  return { ids }
}

function round(value: number, digits: number) {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
