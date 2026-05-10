'use client'

import { useMemo, useState } from 'react'
import { getHeatValue, getTheme, relevancePercent } from '@/lib/filters'
import { formatMarketCap, formatPercent, formatValuation } from '@/lib/format'
import { factorHeatColor, metricHeatColor, purityHeatColor, weeklyHeatColor } from '@/lib/valuation'
import type { CompanyThemeRow } from '@/lib/filters'
import type { HeatMetric } from '@/lib/types'

type SortDirection = 'asc' | 'desc'
type SortColumn =
  | 'name'
  | 'theme'
  | 'market'
  | 'price'
  | 'marketCap'
  | 'weekly'
  | 'valuationValue'
  | 'valuation'
  | 'relevance'
  | 'purity'
  | 'quality'
  | 'momentum'
  | 'aiValue'
  | 'elasticity'
  | 'capex'
  | 'retailHeat'
  | 'mainFund'
  | 'selected'

type Column = {
  id: SortColumn
  label: string
  width: string
  value: (row: CompanyThemeRow) => string | number
  sortValue: (row: CompanyThemeRow) => string | number
  fill?: (row: CompanyThemeRow) => string
  align?: 'left' | 'right' | 'center'
}

const factorColumns: Array<{ id: HeatMetric; label: string }> = [
  { id: 'quality', label: '质量' },
  { id: 'momentum', label: '动量' },
  { id: 'aiValue', label: 'AI价值' },
  { id: 'elasticity', label: '弹性' },
  { id: 'capex', label: 'Capex' },
  { id: 'retailHeat', label: '散户热' },
  { id: 'mainFund', label: '主力' },
]

