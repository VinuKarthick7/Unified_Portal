import { useState, useEffect, useCallback } from 'react'
import { getMyAssignments } from '../../api/core'
import { getTopics } from '../../api/kgaps'
import { getHandlingEntries, logHandling, deleteHandling, getProgress } from '../../api/kgaps_handling'
import Badge from '../../components/Badge'

const STATUS_VARIANT = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' }

// ── Progress Summary Card ──────────────────────────────────────────────────
function ProgressCard({ entry }) {
  const pct = entry.completion_percent
  const barColor =
    pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : pct >= 25 ? 'bg-yellow-500' : 'bg-red-400'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{entry.course_code}</p>
          <p className="text-xs text-gray-500 truncate max-w-[160px]">{entry.course_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">Sec {entry.section} · {entry.academic_year}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-800">{pct}%</p>
          <p className="text-xs text-gray-400">{entry.handled_topics}/{entry.total_topics} topics</p>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <p className="text-xs text-gray-400">{entry.total_hours}h handled</p>
        {entry.pending_topics > 0 && (
          <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">
            {entry.pending_topics} pending approval
          </span>
        )}
      </div>
    </div>
  )
}

// ── Log Handling Form ──────────────────────────────────────────────────────
function LogHandlingForm({ onSuccess }) {
  const [assignments, setAssignments] = useState([])
  const [topics, setTopics] = useState([])
  const [form, setForm] = useState({
    course_assignment: '',
    topic: '',
    hours_handled: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getMyAssignments().then(({ data }) => setAssignments(data)).catch(() => {})
  }, [])

  // Load topics when course assignment changes
  useEffect(() => {
    const assignment = assignments.find((a) => String(a.id) === form.course_assignment)
    if (assignment?.course) {
      getTopics({ course: assignment.course })
        .then(({ data }) => setTopics(data))
        .catch(() => setTopics([]))
    } else {
      setTopics([])
    }
  }, [form.course_assignment, assignments])

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await logHandling({
        topic: Number(form.topic),
        course_assignment: Number(form.course_assignment),
        hours_handled: form.hours_handled,
        date: form.date,
        notes: form.notes,
      })
      setSuccess(true)
      setForm((p) => ({ ...p, topic: '', hours_handled: '', notes: '' }))
      setTimeout(() => setSuccess(false), 3000)
      onSuccess()
    } catch (err) {
      const data = err.response?.data
      setError(
        typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : 'Failed to log entry.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="font-semibold text-gray-800 mb-4">Log Teaching Entry</h2>

      {error && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-3 p-3 bg-green-50 text-green-700 rounded-lg text-sm">Entry logged successfully!</div>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Assignment</label>
          <select
            name="course_assignment"
            value={form.course_assignment}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— select course —</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.course_code} — {a.course_name} (Sec {a.section})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
          <select
            name="topic"
            value={form.topic}
            onChange={handleChange}
            required
            disabled={!form.course_assignment}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">— select topic —</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.unit_title} › {t.topic_title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hours Handled</label>
          <input
            type="number"
            name="hours_handled"
            value={form.hours_handled}
            onChange={handleChange}
            required
            min="0.5"
            max="8"
            step="0.5"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 1.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <input
            type="text"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any notes about this session…"
          />
        </div>

        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Log Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function KGAPSHandling() {
  const [progress, setProgress] = useState([])
  const [entries, setEntries] = useState([])
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  const loadAll = useCallback(async () => {
    setLoadingProgress(true)
    setLoadingEntries(true)
    try {
      const [prog, ent] = await Promise.all([
        getProgress(),
        getHandlingEntries(),
      ])
      setProgress(prog.data)
      setEntries(ent.data)
    } finally {
      setLoadingProgress(false)
      setLoadingEntries(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return
    setDeletingId(id)
    try {
      await deleteHandling(id)
      loadAll()
    } catch (err) {
      alert(err.response?.data?.detail || 'Cannot delete this entry.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">KG-APS — Teaching Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Log topics you've taught and track your syllabus completion per course.
        </p>
      </div>

      {/* Progress summary */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Syllabus Progress
        </h2>
        {loadingProgress ? (
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : progress.length === 0 ? (
          <p className="text-sm text-gray-400">No course assignments found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {progress.map((p) => (
              <ProgressCard key={p.assignment_id} entry={p} />
            ))}
          </div>
        )}
      </div>

      {/* Log form */}
      <LogHandlingForm onSuccess={loadAll} />

      {/* Recent entries */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Recent Entries
        </h2>
        {loadingEntries ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
            No entries yet. Log your first teaching session above.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date', 'Course', 'Topic', 'Hours', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.date}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{e.course_code}</span>
                      {e.is_auto_generated && (
                        <span className="ml-1.5 text-xs text-indigo-500" title="Auto-generated from daily entry">⚡</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate" title={e.topic_title}>
                      <span className="text-xs text-gray-400">{e.unit_title} › </span>{e.topic_title}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{e.hours_handled}h</td>
                    <td className="px-4 py-3">
                      <Badge
                        label={e.verification_status ?? 'PENDING'}
                        variant={STATUS_VARIANT[e.verification_status] ?? 'pending'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {e.verification_status !== 'APPROVED' && (
                        <button
                          onClick={() => handleDelete(e.id)}
                          disabled={deletingId === e.id}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                        >
                          {deletingId === e.id ? '…' : 'Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
