'use client'

import { useMemo, useState } from 'react'
import { CompanyGrid } from '@/components/CompanyGrid'
import { DashboardHeader } from '@/components/DashboardHeader'
import { HeatmapMatrix } from '@/components/HeatmapMatrix'
import { MarketFilter } from '@/components/MarketFilter'
import { ThemeTreeFilter } from '@/components/ThemeTreeFilter'
import { TreemapView } from '@/components/TreemapView'
import { ViewToggle } from '@/components/ViewToggle'
import { createThemeRows, filterThemeRows, sortThemeRows, aggregateCompanyRows, getHeatValue } from '@/lib/filters'
import type { HeatMetric, Market, SortKey, ViewMode } from '@/lib/types'

const sortOptions: Array<{ id: SortKey; label: string }> = [
  { id: 'relevance', label: '相关性' },
  { id: 'purity', label: '纯度' },
  { id: 'weekly', label: '周涨跌' },
  { id: 'valuation', label: '估值热度' },
  { id: 'marketCap', label: '市值' },
  { id: 'earnings', label: '财报临近' },
  { id: 'quality', label: '质量因子' },
  { id: 'momentum', label: '动量因子' },
  { id: 'aiValue', label: 'AI价值因子' },
  { id: 'elasticity', label: '收入弹性' },
  { id: 'capex', label: 'Capex联动' },
  { id: 'retailHeat', label: '散户热度' },
  { id: 'mainFund', label: '主力资金' },
]

const heatOptions: Array<{ id: HeatMetric; label: string }> = [
  { id: 'valuation', label: '相对估值' },
  { id: 'weekly', label: '周涨跌' },
  { id: 'purity', label: '主题纯度' },
  { id: 'quality', label: '质量因子' },
  { id: 'momentum', label: '动量因子' },
  { id: 'aiValue', label: 'AI价值因子' },
  { id: 'elasticity', label: '收入弹性' },
  { id: 'capex', label: 'Capex联动' },
  { id: 'retailHeat', label: '散户热度' },
  { id: 'mainFund', label: '主力资金' },
]

const factorFloorOptions = [0, 40, 60, 80]

export default function Home() {
  const [view, setView] = useState<ViewMode>('cards')
  const [themeIds, setThemeIds] = useState<string[]>([])
  const [market, setMarket] = useState<Market | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('relevance')
  const [heatMetric, setHeatMetric] = useState<HeatMetric>('valuation')
  const [factorFloor, setFactorFloor] = useState(0)

  const allRows = useMemo(() => createThemeRows(), [])
  const rows = useMemo(() => {
    const filtered = filterThemeRows({ rows: allRows, themeIds, market })
    const aggregated = aggregateCompanyRows(filtered, themeIds).filter((row) => getHeatValue(row, heatMetric) >= factorFloor)
    return sortThemeRows(aggregated, sortKey)
  }, [allRows, themeIds, market, sortKey, heatMetric, factorFloor])

  function toggleTheme(themeId: string) {
    setThemeIds((current) => current.includes(themeId) ? current.filter((id) => id !== themeId) : [...current, themeId])
  }

  function toggleLayer(layerThemeIds: string[]) {
    setThemeIds((current) => {
      const selected = layerThemeIds.every((id) => current.includes(id))
      if (selected) return current.filter((id) => !layerThemeIds.includes(id))
      return Array.from(new Set([...current, ...layerThemeIds]))
    })
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a,#020617_45%)] px-4 py-5 text-slate-100 md:px-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <DashboardHeader rows={rows} />

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-col gap-4">
            <ThemeTreeFilter themeIds={themeIds} onLayerToggle={toggleLayer} onThemeToggle={toggleTheme} onClearThemes={() => setThemeIds([])} />
            <div className="grid gap-3 md:grid-cols-[180px_180px_220px_170px_auto] md:items-end">
              <MarketFilter value={market} onChange={setMarket} />
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                排序 Sort
                <select className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                  {sortOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                配色 / 因子 Color
                <select className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100" value={heatMetric} onChange={(event) => setHeatMetric(event.target.value as HeatMetric)}>
                  {heatOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                因子门槛 ≥
                <select className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100" value={factorFloor} onChange={(event) => setFactorFloor(Number(event.target.value))}>
                  {factorFloorOptions.map((value) => <option key={value} value={value}>{value || '全部'}</option>)}
                </select>
              </label>
              <ViewToggle value={view} onChange={setView} />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>当前公司：{rows.length} · 已选主题：{themeIds.length || '全部'}</span>
          <span>所有视图每家公司只显示一次，相关性以营收/利润敞口百分比估算，散户热度/主力资金为可更新指标。</span>
        </div>

        {view === 'cards' ? <CompanyGrid rows={rows} /> : null}
        {view === 'treemap' ? <TreemapView rows={rows} metric={heatMetric} /> : null}
        {view === 'heatmap' ? <HeatmapMatrix rows={rows} metric={heatMetric} /> : null}
      </div>
    </main>
  )
}
