import { useState, useEffect, useCallback } from 'react'
import { getHandlingVerificationQueue, verifyHandling } from '../../api/kgaps_handling'
import Badge from '../../components/Badge'

const TABS = ['PENDING', 'APPROVED', 'REJECTED']
const VARIANT = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' }

function EntryCard({ entry, onAction }) {
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(null) // 'APPROVED' | 'REJECTED'

  const handle = async (status) => {
    setLoading(status)
    try {
      await verifyHandling(entry.id, { status, remarks })
      onAction()
    } catch (err) {
      alert(err.response?.data?.detail || 'Action failed.')
    } finally {
      setLoading(null)
    }
  }

  const isPending = entry.status === 'PENDING'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-800 text-sm">
            {entry.faculty_name}
          </p>
          <p className="text-xs text-gray-500">{entry.course_code} — Sec {entry.section}</p>
        </div>
        <Badge label={entry.status} variant={VARIANT[entry.status]} />
      </div>

      {/* Topic detail */}
      <div className="text-sm text-gray-700">
        <span className="text-xs text-gray-400">{entry.unit_title} › </span>
        <span className="font-medium">{entry.topic_title}</span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{entry.date}</span>
        <span>{entry.hours_handled}h</span>
        {entry.is_auto_generated && (
          <span className="text-indigo-500" title="Auto-generated from daily schedule">⚡ auto</span>
        )}
      </div>

      {/* Notes */}
      {entry.notes && (
        <p className="text-xs text-gray-500 italic">"{entry.notes}"</p>
      )}

      {/* HOD remarks / actions (only for PENDING) */}
      {isPending && (
        <>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks (optional)…"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handle('APPROVED')}
              disabled={!!loading}
              className="flex-1 bg-green-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading === 'APPROVED' ? 'Approving…' : 'Approve'}
            </button>
            <button
              onClick={() => handle('REJECTED')}
              disabled={!!loading}
              className="flex-1 bg-red-100 text-red-700 rounded-lg py-1.5 text-sm font-medium hover:bg-red-200 disabled:opacity-50"
            >
              {loading === 'REJECTED' ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </>
      )}

      {/* Show existing remarks for non-pending */}
      {!isPending && entry.remarks && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 italic">
          {entry.remarks}
        </p>
      )}
    </div>
  )
}

export default function HandlingVerificationInbox() {
  const [activeTab, setActiveTab] = useState('PENDING')
  const [allEntries, setAllEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getHandlingVerificationQueue()
      setAllEntries(data)
    } catch {
      setAllEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const visible = allEntries.filter((e) => e.status === activeTab)
  const counts = Object.fromEntries(
    TABS.map((t) => [t, allEntries.filter((e) => e.status === t).length])
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Handling Verification</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and verify faculty teaching log entries.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {counts[tab] > 0 && (
              <span
                className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                  tab === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-700'
                    : tab === 'APPROVED'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-14 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          No {activeTab.toLowerCase()} entries.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onAction={load} />
          ))}
        </div>
      )}
    </div>
  )
}
