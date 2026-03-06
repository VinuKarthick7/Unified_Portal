/**
 * NotificationBell.jsx
 * Drop-in bell icon with unread badge, dropdown panel, mark-read, and mark-all-read.
 * Polls unread count every 60 seconds while mounted.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, getUnreadCount, markRead, markAllRead } from '../api/notifications'

// ── Category styling ────────────────────────────────────────────────────────
const CAT_META = {
  TASK:        { dot: 'bg-indigo-500', icon: '📝' },
  HANDLING:    { dot: 'bg-green-500',  icon: '📋' },
  SWAP:        { dot: 'bg-amber-500',  icon: '🔄' },
  EXTRA_CLASS: { dot: 'bg-purple-500', icon: '📅' },
  APPRAISAL:   { dot: 'bg-pink-500',   icon: '📊' },
  SYSTEM:      { dot: 'bg-gray-400',   icon: '🔔' },
}

// ── Relative-time helper ───────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)       return `${diff}s ago`
  if (diff < 3600)     return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800)   return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ── Main component ─────────────────────────────────────────────────────────
export default function NotificationBell() {
  const navigate = useNavigate()
  const panelRef = useRef(null)

  const [count,    setCount]   = useState(0)
  const [items,    setItems]   = useState([])
  const [open,     setOpen]    = useState(false)
  const [loading,  setLoading] = useState(false)

  // Poll unread count
  const refreshCount = useCallback(() => {
    getUnreadCount()
      .then(({ data }) => setCount(data.count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 60_000)
    return () => clearInterval(interval)
  }, [refreshCount])

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    function onOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  // Open bell: fetch list
  const toggleOpen = () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    getNotifications()
      .then(({ data }) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // Mark single read + navigate
  const handleItem = async (item) => {
    if (!item.is_read) {
      await markRead(item.id).catch(() => {})
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n))
      setCount(c => Math.max(0, c - 1))
    }
    setOpen(false)
    if (item.target_url) navigate(item.target_url)
  }

  // Mark all read
  const handleMarkAll = async () => {
    await markAllRead().catch(() => {})
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    setCount(0)
  }

  const unreadItems   = items.filter(n => !n.is_read)
  const hasUnread     = count > 0

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        {/* Bell SVG */}
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* Unread badge */}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">
              Notifications
              {hasUnread > 0 && (
                <span className="ml-2 text-xs text-red-500">({count} unread)</span>
              )}
            </span>
            {unreadItems.length > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-gray-200 mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-2 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                <p className="text-2xl mb-1">🔔</p>
                No notifications yet
              </div>
            ) : (
              items.map((item) => {
                const meta = CAT_META[item.category] ?? CAT_META.SYSTEM
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItem(item)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors ${
                      !item.is_read ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Dot */}
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      item.is_read ? 'bg-gray-200' : meta.dot
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${
                        item.is_read ? 'text-gray-500' : 'text-gray-800 font-medium'
                      }`}>
                        {meta.icon} {item.verb}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(item.created_at)}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2 text-center">
              <span className="text-xs text-gray-400">Showing last {items.length} notifications</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