export function HeatmapMatrix({ rows, metric }: { rows: CompanyThemeRow[]; metric: HeatMetric }) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('selected')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const columns = useMemo(() => getColumns(metric), [metric])
  const sortedRows = useMemo(() => sortRows(rows, columns, sortColumn, sortDirection).slice(0, 120), [rows, columns, sortColumn, sortDirection])

  function toggleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((current) => current === 'desc' ? 'asc' : 'desc')
      return
    }
    setSortColumn(column)
    setSortDirection('desc')
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
        HeatMap · 点击列头排序 · 表格列宽固定对齐 · 最后一列跟随当前“配色/因子”选择
      </div>
      <div className="max-h-[720px] overflow-auto">
        <table className="min-w-[1560px] table-fixed border-collapse text-xs text-slate-300">
          <colgroup>
            {columns.map((column) => <col key={column.id} style={{ width: column.width }} />)}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-950/95 text-[11px] text-slate-500">
            <tr className="border-b border-slate-800">
              {columns.map((column) => (
                <th key={column.id} className="px-2 py-2 font-medium">
                  <button className={`w-full transition hover:text-slate-200 ${alignClass(column.align)}`} onClick={() => toggleSort(column.id)}>
                    {column.label}{sortColumn === column.id ? (sortDirection === 'desc' ? ' ↓' : ' ↑') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const theme = getTheme(row.exposure.themeId)
              return (
                <tr key={`${row.company.id}-${row.exposure.themeId}`} className="border-b border-slate-800/70 last:border-b-0">
                  {columns.map((column) => (
                    <td key={column.id} className="px-2 py-1.5 align-middle">
                      <Cell row={row} themeName={theme?.nameZh ?? row.exposure.themeId} column={column} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Cell({ row, themeName, column }: { row: CompanyThemeRow; themeName: string; column: Column }) {
  if (column.id === 'name') {
    return (
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-100">{row.company.nameZh ?? row.company.nameEn}</div>
        <div className="truncate text-[11px] text-slate-500">{row.company.ticker ?? 'Private'}</div>
      </div>
    )
  }

  if (column.id === 'theme') return <div className="truncate text-slate-400">{themeName}</div>

  const value = column.value(row)
  const align = alignClass(column.align)

  if (!column.fill) return <div className={`truncate ${align}`}>{value}</div>

  return (
    <div className={`rounded-md px-2 py-1 text-[11px] font-semibold text-white ${align}`} style={{ background: column.fill(row) }}>
      {value}
    </div>
  )
}

function alignClass(align: Column['align']) {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}

function getColumns(metric: HeatMetric): Column[] {
  return [
    {
      id: 'name',
      label: '公司',
      width: '190px',
      value: (row) => row.company.nameZh ?? row.company.nameEn,
      sortValue: (row) => row.company.nameZh ?? row.company.nameEn,
    },
    {
      id: 'theme',
      label: '主题',
      width: '190px',
      value: (row) => getTheme(row.exposure.themeId)?.nameZh ?? row.exposure.themeId,
      sortValue: (row) => getTheme(row.exposure.themeId)?.nameZh ?? row.exposure.themeId,
    },
    {
      id: 'market',
      label: '市场',
      width: '64px',
      value: (row) => row.company.market,
      sortValue: (row) => row.company.market,
      align: 'center',
    },
    {
      id: 'price',
      label: '价格',
      width: '82px',
      value: (row) => row.company.price?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—',
      sortValue: (row) => row.company.price ?? -1,
      align: 'right',
    },
    {
      id: 'marketCap',
      label: '市值/估值',
      width: '100px',
      value: (row) => formatMarketCap(row.company.marketCapUsdBn),
      sortValue: (row) => row.company.marketCapUsdBn ?? -1,
      align: 'right',
    },
    {
      id: 'weekly',
      label: '周涨跌',
      width: '86px',
      value: (row) => formatPercent(row.company.weekChangePct),
      sortValue: (row) => row.company.weekChangePct ?? -999,
      fill: (row) => weeklyHeatColor(row.company.weekChangePct),
      align: 'right',
    },
    {
      id: 'valuationValue',
      label: '估值参数',
      width: '150px',
      value: (row) => formatValuation(row.company.valuationMetric, row.company.valuationValue),
      sortValue: (row) => row.company.valuationValue ?? -1,
      align: 'right',
    },
    {
      id: 'valuation',
      label: '估值分',
      width: '78px',
      value: (row) => row.company.valuationScore,
      sortValue: (row) => row.company.valuationScore,
      fill: (row) => metricHeatColor(row.company.valuationScore),
      align: 'right',
    },
    {
      id: 'relevance',
      label: 'Rel',
      width: '66px',
      value: (row) => `${relevancePercent(row)}%`,
      sortValue: (row) => relevancePercent(row),
      fill: (row) => factorHeatColor(row.exposure.relevance * 20),
      align: 'right',
    },
    {
      id: 'purity',
      label: 'Purity',
      width: '76px',
      value: (row) => row.exposure.purity,
      sortValue: (row) => row.exposure.purity,
      fill: (row) => purityHeatColor(row.exposure.purity),
      align: 'right',
    },
    ...factorColumns.map((factor): Column => ({
      id: factor.id as SortColumn,
      label: factor.label,
      width: factor.id === 'aiValue' || factor.id === 'retailHeat' ? '86px' : '74px',
      value: (row) => Math.round(getHeatValue(row, factor.id)),
      sortValue: (row) => getHeatValue(row, factor.id),
      fill: (row) => factorHeatColor(getHeatValue(row, factor.id)),
      align: 'right',
    })),
    {
      id: 'selected',
      label: `当前:${metricLabel(metric)}`,
      width: '104px',
      value: (row) => formatSelectedMetric(row, metric),
      sortValue: (row) => getHeatValue(row, metric),
      fill: (row) => fillSelectedMetric(row, metric),
      align: 'right',
    },
  ]
}

function sortRows(rows: CompanyThemeRow[], columns: Column[], sortColumn: SortColumn, direction: SortDirection) {
  const column = columns.find((item) => item.id === sortColumn) ?? columns[0]
  const directionMultiplier = direction === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => compare(column.sortValue(a), column.sortValue(b)) * directionMultiplier)
}

function compare(a: string | number, b: string | number) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'zh-Hans')
}

function fillSelectedMetric(row: CompanyThemeRow, metric: HeatMetric) {
  if (metric === 'weekly') return weeklyHeatColor(row.company.weekChangePct)
  if (metric === 'purity') return purityHeatColor(row.exposure.purity)
  if (metric === 'valuation') return metricHeatColor(row.company.valuationScore)
  return factorHeatColor(getHeatValue(row, metric))
}

function formatSelectedMetric(row: CompanyThemeRow, metric: HeatMetric) {
  if (metric === 'weekly') return formatPercent(row.company.weekChangePct)
  return Math.round(getHeatValue(row, metric))
}

function metricLabel(metric: HeatMetric) {
  const labels: Record<HeatMetric, string> = {
    valuation: '估值',
    weekly: '周涨跌',
    purity: '纯度',
    quality: '质量',
    momentum: '动量',
    aiValue: 'AI价值',
    elasticity: '弹性',
    capex: 'Capex',
    retailHeat: '散户热',
    mainFund: '主力资金',
  }
  return labels[metric]
}
