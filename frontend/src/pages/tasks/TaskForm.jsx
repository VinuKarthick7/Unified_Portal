/**
 * TaskForm.jsx — Create or Edit a task (HOD/Admin only)
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDepartments, getFacultyList } from '../../api/core'
import { createTask, getTask, updateTask } from '../../api/tasks'

export default function TaskForm() {
  const { id } = useParams()         // present when editing
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'OPEN',
    due_date: '',
    category: '',
    department: '',
    assignees: [],   // list of user IDs
  })
  const [departments, setDepartments] = useState([])
  const [faculties, setFaculties] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load departments + all assignable staff (faculty, HOD, coordinator)
  useEffect(() => {
    Promise.all([getDepartments(), getFacultyList()])
      .then(([d, f]) => {
        setDepartments(d.data)
        // Exclude ADMIN — tasks are assigned to operational staff only
        setFaculties(f.data.filter(u => u.role !== 'ADMIN'))
      })
      .catch(() => {})
  }, [])

  // Load existing task when editing
  useEffect(() => {
    if (!isEdit) return
    getTask(id)
      .then(({ data }) => {
        setForm({
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: data.status,
          due_date: data.due_date || '',
          category: data.category,
          department: data.department ?? '',
          assignees: data.assignments?.map((a) => a.assignee) ?? [],
        })
      })
      .catch(() => navigate('/tasks'))
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate])

  const set = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const toggleAssignee = (uid) => {
    setForm((p) => ({
      ...p,
      assignees: p.assignees.includes(uid)
        ? p.assignees.filter((x) => x !== uid)
        : [...p.assignees, uid],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        department: form.department || null,
        due_date: form.due_date || null,
      }
      if (isEdit) {
        await updateTask(id, payload)
        navigate(`/tasks/${id}`)
      } else {
        const { data } = await createTask(payload)
        navigate(`/tasks/${data.id}`)
      }
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(isEdit ? `/tasks/${id}` : '/tasks')}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
        ← {isEdit ? 'Back to task' : 'Back to tasks'}
      </button>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Edit Task' : 'Create New Task'}
      </h1>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input type="text" name="title" value={form.title} onChange={set} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Task title…" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={set} rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Detailed description…" />
        </div>

        {/* Row: Priority + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select name="priority" value={form.priority} onChange={set}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={form.status} onChange={set}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row: Due date + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" name="due_date" value={form.due_date} onChange={set}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" name="category" value={form.category} onChange={set}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Exam, Event, Admin…" />
          </div>
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department <span className="text-gray-400 font-normal">(leave blank for institution-wide)</span>
          </label>
          <select name="department" value={form.department} onChange={set}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Institution-wide —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Assignees */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign to Staff
            <span className="ml-2 text-xs text-gray-400 font-normal">
              {form.assignees.length} selected
            </span>
          </label>
          {faculties.length === 0 ? (
            <p className="text-sm text-gray-400">No staff found.</p>
          ) : (
            <div className="border border-gray-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-gray-50">
              {faculties.map((f) => {
                const checked = form.assignees.includes(f.id)
                return (
                  <label key={f.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${checked ? 'bg-blue-50' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleAssignee(f.id)}
                      className="rounded border-gray-300 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-800">
                        {f.first_name} {f.last_name}
                        <span className={`ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                          f.role === 'HOD' ? 'bg-purple-100 text-purple-700'
                          : f.role === 'COORDINATOR' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{f.role}</span>
                      </p>
                      <p className="text-xs text-gray-400">{f.email} {f.department_name ? `· ${f.department_name}` : ''}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(isEdit ? `/tasks/${id}` : '/tasks')}
            className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 ml-auto">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
