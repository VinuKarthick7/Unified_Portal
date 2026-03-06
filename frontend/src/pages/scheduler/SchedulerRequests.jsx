/**
 * SchedulerRequests.jsx
 * Tabs: Swap Requests | Extra Classes
 * Both faculty (create) and HOD/Admin (approve/reject) use this page.
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMyAssignments, getFacultyList } from '../../api/core'
import { getTopics } from '../../api/kgaps'
import {
  getTimetables, getPeriods,
  getSwapRequests, createSwapRequest, actionSwapRequest,
  getExtraClasses, requestExtraClass, actionExtraClass,
} from '../../api/scheduler'
import Badge from '../../components/Badge'

const STATUS_VARIANT = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected', CANCELLED: 'pending' }

// ── Swap Requests tab ──────────────────────────────────────────────────────
function SwapTab({ user }) {
  const [swaps, setSwaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [timetables, setTimetables] = useState([])
  const [faculties, setFaculties] = useState([])
  const [slots, setSlots] = useState([])
  const [form, setForm] = useState({ original_slot: '', target_faculty: '', swap_date: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [actionId, setActionId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, tt, f] = await Promise.all([
        getSwapRequests(),
        getTimetables(),
        getFacultyList({ role: 'FACULTY' }),
      ])
      setSwaps(s.data)
      setTimetables(tt.data)
      setFaculties(f.data)
      const allSlots = tt.data.flatMap(t => t.slots.map(sl => ({ ...sl, timetable_label: `${t.course_code} Sec ${t.section}` })))
      setSlots(allSlots)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setF = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createSwapRequest({ ...form, original_slot: Number(form.original_slot), target_faculty: Number(form.target_faculty) })
      setShowForm(false)
      setForm({ original_slot: '', target_faculty: '', swap_date: '', reason: '' })
      load()
    } catch (err) {
      alert(Object.values(err.response?.data || {}).flat().join(' ') || 'Failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const doAction = async (id, status) => {
    setActionId(id)
    try { await actionSwapRequest(id, { status }); load() }
    catch (err) { alert(err.response?.data?.detail || 'Failed.') }
    finally { setActionId(null) }
  }

  const isHodAdmin = user?.role === 'HOD' || user?.role === 'ADMIN'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{swaps.length} swap request{swaps.length !== 1 ? 's' : ''}</p>
        {user?.role === 'FACULTY' && (
          <button onClick={() => setShowForm(v => !v)}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">
            {showForm ? 'Cancel' : '+ Request Swap'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">My Slot</label>
            <select name="original_slot" value={form.original_slot} onChange={setF} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— select slot —</option>
              {slots.map(s => (
                <option key={s.id} value={s.id}>{s.timetable_label} — {s.day_of_week} {s.period_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Swap With</label>
            <select name="target_faculty" value={form.target_faculty} onChange={setF} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— select faculty —</option>
              {faculties.filter(f => f.id !== user?.id).map(f => (
                <option key={f.id} value={f.id}>{f.first_name} {f.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" name="swap_date" value={form.swap_date} onChange={setF} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input type="text" name="reason" value={form.reason} onChange={setF}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional…" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={submitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
      ) : swaps.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">No swap requests.</div>
      ) : (
        <div className="space-y-3">
          {swaps.map(s => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  {s.requester_name} → {s.target_faculty_name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {s.slot_detail?.day_of_week} {s.slot_detail?.period_name} · {s.swap_date}
                  {s.reason && ` · "${s.reason}"`}
                </p>
              </div>
              <Badge label={s.status} variant={STATUS_VARIANT[s.status] ?? 'pending'} />
              {s.status === 'PENDING' && (
                <div className="flex gap-2">
                  {/* target faculty or HOD can approve */}
                  {(s.target_faculty === user?.id || isHodAdmin) && (
                    <button onClick={() => doAction(s.id, 'APPROVED')} disabled={actionId===s.id}
                      className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 disabled:opacity-50">
                      Approve
                    </button>
                  )}
                  {(s.target_faculty === user?.id || isHodAdmin) && (
                    <button onClick={() => doAction(s.id, 'REJECTED')} disabled={actionId===s.id}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 disabled:opacity-50">
                      Reject
                    </button>
                  )}
                  {s.requester === user?.id && (
                    <button onClick={() => doAction(s.id, 'CANCELLED')} disabled={actionId===s.id}
                      className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50">
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Extra Class tab ────────────────────────────────────────────────────────
function ExtraTab({ user }) {
  const [extras, setExtras] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [topics, setTopics] = useState([])
  const [periods, setPeriods] = useState([])
  const [form, setForm] = useState({
    course_assignment: '', topic: '', proposed_date: '',
    proposed_period: '', room: '', reason: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [actionId, setActionId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ex, a, p] = await Promise.all([getExtraClasses(), getMyAssignments(), getPeriods()])
      setExtras(ex.data)
      setAssignments(a.data)
      setPeriods(p.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const a = assignments.find(x => String(x.id) === form.course_assignment)
    if (a?.course) getTopics({ course: a.course }).then(({ data }) => setTopics(data)).catch(() => setTopics([]))
    else setTopics([])
  }, [form.course_assignment, assignments])

  const setF = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await requestExtraClass({
        ...form,
        course_assignment: Number(form.course_assignment),
        topic: Number(form.topic),
        proposed_period: form.proposed_period ? Number(form.proposed_period) : null,
      })
      setShowForm(false)
      setForm({ course_assignment: '', topic: '', proposed_date: '', proposed_period: '', room: '', reason: '' })
      load()
    } catch (err) {
      alert(Object.values(err.response?.data || {}).flat().join(' ') || 'Failed.')
    } finally { setSubmitting(false) }
  }

  const doAction = async (id, status) => {
    setActionId(id)
    try { await actionExtraClass(id, { status }); load() }
    catch (err) { alert(err.response?.data?.detail || 'Failed.') }
    finally { setActionId(null) }
  }

  const isHodAdmin = user?.role === 'HOD' || user?.role === 'ADMIN'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{extras.length} extra class request{extras.length !== 1 ? 's' : ''}</p>
        {user?.role === 'FACULTY' && (
          <button onClick={() => setShowForm(v => !v)}
            className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700">
            {showForm ? 'Cancel' : '+ Request Extra Class'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select name="course_assignment" value={form.course_assignment} onChange={setF} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— select —</option>
              {assignments.map(a => <option key={a.id} value={a.id}>{a.course_code} Sec {a.section}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <select name="topic" value={form.topic} onChange={setF} required disabled={!form.course_assignment}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
              <option value="">— select —</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.unit_title} › {t.topic_title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Date</label>
            <input type="date" name="proposed_date" value={form.proposed_date} onChange={setF} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period (optional)</label>
            <select name="proposed_period" value={form.proposed_period} onChange={setF}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— any —</option>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.start_time?.slice(0,5)}–{p.end_time?.slice(0,5)})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <input type="text" name="room" value={form.room} onChange={setF}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Lab 3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input type="text" name="reason" value={form.reason} onChange={setF}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Why?" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={submitting}
              className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
      ) : extras.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">No extra class requests.</div>
      ) : (
        <div className="space-y-3">
          {extras.map(ex => (
            <div key={ex.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  {ex.faculty_name} — {ex.course_code}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ex.unit_title} › {ex.topic_title} · {ex.proposed_date}
                  {ex.period_name && ` · ${ex.period_name}`}
                  {ex.room && ` · ${ex.room}`}
                  {ex.reason && ` · "${ex.reason}"`}
                </p>
              </div>
              <Badge label={ex.status} variant={STATUS_VARIANT[ex.status] ?? 'pending'} />
              {ex.status === 'PENDING' && isHodAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => doAction(ex.id, 'APPROVED')} disabled={actionId===ex.id}
                    className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 disabled:opacity-50">
                    Approve
                  </button>
                  <button onClick={() => doAction(ex.id, 'REJECTED')} disabled={actionId===ex.id}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 disabled:opacity-50">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SchedulerRequests() {
  const { user } = useAuth()
  const [tab, setTab] = useState('Swaps')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Scheduler Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Manage swap requests and extra class applications.</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {['Swaps', 'Extra Classes'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Swaps' && <SwapTab user={user} />}
      {tab === 'Extra Classes' && <ExtraTab user={user} />}
    </div>
  )
}
