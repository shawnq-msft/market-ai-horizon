'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Radar, RefreshCw, Users } from 'lucide-react'
import { investorFunds, investors } from '@/data/investors'
import { filterInvestorRecords, latestFundHoldings, recordKindLabels } from '@/lib/smart-money'
import type { InvestorDataset, InvestorRecord, InvestorRecordKind } from '@/lib/investor-types'
import type { Company } from '@/lib/types'

const format = (value?: number) => value === undefined ? '未披露' : value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const tones: Record<InvestorRecordKind, string> = {
  comment: 'border-sky-800 bg-sky-950/60 text-sky-200',
  'personal-trade': 'border-amber-800 bg-amber-950/60 text-amber-200',
  'fund-trade': 'border-emerald-800 bg-emerald-950/60 text-emerald-200',
  holding: 'border-violet-800 bg-violet-950/60 text-violet-200',
  'holding-change': 'border-orange-800 bg-orange-950/60 text-orange-200',
}

export function SmartMoneySensor({ companies, detail = false, investorId }: { companies?: Company[]; detail?: boolean; investorId?: string }) {
  const [data, setData] = useState<InvestorDataset | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [selectedInvestor, setSelectedInvestor] = useState('')
  const [kind, setKind] = useState<InvestorRecordKind | ''>('')
  const [fundId, setFundId] = useState('')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(12)

  useEffect(() => {
    const controller = new AbortController()
    setError('')
    setData(null)
    void fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/investors/activity.json`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('投资人披露数据暂时不可用。')
        const payload = await response.json() as InvestorDataset
        if (!Array.isArray(payload.records) || !Array.isArray(payload.sources)) throw new Error('投资人数据格式异常。')
        if (!controller.signal.aborted) setData(payload)
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '加载失败。')
      })
    return () => controller.abort()
  }, [attempt])

  const activeInvestor = investorId || selectedInvestor
  const allRecords = data?.records ?? []
  const currentRecords = [...allRecords.filter((record) => record.kind !== 'holding'), ...latestFundHoldings(allRecords)]
  const scope = filterInvestorRecords(currentRecords, { investorId: activeInvestor, companyIds: companies?.map((company) => company.id) })
  const records = filterInvestorRecords(scope, { kind: kind || undefined, fundId, query })
  const visible = (kind === 'holding' ? latestFundHoldings(records).sort((a, b) => (b.weightPct ?? 0) - (a.weightPct ?? 0)) : records)
  const availableFunds = investorFunds.filter((fund) => !activeInvestor || fund.investorId === activeInvestor)
  const unavailable = data?.sources.filter((source) => source.status === 'unavailable') ?? []

  return <section id="smart-money" aria-label="Smart Money Sensor" className="scroll-mt-5 overflow-hidden rounded-3xl border border-cyan-900/60 bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-slate-950 p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300"><Radar className="h-5 w-5" />Investor intelligence</div><h2 className="mt-2 text-xl font-semibold text-white">Smart Money Sensor</h2><p className="mt-1 text-xs leading-5 text-slate-400">明星投资人 · 个股发言 · 本人买卖 · 基金买卖与持仓</p></div>
      <Link href="/investors" className="inline-flex items-center gap-2 rounded-xl border border-cyan-800 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-950"><Users className="h-4 w-4" />投资人目录 →</Link>
    </div>
    <p className="mt-3 rounded-xl border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs leading-5 text-amber-200">基金／公司操作 ≠ 本人交易；持仓快照 ≠ 当日买入；13F 增减持 ≠ 已知成交日。家庭申报不等于申报人本人持有。按实际主体、报告期和来源分别展示。</p>
    {!investorId && <div className="mt-3 flex flex-wrap gap-2">{investors.map((investor) => <Link key={investor.id} href={`/investors/${investor.id}`} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-cyan-500">{investor.name} ↗</Link>)}</div>}

    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {!investorId && <label className="text-xs text-slate-400">投资人<select aria-label="投资人筛选" value={selectedInvestor} onChange={(event) => { setSelectedInvestor(event.target.value); setFundId(''); setLimit(12) }} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-100"><option value="">全部投资人</option>{investors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <label className="text-xs text-slate-400">记录类型<select aria-label="记录类型" value={kind} onChange={(event) => { setKind(event.target.value as InvestorRecordKind | ''); setLimit(12) }} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-100"><option value="">全部类型</option>{Object.entries(recordKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-xs text-slate-400">基金<select aria-label="基金筛选" value={fundId} onChange={(event) => { setFundId(event.target.value); setLimit(12) }} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-100"><option value="">全部基金 / 主体</option>{availableFunds.map((fund) => <option key={fund.id} value={fund.id}>{fund.id}</option>)}</select></label>
      <label className="text-xs text-slate-400">搜索个股<input aria-label="搜索个股" placeholder="TSLA / NVIDIA…" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(12) }} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-100" /></label>
    </div>

    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
      {Object.entries(recordKindLabels).map(([value, label]) => <span key={value}>{label} <strong className="text-slate-100">{scope.filter((record) => record.kind === value).length}</strong></span>)}
    </div>
    <p className="mt-2 text-[11px] leading-5 text-slate-500">{companies ? detail ? '仅显示此公司的已关联披露。' : '跟随看板市场与主题筛选；投资人目录可查看其他证券。' : '包含未收录到产业链看板的证券；未映射证券不建立错误个股链接。'} 当前为最新披露快照，不是完整历史档案。</p>

    {!data && !error && <p role="status" className="py-8 text-sm text-slate-400">正在读取官方基金披露…</p>}
    {error && <div role="alert" className="py-5 text-sm text-amber-200">{error}<button onClick={() => setAttempt((value) => value + 1)} className="ml-3 inline-flex items-center gap-1 text-cyan-300"><RefreshCw className="h-3 w-3" />重试</button></div>}
    {unavailable.length > 0 && <p role="status" className="mt-3 text-xs text-amber-200">部分数据源不可用：{unavailable.map((source) => source.label).join('、')}。记录不完整，不应据此判断没有持仓。</p>}
    {data && !visible.length && <div role="status" className="mt-4 rounded-2xl border border-dashed border-slate-700 p-6 text-sm leading-6 text-slate-400">当前范围暂无已核实记录。个人发言需有可核实原文，个人买卖需明确个人账户披露；未接入的数据不会用基金记录或估算补齐。</div>}
    <div className="mt-4 grid gap-3 lg:grid-cols-2">{visible.slice(0, limit).map((record) => <RecordCard key={record.id} record={record} />)}</div>
    {visible.length > limit && <button type="button" onClick={() => setLimit((value) => value + 20)} className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-xs text-cyan-200 hover:border-cyan-500">加载更多（已显示 {Math.min(limit, visible.length)} / {visible.length}）</button>}

    {data && <p className="mt-4 text-[11px] text-slate-500">数据获取：{data.fetchedAt.replace('T', ' ').slice(0, 19)} UTC · {process.env.NEXT_PUBLIC_STATIC_HISTORY === 'true' ? '静态部署快照，重新部署更新' : '数据源按小时缓存，非实时'}</p>}
    <details className="mt-4 text-xs leading-6 text-slate-400"><summary className="w-fit cursor-pointer text-cyan-300">数据覆盖、归属与来源</summary>
      <p className="mt-2">本人发言仅收录可核实的个股观点；本人交易只认明确个人账户披露。ARK 基金交易为团队组合操作，不是 Cathie Wood 个人指令。基金持仓有报告期／截至日，披露日期未知时不以抓取时间代替。市值并非成本，权重不跨基金相加。</p>
      <p>ARK 数据自动抓取；新增机构的 13F 和佩洛西年度资产为人工核实快照，大多仅覆盖部分条目，不随抓取自动更新。佩洛西具体资产所有人未核实，年末日期按年度规则确定。Tom Lee 与特朗普持仓尚未接入；13F 变化、个人发言和个人账户交易暂未录入。空记录不代表零持仓。所有内容仅供研究，不构成投资建议。</p>
      {data?.sources.map((source) => <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline">{source.label}</a> · {source.status === 'ok' ? `${source.count} 条原始记录` : source.error}</p>)}
    </details>
  </section>
}

function RecordCard({ record }: { record: InvestorRecord }) {
  const investor = investors.find((item) => item.id === record.investorId)
  return <article className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full border px-2 py-1 text-[10px] ${tones[record.kind]}`}>{record.kind === 'holding' ? record.investorId === 'nancy-pelosi' ? '家庭申报持仓（所有人未核实）' : investor?.entityType === 'company' ? '公司持仓' : record.fundId ? '基金／机构持仓' : '披露持仓' : recordKindLabels[record.kind]}</span><time className="text-xs tabular-nums text-slate-400" dateTime={record.occurredAt}>{record.kind === 'holding' ? '持仓截至' : record.kind === 'holding-change' ? '报告期末' : '事件日期'} {record.occurredAt}</time></div>
    {record.direction && <p className={`mt-2 text-xs font-semibold ${record.direction === 'sell' || record.direction === 'decrease' ? 'text-rose-300' : 'text-emerald-300'}`}>{({ buy: '买入 Buy', sell: '卖出 Sell', increase: '报告期增持（不等于逐笔买入）', decrease: '报告期减持（不等于逐笔卖出）' })[record.direction]}</p>}
    <h3 className="mt-3 break-words text-sm font-semibold text-white">{record.title}</h3>
    <p className="mt-1 text-xs text-slate-400">{record.securityName}</p>
    <p className="mt-2 text-xs text-cyan-200">实际主体：{record.actor}</p>
    <p className="mt-1 text-[11px] text-slate-400">关联投资人／主体：<Link href={`/investors/${record.investorId}`} className="text-cyan-300 hover:underline">{investor?.name ?? record.investorId} ↗</Link>{record.fundId ? ' · 归属以实际申报账户为准' : ''}</p>
    <p className="mt-3 text-xs leading-5 text-slate-300">{record.summary}</p>
    {record.kind !== 'comment' && <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-900/70 p-3 text-xs"><div><dt className="text-slate-500">{record.kind === 'holding' ? '持仓数量' : '披露数量'}</dt><dd className="mt-1 break-all tabular-nums text-slate-100">{format(record.shares)}</dd></div><div><dt className="text-slate-500">市值 USD</dt><dd className="mt-1 break-all tabular-nums text-slate-100">{format(record.marketValueUsd)}</dd></div><div><dt className="text-slate-500">基金权重</dt><dd className="mt-1 text-slate-100">{record.weightPct === undefined ? '未披露' : `${record.weightPct.toFixed(2)}%`}</dd></div></dl>}
    {record.valueRangeUsd && <p className="mt-2 text-xs text-amber-200">申报价值区间：USD {format(record.valueRangeUsd.min)}–{format(record.valueRangeUsd.max)}（非精确市值；持有人未核实）</p>}
    <div className="mt-3 flex flex-wrap gap-3 text-xs"><a href={record.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:underline">{record.sourceName}<ExternalLink className="h-3 w-3" /></a>{record.companyId ? <Link href={`/companies/${record.companyId}#smart-money`} className="text-cyan-300 hover:underline">个股页面 ↗</Link> : <span className="text-slate-500">未映射至看板个股</span>}</div>
    <details className="mt-3 text-[11px] leading-5 text-slate-500"><summary className="cursor-pointer">披露说明与时间</summary><p>{record.disclosureNote}</p><p>证据类型：{record.evidence === 'official-disclosure' ? '官方披露' : record.evidence === 'secondary-disclosure' ? '二手披露解析（非直接核实原件）' : record.evidence === 'primary-statement' ? '本人原始发言' : '媒体报道'}</p><p>披露日期：{record.publishedAt ?? '未单独披露'} · 获取／核实：{record.retrievedAt.slice(0, 10)}</p></details>
  </article>
}