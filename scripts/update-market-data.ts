import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { companies } from '../data/companies.seed'
import type { Company, Market } from '../lib/types'

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number
        chartPreviousClose?: number
      }
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
          volume?: Array<number | null>
        }>
      }
    }>
    error?: { description?: string }
  }
}

type ITickResponse = {
  code?: number
  msg?: string
  data?: Array<{ c?: number; close?: number; t?: number; tu?: number; v?: number }>
}

type EastMoneyKlineResponse = {
  data?: {
    klines?: string[]
  }
}

type SinaQuote = {
  price?: number
  previous?: number
  volume?: number
  turnover?: number
}

type ProviderName = 'eastmoney' | 'yahoo' | 'sina' | 'itick'

type QuoteUpdate = {
  company: Company
  symbol: string
  provider: ProviderName
  price: number
  week: number
  retailHeat?: number
  mainFund?: number
}

type RefreshOptions = {
  ids: string[]
  tickers: string[]
  market?: Market
  limit?: number
  providers: ProviderName[]
  all: boolean
}

const sourcePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/companies.seed.ts')
const today = new Date().toISOString().slice(0, 10)
const defaultRefreshLimit = 25
const requestTimeoutMs = 12000
const iTickBaseUrl = process.env.ITICK_BASE_URL ?? 'https://api0.itick.org'
const iTickMinIntervalMs = 12500
let lastITickRequestAt = 0

const defaultProviders: ProviderName[] = ['eastmoney', 'yahoo', 'sina', 'itick']
const marketSuffix: Partial<Record<Market, string>> = {
  HK: '.HK',
  CN: '',
  TW: '.TW',
  JP: '.T',
  KR: '.KS',
}

function primaryTicker(company: Company) {
  return company.ticker?.split('/')[0].trim()
}

function yahooSymbol(company: Company) {
  const ticker = primaryTicker(company)
  if (!ticker || ticker === 'Private' || company.market === 'Private') return undefined
  if (ticker.includes('.')) return normalizeChinaSuffix(ticker)
  if (company.market === 'US' || company.market === 'ETF' || company.market === 'EU') return ticker
  const suffix = marketSuffix[company.market]
  if (company.market === 'HK') return `${ticker.padStart(4, '0')}${suffix}`
  if (suffix !== undefined) return `${ticker}${suffix}`
  return undefined
}

function normalizeChinaSuffix(ticker: string) {
  if (ticker.endsWith('.SH')) return `${ticker.slice(0, -3)}.SS`
  return ticker
}

function validCloses(response: YahooChartResponse) {
  return response.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)) ?? []
}

