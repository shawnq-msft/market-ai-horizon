import type { Company } from './types'

/** Machine-readable evidence, deliberately separate from legacy research estimates. */
export function marketSnapshot(companies: Company[], generatedAt = new Date().toISOString()) {
  const today = generatedAt.slice(0, 10)
  return {
    schemaVersion: 1,
    generatedAt,
    buildCommit: process.env.GITHUB_SHA ?? null,
    methodology: 'Delayed provider quotes; 5-session price returns, not total returns. Null means unavailable/unverified. Qualitative relevance/purity/elasticity are research estimates, not measured revenue sensitivity. Valuation snapshots have their own dates.',
    companies: companies.map(c => ({
      id: c.id, name: c.nameZh ?? c.nameEn, market: c.market, ticker: c.ticker ?? null,
      listed: c.listed, layer: c.primaryLayer, theme: c.primaryTheme,
      price: c.listed && c.quoteSourceUrl ? c.price ?? null : null,
      weekChangePct: c.listed && c.quoteSourceUrl ? c.weekChangePct ?? null : null,
      quoteAsOf: c.listed && c.quoteSourceUrl ? c.updatedAt : null,
      quoteSourceUrl: c.listed ? c.quoteSourceUrl ?? null : null,
      valuation: c.valuationSourceUrl && c.valuationUpdatedAt && c.valuationValue !== undefined ? {
        metric: c.valuationMetric ?? null, value: c.valuationValue,
        asOf: c.valuationUpdatedAt, sourceUrl: c.valuationSourceUrl,
      } : null,
      nextEarningsDate: c.listed && c.earningsSourceUrl && c.nextEarningsDate && c.nextEarningsDate >= today ? c.nextEarningsDate : null,
      earningsConfirmed: c.earningsConfirmed ?? false,
      earningsSourceUrl: c.earningsSourceUrl ?? null,
      earningsRetrievedAt: c.earningsUpdatedAt ?? null,
      measuredRevenueElasticity: null,
    })),
  }
}
