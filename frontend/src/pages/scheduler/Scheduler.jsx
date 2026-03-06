/**
 * Scheduler.jsx — Main faculty scheduler page.
 *
 * Tabs:
 *  1. Timetable  — weekly grid for each course assignment
 *  2. Log Entry  — log a class as conducted (creates DailyEntry → signal auto-creates TopicHandling)
 *  3. History    — table of past daily entries
 */
import { useState, useEffect, useCallback } from 'react'
import { getMyAssignments } from '../../api/core'
import { getTopics } from '../../api/kgaps'
import {
  getTimetables, getPeriods, getDailyEntries,
  logDailyEntry, deleteDailyEntry,
} from '../../api/scheduler'
import Badge from '../../components/Badge'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAY_LABEL = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' }

// ── Weekly grid for a single timetable ────────────────────────────────────
function TimetableGrid({ timetable, periods }) {
  // Build lookup: { 'MON-1': slot, ... }
  const lookup = {}
  timetable.slots.forEach((s) => {
    lookup[`${s.day_of_week}-${s.period}`] = s
  })

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div>
          <p className="font-semibold text-gray-800">
            {timetable.course_code} — {timetable.course_name}
          </p>
          <p className="text-xs text-gray-500">Sec {timetable.section} · {timetable.faculty_name}</p>
        </div>
        {!timetable.is_active && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">Inactive</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="bg-gray-50 border border-gray-200 px-2 py-2 text-left text-gray-500 w-24">Period</th>
              {DAYS.map((d) => (
                <th key={d} className="bg-gray-50 border border-gray-200 px-2 py-2 text-center text-gray-600 font-semibold">
                  {DAY_LABEL[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id}>
                <td className="border border-gray-200 px-2 py-2 text-gray-500 bg-gray-50 whitespace-nowrap">
                  <span className="font-medium text-gray-700">{p.name}</span>
                  <br />
                  <span className="text-gray-400">{p.start_time?.slice(0, 5)}–{p.end_time?.slice(0, 5)}</span>
                </td>
                {DAYS.map((d) => {
                  const slot = lookup[`${d}-${p.id}`]
                  return (
                    <td key={d} className={`border border-gray-200 px-2 py-2 text-center ${slot ? 'bg-blue-50' : 'bg-white'}`}>
                      {slot ? (
                        <span className="text-blue-700 font-medium">
                          {slot.room ? slot.room : '—'}
                        </span>
                      ) : (
                        <span className="text-gray-200">·</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Log Entry Form ─────────────────────────────────────────────────────────
function LogEntryForm({ assignments, onSuccess }) {
  const [topics, setTopics] = useState([])
  const [form, setForm] = useState({
    course_assignment: '',
    topic: '',
    date: new Date().toISOString().slice(0, 10),
    hours_conducted: '1.0',
    notes: '',
    is_extra_class: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const a = assignments.find((x) => String(x.id) === form.course_assignment)
    if (a?.course) {
      getTopics({ course: a.course }).then(({ data }) => setTopics(data)).catch(() => setTopics([]))
    } else {
      setTopics([])
    }
  }, [form.course_assignment, assignments])

  const set = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((p) => ({ ...p, [e.target.name]: val }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await logDailyEntry({
        topic: Number(form.topic),
        course_assignment: Number(form.course_assignment),
        date: form.date,
        hours_conducted: form.hours_conducted,
        notes: form.notes,
        is_extra_class: form.is_extra_class,
      })
      setOk(true)
      setForm((p) => ({ ...p, topic: '', hours_conducted: '1.0', notes: '', is_extra_class: false }))
      setTimeout(() => setOk(false), 3000)
      onSuccess()
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Failed to log.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="font-semibold text-gray-800 mb-4">Log Conducted Class</h2>
      <p className="text-xs text-gray-500 mb-4">
        This will automatically record a teaching entry in KG-APS Handling.
      </p>

      {error && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {ok && <div className="mb-3 p-3 bg-green-50 text-green-700 rounded-lg text-sm">Entry logged! KG-APS Handling updated automatically.</div>}

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
          <select name="course_assignment" value={form.course_assignment} onChange={set} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— select course —</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>{a.course_code} — Sec {a.section}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Topic Covered</label>
          <select name="topic" value={form.topic} onChange={set} required
            disabled={!form.course_assignment}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
            <option value="">— select topic —</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.unit_title} › {t.topic_title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" name="date" value={form.date} onChange={set} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hours Conducted</label>
          <input type="number" name="hours_conducted" value={form.hours_conducted} onChange={set}
            required min="0.5" max="8" step="0.5"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input type="text" name="notes" value={form.notes} onChange={set}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional session notes…" />
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <input type="checkbox" id="isExtra" name="is_extra_class"
            checked={form.is_extra_class} onChange={set}
            className="h-4 w-4 rounded border-gray-300 text-blue-600" />
          <label htmlFor="isExtra" className="text-sm text-gray-700">Mark as extra class</label>

          <button type="submit" disabled={loading}
            className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving…' : 'Log Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── History table ──────────────────────────────────────────────────────────
function EntryHistory({ entries, loading, onDelete, deletingId }) {
  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
  }
  if (entries.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
        No entries yet.
      </div>
    )
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {['Date', 'Course', 'Topic', 'Hours', 'Type', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {entries.map(e => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600">{e.date}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{e.course_code} <span className="text-xs text-gray-400">§{e.section}</span></td>
              <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate" title={e.topic_title}>
                <span className="text-xs text-gray-400">{e.unit_title} › </span>{e.topic_title}
              </td>
              <td className="px-4 py-3 text-gray-700">{e.hours_conducted}h</td>
              <td className="px-4 py-3">
                {e.is_extra_class
                  ? <Badge label="Extra" variant="info" />
                  : <Badge label="Regular" variant="pending" />}
              </td>
              <td className="px-4 py-3">
                <button onClick={() => onDelete(e.id)} disabled={deletingId === e.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40">
                  {deletingId === e.id ? '…' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
const TABS = ['Timetable', 'Log Entry', 'History']

export default function Scheduler() {
  const [tab, setTab] = useState('Timetable')
  const [timetables, setTimetables] = useState([])
  const [periods, setPeriods] = useState([])
  const [assignments, setAssignments] = useState([])
  const [entries, setEntries] = useState([])
  const [loadingTT, setLoadingTT] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  const loadTimetables = useCallback(async () => {
    setLoadingTT(true)
    try {
      const [tt, p] = await Promise.all([getTimetables(), getPeriods()])
      setTimetables(tt.data)
      setPeriods(p.data)
    } finally {
      setLoadingTT(false)
    }
  }, [])

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true)
    try {
      const { data } = await getDailyEntries()
      setEntries(data)
    } finally {
      setLoadingEntries(false)
    }
  }, [])

  useEffect(() => {
    loadTimetables()
    loadEntries()
    getMyAssignments().then(({ data }) => setAssignments(data)).catch(() => {})
  }, [loadTimetables, loadEntries])

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return
    setDeletingId(id)
    try { await deleteDailyEntry(id); loadEntries() }
    catch (err) { alert(err.response?.data?.detail || 'Cannot delete.') }
    finally { setDeletingId(null) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Academic Scheduler</h1>
        <p className="text-sm text-gray-500 mt-1">View your timetable and log conducted classes.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Timetable tab */}
      {tab === 'Timetable' && (
        loadingTT ? (
          <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : timetables.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
            No timetable set up yet. Contact your HOD to configure your schedule.
          </div>
        ) : (
          timetables.map(tt => <TimetableGrid key={tt.id} timetable={tt} periods={periods} />)
        )
      )}

      {/* Log Entry tab */}
      {tab === 'Log Entry' && (
        <LogEntryForm assignments={assignments} onSuccess={loadEntries} />
      )}

      {/* History tab */}
      {tab === 'History' && (
        <EntryHistory entries={entries} loading={loadingEntries}
          onDelete={handleDelete} deletingId={deletingId} />
      )}
    </div>
  )
}