async function fetchQuoteUpdate(company: Company, providers: ProviderName[]): Promise<QuoteUpdate | undefined> {
  const candidates = providersForCompany(company, providers)
  const errors: string[] = []

  for (const provider of candidates) {
    try {
      if (provider === 'eastmoney') return await fetchEastMoneyUpdate(company)
      if (provider === 'yahoo') return await fetchYahooUpdate(company)
      if (provider === 'sina') return await fetchSinaUpdate(company)
      return await fetchITickUpdate(company)
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(errors.join(' | ') || 'no provider available')
}

function providersForCompany(company: Company, selected: ProviderName[]) {
  const order: ProviderName[] = company.market === 'CN'
    ? ['eastmoney', 'sina', 'yahoo', 'itick']
    : company.market === 'HK'
      ? ['yahoo', 'sina', 'eastmoney', 'itick']
      : ['yahoo', 'sina', 'itick', 'eastmoney']
  return order.filter((provider) => selected.includes(provider))
}

async function fetchYahooUpdate(company: Company): Promise<QuoteUpdate> {
  const symbol = yahooSymbol(company)
  if (!symbol) throw new Error('unsupported symbol')

  const response = await fetchJson<YahooChartResponse>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`)
  const result = response.chart?.result?.[0]
  const closes = validCloses(response)
  const price = result?.meta?.regularMarketPrice ?? closes.at(-1)
  const previous = closes.at(0) ?? result?.meta?.chartPreviousClose

  if (price === undefined || previous === undefined || previous === 0) throw new Error('no usable close data')

  return quoteUpdate(company, symbol, 'yahoo', price, previous)
}

async function fetchITickUpdate(company: Company): Promise<QuoteUpdate> {
  const token = process.env.ITICK_TOKEN
  const symbol = iTickSymbol(company)
  if (!token) throw new Error('ITICK_TOKEN not set')
  if (!symbol) throw new Error('unsupported symbol')

  await throttleITick()
  const response = await fetchJson<ITickResponse>(`${iTickBaseUrl}/stock/kline?region=${symbol.region}&code=${encodeURIComponent(symbol.code)}&kType=8&limit=5`, {
    headers: { accept: 'application/json', token },
  })
  const closes = response.data?.map((item) => item.c ?? item.close).filter((value): value is number => typeof value === 'number' && Number.isFinite(value)) ?? []
  const price = closes.at(-1)
  const previous = closes.at(0)
  if (price === undefined || previous === undefined || previous === 0) throw new Error(response.msg ?? 'no usable close data')

  return quoteUpdate(company, `${symbol.region}:${symbol.code}`, 'itick', price, previous)
}

async function fetchEastMoneyUpdate(company: Company): Promise<QuoteUpdate> {
  const symbol = eastMoneySymbol(company)
  if (!symbol) throw new Error('unsupported symbol')

  const response = await fetchJson<EastMoneyKlineResponse>(`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${symbol.secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57&klt=101&fqt=1&end=20500101&lmt=5`)
  const rows = response.data?.klines ?? []
  const closes = rows.map((row) => Number(row.split(',')[2])).filter((value) => Number.isFinite(value))
  const turnovers = rows.map((row) => Number(row.split(',')[6])).filter((value) => Number.isFinite(value))
  const price = closes.at(-1)
  const previous = closes.at(0)
  if (price === undefined || previous === undefined || previous === 0) throw new Error('no usable close data')

  const retailHeat = heatFromTurnover(turnovers)
  const mainFund = mainFundFromPriceAndTurnover(closes, turnovers)
  return quoteUpdate(company, symbol.label, 'eastmoney', price, previous, retailHeat, mainFund)
}

async function fetchSinaUpdate(company: Company): Promise<QuoteUpdate> {
  const symbol = sinaSymbol(company)
  if (!symbol) throw new Error('unsupported symbol')

  const text = await fetchText(`https://hq.sinajs.cn/list=${symbol.code}`, {
    headers: { referer: 'https://finance.sina.com.cn/' },
  })
  const quote = parseSinaQuote(text, company.market)
  if (!quote.price || !quote.previous) throw new Error('no usable quote data')

  return quoteUpdate(company, symbol.label, 'sina', quote.price, quote.previous, heatFromTurnover([quote.turnover]), mainFundFromPriceAndTurnover([quote.previous, quote.price], [quote.turnover]))
}

function iTickSymbol(company: Company) {
  const ticker = primaryTicker(company)
  if (!ticker || ticker === 'Private') return undefined
  if (company.market === 'US' || company.market === 'ETF') return { region: 'US', code: ticker, label: `US:${ticker}` }
  if (company.market === 'HK') return { region: 'HK', code: String(Number(ticker.replace('.HK', ''))), label: `HK:${ticker}` }
  if (company.market === 'JP') return { region: 'JP', code: ticker.replace('.T', ''), label: `JP:${ticker}` }
  if (company.market === 'CN') {
    if (ticker.endsWith('.SH')) return { region: 'SH', code: ticker.slice(0, -3), label: `SH:${ticker}` }
    if (ticker.endsWith('.SZ')) return { region: 'SZ', code: ticker.slice(0, -3), label: `SZ:${ticker}` }
  }
  return undefined
}

function eastMoneySymbol(company: Company) {
  const ticker = primaryTicker(company)
  if (!ticker || ticker === 'Private') return undefined
  if (ticker.endsWith('.SH')) return { secid: `1.${ticker.slice(0, -3)}`, label: ticker }
  if (ticker.endsWith('.SZ')) return { secid: `0.${ticker.slice(0, -3)}`, label: ticker }
  if (ticker.endsWith('.HK')) return { secid: `116.${ticker.slice(0, -3).padStart(5, '0')}`, label: ticker }
  if (company.market === 'HK') return { secid: `116.${ticker.padStart(5, '0')}`, label: ticker }
  if (company.market === 'US' || company.market === 'ETF') return { secid: `105.${ticker}`, label: ticker }
  return undefined
}

function sinaSymbol(company: Company) {
  const ticker = primaryTicker(company)
  if (!ticker || ticker === 'Private') return undefined
  if (ticker.endsWith('.SH')) return { code: `sh${ticker.slice(0, -3)}`, label: ticker }
  if (ticker.endsWith('.SZ')) return { code: `sz${ticker.slice(0, -3)}`, label: ticker }
  if (ticker.endsWith('.HK')) return { code: `hk${ticker.slice(0, -3).padStart(5, '0')}`, label: ticker }
  if (company.market === 'HK') return { code: `hk${ticker.padStart(5, '0')}`, label: ticker }
  if (company.market === 'US' || company.market === 'ETF') return { code: `gb_${ticker.toLowerCase()}`, label: ticker }
  return undefined
}

function parseSinaQuote(text: string, market: Market): SinaQuote {
  const value = text.match(/="(.*)"/)?.[1]
  if (!value) return {}
  const fields = value.split(',')
  if (market === 'CN') {
    return {
      price: Number(fields[3]),
      previous: Number(fields[2]),
      volume: Number(fields[8]),
      turnover: Number(fields[9]),
    }
  }
  if (market === 'HK') {
    return {
      price: Number(fields[6]),
      previous: Number(fields[3]),
      volume: Number(fields[12]),
      turnover: Number(fields[11]),
    }
  }
  return {
    price: Number(fields[1]),
    previous: Number(fields[26]),
    volume: Number(fields[10]),
    turnover: Number(fields[11]),
  }
}

function quoteUpdate(company: Company, symbol: string, provider: ProviderName, price: number, previous: number, retailHeat?: number, mainFund?: number): QuoteUpdate {
  return {
    company,
    symbol,
    provider,
    price: round(price, price >= 100 ? 1 : 2),
    week: round((price / previous - 1) * 100, 1),
    retailHeat,
    mainFund,
  }
}

function heatFromTurnover(turnovers: Array<number | undefined>) {
  const usable = turnovers.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
  const latest = usable.at(-1)
  const average = usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : undefined
  if (!latest || !average) return undefined
  return Math.max(0, Math.min(100, Math.round(45 + (latest / average - 1) * 40)))
}

function mainFundFromPriceAndTurnover(closes: number[], turnovers: Array<number | undefined>) {
  const latest = closes.at(-1)
  const previous = closes.at(0)
  const heat = heatFromTurnover(turnovers)
  if (!latest || !previous || heat === undefined) return undefined
  return Math.max(0, Math.min(100, Math.round(heat + (latest / previous - 1) * 120)))
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const text = await fetchText(url, init)
  return JSON.parse(text) as T
}

async function fetchText(url: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

async function throttleITick() {
  const waitMs = Math.max(0, iTickMinIntervalMs - (Date.now() - lastITickRequestAt))
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs))
  lastITickRequestAt = Date.now()
}

