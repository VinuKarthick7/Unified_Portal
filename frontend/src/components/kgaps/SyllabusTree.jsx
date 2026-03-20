import { useEffect, useMemo, useState } from 'react'
import Badge from '../Badge'
import MaterialUploadModal from './MaterialUploadModal'
import {
  createUnit,
  updateUnit,
  deleteUnit,
  createTopic,
  updateTopic,
  deleteTopic,
  deleteMaterial,
  createTopicAssignment,
  deleteTopicAssignment,
} from '../../api/kgaps'
import { getFacultyList } from '../../api/core'
import { useAuth } from '../../context/AuthContext'

const STATUS_LABEL = {
  NOT_UPLOADED: 'Not Uploaded',
  PENDING_VERIFICATION: 'Pending Verification',
  VERIFIED: 'Verified',
}

const STATUS_STYLE = {
  NOT_UPLOADED: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_VERIFICATION: 'bg-blue-50 text-blue-700 border-blue-200',
  VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function UnitModal({ courseId, unit, onClose, onSaved }) {
  const isEdit = !!unit
  const [form, setForm] = useState({
    unit_number: unit?.unit_number ?? '',
    title: unit?.title ?? '',
    description: unit?.description ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        course: courseId,
        unit_number: Number(form.unit_number),
        title: form.title.trim(),
        description: form.description.trim(),
      }
      if (isEdit) await updateUnit(unit.id, payload)
      else await createUnit(payload)
      onSaved()
    } catch (err) {
      const data = err.response?.data
      if (data?.non_field_errors?.length) {
        setError(data.non_field_errors[0])
      } else if (data?.unit_number?.length) {
        setError(data.unit_number[0])
      } else {
        setError(data?.detail || 'Failed to save unit.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 mb-3">{isEdit ? 'Edit Unit' : 'Add Unit'}</h3>
        {error && <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            type="number"
            min="1"
            value={form.unit_number}
            onChange={(e) => setForm((p) => ({ ...p, unit_number: e.target.value }))}
            placeholder="Unit number"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Unit title"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            required
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TopicModal({ unitId, topic, onClose, onSaved }) {
  const isEdit = !!topic
  const [form, setForm] = useState({
    topic_title: topic?.topic_title ?? '',
    description: topic?.description ?? '',
    planned_hours: topic?.planned_hours ?? '1',
    learning_outcome: topic?.learning_outcome ?? '',
    order: topic?.order ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        unit: unitId,
        topic_title: form.topic_title.trim(),
        description: form.description.trim(),
        planned_hours: parseFloat(form.planned_hours) || 1,
        learning_outcome: form.learning_outcome.trim(),
        ...(form.order ? { order: Number(form.order) } : {}),
      }
      if (isEdit) await updateTopic(topic.id, payload)
      else await createTopic(payload)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save topic.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 mb-3">{isEdit ? 'Edit Topic' : 'Add Topic'}</h3>
        {error && <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            type="text"
            value={form.topic_title}
            onChange={(e) => setForm((p) => ({ ...p, topic_title: e.target.value }))}
            placeholder="Topic title"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={form.planned_hours}
              onChange={(e) => setForm((p) => ({ ...p, planned_hours: e.target.value }))}
              placeholder="Planned hours"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="number"
              min="1"
              value={form.order}
              onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
              placeholder="Order"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description"
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            value={form.learning_outcome}
            onChange={(e) => setForm((p) => ({ ...p, learning_outcome: e.target.value }))}
            placeholder="Learning outcome"
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AssignmentPicker({ topicId, assignedFacultyIds, onDone }) {
  const [faculty, setFaculty] = useState([])
  const [selectedFaculty, setSelectedFaculty] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getFacultyList({ role: 'FACULTY' }).then(({ data }) => setFaculty(data)).catch(() => setFaculty([]))
  }, [])

  const available = faculty.filter((f) => !assignedFacultyIds.includes(f.id))

  const assign = async () => {
    if (!selectedFaculty) return
    setLoading(true)
    try {
      await createTopicAssignment({ topic: topicId, faculty: Number(selectedFaculty) })
      setSelectedFaculty('')
      onDone()
    } finally {
      setLoading(false)
    }
  }

  if (available.length === 0) {
    return <span className="text-xs text-gray-500">No additional faculty available</span>
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedFaculty}
        onChange={(e) => setSelectedFaculty(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
      >
        <option value="">Assign faculty</option>
        {available.map((f) => (
          <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
        ))}
      </select>
      <button onClick={assign} disabled={!selectedFaculty || loading} className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50">
        {loading ? '...' : 'Assign'}
      </button>
    </div>
  )
}

function TopicStatusCell({ topic, isFaculty }) {
  if (isFaculty) {
    const key = topic.my_upload_status || 'NOT_UPLOADED'
    return (
      <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[key] || STATUS_STYLE.NOT_UPLOADED}`}>
        {STATUS_LABEL[key] || STATUS_LABEL.NOT_UPLOADED}
      </span>
    )
  }

  if (!topic.assignments?.length) {
    return <span className="text-xs text-gray-500">No faculty assigned</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {topic.assignments.map((a) => {
        const key = a.status || 'NOT_UPLOADED'
        return (
          <span key={a.id} className={`inline-flex rounded border px-2 py-0.5 text-xs ${STATUS_STYLE[key] || STATUS_STYLE.NOT_UPLOADED}`}>
            {a.faculty_name}: {STATUS_LABEL[key] || STATUS_LABEL.NOT_UPLOADED}
          </span>
        )
      })}
    </div>
  )
}

export default function SyllabusTree({ units, onRefresh, onMaterialUploaded, courseId, isCoordinator }) {
  const { user } = useAuth()
  const isFaculty = user?.role === 'FACULTY'
  const canUpload = ['FACULTY', 'ADMIN'].includes(user?.role)
  const canManageUnits = user?.role === 'ADMIN'
  const canManageTopics = ['COORDINATOR', 'ADMIN'].includes(user?.role)

  const [addingUnit, setAddingUnit] = useState(false)
  const [editingUnit, setEditingUnit] = useState(null)
  const [addingTopicToUnit, setAddingTopicToUnit] = useState(null)
  const [editingTopic, setEditingTopic] = useState(null)
  const [uploadTopic, setUploadTopic] = useState(null)
  const [editMaterial, setEditMaterial] = useState(null)
  const [topicQuery, setTopicQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const rows = useMemo(() => {
    const out = []
    ;(units ?? []).forEach((unit) => {
      ;(unit.topics ?? []).forEach((topic) => out.push({ unit, topic }))
    })
    return out
  }, [units])

  const filteredRows = useMemo(() => {
    const q = topicQuery.trim().toLowerCase()
    return rows.filter(({ unit, topic }) => {
      if (q) {
        const hay = `${unit.title} ${topic.topic_title} ${topic.learning_outcome || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (statusFilter !== 'ALL') {
        if (isFaculty) {
          const myStatus = topic.my_upload_status || 'NOT_UPLOADED'
          if (myStatus !== statusFilter) return false
        } else {
          const assigned = topic.assignments ?? []
          if (!assigned.some((a) => (a.status || 'NOT_UPLOADED') === statusFilter)) return false
        }
      }
      return true
    })
  }, [rows, topicQuery, statusFilter, isFaculty])

  const stats = useMemo(() => {
    const allTopics = rows.length
    const withMaterials = rows.filter(({ topic }) => (topic.materials ?? []).length > 0).length
    const assignedTopics = rows.filter(({ topic }) => (topic.assignments ?? []).length > 0).length
    return { allTopics, withMaterials, assignedTopics }
  }, [rows])

  const removeMaterial = async (id) => {
    if (!confirm('Delete this material?')) return
    await deleteMaterial(id)
    onRefresh()
  }

  const removeTopic = async (id) => {
    if (!confirm('Delete this topic?')) return
    await deleteTopic(id)
    onRefresh()
  }

  const removeUnit = async (id) => {
    if (!confirm('Delete this unit and all topics?')) return
    await deleteUnit(id)
    onRefresh()
  }

  const removeAssignment = async (id) => {
    if (!confirm('Remove this assignment?')) return
    await deleteTopicAssignment(id)
    onRefresh()
  }

  if (!rows.length && !canManageTopics) {
    return <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">No topics found.</div>
  }

  return (
    <div className="space-y-4">
      {canManageUnits && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setAddingUnit(true)} className="rounded border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">+ Add Unit</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Topics</div>
          <div className="text-lg font-semibold text-gray-800">{stats.allTopics}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Assigned</div>
          <div className="text-lg font-semibold text-gray-800">{stats.assignedTopics}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">With Material</div>
          <div className="text-lg font-semibold text-gray-800">{stats.withMaterials}</div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={topicQuery}
            onChange={(e) => setTopicQuery(e.target.value)}
            placeholder="Search by unit/topic/learning outcome"
            className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="NOT_UPLOADED">Not Uploaded</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="VERIFIED">Verified</option>
          </select>
          {(topicQuery || statusFilter !== 'ALL') && (
            <button
              onClick={() => { setTopicQuery(''); setStatusFilter('ALL') }}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="max-h-[68vh] overflow-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Unit</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Topic</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Planned</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Assignment / Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Materials</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRows.map(({ unit, topic }, idx) => (
              <tr key={topic.id} className={idx % 2 ? 'bg-white' : 'bg-gray-50/30'}>
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-gray-900">Unit {unit.unit_number}</div>
                  <div className="text-xs text-gray-600">{unit.title}</div>
                  {canManageUnits && (
                    <div className="mt-1 flex gap-2 text-xs">
                      <button onClick={() => setEditingUnit(unit)} className="text-indigo-600 hover:underline">Edit</button>
                      <button onClick={() => removeUnit(unit.id)} className="text-red-600 hover:underline">Delete</button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-gray-900">{topic.topic_title}</div>
                  {topic.learning_outcome && <div className="mt-1 text-xs text-gray-600">{topic.learning_outcome}</div>}
                  {canManageTopics && (
                    <div className="mt-1 flex gap-2 text-xs">
                      <button onClick={() => setEditingTopic(topic)} className="text-indigo-600 hover:underline">Edit</button>
                      <button onClick={() => removeTopic(topic.id)} className="text-red-600 hover:underline">Delete</button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-gray-700">{topic.planned_hours}h</td>
                <td className="px-4 py-3 align-top">
                  <TopicStatusCell topic={topic} isFaculty={isFaculty} />
                  {canManageTopics && (
                    <div className="mt-2 space-y-1">
                      {(topic.assignments ?? []).map((a) => (
                        <div key={a.id} className="flex items-center gap-2 text-xs text-gray-700">
                          <span>{a.faculty_name}</span>
                          <button onClick={() => removeAssignment(a.id)} className="text-red-600 hover:underline">remove</button>
                        </div>
                      ))}
                      <AssignmentPicker
                        topicId={topic.id}
                        assignedFacultyIds={(topic.assignments ?? []).map((a) => a.faculty)}
                        onDone={onRefresh}
                      />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {(topic.materials ?? []).length === 0 ? (
                    <span className="text-xs text-gray-500">No material</span>
                  ) : (
                    <div className="space-y-1">
                      {(topic.materials ?? []).map((m) => (
                        <div key={m.id} className="flex items-center gap-2 text-xs">
                          <Badge label={m.material_type} variant="info" />
                          <span className="truncate text-gray-700">{m.title}</span>
                          {m.file_url && <a href={m.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">file</a>}
                          {m.external_url && <a href={m.external_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">link</a>}
                          {canUpload && <button onClick={() => setEditMaterial(m)} className="text-indigo-600 hover:underline">edit</button>}
                          {canUpload && <button onClick={() => removeMaterial(m.id)} className="text-red-600 hover:underline">delete</button>}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-1 text-xs">
                    {canUpload && (
                      <button onClick={() => setUploadTopic(topic)} className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">Upload</button>
                    )}
                    {canManageTopics && (
                      <button onClick={() => setAddingTopicToUnit(unit.id)} className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700">+ Topic</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  No topics match current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {addingUnit && (
        <UnitModal courseId={courseId} onClose={() => setAddingUnit(false)} onSaved={() => { setAddingUnit(false); onRefresh() }} />
      )}
      {editingUnit && (
        <UnitModal courseId={courseId} unit={editingUnit} onClose={() => setEditingUnit(null)} onSaved={() => { setEditingUnit(null); onRefresh() }} />
      )}
      {addingTopicToUnit && (
        <TopicModal unitId={addingTopicToUnit} onClose={() => setAddingTopicToUnit(null)} onSaved={() => { setAddingTopicToUnit(null); onRefresh() }} />
      )}
      {editingTopic && (
        <TopicModal unitId={editingTopic.unit} topic={editingTopic} onClose={() => setEditingTopic(null)} onSaved={() => { setEditingTopic(null); onRefresh() }} />
      )}
      {uploadTopic && (
        <MaterialUploadModal
          topic={uploadTopic}
          onClose={() => setUploadTopic(null)}
          onSuccess={() => {
            setUploadTopic(null)
            onRefresh()
            onMaterialUploaded?.()
          }}
        />
      )}
      {editMaterial && (
        <MaterialUploadModal
          editMaterial={editMaterial}
          onClose={() => setEditMaterial(null)}
          onSuccess={() => {
            setEditMaterial(null)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
