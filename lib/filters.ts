import { companies } from '@/data/companies.seed'
import { layers } from '@/data/layers'
import type { BenchmarkProvider, Company, HeatMetric, LayerId, Market, SortKey, ThemeExposure } from './types'

export type ThemeSelection = string[]

export type CompanyThemeRow = {
  company: Company
  exposure: ThemeExposure
  exposures?: ThemeExposure[]
}

export function getAllThemes() {
  return layers.flatMap((layer) => layer.themes)
}

export function getTheme(themeId: string) {
  return getAllThemes().find((theme) => theme.id === themeId)
}

export function getLayer(layerId: LayerId) {
  return layers.find((layer) => layer.id === layerId)
}

export function createThemeRows(source: Company[] = companies): CompanyThemeRow[] {
  return source.flatMap((company) => company.themeExposures.map((exposure) => ({ company, exposure })))
}

export function filterThemeRows({
  rows,
  themeIds,
  market,
}: {
  rows: CompanyThemeRow[]
  themeIds: ThemeSelection
  market: Market | 'all'
}) {
  return rows.filter(({ company, exposure }) => {
    if (themeIds.length && !themeIds.includes(exposure.themeId)) return false
    if (market !== 'all' && company.market !== market) return false
    return true
  })
}

export function aggregateCompanyRows(rows: CompanyThemeRow[], selectedThemeIds: ThemeSelection) {
  const rowsByCompany = new Map<string, CompanyThemeRow[]>()

  for (const row of rows) {
    const companyRows = rowsByCompany.get(row.company.id) ?? []
    companyRows.push(row)
    rowsByCompany.set(row.company.id, companyRows)
  }

  return [...rowsByCompany.values()].map((companyRows) => {
    const primary = pickPrimaryRow(companyRows, selectedThemeIds)
    const exposures = companyRows.map((row) => row.exposure)
    return {
      company: primary.company,
      exposure: {
        ...primary.exposure,
        relevance: exposures.reduce((sum, exposure) => sum + exposure.relevance, 0),
        purity: Math.round(exposures.reduce((sum, exposure) => sum + exposure.purity, 0) / exposures.length),
        revenueExposure: aggregateRevenueExposure(exposures),
        evidence: exposures.map((exposure) => exposure.evidence).join(' / '),
      },
      exposures,
    }
  })
}

function aggregateRevenueExposure(exposures: ThemeExposure[]) {
  const explicit = exposures.map((exposure) => exposure.revenueExposure).filter((value): value is number => value !== undefined)
  if (explicit.length) return Math.min(100, Math.round(explicit.reduce((sum, value) => sum + value, 0)))
  return undefined
}

function pickPrimaryRow(rows: CompanyThemeRow[], selectedThemeIds: ThemeSelection) {
  return [...rows].sort((a, b) => {
    const aSelected = selectedThemeIds.includes(a.exposure.themeId) ? 1000 : 0
    const bSelected = selectedThemeIds.includes(b.exposure.themeId) ? 1000 : 0
    return bSelected + b.exposure.relevance * 10 + b.exposure.purity - (aSelected + a.exposure.relevance * 10 + a.exposure.purity)
  })[0]
}

export function sortThemeRows(rows: CompanyThemeRow[], sortKey: SortKey) {
  return [...rows].sort((a, b) => {
    switch (sortKey) {
      case 'relevance':
        return b.exposure.relevance - a.exposure.relevance
      case 'purity':
        return b.exposure.purity - a.exposure.purity
      case 'weekly':
        return (b.company.weekChangePct ?? -999) - (a.company.weekChangePct ?? -999)
      case 'valuation':
        return b.company.valuationScore - a.company.valuationScore
      case 'marketCap':
        return (b.company.marketCapUsdBn ?? 0) - (a.company.marketCapUsdBn ?? 0)
      case 'earnings':
        return (a.company.nextEarningsDate ?? '9999-12-31').localeCompare(b.company.nextEarningsDate ?? '9999-12-31')
      case 'quality':
      case 'momentum':
      case 'aiValue':
      case 'elasticity':
      case 'capex':
      case 'retailHeat':
      case 'mainFund':
      case 'mmluPro':
      case 'agentBenchmark':
      case 'codingBenchmark':
      case 'openRouterRank':
      case 'openRouterUsage':
      case 'dataCenterCapacity':
        return getHeatValue(b, sortKey) - getHeatValue(a, sortKey)
    }
  })
}

export function getAvailableThemes(layerId: LayerId | 'all') {
  if (layerId === 'all') return getAllThemes()
  return layers.find((layer) => layer.id === layerId)?.themes ?? []
}

export function getCompanyById(id: string) {
  return companies.find((company) => company.id === id)
}