function round(value: number, digits: number) {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function upsertNumberProperty(line: string, property: string, value: number) {
  const formatted = `${property}: ${value}`
  const pattern = new RegExp(`, ${property}: -?\\d+(?:\\.\\d+)?`)
  if (pattern.test(line)) return line.replace(pattern, `, ${formatted}`)
  if (property === 'price') return line.replace(', week:', `, ${formatted}, week:`)
  if (property === 'week') return line.replace(', metric:', `, ${formatted}, metric:`)
  return line.replace(', metric:', `, ${formatted}, metric:`)
}

function updateCompanyLine(source: string, update: QuoteUpdate) {
  const pattern = new RegExp(`seed\\(\\{ id: '${escapeRegExp(update.company.id)}', .*? \\}\\),`)
  const match = source.match(pattern)
  if (!match) return source

  let line = match[0]
  line = upsertNumberProperty(line, 'price', update.price)
  line = upsertNumberProperty(line, 'week', update.week)
  if (update.retailHeat !== undefined) line = upsertNumberProperty(line, 'retailHeat', update.retailHeat)
  if (update.mainFund !== undefined) line = upsertNumberProperty(line, 'mainFund', update.mainFund)
  return source.replace(match[0], line)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseOptions(args: string[]): RefreshOptions {
  const options: RefreshOptions = { ids: [], tickers: [], providers: defaultProviders, all: false }

  for (const arg of args) {
    if (arg === '--all') options.all = true
    else if (arg.startsWith('--ids=')) options.ids = splitArg(arg)
    else if (arg.startsWith('--tickers=')) options.tickers = splitArg(arg).map((ticker) => ticker.toUpperCase())
    else if (arg.startsWith('--market=')) options.market = arg.split('=')[1] as Market
    else if (arg.startsWith('--limit=')) options.limit = Number(arg.split('=')[1])
    else if (arg.startsWith('--providers=')) options.providers = parseProviders(splitArg(arg))
  }

  return options
}

function parseProviders(values: string[]) {
  const valid = new Set<ProviderName>(defaultProviders)
  const providers = values.filter((value): value is ProviderName => valid.has(value as ProviderName))
  return providers.length ? providers : defaultProviders
}

function splitArg(arg: string) {
  return arg.split('=')[1]?.split(',').map((value) => value.trim()).filter(Boolean) ?? []
}

function selectCompanies(options: RefreshOptions) {
  let listed = companies.filter((company) => company.market !== 'Private' && primaryTicker(company))

  if (options.ids.length) listed = listed.filter((company) => options.ids.includes(company.id))
  if (options.tickers.length) listed = listed.filter((company) => {
    const ticker = primaryTicker(company)?.toUpperCase()
    const yahoo = yahooSymbol(company)?.toUpperCase()
    return Boolean((ticker && options.tickers.includes(ticker)) || (yahoo && options.tickers.includes(yahoo)))
  })
  if (options.market) listed = listed.filter((company) => company.market === options.market)

  const limit = options.limit ?? (options.all || options.ids.length || options.tickers.length || options.market ? listed.length : defaultRefreshLimit)
  return listed.slice(0, limit)
}

function selectionLabel(options: RefreshOptions) {
  if (options.all) return 'all'
  if (options.ids.length || options.tickers.length || options.market) return options.limit === undefined ? 'filtered' : `filtered first ${options.limit}`
  return options.limit === undefined ? `default first ${defaultRefreshLimit}` : `first ${options.limit}`
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const listed = selectCompanies(options)
  const updates: QuoteUpdate[] = []
  const failed: string[] = []

  for (const company of listed) {
    try {
      const update = await fetchQuoteUpdate(company, options.providers)
      if (update) updates.push(update)
      else failed.push(`${company.id}: no usable close data`)
    } catch (error) {
      failed.push(`${company.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  let source = await readFile(sourcePath, 'utf8')
  source = source.replace(/const updatedAt = '\d{4}-\d{2}-\d{2}'/, `const updatedAt = '${today}'`)
  for (const update of updates) source = updateCompanyLine(source, update)
  await writeFile(sourcePath, source)

  console.log(`Updated ${updates.length}/${listed.length} selected listed symbols with latest price and 5-session change.`)
  console.log(`Selection: ${selectionLabel(options)}. Providers: ${options.providers.join(',')}. Use --all, --limit=N, --ids=a,b, --tickers=MSFT,0100.HK, or --market=HK.`)
  console.log('Provider strategy: Eastmoney/Sina for China/HK quote and heat proxies, Yahoo for broad global fallback, iTick via ITICK_TOKEN with 5 rpm throttle.')
  console.log('Valuation metric/value/score fields were preserved; public valuation endpoints were unavailable.')
  if (updates.length) {
    console.log('Provider hits:')
    for (const [provider, count] of providerCounts(updates)) console.log(`- ${provider}: ${count}`)
  }
  if (failed.length) {
    console.log(`Skipped ${failed.length}:`)
    for (const item of failed) console.log(`- ${item}`)
  }
}

function providerCounts(updates: QuoteUpdate[]) {
  const counts = new Map<ProviderName, number>()
  for (const update of updates) counts.set(update.provider, (counts.get(update.provider) ?? 0) + 1)
  return counts
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
