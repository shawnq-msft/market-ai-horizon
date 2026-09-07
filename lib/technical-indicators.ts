import type { PriceBar } from './stock-history'

export function aggregateWeekly(bars: PriceBar[]): PriceBar[] {
  const weeks = new Map<string, PriceBar>()
  for (const bar of bars) {
    const date = new Date(`${bar.time}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
    const key = date.toISOString().slice(0, 10)
    const previous = weeks.get(key)
    if (!previous) weeks.set(key, { ...bar })
    else {
      previous.high = Math.max(previous.high, bar.high)
      previous.low = Math.min(previous.low, bar.low)
      previous.close = bar.close
      previous.volume = previous.volume === null || bar.volume === null ? null : previous.volume + bar.volume
    }
  }
  return [...weeks.values()]
}

export function movingAverage(bars: PriceBar[], period: number) {
  if (!Number.isInteger(period) || period < 1) throw new Error('Invalid moving average period')
  let sum = 0
  return bars.flatMap((bar, index) => {
    sum += bar.close
    if (index >= period) sum -= bars[index - period].close
    return index < period - 1 ? [] : [{ time: bar.time, value: sum / period }]
  })
}

// Volume-based proxies cannot identify institutions, orders, or actual net inflows.
export function volumeSignals(bars: PriceBar[]) {
  const recent = bars.slice(-20)
  const valid = recent.length === 20 && recent.every((bar) => bar.volume !== null)
  const totalVolume = valid ? recent.reduce((sum, bar) => sum + (bar.volume ?? 0), 0) : 0
  const cmf20 = totalVolume > 0 ? recent.reduce((sum, bar) => {
    const multiplier = bar.high === bar.low ? 0 : (2 * bar.close - bar.high - bar.low) / (bar.high - bar.low)
    return sum + multiplier * (bar.volume ?? 0)
  }, 0) / totalVolume : null

  const previous = bars.slice(-21, -1)
  const average = previous.length === 20 && previous.every((bar) => bar.volume !== null)
    ? previous.reduce((sum, bar) => sum + (bar.volume ?? 0), 0) / 20 : 0
  const latestVolume = bars.at(-1)?.volume
  const relativeVolume = average > 0 && typeof latestVolume === 'number' ? latestVolume / average : null
  return { cmf20, relativeVolume }
}