import { CompanyThemeCard } from './CompanyThemeCard'
import type { CompanyThemeRow } from '@/lib/filters'

export function CompanyGrid({ rows }: { rows: CompanyThemeRow[] }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 [@media(min-width:1800px)]:grid-cols-10">
      {rows.map((row) => (
        <CompanyThemeCard key={`${row.company.id}-${row.exposure.themeId}`} row={row} />
      ))}
    </div>
  )
}
