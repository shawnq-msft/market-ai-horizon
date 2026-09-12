'use client'

import Link from 'next/link'
import { investors } from '@/data/investors'
import { holdingCompanyIds, latestFundHoldings } from '@/lib/smart-money'
import type { InvestorDataset } from '@/lib/investor-types'

export function InvestorHoldingsFilter({ value, onChange, data, error, onRetry }: {
  value: string; onChange: (id: string) => void; data: InvestorDataset | null; error: string; onRetry: () => void
}) {
  const investor = investors.find((item) => item.id === value)
  const dates = investor && data ? [...new Set(latestFundHoldings(data.records.filter((record) => record.investorId === value)).map((record) => record.occurredAt))].sort() : []
  const count = value && data ? holdingCompanyIds(data.records, value).size : 0
  const partialFailure = value === 'cathie-wood' && data?.sources.some((source) => source.id.startsWith('holdings-ARK') && source.status === 'unavailable')
  const status = !value ? '按已核实持仓筛选下方所有视图，与其他筛选条件取交集。'
    : error ? error
    : !data ? '正在加载持仓…'
    : investor?.holdingsCoverage === 'unavailable' ? '持仓待接入，不代表未持股。'
    : `${count} 家匹配公司（其他筛选前） · ${partialFailure ? '部分来源失败' : investor?.holdingsCoverage === 'reviewed-partial' ? '部分快照' : '基金持仓'}${dates.length ? ` · 截至 ${dates.join(' / ')}` : ''}。不代表完整或实时组合。`
  const detailTitle = [investor?.organization, investor?.coverageNote, status].filter(Boolean).join('\n')

  return <div className="flex min-w-0 flex-col gap-1 text-xs text-slate-400">
    <div className="flex items-center justify-between gap-2">
      <label htmlFor="investor-holdings">投资人 Investor</label>
      {value && error ? <button type="button" onClick={onRetry} className="text-amber-200 hover:underline">加载失败 · 重试</button>
        : <Link href={value ? `/investors/${value}` : '/investors'} title={detailTitle} aria-label={value ? `${investor?.nameZh}持仓详情：${status}` : '全部投资人与机构'} className="truncate text-cyan-300 hover:underline">
          {!value ? `${investors.length} 位 ↗` : !data ? '加载中…' : investor?.holdingsCoverage === 'unavailable' ? '待接入 ↗' : partialFailure ? '部分失败 ↗' : investor?.holdingsCoverage === 'reviewed-partial' ? '部分快照 ↗' : '基金持仓 ↗'}
        </Link>}
    </div>
    <select id="investor-holdings" aria-controls="dashboard-results" aria-describedby="investor-holdings-status" title={detailTitle} value={value} onChange={(event) => onChange(event.target.value)} className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100">
      <option value="">全部投资人 / 机构</option>
      {investors.map((item) => <option key={item.id} value={item.id}>{item.nameZh} · {item.name}{item.holdingsCoverage === 'unavailable' ? '（待接入）' : ''}</option>)}
    </select>
    <span id="investor-holdings-status" role="status" className="sr-only">{status}</span>
  </div>
}