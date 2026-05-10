import type { Market } from '@/lib/types'

const markets: Array<Market | 'all'> = ['all', 'US', 'HK', 'CN', 'TW', 'JP', 'KR', 'EU', 'ETF', 'Private']

export function MarketFilter({ value, onChange }: { value: Market | 'all'; onChange: (value: Market | 'all') => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      市场 Market
      <select className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100" value={value} onChange={(event) => onChange(event.target.value as Market | 'all')}>
        {markets.map((market) => (
          <option key={market} value={market}>
            {market === 'all' ? '全部 All' : market}
          </option>
        ))}
      </select>
    </label>
  )
}
