'use client'

import { ResponsiveContainer, Tooltip, Treemap } from 'recharts'
import { getHeatValue, getTheme, relevancePercent } from '@/lib/filters'
import { formatGigawatts, formatMarketCap, formatPercent } from '@/lib/format'
import { factorHeatColor, purityHeatColor, relativeValuationHeatColor, weeklyHeatColor } from '@/lib/valuation'
import type { CompanyThemeRow } from '@/lib/filters'
import type { HeatMetric } from '@/lib/types'

type TreeNode = {
  name: string
  size: number
  fill: string
  colorValue: string
  row: CompanyThemeRow
}

export function TreemapView({ rows, metric }: { rows: CompanyThemeRow[]; metric: HeatMetric }) {
  const data: TreeNode[] = rows
    .map((row) => ({
      name: row.company.nameZh ?? row.company.nameEn,
      size: row.company.marketCapUsdBn ?? row.exposure.purity,
      fill: treemapColor(row, metric),
      colorValue: `${metricLabel(metric)} ${formatMetricValue(row, metric)}`,
      row,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 100)

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-3 flex flex-col gap-2 text-xs text-slate-400 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="font-medium text-slate-200">TreeMap</span> · 面积=市值/估算权重 · 颜色=当前配色/因子 · 标签=中文名/代码市值/估值相关度
        </div>
        <TreemapLegend />
      </div>
      <div className="h-[680px]">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={data} dataKey="size" nameKey="name" stroke="#020617" content={<TreeCell />} isAnimationActive={false}>
            <Tooltip content={<TreeTooltip metric={metric} />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function TreeCell(props: any) {
  const { x, y, width, height, name, fill, row, colorValue } = props
  if (width < 18 || height < 18) return null
  const companyRow: CompanyThemeRow | undefined = row
  const ticker = companyRow?.company.ticker ?? 'Private'
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={5} ry={5} opacity={0.96} />
      {width > 54 && height > 34 ? (
        <>
          <text x={x + 5} y={y + 14} fill="#020617" stroke="#f8fafc" strokeWidth={2.2} paintOrder="stroke" fontSize={12} fontWeight={800}>
            {clipLabel(name, width)}
          </text>
          <text x={x + 5} y={y + 29} fill="#020617" stroke="#f8fafc" strokeWidth={1.8} paintOrder="stroke" fontSize={10} fontWeight={700}>
            {clipLabel(`${ticker} · ${formatMarketCap(companyRow?.company.marketCapUsdBn)}`, width)}
          </text>
        </>
      ) : null}
      {width > 80 && height > 52 && companyRow ? (
        <text x={x + 5} y={y + 44} fill="#020617" stroke="#f8fafc" strokeWidth={1.6} paintOrder="stroke" fontSize={10} fontWeight={700}>
          {clipLabel(`${colorValue} · Rel ${relevancePercent(companyRow)}%`, width)}
        </text>
      ) : null}
    </g>
  )
}

function TreemapLegend() {
  const items = [
    { color: '#22c55e', label: '低估值/强因子' },
    { color: '#eab308', label: '中性' },
    { color: '#f59e0b', label: '偏贵/弱因子' },
    { color: '#ef4444', label: '高估值/很弱' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <div key={item.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
          <span className="text-[11px] text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function clipLabel(value: string, width: number) {
  const maxLength = Math.max(3, Math.floor((width - 10) / 7))
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}

function treemapColor(row: CompanyThemeRow, metric: HeatMetric) {
  if (metric === 'valuation') return relativeValuationHeatColor(row.company.valuationScore)
  if (metric === 'weekly') return weeklyHeatColor(row.company.weekChangePct)
  if (metric === 'purity') return purityHeatColor(row.exposure.purity)
  return factorHeatColor(getHeatValue(row, metric))
}

function metricLabel(metric: HeatMetric) {
  const labels: Record<HeatMetric, string> = {
    valuation: '估值',
    weekly: '动量',
    purity: '纯度',
    quality: '质量',
    momentum: '动量因子',
    aiValue: 'AI价值',
    elasticity: '弹性',
    capex: 'Capex',
    retailHeat: '散户热',
    mainFund: '主力资金',
    mmluPro: 'MMLU',
    agentBenchmark: 'Agent',
    codingBenchmark: '代码',
    openRouterRank: 'OR排名',
    openRouterUsage: 'OR用量',
    dataCenterCapacity: 'DC GW',
  }
  return labels[metric]
}

function formatMetricValue(row: CompanyThemeRow, metric: HeatMetric) {
  if (metric === 'weekly') return formatPercent(row.company.weekChangePct)
  if (metric === 'dataCenterCapacity') return formatGigawatts(row.company.dataCenterCapacityGw)
  return Math.round(getHeatValue(row, metric)).toString()
}

function TreeTooltip({ active, payload, metric }: any) {
  if (!active || !payload?.length) return null
  const row: CompanyThemeRow = payload[0].payload.row
  const theme = getTheme(row.exposure.themeId)

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-3 text-xs shadow-xl">
      <div className="font-semibold text-slate-100">{row.company.nameZh ?? row.company.nameEn}</div>
      <div className="text-slate-500">{row.company.ticker ?? 'Private'} · {row.company.market}</div>
      <div className="mt-2 text-sky-200">{theme?.nameZh}</div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
        <span>面积 {formatMarketCap(row.company.marketCapUsdBn)}</span>
        <span>颜色 {metricLabel(metric)} {formatMetricValue(row, metric)}</span>
        <span>周变化 {formatPercent(row.company.weekChangePct)}</span>
        <span>DC容量 {formatGigawatts(row.company.dataCenterCapacityGw)}</span>
        <span>估值分 {row.company.valuationScore}</span>
        <span>纯度 {row.exposure.purity}</span>
        <span>相关性 {relevancePercent(row)}%</span>
        <span>质量 {formatMetricValue(row, 'quality')}</span>
        <span>动量 {formatMetricValue(row, 'momentum')}</span>
        <span>AI价值 {formatMetricValue(row, 'aiValue')}</span>
        <span>弹性 {row.company.revenueElasticityScore}</span>
      </div>
    </div>
  )
}
