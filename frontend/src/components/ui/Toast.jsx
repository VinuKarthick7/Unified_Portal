import { createContext, useCallback, useContext, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '../../lib/cn'

/* ── Context ─────────────────────────────────────────── */
const ToastContext = createContext(null)

const ICONS = {
  success: <CheckCircle className="w-4 h-4" />,
  error:   <XCircle    className="w-4 h-4" />,
  info:    <Info       className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
}

const COLORS = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error:   'bg-rose-50    border-rose-200    text-rose-800',
  info:    'bg-indigo-50  border-indigo-200  text-indigo-800',
  warning: 'bg-amber-50   border-amber-200   text-amber-800',
}

const ICON_COLORS = {
  success: 'text-emerald-500',
  error:   'text-rose-500',
  info:    'text-indigo-500',
  warning: 'text-amber-500',
}

/* ── Single Toast item ───────────────────────────────── */
function ToastItem({ id, type = 'info', message, onDismiss }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 w-80 rounded-xl border px-4 py-3 shadow-lg',
        'animate-slide-in-right',
        COLORS[type]
      )}
    >
      <span className={cn('mt-0.5 flex-shrink-0', ICON_COLORS[type])}>{ICONS[type]}</span>
      <p className="text-sm font-medium flex-1 leading-snug">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

/* ── Provider ────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  /* Expose addToast so each helper (success/error/…) can call it */
  const addToast = useCallback((type, message, duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const dismiss = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const ctx = {
    success: (msg, dur) => addToast('success', msg, dur),
    error:   (msg, dur) => addToast('error',   msg, dur),
    info:    (msg, dur) => addToast('info',    msg, dur),
    warning: (msg, dur) => addToast('warning', msg, dur),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {createPortal(
        <div id="toast-root" className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem {...t} onDismiss={dismiss} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

/* ── Hook ────────────────────────────────────────────── */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
