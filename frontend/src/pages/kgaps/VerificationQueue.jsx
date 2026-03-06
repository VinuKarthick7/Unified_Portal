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
        <div className="space-y-4">
          {items.map((item) => {
            const mat = item.material
            const isActionable = activeStatus === 'PENDING'
            return (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">
                        {mat?.title}
                      </span>
                      <Badge
                        label={mat?.material_type}
                        variant="info"
                      />
                      <Badge
                        label={item.status}
                        variant={item.status.toLowerCase()}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Topic: <span className="font-medium">{mat?.topic?.topic_title ?? `#${mat?.topic}`}</span>
                      {' · '}Uploaded by: <span className="font-medium">{mat?.uploaded_by_name}</span>
                    </p>
                    {item.remarks && (
                      <p className="text-xs text-gray-500 mt-1">
                        Remarks: <span className="italic">{item.remarks}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {mat?.file_url && (
                      <a
                        href={mat.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                      >
                        View File
                      </a>
                    )}
                    {mat?.external_url && (
                      <a
                        href={mat.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                      >
                        Open Link
                      </a>
                    )}
                  </div>
                </div>

                {isActionable && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <input
                      type="text"
                      placeholder="Remarks (optional)"
                      value={remarksMap[item.id] ?? ''}
                      onChange={(e) =>
                        setRemarksMap((p) => ({ ...p, [item.id]: e.target.value }))
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(item.id, 'APPROVED')}
                        disabled={actionLoading === item.id + 'APPROVED'}
                        className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === item.id + 'APPROVED' ? 'Saving…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'REJECTED')}
                        disabled={actionLoading === item.id + 'REJECTED'}
                        className="bg-red-50 text-red-700 border border-red-200 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                      >
                        {actionLoading === item.id + 'REJECTED' ? 'Saving…' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
