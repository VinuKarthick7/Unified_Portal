/**
 * AppraisalTemplateForm.jsx — Create or edit appraisal template + criteria (HOD/Admin)
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDepartments } from '../../api/core'
import { getTemplate, createTemplate, updateTemplate, addCriteria, updateCriteria, deleteCriteria } from '../../api/appraisal'

const emptyCriterion = () => ({ _tmp: Date.now() + Math.random(), title: '', description: '', max_score: 10, order: 0 })

export default function AppraisalTemplateForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    title: '',
    description: '',
    academic_year: '',
    department: '',
    deadline: '',
    is_active: true,
  })
  const [criteria,     setCriteria]     = useState([emptyCriterion()])
  const [savedCriteria, setSavedCriteria] = useState([])   // existing DB criteria (edit mode)
  const [departments,  setDepartments]  = useState([])
  const [loading,      setLoading]      = useState(isEdit)
  const [saving,       setSaving]       = useState(false)
  const [criteriaOps,  setCriteriaOps]  = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => {
    getDepartments().then(({ data }) => setDepartments(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    getTemplate(id)
      .then(({ data }) => {
        setForm({
          title:         data.title,
          description:   data.description,
          academic_year: data.academic_year,
          department:    data.department ?? '',
          deadline:      data.deadline ?? '',
          is_active:     data.is_active,
        })
        setSavedCriteria(data.criteria ?? [])
        setCriteria([])  // new additions start blank in edit mode
      })
      .catch(() => navigate('/appraisal'))
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate])

  const set = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(p => ({ ...p, [e.target.name]: val }))
  }

  const setC = (idx, field, value) =>
    setCriteria(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))

  const addRow = () => setCriteria(prev => [...prev, emptyCriterion()])

  const removeNewRow = (idx) => setCriteria(prev => prev.filter((_, i) => i !== idx))

  // ---- submit ---- //
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, department: form.department || null, deadline: form.deadline || null }

      if (isEdit) {
        // 1. Update template meta
        await updateTemplate(id, payload)

        // 2. Add new criteria rows
        setCriteriaOps(true)
        for (const c of criteria) {
          if (c.title.trim()) {
            await addCriteria(id, { title: c.title, description: c.description, max_score: Number(c.max_score), order: Number(c.order) })
          }
        }
        navigate(`/appraisal`)
      } else {
        // For create: send criteria inline (handled by write serializer)
        const fullPayload = {
          ...payload,
          criteria: criteria.filter(c => c.title.trim()).map(c => ({
            title: c.title, description: c.description, max_score: Number(c.max_score), order: Number(c.order),
          })),
        }
        await createTemplate(fullPayload)
        navigate('/appraisal')
      }
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Save failed.')
    } finally {
      setSaving(false)
      setCriteriaOps(false)
    }
  }

  // Edit mode inline criteria edit/delete
  const handleSavedCriteriaEdit = async (crit) => {
    try {
      await updateCriteria(id, crit.id, { title: crit.title, description: crit.description, max_score: crit.max_score, order: crit.order })
    } catch {}
  }

  const handleDeleteCriteria = async (critId) => {
    if (!window.confirm('Delete this criterion?')) return
    try {
      await deleteCriteria(id, critId)
      setSavedCriteria(prev => prev.filter(c => c.id !== critId))
    } catch {}
  }

  const setSavedC = (idx, field, value) =>
    setSavedCriteria(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate('/appraisal')} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Edit Template' : 'Create Appraisal Template'}
      </h1>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input type="text" name="title" value={form.title} onChange={set} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="e.g. Annual Faculty Appraisal 2025-26" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={set} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
            placeholder="Brief description of this appraisal…" />
        </div>

        {/* Academic year + Department */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
            <input type="text" name="academic_year" value={form.academic_year} onChange={set} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="2025-26" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select name="department" value={form.department} onChange={set}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="">— All Departments —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {/* Deadline + Active */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <input type="date" name="deadline" value={form.deadline} onChange={set}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={set}
                className="rounded border-gray-300 text-pink-600" />
              <span className="text-sm text-gray-700">Active (visible to faculty)</span>
            </label>
          </div>
        </div>

        {/* ---- Existing criteria (edit mode) ---- */}
        {isEdit && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Existing Criteria</h2>
            {savedCriteria.length === 0 && <p className="text-sm text-gray-400">No criteria yet.</p>}
            <div className="space-y-2">
              {savedCriteria.map((c, idx) => (
                <div key={c.id} className="flex gap-2 items-start border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input type="text" value={c.title}
                      onChange={e => setSavedC(idx, 'title', e.target.value)}
                      onBlur={() => handleSavedCriteriaEdit(c)}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 col-span-2"
                      placeholder="Criterion title" />
                    <input type="number" value={c.max_score}
                      onChange={e => setSavedC(idx, 'max_score', e.target.value)}
                      onBlur={() => handleSavedCriteriaEdit(c)}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                      placeholder="Max score" min={1} />
                    <input type="text" value={c.description}
                      onChange={e => setSavedC(idx, 'description', e.target.value)}
                      onBlur={() => handleSavedCriteriaEdit(c)}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 col-span-2"
                      placeholder="Description (optional)" />
                    <input type="number" value={c.order}
                      onChange={e => setSavedC(idx, 'order', e.target.value)}
                      onBlur={() => handleSavedCriteriaEdit(c)}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                      placeholder="Order" min={0} />
                  </div>
                  <button type="button" onClick={() => handleDeleteCriteria(c.id)}
                    className="text-red-400 hover:text-red-600 text-xs mt-1 px-1">✕</button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Changes saved individually on blur.</p>
          </div>
        )}

        {/* ---- New criteria rows ---- */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">
              {isEdit ? 'Add New Criteria' : 'Criteria'}
            </h2>
            <button type="button" onClick={addRow}
              className="text-xs text-pink-600 hover:text-pink-800 font-medium">
              + Add row
            </button>
          </div>
          <div className="space-y-2">
            {criteria.map((c, idx) => (
              <div key={c._tmp} className="flex gap-2 items-start border border-gray-200 rounded-xl p-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="text" value={c.title}
                    onChange={e => setC(idx, 'title', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 col-span-2"
                    placeholder="Criterion title *" />
                  <input type="number" value={c.max_score}
                    onChange={e => setC(idx, 'max_score', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                    placeholder="Max" min={1} />
                  <input type="text" value={c.description}
                    onChange={e => setC(idx, 'description', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 col-span-2"
                    placeholder="Description" />
                  <input type="number" value={c.order}
                    onChange={e => setC(idx, 'order', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                    placeholder="Order" min={0} />
                </div>
                {criteria.length > 1 && (
                  <button type="button" onClick={() => removeNewRow(idx)}
                    className="text-red-400 hover:text-red-600 text-xs mt-1 px-1">✕</button>
                )}
              </div>
            ))}
          </div>
          {!isEdit && <p className="text-xs text-gray-400 mt-1">Rows with blank titles are ignored.</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/appraisal')}
            className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving || criteriaOps}
            className="ml-auto bg-pink-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  )
}
