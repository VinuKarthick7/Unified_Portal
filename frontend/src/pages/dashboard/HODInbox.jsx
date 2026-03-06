/**
 * HODInbox.jsx — Unified pending-action inbox for HOD / Admin.
 * Shows: handling verifications, swap requests, extra classes, appraisals
 *        needing review, and overdue tasks — all from one view.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHODInbox } from '../../api/analytics'

const TYPE_META = {
  handling_verification: { label: 'Handling Verification', color: 'bg-cyan-100 text-cyan-700',   icon: '📋' },
  swap_request:          { label: 'Swap Request',           color: 'bg-amber-100 text-amber-700', icon: '🔄' },
  extra_class:           { label: 'Extra Class',            color: 'bg-purple-100 text-purple-700', icon: '📅' },
  appraisal:             { label: 'Appraisal',              color: 'bg-pink-100 text-pink-700',   icon: '📊' },
  task:                  { label: 'Overdue Task',           color: 'bg-red-100 text-red-700',     icon: '⚠️' },
}

const ALL_TABS = ['all', 'handling_verification', 'swap_request', 'extra_class', 'appraisal', 'task']
const TAB_LABELS = {
  all: 'All',
  handling_verification: 'Handling',
  swap_request: 'Swaps',
  extra_class: 'Extra Classes',
  appraisal: 'Appraisals',
  task: 'Overdue Tasks',
}

function InboxItem({ item, onClick }) {
  const meta = TYPE_META[item.type] || { label: item.type, color: 'bg-gray-100 text-gray-600', icon: '•' }
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all"
    >
      <span className="text-2xl w-8 text-center shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
          {meta.label}
        </span>
        {item.date && (
          <span className="text-xs text-gray-400">{item.date}</span>
        )}
      </div>
    </div>
  )
}

export default function HODInbox() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  const load = useCallback(() => {
    setLoading(true)
    getHODInbox()
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Flatten all items for "All" tab
  const allItems = data ? [
    ...data.items.handling_verifications,
    ...data.items.swap_requests,
    ...data.items.extra_classes,
    ...data.items.appraisals,
    ...data.items.overdue_tasks,
  ] : []

  const itemsByTab = {
    all: allItems,
    handling_verification: data?.items.handling_verifications ?? [],
    swap_request:          data?.items.swap_requests ?? [],
    extra_class:           data?.items.extra_classes ?? [],
    appraisal:             data?.items.appraisals ?? [],
    task:                  data?.items.overdue_tasks ?? [],
  }

  const visibleItems = itemsByTab[activeTab] ?? []
  const counts = data?.counts ?? {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</button>
        <h1 className="text-lg font-semibold text-gray-800 flex-1">HOD Action Inbox</h1>
        {data && (
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            counts.total > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {counts.total} pending
          </span>
        )}
        <button onClick={load} className="text-xs text-blue-600 hover:text-blue-800">↻ Refresh</button>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-4">

        {/* Summary counts */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <div
                key={key}
                onClick={() => setActiveTab(key)}
                className={`rounded-xl p-3 border cursor-pointer transition-all ${
                  activeTab === key
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className="text-lg font-bold text-gray-800">
                  {counts[key === 'task' ? 'overdue_tasks' : key === 'handling_verification' ? 'handling_verification' : key + 's'] ?? counts[key] ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{meta.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {ALL_TABS.map((tab) => {
            const count = tab === 'all' ? counts.total : itemsByTab[tab]?.length ?? 0
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {TAB_LABELS[tab]}
                {count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Items list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-medium">All clear!</p>
            <p className="text-sm">No pending items in this category.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleItems.map((item, idx) => (
              <InboxItem
                key={`${item.type}-${item.id}-${idx}`}
                item={item}
                onClick={() => item.url && navigate(item.url)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
