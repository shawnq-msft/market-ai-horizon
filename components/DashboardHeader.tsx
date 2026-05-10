import { Activity, BarChart3, CalendarClock, Database, TrendingUp } from 'lucide-react'
import { MetricBadge } from './MetricBadge'
import { companies } from '@/data/companies.seed'
import type { CompanyThemeRow } from '@/lib/filters'
import { formatPercent } from '@/lib/format'

export function DashboardHeader({ rows }: { rows: CompanyThemeRow[] }) {
  const avgWeek = rows.length ? rows.reduce((sum, row) => sum + (row.company.weekChangePct ?? 0), 0) / rows.length : 0
  const highRelevance = rows.filter((row) => row.exposure.relevance >= 5).length
  const earningsSoon = companies.filter((company) => company.nextEarningsDate && company.nextEarningsDate <= '2026-06-15').length
  const privateCount = companies.filter((company) => company.market === 'Private').length

  return (
    <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-5 shadow-2xl shadow-slate-950/60">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
            <Database className="h-3.5 w-3.5" /> Seed data · 非实时行情 · 非投资建议
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-4xl">全球 AI 产业链情报看板</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Global AI Value Chain Map：云应用、大模型、Neo-Cloud、算力、半导体、日韩材料、电力资源与投资载体的主题纯度和估值热度视图。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[520px]">
          <Summary icon={<BarChart3 />} label="公司" value={companies.length} />
          <Summary icon={<TrendingUp />} label="周变化" value={formatPercent(avgWeek)} />
          <Summary icon={<Activity />} label="高相关主题" value={highRelevance} />
          <Summary icon={<CalendarClock />} label="近财报/Private" value={`${earningsSoon}/${privateCount}`} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <MetricBadge label="重点" value="US/HK/CN/JP/KR" tone="sky" />
        <MetricBadge label="新增" value="Neo-Cloud" tone="violet" />
        <MetricBadge label="电力" value="单独层" tone="amber" />
        <MetricBadge label="跨主题" value="统一落地页" tone="emerald" />
      </div>
    </header>
  )
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-sky-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-100">{value}</div>
    </div>
  )
}
