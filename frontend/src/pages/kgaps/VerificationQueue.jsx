import { useState, useEffect, useCallback } from 'react'
import { getVerificationQueue, verifyMaterial } from '../../api/kgaps'
import Badge from '../../components/Badge'

const STATUS_TABS = ['PENDING', 'APPROVED', 'REJECTED']

export default function VerificationQueue() {
  const [activeStatus, setActiveStatus] = useState('PENDING')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [remarksMap, setRemarksMap] = useState({})
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getVerificationQueue(activeStatus)
      setItems(data)
    } catch {
      setError('Failed to load verification queue.')
    } finally {
      setLoading(false)
    }
  }, [activeStatus])

  useEffect(() => { load() }, [load])

  const handleAction = async (verificationId, newStatus) => {
    setActionLoading(verificationId + newStatus)
    try {
      await verifyMaterial(verificationId, {
        status: newStatus,
        remarks: remarksMap[verificationId] ?? '',
      })
      load()
    } catch {
      setError('Action failed. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Material Verification Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve or reject faculty-uploaded materials.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">Pending: {items.filter(i => i.status === 'PENDING').length}</div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">Approved: {items.filter(i => i.status === 'APPROVED').length}</div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">Rejected: {items.filter(i => i.status === 'REJECTED').length}</div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Status tabs */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setActiveStatus(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeStatus === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          No {activeStatus.toLowerCase()} materials.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Topic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Faculty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Material</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const mat = item.material_detail
            const isActionable = activeStatus === 'PENDING'
            return (
              <tr key={item.id}>
                <td className="px-4 py-3 text-gray-700">{mat?.topic_title ?? `#${mat?.topic}`}</td>
                <td className="px-4 py-3 text-gray-700">{mat?.uploaded_by_name || 'Unknown'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{mat?.title}</span>
                    <Badge label={mat?.material_type} variant="info" />
                  </div>
                </td>
                <td className="px-4 py-3"><Badge label={item.status} variant={item.status.toLowerCase()} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {mat?.file_url && (
                      <a href={mat.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View File</a>
                    )}
                    {mat?.external_url && (
                      <a href={mat.external_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Open Link</a>
                    )}
                    {isActionable && (
                      <>
                        <input
                          type="text"
                          placeholder="Remarks"
                          value={remarksMap[item.id] ?? ''}
                          onChange={(e) => setRemarksMap((p) => ({ ...p, [item.id]: e.target.value }))}
                          className="border border-gray-200 rounded px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => handleAction(item.id, 'APPROVED')}
                          disabled={actionLoading === item.id + 'APPROVED'}
                          className="bg-green-600 text-white px-2.5 py-1 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === item.id + 'APPROVED' ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'REJECTED')}
                          disabled={actionLoading === item.id + 'REJECTED'}
                          className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                        >
                          {actionLoading === item.id + 'REJECTED' ? '...' : 'Reject'}
                        </button>
                      </>
                    )}
                  </div>
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