export function getHeatValue(row: CompanyThemeRow, metric: HeatMetric) {
  if (metric === 'valuation') return row.company.valuationScore
  if (metric === 'weekly') return row.company.weekChangePct ?? 0
  if (metric === 'purity') return row.exposure.purity
  if (metric === 'quality') return getQualityFactor(row)
  if (metric === 'momentum') return getMomentumFactor(row)
  if (metric === 'aiValue') return getAiValueFactor(row)
  if (metric === 'elasticity') return row.company.revenueElasticityScore * 20
  if (metric === 'capex') return (row.company.capexLinkageScore ?? 0) * 20
  if (metric === 'retailHeat') return row.company.retailHeatScore ?? estimateRetailHeat(row)
  if (metric === 'mainFund') return row.company.mainFundFlowScore ?? estimateMainFundFlow(row)
  if (metric === 'mmluPro') return getBenchmarkScore(row, 'mmlu-pro')
  if (metric === 'agentBenchmark') return getBenchmarkScore(row, 'agent')
  if (metric === 'codingBenchmark') return getBenchmarkScore(row, 'coding')
  if (metric === 'openRouterRank') return getBenchmarkRankScore(row, 'openrouter')
  if (metric === 'openRouterUsage') return getOpenRouterUsageScore(row)
  return getDataCenterCapacityScore(row)
}

export function getQualityFactor(row: CompanyThemeRow) {
  return Math.round((row.company.aiRelevanceScore * 14 + row.exposure.purity * 0.45 + row.exposure.relevance * 8 + row.company.revenueElasticityScore * 8) / 1.55)
}

export function getMomentumFactor(row: CompanyThemeRow) {
  const weekly = row.company.weekChangePct ?? 0
  return Math.max(0, Math.min(100, Math.round(50 + weekly * 5 + row.company.revenueElasticityScore * 4)))
}

export function getAiValueFactor(row: CompanyThemeRow) {
  return Math.max(0, Math.min(100, Math.round(row.company.aiRelevanceScore * 14 + row.exposure.purity * 0.35 + (100 - row.company.valuationScore) * 0.25)))
}

export function relevancePercent(row: CompanyThemeRow) {
  return Math.max(0, Math.min(100, Math.round((row.exposure.revenueExposure ?? row.exposure.relevance * 12))))
}

export function getBenchmark(company: Company, provider: BenchmarkProvider) {
  return company.modelBenchmarks?.find((benchmark) => benchmark.provider === provider)
}

export function getBenchmarkScore(row: CompanyThemeRow, provider: BenchmarkProvider) {
  const benchmark = getBenchmark(row.company, provider)
  if (!benchmark) return 0
  if (benchmark.score !== undefined) return Math.max(0, Math.min(100, benchmark.score))
  return rankToScore(benchmark.rank)
}

export function getBenchmarkRankScore(row: CompanyThemeRow, provider: BenchmarkProvider) {
  return rankToScore(getBenchmark(row.company, provider)?.rank ?? getBenchmark(row.company, provider)?.usageRank)
}

export function getOpenRouterUsageScore(row: CompanyThemeRow) {
  const benchmark = getBenchmark(row.company, 'openrouter')
  if (!benchmark) return 0
  if (benchmark.usageSharePct !== undefined) return Math.max(0, Math.min(100, benchmark.usageSharePct * 10))
  return rankToScore(benchmark.usageRank ?? benchmark.rank)
}

export function getDataCenterCapacityScore(row: CompanyThemeRow) {
  const capacityGw = row.company.dataCenterCapacityGw ?? 0
  const gpuEquivalentK = row.company.gpuEquivalentK ?? 0
  return Math.max(0, Math.min(100, Math.round(capacityGw * 12 + gpuEquivalentK / 20)))
}

export function formatBenchmarkSummary(company: Company) {
  const mmlu = getBenchmark(company, 'mmlu-pro')
  const agent = getBenchmark(company, 'agent')
  const coding = getBenchmark(company, 'coding')
  const openRouter = getBenchmark(company, 'openrouter')
  return [
    mmlu?.rank ? `MMLU #${mmlu.rank}` : undefined,
    agent?.rank ? `Agent #${agent.rank}` : undefined,
    coding?.rank ? `Code #${coding.rank}` : undefined,
    openRouter?.usageRank ? `OR #${openRouter.usageRank}` : openRouter?.rank ? `OR #${openRouter.rank}` : undefined,
  ].filter(Boolean).join(' · ')
}

function rankToScore(rank?: number) {
  if (!rank) return 0
  return Math.max(0, Math.min(100, 105 - rank * 5))
}

function estimateRetailHeat(row: CompanyThemeRow) {
  const weekly = row.company.weekChangePct ?? 0
  return Math.max(0, Math.min(100, Math.round(35 + row.company.aiRelevanceScore * 6 + Math.max(0, weekly) * 3 + (row.company.valuationScore >= 80 ? 12 : 0))))
}

function estimateMainFundFlow(row: CompanyThemeRow) {
  const weekly = row.company.weekChangePct ?? 0
  return Math.max(0, Math.min(100, Math.round(45 + row.exposure.purity * 0.25 + row.company.revenueElasticityScore * 5 + weekly * 1.5)))
}
