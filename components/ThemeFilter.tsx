import type { Theme } from '@/lib/types'

export function ThemeFilter({ themes, value, onChange }: { themes: Theme[]; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      主题 Theme
      <select
        className="min-h-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
        multiple
        value={value}
        onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))}
      >
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.nameZh} / {theme.nameEn}
          </option>
        ))}
      </select>
      <span className="text-[10px] text-slate-500">不选=全部；按 Ctrl/⌘ 可多选。</span>
    </label>
  )
}
