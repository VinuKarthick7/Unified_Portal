import { useState, useEffect, useCallback } from 'react'
import { getHandlingVerificationQueue, verifyHandling } from '../../api/kgaps_handling'
import Badge from '../../components/Badge'

const TABS = ['PENDING', 'APPROVED', 'REJECTED']
const VARIANT = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' }

export default function HandlingVerificationInbox() {
  const [activeTab, setActiveTab] = useState('PENDING')
  const [allEntries, setAllEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [remarksMap, setRemarksMap] = useState({})
  const [actionLoading, setActionLoading] = useState('')

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

  const takeAction = async (entryId, status) => {
    const key = `${entryId}-${status}`
    setActionLoading(key)
    try {
      await verifyHandling(entryId, { status, remarks: remarksMap[entryId] ?? '' })
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Action failed.')
    } finally {
      setActionLoading('')
    }
  }

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

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">Pending: {counts.PENDING ?? 0}</div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">Approved: {counts.APPROVED ?? 0}</div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">Rejected: {counts.REJECTED ?? 0}</div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
      ) : visible.length === 0 ? (
        <div className="text-center py-14 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          No {activeTab.toLowerCase()} entries.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Faculty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Topic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hours</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((entry) => {
                const isPending = entry.status === 'PENDING'
                return (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium">{entry.faculty_name}</div>
                      <div className="text-xs text-gray-500">{entry.course_code} - Sec {entry.section}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{entry.topic_title}</div>
                      <div className="text-xs text-gray-500">{entry.unit_title}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{entry.date}</td>
                    <td className="px-4 py-3 text-gray-700">{entry.hours_handled}h</td>
                    <td className="px-4 py-3"><Badge label={entry.status} variant={VARIANT[entry.status]} /></td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={remarksMap[entry.id] ?? ''}
                            onChange={(e) => setRemarksMap((p) => ({ ...p, [entry.id]: e.target.value }))}
                            placeholder="Remarks"
                            className="border border-gray-200 rounded px-2 py-1 text-xs"
                          />
                          <button
                            onClick={() => takeAction(entry.id, 'APPROVED')}
                            disabled={actionLoading === `${entry.id}-APPROVED`}
                            className="bg-green-600 text-white rounded px-2.5 py-1 text-xs font-medium hover:bg-green-700"
                          >
                            {actionLoading === `${entry.id}-APPROVED` ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => takeAction(entry.id, 'REJECTED')}
                            disabled={actionLoading === `${entry.id}-REJECTED`}
                            className="bg-red-100 text-red-700 rounded px-2.5 py-1 text-xs font-medium hover:bg-red-200"
                          >
                            {actionLoading === `${entry.id}-REJECTED` ? '...' : 'Reject'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">{entry.remarks || '-'}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
