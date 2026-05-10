import clsx from 'clsx'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { layers } from '@/data/layers'

export function ThemeTreeFilter({
  themeIds,
  onLayerToggle,
  onThemeToggle,
  onClearThemes,
}: {
  themeIds: string[]
  onLayerToggle: (themeIds: string[]) => void
  onThemeToggle: (value: string) => void
  onClearThemes: () => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between gap-3 p-3">
        <button className="flex items-center gap-2 text-left" onClick={() => setOpen((value) => !value)} type="button">
          <ChevronDown className={clsx('h-4 w-4 text-slate-400 transition', !open && '-rotate-90')} />
          <div>
            <div className="text-xs font-semibold text-slate-200">产业层级与主题筛选</div>
            <div className="text-[11px] text-slate-500">行业和主题都可 toggle；选中行业会全选/取消该行业主题。</div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] text-slate-400">已选 {themeIds.length || '全部'}</span>
          <button
            className={clsx('rounded-full border px-2.5 py-1 text-[11px]', themeIds.length === 0 ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100')}
            onClick={onClearThemes}
            type="button"
          >
            全部
          </button>
        </div>
      </div>

      {open ? (
        <div className="grid gap-2 border-t border-slate-800 p-3 lg:grid-cols-2 2xl:grid-cols-3">
          {layers.map((layer) => {
            const layerThemeIds = layer.themes.map((theme) => theme.id)
            const selectedCount = layerThemeIds.filter((id) => themeIds.includes(id)).length
            const activeLayer = selectedCount === layerThemeIds.length
            const partialLayer = selectedCount > 0 && !activeLayer

            return (
              <div key={layer.id} className={clsx('rounded-xl border p-2', activeLayer ? 'border-sky-500/50 bg-sky-500/10' : partialLayer ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 bg-slate-900/60')}>
                <button
                  className="mb-1 flex w-full items-center justify-between gap-2 text-left"
                  onClick={() => onLayerToggle(layerThemeIds)}
                  type="button"
                >
                  <span className="truncate text-[12px] font-medium text-slate-100">{layer.nameZh}</span>
                  <span className={clsx('shrink-0 rounded-full px-1.5 py-0.5 text-[10px]', selectedCount ? 'bg-sky-500/15 text-sky-200' : 'bg-slate-950 text-slate-500')}>{selectedCount}/{layer.themes.length}</span>
                </button>
                <div className="flex flex-wrap gap-1">
                  {layer.themes.map((theme) => {
                    const activeTheme = themeIds.includes(theme.id)
                    return (
                      <button
                        key={theme.id}
                        className={clsx('rounded-full border px-2 py-0.5 text-[10px]', activeTheme ? 'border-violet-400 bg-violet-500/20 text-violet-100' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100')}
                        onClick={() => onThemeToggle(theme.id)}
                        title={`${theme.nameZh} / ${theme.nameEn}`}
                        type="button"
                      >
                        {theme.nameZh}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
