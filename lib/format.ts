export function formatPercent(value?: number) {
  if (value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function formatCompactNumber(value?: number, suffix = '') {
  if (value === undefined) return '—'
  return `${value.toLocaleString(undefined, { maximumFractionDigits: value >= 100 ? 0 : 1 })}${suffix}`
}

export function formatMarketCap(value?: number) {
  if (value === undefined) return '—'
  return `$${formatCompactNumber(value, 'B')}`
}

export function formatGigawatts(value?: number) {
  if (value === undefined) return '—'
  return `${formatCompactNumber(value, 'GW')}`
}

export function formatGpuEquivalent(value?: number) {
  if (value === undefined) return '—'
  return `${formatCompactNumber(value, 'k GPU')}`
}

export function formatValuation(metric?: string, value?: number) {
  if (!metric) return '—'
  if (metric === 'Private') return value === undefined ? 'Private' : `Private valuation ${formatMarketCap(value)}`
  if (value === undefined) return metric
  if (metric === 'AUM') return `${metric} ${formatMarketCap(value)}`
  return `${metric} ${value.toFixed(1)}x`
}

export function formatDate(value?: string) {
  if (!value) return 'TBD'
  return value.slice(5)
}
