/**
 * Notifications.jsx — Full notifications centre.
 * Shows all user notifications, grouped by date, with mark-read and filter tabs.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markRead, markAllRead } from '../../api/notifications'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonLoader } from '../../components/ui/SkeletonLoader'

/* ── Colour/icon map by category ─────────────────────────── */
const CAT_META = {
  TASK:        { label: 'Task',        dot: 'bg-indigo-500',  bg: 'bg-indigo-50',  text: 'text-indigo-700'  },
  SWAP:        { label: 'Swap',        dot: 'bg-sky-500',     bg: 'bg-sky-50',     text: 'text-sky-700'     },
  APPRAISAL:   { label: 'Appraisal',   dot: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700'  },
  KGAPS:       { label: 'KG-APS',      dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  SYSTEM:      { label: 'System',      dot: 'bg-slate-400',   bg: 'bg-slate-50',   text: 'text-slate-600'   },
}
function catMeta(cat) { return CAT_META[cat] ?? CAT_META.SYSTEM }

/* ── Group notifications by date label ────────────────────── */
function groupByDate(items) {
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const groups = {}
  items.forEach(n => {
    const d = new Date(n.created_at); d.setHours(0,0,0,0)
    let key
    if (d.getTime() === today.getTime()) key = 'Today'
    else if (d.getTime() === yesterday.getTime()) key = 'Yesterday'
    else key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  })
  return groups
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const TABS = ['All', 'Unread', 'Task', 'Swap', 'Appraisal', 'KG-APS', 'System']

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All')
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getNotifications()
      .then(({ data }) => setNotifications(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleMarkRead = async id => {
    try {
      await markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {}
  }

  const handleMarkAll = async () => {
    setMarkingAll(true)
    try {
      await markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {}
    setMarkingAll(false)
  }

  const handleClick = n => {
    if (!n.is_read) handleMarkRead(n.id)
    if (n.target_url) navigate(n.target_url)
  }

  /* Filter */
  const filtered = notifications.filter(n => {
    if (tab === 'All') return true
    if (tab === 'Unread') return !n.is_read
    return n.category === tab.toUpperCase().replace('KG-APS', 'KGAPS')
  })

  const grouped = groupByDate(filtered)
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        actions={
          unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markingAll}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tab === t
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t}
            {t === 'Unread' && unreadCount > 0 && (
              <span className="ml-1.5 inline-block bg-white/30 px-1.5 rounded-full">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonLoader variant="list" rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>}
          title="No notifications"
          description={tab !== 'All' ? `No ${tab.toLowerCase()} notifications` : "You're all caught up!"}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{date}</p>
              <div className="card divide-y divide-slate-100 overflow-hidden p-0">
                {items.map(n => {
                  const meta = catMeta(n.category)
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`flex gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-slate-50 ${
                        !n.is_read ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Dot */}
                      <div className="mt-1.5 flex-shrink-0">
                        <span className={`block w-2 h-2 rounded-full ${!n.is_read ? meta.dot : 'bg-slate-300'}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.bg} ${meta.text}`}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
