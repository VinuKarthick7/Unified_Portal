import { cn } from '../../lib/cn'

/**
 * PageHeader — top of page chrome.
 *
 * Props:
 *   title        string      — page title
 *   subtitle     string      — optional supporting text
 *   breadcrumbs  [{label, href}]  — optional breadcrumb trail
 *   actions      ReactNode   — right-side buttons / controls
 */
export function PageHeader({ title, subtitle, breadcrumbs, actions, className }) {
  return (
    <div className={cn('flex flex-col gap-1 mb-6', className)}>
      {breadcrumbs?.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-slate-300">/</span>}
              {crumb.href
                ? <a href={crumb.href} className="hover:text-indigo-600 transition-colors">{crumb.label}</a>
                : <span className="text-slate-400">{crumb.label}</span>
              }
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      <div className="mt-4 h-px bg-slate-200" />
    </div>
  )
}
