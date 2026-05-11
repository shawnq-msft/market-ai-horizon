import { MetricBadge } from './MetricBadge'
import { getTheme } from '@/lib/filters'
import { formatGigawatts, formatGpuEquivalent, formatMarketCap, formatPercent, formatValuation } from '@/lib/format'
import { newsSearchUrl, quoteUrl, valuationSourceUrl } from '@/lib/links'
import type { Company } from '@/lib/types'

export function CompanyDetailPanel({ company }: { company: Company }) {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm text-slate-500">{company.market} · {company.exchange ?? 'Private'} · {company.ticker ?? 'Private'}</div>
            <h1 className="mt-1 text-3xl font-semibold text-white">{company.nameZh ?? company.nameEn}</h1>
            <p className="mt-1 text-slate-400">{company.nameEn}</p>
            <p className="mt-4 max-w-3xl text-sm text-slate-300">{company.tagZh}</p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <MetricBadge label="AI R" value={company.aiRelevanceScore} tone="sky" />
            <MetricBadge label="Elasticity" value={company.revenueElasticityScore} tone="emerald" />
            <MetricBadge label="Purity" value={company.purityScore} tone="violet" />
            <SourceLink href={quoteUrl(company)} label="行情" />
            <SourceLink href={newsSearchUrl(company)} label="消息搜索" />
            <SourceLink href={valuationSourceUrl(company)} label={company.market === 'Private' ? '估值来源' : '估值核实'} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Tile label="市值" value={formatMarketCap(company.marketCapUsdBn)} />
        <Tile label="周变化" value={formatPercent(company.weekChangePct)} />
        <Tile label="估值" value={formatValuation(company.valuationMetric, company.valuationValue)} />
        <Tile label="DC电力容量" value={formatGigawatts(company.dataCenterCapacityGw)} />
        <Tile label="GPU等效规模" value={formatGpuEquivalent(company.gpuEquivalentK)} />
        <Tile label="下一期财报" value={company.nextEarningsDate ?? 'TBD'} />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">主题暴露 / Theme exposures</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {company.themeExposures.map((exposure) => {
            const theme = getTheme(exposure.themeId)
            return (
              <div key={exposure.themeId} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-sm font-medium text-sky-200">{theme?.nameZh ?? exposure.themeId}</div>
                <p className="mt-1 text-xs text-slate-400">{theme?.nameEn}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <MetricBadge label="Rel" value={exposure.relevance} tone="sky" />
                  <MetricBadge label="Purity" value={exposure.purity} tone="violet" />
                  {exposure.positionType ? <MetricBadge label="Type" value={exposure.positionType} /> : null}
                </div>
                <p className="mt-3 text-xs text-slate-400">{exposure.evidence}</p>
              </div>
            )
          })}
        </div>
      </section>

      {company.modelBenchmarks?.length ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">模型基准 / Model benchmarks</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {company.modelBenchmarks.map((benchmark) => (
              <a key={`${benchmark.provider}-${benchmark.modelName}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-sky-400/80" href={benchmark.sourceUrl} target="_blank" rel="noreferrer">
                <div className="text-sm font-medium text-sky-200">{benchmarkTitle(benchmark.provider)}</div>
                <div className="mt-1 text-xs text-slate-400">{benchmark.sourceName}</div>
                <div className="mt-3 text-sm font-semibold text-slate-100">{benchmark.modelName}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {benchmark.rank ? <MetricBadge label="Rank" value={`#${benchmark.rank}`} tone="sky" /> : null}
                  {benchmark.score !== undefined ? <MetricBadge label="Score" value={benchmark.scoreLabel ?? benchmark.score} tone="emerald" /> : null}
                  {benchmark.usageRank ? <MetricBadge label="Usage" value={`#${benchmark.usageRank}`} tone="violet" /> : null}
                </div>
                <div className="mt-2 text-[11px] text-slate-500">更新 {benchmark.updatedAt} · 点击核实榜单</div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {(company.relatedPrivateCompanies?.length || company.relatedListedCompanies?.length) ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">投资/映射关系</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {company.relatedPrivateCompanies?.map((name) => <MetricBadge key={name} label="Private" value={name} tone="violet" />)}
            {company.relatedListedCompanies?.map((name) => <MetricBadge key={name} label="Listed" value={name} tone="sky" />)}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">风险标签</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {company.riskFlags.length ? company.riskFlags.map((risk) => <MetricBadge key={risk} label="Risk" value={risk} tone="amber" />) : <span className="text-sm text-slate-500">暂无</span>}
        </div>
      </section>
    </div>
  )
}

function SourceLink({ href, label }: { href: string | undefined; label: string }) {
  if (!href) return null
  return (
    <a className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-400 hover:text-sky-200" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  )
}

function benchmarkTitle(provider: string) {
  if (provider === 'mmlu-pro') return 'MMLU-Pro 通用能力榜'
  if (provider === 'agent') return 'SWE-bench Verified Agent榜'
  if (provider === 'coding') return 'Coding 能力榜'
  return 'OpenRouter 用量榜'
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  )
}
