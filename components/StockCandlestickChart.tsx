'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CandlestickChart, ExternalLink, RefreshCw } from 'lucide-react'
import { CandlestickSeries, ColorType, createChart, HistogramSeries, LineSeries } from 'lightweight-charts'
import { historySymbol } from '@/lib/stock-history'
import type { PriceBar, StockHistory } from '@/lib/stock-history'
import { aggregateWeekly, movingAverage, volumeSignals } from '@/lib/technical-indicators'
import { quoteUrl } from '@/lib/links'
import type { Company } from '@/lib/types'

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: StockHistory }
const number = (value: number | null | undefined) => typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 3 }) : '—'
const volume = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)

export function StockCandlestickChart({ company }: { company: Company }) {
  const symbol = historySymbol(company)
  return (
    <section id="stock-chart" aria-label="个股K线图" className="scroll-mt-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><CandlestickChart className="h-5 w-5 text-cyan-300" aria-hidden="true" />个股K线图 <span className="text-sm font-normal text-slate-500">/ Price action</span></h2>
        <span className="text-xs text-slate-400">{symbol ?? 'Private'} · 历史价量</span>
      </div>
      {symbol ? <HistoryLoader key={company.id} company={company} /> : <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-12 text-center text-sm text-slate-400">未上市公司暂无公开交易 K 线和成交量数据。</div>}
    </section>
  )
}

function HistoryLoader({ company }: { company: Company }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const externalQuote = quoteUrl(company)

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    async function load() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/companies/${encodeURIComponent(company.id)}/history.json`, { signal: controller.signal })
        const payload = await response.json()
        if (!response.ok || payload.error) throw new Error(typeof payload.error === 'string' ? payload.error : '历史行情暂不可用。')
        if (!Array.isArray(payload.bars) || !payload.bars.length) throw new Error('该股票暂无可用历史行情。')
        if (!controller.signal.aborted) setState({ status: 'ready', data: payload as StockHistory })
      } catch (error) {
        if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : '历史行情加载失败。' })
      }
    }
    void load()
    return () => controller.abort()
  }, [company.id, attempt])

  if (state.status === 'loading') return <div className="flex h-[420px] items-center justify-center gap-2 rounded-2xl bg-slate-950/60 text-sm text-slate-400" role="status"><RefreshCw className="h-4 w-4 animate-spin" />正在获取历史 OHLC / 成交量…</div>
  if (state.status === 'error') return <div className="rounded-2xl border border-dashed border-amber-900/70 bg-slate-950/60 px-5 py-12 text-center">
    <p role="alert" className="text-sm text-amber-200">{state.message}</p>
    <p className="mt-2 text-xs text-slate-500">不使用模拟数据替代真实行情。</p>
    <div className="mt-4 flex justify-center gap-4"><button type="button" onClick={() => setAttempt((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-500"><RefreshCw className="h-3 w-3" />重试</button>{externalQuote && <a href={externalQuote} target="_blank" rel="noreferrer" className="self-center text-xs text-slate-300 hover:text-cyan-200">查看外部行情 ↗</a>}</div>
  </div>
  return <HistoryView data={state.data} />
}

function HistoryView({ data }: { data: StockHistory }) {
  const [months, setMonths] = useState(3)
  const [interval, setInterval] = useState<'day' | 'week'>('day')
  const [showMA, setShowMA] = useState(true)
  const bars = useMemo(() => interval === 'week' ? aggregateWeekly(data.bars) : data.bars, [data.bars, interval])
  const start = useMemo(() => {
    const date = new Date(`${data.bars.at(-1)!.time}T00:00:00Z`)
    date.setUTCMonth(date.getUTCMonth() - months)
    return date.toISOString().slice(0, 10)
  }, [data.bars, months])
  const visible = useMemo(() => bars.filter((bar) => bar.time >= start), [bars, start])
  const signals = useMemo(() => volumeSignals(data.bars), [data.bars])
  const first = visible[0]
  const last = visible.at(-1)
  const change = first && last ? (last.close / first.open - 1) * 100 : null

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-baseline gap-3"><span className="text-2xl font-semibold tabular-nums text-white">{number(last?.close)}</span><span className="text-xs text-slate-400">{data.currency}</span><span className={`text-sm tabular-nums ${(change ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}<span className="ml-1 text-[10px] text-slate-500">区间开盘至收盘</span></span></div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1" aria-label="图表时间范围">{[1, 3, 6, 12].map((value) => <button type="button" key={value} aria-pressed={months === value} onClick={() => setMonths(value)} className={`rounded-md px-2.5 py-1.5 text-xs ${months === value ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{value === 12 ? '1Y' : `${value}M`}</button>)}</div>
        <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1" aria-label="K线周期">{(['day', 'week'] as const).map((value) => <button type="button" key={value} aria-pressed={interval === value} onClick={() => setInterval(value)} className={`rounded-md px-2.5 py-1.5 text-xs ${interval === value ? 'bg-cyan-900 text-cyan-100' : 'text-slate-400 hover:text-white'}`}>{value === 'day' ? '日K' : '周K'}</button>)}</div>
        <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="checkbox" checked={showMA} onChange={(event) => setShowMA(event.target.checked)} className="accent-cyan-400" />MA5 / MA20</label>
      </div>
    </div>

    <ChartCanvas bars={bars} visible={visible} showMA={showMA} currency={data.currency} />

    <div className="grid gap-3 sm:grid-cols-3">
      <Indicator label="CMF · 20交易日" value={signals.cmf20 === null ? '数据不足' : signals.cmf20.toFixed(3)} note="收盘位置 × 成交量；正值为买压代理，负值为卖压代理" />
      <Indicator label="相对成交量 · RVOL" value={signals.relativeVolume === null ? '数据不足' : `${signals.relativeVolume.toFixed(2)}×`} note="最新日成交量 / 此前20交易日均量；未收盘时数值偏低" />
      <Indicator label="量价资金信号 · 非机构流量" value={signals.cmf20 === null ? '等待数据' : signals.cmf20 > 0.1 ? '买压偏强' : signals.cmf20 < -0.1 ? '卖压偏强' : '多空平衡'} note="按日线 CMF ±0.10 分区；不随图表周期变化，不代表真实净流入" />
    </div>

    <div className="space-y-1 text-[11px] leading-5 text-slate-500">
      <p><a href={data.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100">{data.source}<ExternalLink className="h-3 w-3" /></a> · 最近交易日 {data.bars.at(-1)?.time} · {data.exchangeTimezone} · 获取时间 {data.fetchedAt.replace('T', ' ').slice(0, 19)} UTC · {process.env.NEXT_PUBLIC_STATIC_HISTORY === 'true' ? '静态部署快照 · 重新部署时更新' : '按需获取 · 上游缓存15分钟'}</p>
      <p>{data.priceBasis}。周线按交易所日期的周一分组，首尾周可能不完整。绿涨红跌。MA 按所选周期计算；成交量缺失时不补零。拖动平移、滚轮缩放，悬停查看 OHLC。价量信号仅供研究。</p>
      <p>图表由 <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="underline hover:text-slate-300">TradingView Lightweight Charts™</a> 提供。</p>
    </div>

    <details className="text-xs text-slate-400">
      <summary className="w-fit cursor-pointer text-cyan-300">查看行情数据表（最近20根K线）</summary>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-right tabular-nums"><caption className="sr-only">{data.symbol} {interval === 'day' ? '日线' : '周线'} OHLC 与成交量，{data.currency}</caption><thead className="text-slate-500"><tr>{['日期', '开盘', '最高', '最低', '收盘', '成交量'].map((label) => <th key={label} scope="col" className="whitespace-nowrap p-2 font-normal">{label}</th>)}</tr></thead><tbody>{visible.slice(-20).reverse().map((bar) => <tr key={bar.time} className="border-t border-slate-800"><th scope="row" className="whitespace-nowrap p-2 font-normal">{bar.time}</th>{[bar.open, bar.high, bar.low, bar.close].map((value, index) => <td key={index} className="p-2">{number(value)}</td>)}<td className="p-2">{number(bar.volume)}</td></tr>)}</tbody></table></div>
    </details>
  </div>
}

function ChartCanvas({ bars, visible, showMA, currency }: { bars: PriceBar[]; visible: PriceBar[]; showMA: boolean; currency: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<PriceBar | null>(null)
  const current = hovered ?? visible.at(-1)

  useEffect(() => {
    if (!container.current || !visible.length) return
    setHovered(null)
    const chart = createChart(container.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: '#020617' }, textColor: '#94a3b8', fontSize: 11, attributionLogo: true },
      grid: { vertLines: { color: '#0f172a' }, horzLines: { color: '#172033' } },
      rightPriceScale: { borderColor: '#1e293b', scaleMargins: { top: 0.08, bottom: 0.27 } },
      timeScale: { borderColor: '#1e293b', timeVisible: false },
      localization: { locale: 'en-US' },
      handleScroll: { vertTouchDrag: false },
    })
    const candleSeries = chart.addSeries(CandlestickSeries, { upColor: '#34d399', downColor: '#fb7185', borderVisible: false, wickUpColor: '#34d399', wickDownColor: '#fb7185' })
    candleSeries.setData(visible)
    const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume', lastValueVisible: false, priceLineVisible: false })
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 }, visible: false })
    volumeSeries.setData(visible.flatMap((bar) => bar.volume === null ? [] : [{ time: bar.time, value: bar.volume, color: bar.close >= bar.open ? '#34d39950' : '#fb718550' }]))
    if (showMA) {
      for (const [period, color] of [[5, '#fbbf24'], [20, '#a78bfa']] as const) {
        const line = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
        line.setData(movingAverage(bars, period).filter((point) => point.time >= visible[0].time))
      }
    }
    const byDate = new Map(visible.map((bar) => [bar.time, bar]))
    chart.subscribeCrosshairMove((event) => {
      const candle = event.seriesData.get(candleSeries)
      const time = candle?.time
      const key = typeof time === 'string' ? time : typeof time === 'object' ? `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}` : undefined
      setHovered(key ? byDate.get(key) ?? null : null)
    })
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [bars, visible, showMA])

  return <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
    <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-800/70 px-3 py-2 text-[11px] tabular-nums text-slate-400">
      <span className="text-slate-200">{current?.time ?? '无数据'}</span><span>开 <b className="font-normal text-slate-200">{number(current?.open)}</b></span><span>高 {number(current?.high)}</span><span>低 {number(current?.low)}</span><span>收 <b className="font-normal text-slate-200">{number(current?.close)}</b></span><span>量 {current ? volume(current.volume) : '—'}</span><span>{currency}</span>{showMA && <><span className="text-amber-300">MA5</span><span className="text-violet-400">MA20</span></>}
    </div>
    <div ref={container} className="h-[340px] w-full md:h-[400px]" role="img" aria-label="蜡烛K线、成交量与移动平均线；下方提供可访问的行情数据表" />
  </div>
}

function Indicator({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums text-cyan-200">{value}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{note}</p></div>
}