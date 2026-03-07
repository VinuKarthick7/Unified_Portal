import { cn } from '../../lib/cn'

/**
 * EmptyState — placeholder when a list has no data.
 *
 * Props:
 *   icon        ReactNode   — Lucide icon (rendered large, muted)
 *   title       string      — short heading
 *   description string      — supporting text
 *   actionLabel string      — CTA button text (optional)
 *   onAction    function    — CTA click handler
 *   compact     bool        — smaller variant for cards/panels
 */
export function EmptyState({ icon, title, description, actionLabel, onAction, compact = false, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      {icon && (
        <div className={cn(
          'rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4',
          compact ? 'w-12 h-12' : 'w-16 h-16'
        )}>
          {icon}
        </div>
      )}
      <p className={cn('font-semibold text-slate-700', compact ? 'text-sm' : 'text-base')}>{title}</p>
      {description && (
        <p className={cn('text-slate-500 mt-1 max-w-xs', compact ? 'text-xs' : 'text-sm')}>{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
