import clsx from 'clsx'
import { layers } from '@/data/layers'
import type { LayerId } from '@/lib/types'

export function LayerFilter({ value, onChange }: { value: LayerId | 'all'; onChange: (value: LayerId | 'all') => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={clsx('rounded-full border px-3 py-1.5 text-xs', value === 'all' ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-slate-800 bg-slate-950 text-slate-400')}
        onClick={() => onChange('all')}
        type="button"
      >
        全部 All
      </button>
      {layers.map((layer) => (
        <button
          key={layer.id}
          className={clsx('rounded-full border px-3 py-1.5 text-xs', value === layer.id ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100')}
          onClick={() => onChange(layer.id)}
          type="button"
        >
          {layer.nameZh}
        </button>
      ))}
    </div>
  )
}
