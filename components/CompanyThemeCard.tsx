import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { formatDate, formatGigawatts, formatGpuEquivalent, formatPercent, formatValuation } from '@/lib/format'
import { formatBenchmarkSummary, getTheme, relevancePercent } from '@/lib/filters'
import { newsSearchUrl, quoteUrl, valuationSourceUrl } from '@/lib/links'
import { relativeValuationCardColor } from '@/lib/valuation'
import type { CompanyThemeRow } from '@/lib/filters'

export function CompanyThemeCard({ row }: { row: CompanyThemeRow }) {
  const { company, exposure } = row
  const theme = getTheme(exposure.themeId)
  const weeklyTone = (company.weekChangePct ?? 0) >= 0 ? 'emerald' : 'rose'
  const benchmarkSummary = formatBenchmarkSummary(company)
  const companyQuoteUrl = quoteUrl(company)
  const companyNewsUrl = newsSearchUrl(company)
  const companyValuationSourceUrl = valuationSourceUrl(company)

  return (
    <div className={`group block min-h-[92px] rounded-lg border px-1.5 py-1.5 transition hover:border-sky-300/80 ${relativeValuationCardColor(company.valuationScore)}`}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <Link className="truncate text-[11px] font-semibold leading-4 text-slate-100 hover:text-sky-200" href={`/companies/${company.id}`}>{company.nameZh ?? company.nameEn}</Link>
            <ExternalLink className="h-2.5 w-2.5 shrink-0 text-slate-500 opacity-0 transition group-hover:opacity-100" />
          </div>
          <p className="truncate text-[9px] leading-3 text-slate-500">{company.ticker ?? 'Private'} · {company.market}</p>
        </div>
        <span className="shrink-0 rounded-full border border-current bg-black/20 px-1 py-0.5 text-[8px] leading-none">{company.valuationScore}</span>
      </div>

      <div className="mt-1 truncate rounded-md border border-black/20 bg-black/20 px-1.5 py-0.5 text-[9px] leading-3 text-slate-100">
        {theme?.nameZh ?? exposure.themeId}
      </div>

      <div className="mt-1 grid grid-cols-4 gap-0.5">
        <MiniMetric label="R" value={`${relevancePercent(row)}%`} tone="text-sky-200" />
        <MiniMetric label="P" value={exposure.purity} tone="text-violet-200" />
        <MiniMetric label="W" value={formatPercent(company.weekChangePct)} tone={weeklyTone === 'emerald' ? 'text-emerald-200' : 'text-rose-200'} />
        <MiniMetric label="E" value={company.revenueElasticityScore} tone="text-slate-200" />
      </div>

      {benchmarkSummary ? <div className="mt-1 truncate text-[9px] leading-3 text-amber-200">{benchmarkSummary}</div> : null}
      {company.dataCenterCapacityGw || company.gpuEquivalentK ? <div className="mt-1 truncate text-[9px] leading-3 text-cyan-200">DC {formatGigawatts(company.dataCenterCapacityGw)} · {formatGpuEquivalent(company.gpuEquivalentK)}</div> : null}

      <div className="mt-1 flex items-center justify-between gap-1 text-[9px] leading-3 text-slate-500">
        <span className="truncate text-slate-300">{formatValuation(company.valuationMetric, company.valuationValue)}</span>
        <span className="shrink-0">财 {formatDate(company.nextEarningsDate)}</span>
      </div>

      <div className="mt-1 flex items-center gap-2 text-[9px] leading-3 text-slate-500">
        {companyQuoteUrl ? <ExternalCardLink href={companyQuoteUrl} label="行情" /> : null}
        <ExternalCardLink href={companyNewsUrl} label="消息" />
        {company.market === 'Private' && companyValuationSourceUrl ? <ExternalCardLink href={companyValuationSourceUrl} label="估值源" /> : null}
      </div>
    </div>
  )
}

function ExternalCardLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="hover:text-sky-200" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  )
}

function MiniMetric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="min-w-0 rounded bg-black/20 px-1 py-0.5 text-center text-[9px] leading-3">
      <span className="text-slate-500">{label}</span> <span className={tone}>{value}</span>
    </div>
  )
}
