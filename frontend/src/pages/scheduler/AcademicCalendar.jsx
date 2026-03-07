/**
 * AcademicCalendar.jsx — Admin-only read-only view of the college schedule.
 * Shows dept-wise timetable summary: courses, periods, rooms.
 * No staff-level editing. Data grouped by department.
 */
import { useState, useEffect } from 'react'
import { getTimetables, getSwapRequests, getExtraClasses } from '../../api/scheduler'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
const DAY_FULL = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri' }

const C = {
  indigo: '#6366f1', sky: '#0ea5e9', teal: '#14b8a6',
  amber: '#f59e0b', rose: '#f43f5e', violet: '#8b5cf6',
  emerald: '#10b981', blue: '#3b82f6',
}
const DEPT_COLORS = [C.indigo, C.sky, C.teal, C.amber, C.rose, C.violet, C.emerald, C.blue]

function Badge({ label, color }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: `${color}18`, color }}>
      {label}
    </span>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center px-4 py-2 rounded-xl"
      style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
      <span className="text-lg font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
  )
}

export default function AcademicCalendar() {
  const [timetables, setTimetables] = useState([])
  const [swaps, setSwaps] = useState([])
  const [extras, setExtras] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDept, setActiveDept] = useState(null)

  useEffect(() => {
    Promise.all([getTimetables(), getSwapRequests(), getExtraClasses()])
      .then(([t, s, e]) => {
        setTimetables(Array.isArray(t.data) ? t.data : [])
        setSwaps(Array.isArray(s.data) ? s.data : [])
        setExtras(Array.isArray(e.data) ? e.data : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Group timetables by department
  const deptMap = {}
  timetables.forEach(tt => {
    const key = tt.faculty_department || 'Unassigned'
    const code = tt.faculty_department_code || '—'
    if (!deptMap[key]) deptMap[key] = { name: key, code, timetables: [] }
    deptMap[key].timetables.push(tt)
  })
  const depts = Object.values(deptMap).sort((a, b) => a.name.localeCompare(b.name))

  // Summary stats
  const pendingSwaps  = swaps.filter(s => s.status === 'PENDING').length
  const pendingExtras = extras.filter(e => e.status === 'PENDING').length
  const totalCourses  = timetables.length
  const totalPeriods  = timetables.reduce((a, tt) => a + (tt.slots?.length ?? 0), 0)

  const selected = activeDept ?? depts[0]?.name

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-t-indigo-500 border-indigo-100 animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Academic Calendar</h1>
        <p className="text-sm text-gray-400 mt-0.5">College-wide schedule overview — grouped by department</p>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        <StatPill label="Departments" value={depts.length}   color={C.indigo} />
        <StatPill label="Courses Set" value={totalCourses}   color={C.sky} />
        <StatPill label="Periods/Week" value={totalPeriods}  color={C.teal} />
        <StatPill label="Pending Swaps"  value={pendingSwaps}  color={C.amber} />
        <StatPill label="Pending Extra"  value={pendingExtras} color={C.rose} />
      </div>

      {depts.length === 0 ? (
        <div className="text-center py-20 text-sm text-gray-400">
          No timetables have been set up yet.
        </div>
      ) : (
        <div className="flex gap-5 items-start">

          {/* Left: dept list */}
          <div className="w-44 shrink-0 space-y-1">
            {depts.map((d, i) => {
              const color = DEPT_COLORS[i % DEPT_COLORS.length]
              const active = selected === d.name
              return (
                <button key={d.name}
                  onClick={() => setActiveDept(d.name)}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: active ? `${color}12` : 'transparent',
                    border: `1px solid ${active ? color : 'transparent'}`,
                  }}>
                  <p className="text-xs font-bold truncate" style={{ color: active ? color : '#374151' }}>{d.name}</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: active ? color : '#9ca3af' }}>
                    {d.code} · {d.timetables.length} course{d.timetables.length !== 1 ? 's' : ''}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Right: dept schedule detail */}
          {(() => {
            const dept = depts.find(d => d.name === selected)
            if (!dept) return null
            const deptColor = DEPT_COLORS[depts.indexOf(dept) % DEPT_COLORS.length]

            return (
              <div className="flex-1 rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(0,0,0,0.07)', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

                {/* Dept header */}
                <div className="px-5 py-4 flex items-center gap-3"
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: `${deptColor}07` }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: deptColor }} />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{dept.name}</p>
                    <p className="text-[11px] font-mono text-gray-400">{dept.code}</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Badge label={`${dept.timetables.length} courses`} color={deptColor} />
                    <Badge
                      label={`${dept.timetables.reduce((a, tt) => a + (tt.slots?.length ?? 0), 0)} periods/wk`}
                      color={C.teal} />
                  </div>
                </div>

                {/* Course rows */}
                <div className="divide-y divide-gray-50">
                  {dept.timetables.map(tt => {
                    // Build slot summary: group by day
                    const byDay = {}
                    ;(tt.slots ?? []).forEach(s => {
                      const d = s.day_of_week
                      if (!byDay[d]) byDay[d] = []
                      byDay[d].push(s.period_name ?? s.period ?? '—')
                    })

                    return (
                      <div key={tt.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {tt.course_code} <span className="font-normal text-gray-500">— {tt.course_name}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Sec {tt.section ?? '—'} &nbsp;·&nbsp; {tt.faculty_name}
                            </p>
                          </div>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                            {tt.slots?.length ?? 0} slots
                          </span>
                        </div>

                        {/* Day pills */}
                        {Object.keys(byDay).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {DAYS.filter(d => byDay[d]).map(d => (
                              <span key={d}
                                className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                                style={{ background: `${deptColor}12`, color: deptColor }}>
                                {DAY_FULL[d]}: {byDay[d].join(', ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Requests summary */}
      {(swaps.length > 0 || extras.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Swap requests */}
          <div className="rounded-2xl p-5"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Swap Requests</p>
            <div className="flex gap-3 flex-wrap">
              {['PENDING','APPROVED','REJECTED'].map(st => {
                const count = swaps.filter(s => s.status === st).length
                const color = st === 'PENDING' ? C.amber : st === 'APPROVED' ? C.emerald : C.rose
                return <StatPill key={st} label={st} value={count} color={color} />
              })}
            </div>
          </div>

          {/* Extra class requests */}
          <div className="rounded-2xl p-5"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Extra Class Requests</p>
            <div className="flex gap-3 flex-wrap">
              {['PENDING','APPROVED','REJECTED'].map(st => {
                const count = extras.filter(e => e.status === st).length
                const color = st === 'PENDING' ? C.amber : st === 'APPROVED' ? C.emerald : C.rose
                return <StatPill key={st} label={st} value={count} color={color} />
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
