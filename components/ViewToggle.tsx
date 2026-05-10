import clsx from 'clsx'
import type { ViewMode } from '@/lib/types'

const views: Array<{ id: ViewMode; label: string }> = [
  { id: 'cards', label: 'Cards 卡片' },
  { id: 'treemap', label: 'TreeMap' },
  { id: 'heatmap', label: 'HeatMap' },
]

export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950 p-1">
      {views.map((view) => (
        <button
          key={view.id}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition',
            value === view.id ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100',
          )}
          onClick={() => onChange(view.id)}
          type="button"
        >
          {view.label}
        </button>
      ))}
    </div>
  )
}
