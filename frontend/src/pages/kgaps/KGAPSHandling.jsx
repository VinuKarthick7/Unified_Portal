/**
 * KGAPSHandling.jsx — Teaching Progress Log (Faculty)
 * Premium UI: gradient background, glassmorphic cards, SVG icons
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyAssignments } from '../../api/core'
import { getTopics } from '../../api/kgaps'
import { getHandlingEntries, logHandling, deleteHandling, getProgress } from '../../api/kgaps_handling'
import Badge from '../../components/Badge'

const STATUS_VARIANT = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' }

/* ── SVG Icon helper ───────────────────────────────────────── */
function Icon({ d, className = 'w-4 h-4', stroke = 'currentColor' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke={stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}
const ICONS = {
  back:     'M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18',
  book:     'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  clock:    'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  check:    'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  chart:    'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  plus:     'M12 4.5v15m7.5-7.5h-15',
  trash:    'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  zap:      'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  alert:    'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  pencil:   'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125',
}

/* ── Progress Summary Card — Premium ─────────────────────── */
function ProgressCard({ entry }) {
  const pct = entry.completion_percent
  const strokeColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444'
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : pct >= 25 ? 'bg-amber-500' : 'bg-red-400'

  return (
    <div className="rounded-2xl p-5 border border-gray-100 hover:border-indigo-100 transition-all hover:shadow-md"
      style={{ background: '#fff' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${strokeColor}14` }}>
              <Icon d={ICONS.book} className="w-3.5 h-3.5" stroke={strokeColor} />
            </div>
            <p className="font-bold text-sm text-gray-900 truncate">{entry.course_code}</p>
          </div>
          <p className="text-xs text-gray-500 truncate ml-9">{entry.course_name}</p>
          <p className="text-[10px] text-gray-400 ml-9 mt-0.5">Sec {entry.section} · {entry.academic_year}</p>
        </div>
        {/* Circular progress indicator */}
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke={strokeColor} strokeWidth="3"
              strokeDasharray={`${pct * 0.9738} 97.38`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"
            style={{ color: strokeColor }}>{pct}%</span>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-2.5 text-[10px]">
        <span className="text-gray-400">{entry.handled_topics}/{entry.total_topics} topics · {entry.total_hours}h</span>
        {entry.pending_topics > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-medium">
            <Icon d={ICONS.clock} className="w-2.5 h-2.5" stroke="#d97706" />
            {entry.pending_topics} pending
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Log Handling Form — Premium ─────────────────────────── */
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
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getMyAssignments().then(({ data }) => {
      setAssignments(data)
      if (data.length === 1) setForm(f => ({ ...f, course_assignment: String(data[0].id) }))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const assignment = assignments.find(a => String(a.id) === form.course_assignment)
    if (assignment?.course) {
      getTopics({ course: assignment.course })
        .then(({ data }) => setTopics(data))
        .catch(() => setTopics([]))
    } else {
      setTopics([])
    }
  }, [form.course_assignment, assignments])

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
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
      setForm(p => ({ ...p, topic: '', hours_handled: '', notes: '' }))
      setTimeout(() => setSuccess(false), 3000)
      onSuccess()
    } catch (err) {
      const data = err.response?.data
      setError(typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Failed to log entry.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-colors'
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden"
      style={{ background: '#fff' }}>
      {/* Toggle header */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.08)' }}>
            <Icon d={ICONS.pencil} className="w-4 h-4" stroke="#6366f1" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-bold text-gray-900">Log Teaching Entry</h2>
            <p className="text-[10px] text-gray-400">Record topics taught and hours</p>
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-50">
          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-xl border border-red-100"
              style={{ background: 'rgba(239,68,68,0.04)' }}>
              <Icon d={ICONS.alert} className="w-4 h-4 shrink-0" stroke="#ef4444" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
          {success && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-xl border border-green-100"
              style={{ background: 'rgba(16,185,129,0.04)' }}>
              <Icon d={ICONS.check} className="w-4 h-4 shrink-0" stroke="#10b981" />
              <span className="text-sm text-green-700">Entry logged successfully!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelClass}>Course Assignment</label>
              {assignments.length === 1 ? (
                <div className="px-3.5 py-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-sm font-medium text-indigo-700">
                  {assignments[0].course_code} — {assignments[0].course_name} (Sec {assignments[0].section})
                </div>
              ) : (
                <select name="course_assignment" value={form.course_assignment}
                  onChange={handleChange} required className={inputClass}>
                  <option value="">— select course —</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.course_code} — {a.course_name} (Sec {a.section})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className={labelClass}>Topic</label>
              <select name="topic" value={form.topic} onChange={handleChange}
                required disabled={!form.course_assignment} className={inputClass + ' disabled:opacity-50'}>
                <option value="">— select topic —</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.unit_title} › {t.topic_title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Hours Handled</label>
              <input type="number" name="hours_handled" value={form.hours_handled}
                onChange={handleChange} required min="0.5" max="8" step="0.5"
                className={inputClass} placeholder="e.g. 1.5" />
            </div>

            <div>
              <label className={labelClass}>Date</label>
              <input type="date" name="date" value={form.date}
                onChange={handleChange} required className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Notes (optional)</label>
              <input type="text" name="notes" value={form.notes}
                onChange={handleChange} className={inputClass}
                placeholder="Any notes about this session…" />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={loading}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors">
                {loading ? 'Saving…' : 'Log Entry'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────── */
export default function KGAPSHandling() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState([])
  const [entries, setEntries] = useState([])
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  const loadAll = useCallback(async () => {
    setLoadingProgress(true)
    setLoadingEntries(true)
    try {
      const [prog, ent] = await Promise.all([getProgress(), getHandlingEntries()])
      setProgress(prog.data)
      setEntries(ent.data)
    } finally {
      setLoadingProgress(false)
      setLoadingEntries(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleDelete = async id => {
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

  // Aggregate stats
  const totalTopics = progress.reduce((s, p) => s + p.total_topics, 0)
  const handledTopics = progress.reduce((s, p) => s + p.handled_topics, 0)
  const totalHours = progress.reduce((s, p) => s + p.total_hours, 0)
  const overallPct = totalTopics > 0 ? Math.round((handledTopics / totalTopics) * 100) : 0

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f8fafc 0%, #eef2ff 100%)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-4 flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(14px)',
                 borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
        <button onClick={() => navigate('/faculty-dashboard')}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
          <Icon d={ICONS.back} className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <h1 className="text-base font-bold" style={{ color: '#0f172a' }}>Teaching Progress</h1>
          <p className="text-[11px]" style={{ color: '#94a3b8' }}>Log topics taught and track syllabus completion</p>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6">

        {/* Overview strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Overall Progress',  value: `${overallPct}%`, icon: ICONS.chart, accent: '#6366f1' },
            { label: 'Topics Covered',     value: `${handledTopics}/${totalTopics}`, icon: ICONS.book, accent: '#3b82f6' },
            { label: 'Total Hours',        value: `${totalHours}h`, icon: ICONS.clock, accent: '#10b981' },
            { label: 'Courses Active',     value: progress.length, icon: ICONS.check, accent: '#f59e0b' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4 flex flex-col gap-1"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
                       boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${k.accent}14` }}>
                <Icon d={k.icon} className="w-3.5 h-3.5" stroke={k.accent} />
              </div>
              <p className="text-xl font-bold tracking-tight" style={{ color: '#0f172a' }}>{k.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* Per-course progress cards */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Icon d={ICONS.chart} className="w-3.5 h-3.5" stroke="#6366f1" />
            Course-wise Progress
          </h2>
          {loadingProgress ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-36 bg-white rounded-2xl animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : progress.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200"
              style={{ background: 'rgba(255,255,255,0.6)' }}>
              <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.08)' }}>
                <Icon d={ICONS.book} className="w-6 h-6" stroke="#6366f1" />
              </div>
              <p className="text-sm font-medium text-gray-500">No course assignments found</p>
              <p className="text-xs text-gray-400 mt-1">Assignments will appear once allocated</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {progress.map(p => <ProgressCard key={p.assignment_id} entry={p} />)}
            </div>
          )}
        </section>

        {/* Log form */}
        <LogHandlingForm onSuccess={loadAll} />

        {/* Recent entries */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Icon d={ICONS.clock} className="w-3.5 h-3.5" stroke="#6366f1" />
            Recent Entries
          </h2>
          {loadingEntries ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white rounded-xl animate-pulse border border-gray-100" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-14 rounded-2xl border border-dashed border-gray-200"
              style={{ background: 'rgba(255,255,255,0.6)' }}>
              <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.08)' }}>
                <Icon d={ICONS.pencil} className="w-6 h-6" stroke="#6366f1" />
              </div>
              <p className="text-sm font-medium text-gray-500">No entries yet</p>
              <p className="text-xs text-gray-400 mt-1">Log your first teaching session above</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 overflow-hidden" style={{ background: '#fff' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(99,102,241,0.03)' }}>
                    {['Date', 'Course', 'Topic', 'Hours', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{e.date}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-800 text-xs">{e.course_code}</span>
                        {e.is_auto_generated && (
                          <span className="ml-1.5 inline-flex items-center" title="Auto-generated from daily entry">
                            <Icon d={ICONS.zap} className="w-3 h-3" stroke="#6366f1" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs max-w-[200px]" title={e.topic_title}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate"><span className="text-gray-400">{e.unit_title} › </span>{e.topic_title}</span>
                          {e.is_taught_today && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap flex-shrink-0">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                              Taught Today
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs font-medium">{e.hours_handled}h</td>
                      <td className="px-4 py-3">
                        <Badge label={e.verification_status ?? 'PENDING'}
                          variant={STATUS_VARIANT[e.verification_status] ?? 'pending'} />
                      </td>
                      <td className="px-4 py-3">
                        {e.verification_status !== 'APPROVED' && (
                          <button onClick={() => handleDelete(e.id)}
                            disabled={deletingId === e.id}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors">
                            <Icon d={ICONS.trash} className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
