import { cn } from '../../lib/cn'

/**
 * StatCard — animated KPI card for dashboards.
 *
 * Props:
 *   label     string         — metric name
 *   value     string|number  — main displayed value
 *   icon      ReactNode      — Lucide icon element
 *   trend     number|null    — positive = up, negative = down (shown as %)
 *   accent    string         — Tailwind color key: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky'
 *   onClick   function       — optional click handler
 */
const ACCENT = {
  indigo: {
    icon:    'bg-indigo-100 text-indigo-600',
    border:  'border-indigo-100',
    trend_up:'text-emerald-600',
    trend_dn:'text-rose-500',
  },
  emerald: {
    icon:    'bg-emerald-100 text-emerald-600',
    border:  'border-emerald-100',
    trend_up:'text-emerald-600',
    trend_dn:'text-rose-500',
  },
  amber: {
    icon:    'bg-amber-100 text-amber-600',
    border:  'border-amber-100',
    trend_up:'text-emerald-600',
    trend_dn:'text-rose-500',
  },
  rose: {
    icon:    'bg-rose-100 text-rose-600',
    border:  'border-rose-100',
    trend_up:'text-emerald-600',
    trend_dn:'text-rose-500',
  },
  sky: {
    icon:    'bg-sky-100 text-sky-600',
    border:  'border-sky-100',
    trend_up:'text-emerald-600',
    trend_dn:'text-rose-500',
  },
  violet: {
    icon:    'bg-violet-100 text-violet-600',
    border:  'border-violet-100',
    trend_up:'text-emerald-600',
    trend_dn:'text-rose-500',
  },
}

export function StatCard({ label, value, icon, trend, accent = 'indigo', onClick, className }) {
  const a = ACCENT[accent] || ACCENT.indigo
  const isUp = trend > 0
  const hasTrend = trend !== null && trend !== undefined

  return (
    <div
      onClick={onClick}
      className={cn(
        'card p-5 flex flex-col gap-3 animate-fade-in',
        onClick && 'cursor-pointer hover:shadow-lg transition-all',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500 leading-tight">{label}</p>
        {icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', a.icon)}>
            {icon}
          </div>
        )}
      </div>

      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value ?? '—'}</p>

      {hasTrend && (
        <div className="flex items-center gap-1 text-xs font-medium">
          <span className={isUp ? a.trend_up : a.trend_dn}>
            {isUp ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="text-slate-400">vs last month</span>
        </div>
      )}
    </div>
  )
}
