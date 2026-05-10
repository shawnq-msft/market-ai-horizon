import clsx from 'clsx'

export function MetricBadge({
  label,
  value,
  tone = 'slate',
  compact = false,
}: {
  label: string
  value: string | number
  tone?: 'slate' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet'
  compact?: boolean
}) {
  const tones = {
    slate: 'border-slate-700 bg-slate-900 text-slate-300',
    emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    rose: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    sky: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
    violet: 'border-violet-500/40 bg-violet-500/10 text-violet-200',
  }

  return (
    <span className={clsx('inline-flex items-center justify-center rounded-full border', compact ? 'gap-0.5 px-1.5 py-0.5 text-[10px]' : 'gap-1 px-2 py-0.5 text-[11px]', tones[tone])}>
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  )
}
