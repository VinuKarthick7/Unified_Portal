import { useState } from 'react'
import Badge from '../Badge'
import MaterialUploadModal from './MaterialUploadModal'
import { deleteMaterial } from '../../api/kgaps'
import { useAuth } from '../../context/AuthContext'

const TYPE_COLORS = {
  PPT: 'bg-indigo-100 text-indigo-700',
  NOTES: 'bg-green-100 text-green-700',
  LAB: 'bg-orange-100 text-orange-700',
  VIDEO: 'bg-pink-100 text-pink-700',
  REFERENCE: 'bg-gray-100 text-gray-700',
}

function TopicRow({ topic, onRefresh }) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)

  const canUpload = ['FACULTY', 'ADMIN', 'COORDINATOR'].includes(user?.role)

  const handleDelete = async (matId) => {
    if (!confirm('Delete this material?')) return
    await deleteMaterial(matId)
    onRefresh()
  }

  return (
    <div className="border border-gray-100 rounded-lg mb-2">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
      >
        <span className="text-sm font-medium text-gray-800">{topic.topic_title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{topic.materials?.length ?? 0} material(s)</span>
          <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {topic.description && (
            <p className="text-xs text-gray-500 mb-3">{topic.description}</p>
          )}

          {/* Materials list */}
          {topic.materials?.length > 0 ? (
            <div className="space-y-2 mb-3">
              {topic.materials.map((mat) => (
                <div
                  key={mat.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${TYPE_COLORS[mat.material_type]}`}>
                      {mat.material_type}
                    </span>
                    <span className="text-sm text-gray-700 truncate">{mat.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge
                      label={mat.verification_status ?? 'PENDING'}
                      variant={(mat.verification_status ?? 'pending').toLowerCase()}
                    />
                    {mat.file_url && (
                      <a
                        href={mat.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    )}
                    {mat.external_url && (
                      <a
                        href={mat.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Open
                      </a>
                    )}
                    {canUpload && (
                      <button
                        onClick={() => handleDelete(mat.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-3">No materials uploaded yet.</p>
          )}

          {canUpload && (
            <button
              onClick={() => setUploading(true)}
              className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium"
            >
              + Upload Material
            </button>
          )}
        </div>
      )}

      {uploading && (
        <MaterialUploadModal
          topic={topic}
          onClose={() => setUploading(false)}
          onSuccess={() => { setUploading(false); onRefresh() }}
        />
      )}
    </div>
  )
}


export default function SyllabusTree({ units, onRefresh }) {
  const [openUnits, setOpenUnits] = useState({})

  const toggleUnit = (id) =>
    setOpenUnits((p) => ({ ...p, [id]: !p[id] }))

  if (!units?.length) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No units defined for this course yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {units.map((unit) => (
        <div key={unit.id} className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleUnit(unit.id)}
            className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {unit.unit_number}
              </span>
              <span className="font-semibold text-gray-800">{unit.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{unit.topics?.length ?? 0} topic(s)</span>
              <span className="text-gray-400">{openUnits[unit.id] ? '▲' : '▼'}</span>
            </div>
          </button>

          {openUnits[unit.id] && (
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
              {unit.description && (
                <p className="text-xs text-gray-500 mb-3">{unit.description}</p>
              )}
              {unit.topics?.length > 0 ? (
                unit.topics.map((topic) => (
                  <TopicRow key={topic.id} topic={topic} onRefresh={onRefresh} />
                ))
              ) : (
                <p className="text-xs text-gray-400">No topics in this unit.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
