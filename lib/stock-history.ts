import type { Company } from './types'

export type PriceBar = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number | null
}

export type StockHistory = {
  symbol: string
  currency: string
  exchangeTimezone: string
  source: string
  sourceUrl: string
  fetchedAt: string
  priceBasis: string
  bars: PriceBar[]
}

export function historySymbol(company: Company): string | undefined {
  const ticker = company.ticker?.split('/')[0].trim().toUpperCase()
  if (!company.listed || company.market === 'Private' || !ticker || ticker === 'PRIVATE') return undefined
  if (ticker.endsWith('.SH')) return ticker.replace(/\.SH$/, '.SS')
  if (company.market === 'HK') {
    const code = ticker.replace(/\.HK$/, '')
    return /^\d+$/.test(code) ? `${String(Number(code)).padStart(4, '0')}.HK` : undefined
  }
  if (ticker.includes('.')) return ticker
  if (company.market === 'CN') return /^\d{6}$/.test(ticker) ? `${ticker}.${ticker.startsWith('6') ? 'SS' : 'SZ'}` : undefined
  const suffix = { TW: '.TW', JP: '.T', KR: '.KS' }[company.market as 'TW' | 'JP' | 'KR']
  return `${ticker}${suffix ?? ''}`
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

// Validate the external payload before passing data into the chart library.
export function parseYahooHistory(payload: unknown, symbol: string, now = new Date()): StockHistory {
  const chart = record(record(payload).chart)
  if (chart.error) throw new Error('Historical price provider returned an error')
  const result = record(array(chart.result)[0])
  const meta = record(result.meta)
  const quote = record(array(record(result.indicators).quote)[0])
  const timezone = typeof meta.exchangeTimezoneName === 'string' ? meta.exchangeTimezoneName : 'UTC'
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const byDate = new Map<string, PriceBar>()
  const opens = array(quote.open), highs = array(quote.high), lows = array(quote.low)
  const closes = array(quote.close), volumes = array(quote.volume)

  array(result.timestamp).forEach((timestamp, index) => {
    const open = opens[index], high = highs[index], low = lows[index], close = closes[index], volume = volumes[index]
    if (!finite(timestamp) || timestamp <= 0 || timestamp * 1000 > now.getTime()) return
    if (!finite(open) || !finite(high) || !finite(low) || !finite(close)) return
    if (low <= 0 || high < Math.max(open, close) || low > Math.min(open, close)) return
    const parts = dateFormatter.formatToParts(new Date(timestamp * 1000))
    const part = (type: string) => parts.find((item) => item.type === type)?.value
    const time = `${part('year')}-${part('month')}-${part('day')}`
    byDate.set(time, { time, open, high, low, close, volume: finite(volume) && volume >= 0 ? volume : null })
  })

  const bars = [...byDate.values()].sort((a, b) => a.time.localeCompare(b.time))
  if (!bars.length) throw new Error('No usable historical prices')
  return {
    symbol,
    currency: typeof meta.currency === 'string' ? meta.currency : 'N/A',
    exchangeTimezone: timezone,
    source: 'Yahoo Finance',
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/history/`,
    fetchedAt: now.toISOString(),
    priceBasis: 'Yahoo OHLC（拆股调整，非股息复权）；非实时，最新交易日可能未收盘',
    bars,
  }
}

export async function fetchStockHistory(company: Company): Promise<StockHistory> {
  const symbol = historySymbol(company)
  if (!symbol) throw new Error('No public market symbol')
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d&includePrePost=false`, {
    headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(12000),
    next: { revalidate: 900 },
  })
  if (!response.ok) throw new Error(`Historical price provider HTTP ${response.status}`)
  return parseYahooHistory(await response.json(), symbol)
}