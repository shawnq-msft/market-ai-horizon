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
  return <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="investor-holdings" className="text-xs text-slate-400">投资人 / 机构持仓</label>
      <select id="investor-holdings" aria-describedby="investor-holdings-status" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 max-w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 sm:w-80">
        <option value="">全部公司（不限投资人）</option>
        {investors.map((item) => <option key={item.id} value={item.id}>{item.nameZh} · {item.name}{item.holdingsCoverage === 'unavailable' ? '（持仓待接入）' : item.holdingsCoverage === 'reviewed-partial' ? '（已核实快照）' : '（基金持仓）'}</option>)}
      </select>
      <Link href={value ? `/investors/${value}` : '/investors'} className="text-xs text-cyan-300 hover:underline">{value ? '归属与持仓详情' : '投资人目录'} ↗</Link>
      {value && <button type="button" onClick={() => onChange('')} className="text-xs text-slate-400 hover:text-white">清除投资人筛选</button>}
    </div>
    <div id="investor-holdings-status" role="status" className="mt-2 text-xs leading-5 text-slate-400">
      {!value ? '选中后仅显示已核实、可匹配到看板的持仓股；与市场、主题及因子条件取交集。' : <>
        <p>{investor?.entityType === 'company' ? '公司投资组合' : investor?.entityType === 'institution' ? '机构申报' : '关联账户／申报主体'} · {investor?.organization}</p>
        <p>{investor?.coverageNote}</p>
        {error ? <p className="text-amber-200">{error}<button type="button" onClick={onRetry} className="ml-2 text-cyan-300">重试持仓加载</button></p> : !data ? <p>正在加载持仓，暂不展示未筛选公司…</p> : <p className={count ? 'text-cyan-200' : 'text-amber-200'}>{count ? `已匹配 ${count} 家公司（应用其他筛选前）` : '暂无可匹配的已核实持仓，不代表未持股。'}{dates.length > 0 ? ` · 报告截至 ${dates.join(' / ')}` : ''}</p>}
        {partialFailure && <p className="text-amber-200">部分 ARK 持仓源不可用，当前结果不完整。</p>}
      </>}
    </div>
  </div>
}