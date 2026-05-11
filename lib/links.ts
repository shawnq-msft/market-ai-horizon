import type { Company } from './types'

export function quoteUrl(company: Company) {
  if (company.quoteUrl) return company.quoteUrl
  const ticker = primaryTicker(company)
  if (!ticker || company.market === 'Private') return undefined
  if (company.market === 'HK') return `https://finance.yahoo.com/quote/${encodeURIComponent(normalizeHongKongTicker(ticker))}`
  if (company.market === 'CN') return `https://www.google.com/search?q=${encodeURIComponent(`${ticker} ${company.nameZh ?? company.nameEn} stock`)}`
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`
}

export function newsSearchUrl(company: Company) {
  if (company.newsSearchUrl) return company.newsSearchUrl
  const query = [company.nameEn, company.nameZh, primaryTicker(company), company.market === 'Private' ? 'valuation funding' : 'stock news'].filter(Boolean).join(' ')
  return `https://www.google.com/search?tbm=nws&q=${encodeURIComponent(query)}`
}

export function valuationSourceUrl(company: Company) {
  if (company.valuationSourceUrl) return company.valuationSourceUrl
  if (company.market !== 'Private') return quoteUrl(company)
  const query = `${company.nameEn} ${company.nameZh ?? ''} valuation funding Reuters Bloomberg Forbes TechCrunch`.trim()
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

function primaryTicker(company: Company) {
  return company.ticker?.split('/')[0].trim()
}

function normalizeHongKongTicker(ticker: string) {
  if (ticker.includes('.')) return ticker
  return `${ticker.padStart(4, '0')}.HK`
}
