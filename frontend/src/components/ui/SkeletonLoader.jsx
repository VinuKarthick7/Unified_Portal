import { cn } from '../../lib/cn'

/**
 * Skeleton loader — replaces spinners for loading states.
 * Usage: <SkeletonLoader rows={4} /> or <SkeletonLoader card />
 */
export function SkeletonLoader({ rows = 3, card = false, variant, className }) {
  const isCard = card || variant === 'card'
  if (isCard) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-8 w-8 rounded-full" />
            </div>
            <div className="skeleton h-8 w-16" />
            <div className="skeleton h-3 w-20" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-4">
          <div className="skeleton h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
          <div className="skeleton h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Single block skeleton — flexible building block */
export function SkeletonBlock({ height = 'h-4', width = 'w-full', className }) {
  return <div className={cn('skeleton', height, width, className)} />
}
