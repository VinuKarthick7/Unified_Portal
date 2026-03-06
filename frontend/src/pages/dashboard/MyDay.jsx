/**
 * MyDay.jsx — Faculty "My Day" view.
 * Shows today's timetable, pending tasks, handling awaiting approval, and upcoming swaps.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyDay } from '../../api/analytics'

const PRIORITY_META = {
  HIGH:   { label: 'High',   color: 'bg-red-100 text-red-700' },
  MEDIUM: { label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  LOW:    { label: 'Low',    color: 'bg-green-100 text-green-700' },
}

const STATUS_META = {
  PENDING:     { label: 'Pending',     color: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  SUBMITTED:   { label: 'Submitted',   color: 'bg-purple-100 text-purple-700' },
  ACCEPTED:    { label: 'Accepted',    color: 'bg-green-100 text-green-700' },
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
      {children}
    </h2>
  )
}

function EmptyCard({ text }) {
  return (
    <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
      {text}
    </div>
  )
}

export default function MyDay() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    getMyDay()
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const loggedIds = new Set(data?.logged_today?.map(e => e.course_assignment_id) ?? [])
  const summary = data?.summary ?? {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-800">My Day</h1>
          {data && (
            <p className="text-xs text-gray-500">
              {data.today_day}, {data.today_date}
            </p>
          )}
        </div>
        <button onClick={load} className="text-xs text-blue-600 hover:text-blue-800">↻ Refresh</button>
      </header>

      {/* Summary strip */}
      {data && (
        <div className="bg-white border-b border-gray-100 px-6 py-2 flex gap-6 text-xs text-gray-600 overflow-x-auto">
          <span>🗓 <strong>{summary.slots_today ?? 0}</strong> classes today</span>
          <span>✅ <strong>{summary.entries_logged ?? 0}</strong> logged</span>
          <span>📝 <strong>{summary.tasks_pending ?? 0}</strong> tasks pending</span>
          <span>⏳ <strong>{summary.handling_awaiting_approval ?? 0}</strong> awaiting approval</span>
          {(summary.tasks_pending ?? 0) > 0 && summary.is_overdue_any && (
            <span className="text-red-600 font-semibold">⚠️ has overdue</span>
          )}
        </div>
      )}

      <div className="p-6 max-w-3xl mx-auto space-y-8">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !data ? (
          <div className="text-center py-16 text-gray-400">Failed to load data. Try refreshing.</div>
        ) : (
          <>
            {/* Today's Schedule */}
            <section>
              <SectionTitle>🗓 Today's Schedule</SectionTitle>
              {data.today_slots.length === 0 ? (
                <EmptyCard text="No classes scheduled for today." />
              ) : (
                <div className="space-y-3">
                  {data.today_slots.map((slot) => {
                    const isLogged = loggedIds.has(slot.assignment_id)
                    return (
                      <div
                        key={slot.slot_id}
                        className={`flex items-center gap-4 p-4 rounded-xl border ${
                          isLogged
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="text-center min-w-[64px]">
                          <p className="text-xs font-medium text-gray-500">{slot.period}</p>
                          <p className="text-xs text-gray-400 whitespace-nowrap">
                            {slot.period_start} – {slot.period_end}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{slot.course_code}</p>
                          <p className="text-xs text-gray-500 truncate">{slot.course_name}</p>
                          {slot.room && <p className="text-xs text-gray-400">Room: {slot.room}</p>}
                        </div>
                        {isLogged ? (
                          <span className="text-xs text-green-600 font-medium">Logged ✓</span>
                        ) : (
                          <button
                            onClick={() => navigate('/kgaps/creation')}
                            className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50"
                          >
                            Log Entry →
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Pending Tasks */}
            <section>
              <SectionTitle>📝 My Tasks</SectionTitle>
              {data.pending_tasks.length === 0 ? (
                <EmptyCard text="No pending or in-progress tasks." />
              ) : (
                <div className="space-y-2">
                  {data.pending_tasks.map((t) => {
                    const pMeta = PRIORITY_META[t.priority] ?? PRIORITY_META.MEDIUM
                    const sMeta = STATUS_META[t.status] ?? STATUS_META.PENDING
                    return (
                      <div
                        key={t.assignment_id}
                        onClick={() => navigate(`/tasks/${t.task_id}`)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${
                          t.is_overdue
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-gray-200 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{t.task_title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Due: {t.due_date ?? 'No deadline'}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pMeta.color}`}>
                          {pMeta.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sMeta.color}`}>
                          {sMeta.label}
                        </span>
                        {t.is_overdue && (
                          <span className="text-xs text-red-600 font-semibold">Overdue</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Pending Handling Approvals */}
            <section>
              <SectionTitle>⏳ Handling – Awaiting Approval</SectionTitle>
              {data.pending_handling.length === 0 ? (
                <EmptyCard text="No handling entries awaiting HOD review." />
              ) : (
                <div className="space-y-2">
                  {data.pending_handling.map((h) => (
                    <div
                      key={h.verification_id}
                      onClick={() => navigate('/kgaps/handling')}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-amber-50 border-amber-200 cursor-pointer hover:shadow-sm transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{h.topic}</p>
                        <p className="text-xs text-gray-500">{h.course_code} · {h.hours}h</p>
                      </div>
                      <span className="text-xs text-gray-400">{h.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Upcoming Swaps */}
            {data.upcoming_swaps && data.upcoming_swaps.length > 0 && (
              <section>
                <SectionTitle>🔄 Upcoming Swaps</SectionTitle>
                <div className="space-y-2">
                  {data.upcoming_swaps.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => navigate('/scheduler/requests')}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-purple-50 border-purple-200 cursor-pointer hover:shadow-sm transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">{s.description ?? 'Swap request'}</p>
                      </div>
                      <span className="text-xs text-gray-400">{s.date}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
