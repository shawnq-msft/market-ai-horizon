import type { ValuationLabel } from './types'

export function valuationColor(label: ValuationLabel) {
  switch (label) {
    case 'Cheap':
      return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
    case 'Fair':
      return 'border-sky-400/40 bg-sky-500/10 text-sky-200'
    case 'Rich':
      return 'border-amber-400/40 bg-amber-500/10 text-amber-200'
    case 'Very Rich':
      return 'border-rose-400/40 bg-rose-500/10 text-rose-200'
    case 'Private':
      return 'border-violet-400/40 bg-violet-500/10 text-violet-200'
  }
}

export function relativeValuationHeatColor(score: number) {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#eab308'
  return '#22c55e'
}

export function relativeValuationCardColor(score: number) {
  if (score >= 80) return 'border-red-400/60 bg-red-500/15 text-red-100'
  if (score >= 60) return 'border-amber-400/60 bg-amber-500/15 text-amber-100'
  if (score >= 40) return 'border-yellow-400/60 bg-yellow-500/15 text-yellow-100'
  return 'border-green-400/60 bg-green-500/15 text-green-100'
}

export function metricHeatColor(score: number) {
  return relativeValuationHeatColor(score)
}

export function factorHeatColor(score: number) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#84cc16'
  if (score >= 40) return '#eab308'
  if (score >= 20) return '#f97316'
  return '#ef4444'
}

export function weeklyHeatColor(value?: number) {
  if (value === undefined) return '#64748b'
  if (value >= 5) return '#22c55e'
  if (value > 0) return '#84cc16'
  if (value <= -5) return '#ef4444'
  if (value < 0) return '#f97316'
  return '#64748b'
}

export function purityHeatColor(value: number) {
  if (value >= 85) return '#2563eb'
  if (value >= 70) return '#0284c7'
  if (value >= 50) return '#0d9488'
  return '#64748b'
}
