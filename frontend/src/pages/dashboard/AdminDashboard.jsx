/**
 * AdminDashboard.jsx — Read-only visual overview for ADMIN role.
 * No create / edit / delete actions—pure data display.
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getModuleSummary,
  getTaskAnalytics,
  getWorkloadTrend,
  getDepartmentOverview,
} from '../../api/analytics'
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

/* ── tiny palette ───────────────────────────────────────── */
const C = {
  indigo: '#6366f1', blue: '#3b82f6', teal: '#14b8a6',
  amber: '#f59e0b', rose: '#f43f5e', violet: '#8b5cf6',
  sky: '#0ea5e9', emerald: '#10b981',
}
const DEPT_COLORS = [C.indigo, C.sky, C.teal, C.amber, C.rose, C.violet, C.emerald, C.blue]

/* ── KPI card ───────────────────────────────────────────── */
function KPI({ label, value, sub, color = C.indigo }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1"
        style={{ background: `${color}18` }}>
        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: '#0f172a' }}>{value ?? '—'}</p>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{sub}</p>}
    </div>
  )
}

/* ── section heading ─────────────────────────────────────── */
function SH({ children }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#64748b' }}>
      {children}
    </h2>
  )
}

/* ── progress bar ────────────────────────────────────────── */
function Bar2({ value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(0,0,0,0.07)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color: '#64748b' }}>{pct}%</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const { user, logout } = useAuth()

  const [summary,    setSummary]    = useState(null)
  const [tasks,      setTasks]      = useState([])
  const [workload,   setWorkload]   = useState([])
  const [depts,      setDepts]      = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      getModuleSummary(),
      getTaskAnalytics(),
      getWorkloadTrend(),
      getDepartmentOverview(),
    ])
      .then(([s, t, w, d]) => {
        setSummary(s.data)
        setTasks(Array.isArray(t.data) ? t.data : t.data?.by_department ?? [])
        setWorkload(Array.isArray(w.data) ? w.data : w.data?.trend ?? [])
        setDepts(Array.isArray(d.data) ? d.data : d.data?.departments ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  /* derive KPIs from summary */
  const s = summary ?? {}
  const totalTasks = (s.tasks_total ?? 0) || tasks.reduce((a, d) => a + (d.total ?? 0), 0)

  /* task status ring data */
  const ringData = [
    { name: 'Completed', value: s.tasks_completed ?? 0, color: C.emerald },
    { name: 'In Progress', value: s.tasks_in_progress ?? 0, color: C.blue },
    { name: 'Open', value: s.tasks_open ?? 0, color: C.amber },
    { name: 'Overdue', value: s.tasks_overdue ?? 0, color: C.rose },
  ].filter(r => r.value > 0)

  /* stacked bar data per department */
  const deptTaskData = tasks.map(d => ({
    name: d.department_name ?? d.name ?? 'Unknown',
    Open: d.open ?? 0,
    'In Progress': d.in_progress ?? 0,
    Completed: d.completed ?? 0,
    Overdue: d.overdue ?? 0,
  }))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #f8f7ff, #eef2ff)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-t-indigo-500 border-indigo-100 animate-spin" />
          <p className="text-sm font-medium" style={{ color: '#6366f1' }}>Loading dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f8f7ff 0%, #eef2ff 100%)' }}>

      {/* ── NAV BAR ────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold" style={{ color: '#1e1b4b' }}>Admin Overview</h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Read-only institutional dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium" style={{ color: '#475569' }}>
            {user?.first_name} {user?.last_name}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
            ADMIN
          </span>
          <button onClick={logout}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(244,63,94,0.08)', color: '#f43f5e' }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-7xl mx-auto space-y-10">

        {/* ── KPI STRIP ──────────────────────────────────────── */}
        <section>
          <SH>Institutional Snapshot</SH>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPI label="Departments"    value={s.departments   ?? depts.length}           color={C.indigo} />
            <KPI label="Faculty"        value={s.faculty_count ?? s.total_faculty}         color={C.blue} />
            <KPI label="Teaching Hrs"   value={s.total_hours   ?? s.teaching_hours}        color={C.teal}
              sub={s.hours_this_month ? `${s.hours_this_month} this month` : undefined} />
            <KPI label="Total Tasks"    value={totalTasks}                                 color={C.amber} />
            <KPI label="Completed"      value={s.tasks_completed}                          color={C.emerald} />
            <KPI label="Appraisals"     value={s.appraisals_total ?? s.appraisals}         color={C.violet} />
          </div>
        </section>

        {/* ── WORKLOAD TREND + TASK PIE ─────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Area chart — workload trend */}
          <div className="lg:col-span-3 rounded-2xl p-6"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <SH>Workload Trend</SH>
            {workload.length === 0 ? (
              <p className="text-sm py-10 text-center" style={{ color: '#94a3b8' }}>No workload data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={workload} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="wlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.indigo} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Area type="monotone" dataKey="hours" name="Hours" stroke={C.indigo} strokeWidth={2}
                    fill="url(#wlGrad)" dot={{ r: 3, fill: C.indigo }} activeDot={{ r: 5 }} />
                  {workload[0]?.sessions !== undefined &&
                    <Area type="monotone" dataKey="sessions" name="Sessions" stroke={C.sky} strokeWidth={2}
                      fill="none" dot={{ r: 3, fill: C.sky }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
                  }
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Task ring */}
          <div className="lg:col-span-2 rounded-2xl p-6"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <SH>Task Status</SH>
            {ringData.length === 0 ? (
              <p className="text-sm py-10 text-center" style={{ color: '#94a3b8' }}>No task data yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={ringData} cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                      paddingAngle={3} dataKey="value" stroke="none">
                      {ringData.map((r, i) => <Cell key={i} fill={r.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {ringData.map(r => (
                    <div key={r.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                        <span style={{ color: '#475569' }}>{r.name}</span>
                      </span>
                      <span className="font-semibold" style={{ color: '#1e293b' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── DEPT TASK STACKED BAR ──────────────────────────── */}
        {deptTaskData.length > 0 && (
          <section className="rounded-2xl p-6"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <SH>Task Distribution by Department</SH>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptTaskData} margin={{ top: 4, right: 4, bottom: 20, left: -10 }} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="Completed"   stackId="a" fill={C.emerald} radius={[0, 0, 0, 0]} />
                <Bar dataKey="In Progress" stackId="a" fill={C.blue} />
                <Bar dataKey="Open"        stackId="a" fill={C.amber} />
                <Bar dataKey="Overdue"     stackId="a" fill={C.rose} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* ── DEPARTMENT SCORECARD TABLE ─────────────────────── */}
        {depts.length > 0 && (
          <section>
            <SH>Department Scorecard</SH>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <table className="w-full text-sm">
                <thead style={{ background: 'rgba(99,102,241,0.05)' }}>
                  <tr>
                    {['Department', 'Faculty', 'Hours Taught', 'Tasks', 'Completion', 'Appraisal'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: '#64748b' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {depts.map((d, i) => {
                    const total     = (d.tasks_total  ?? d.total_tasks ?? 0)
                    const completed = (d.tasks_done   ?? d.completed   ?? 0)
                    const open      = (d.tasks_open   ?? d.open        ?? 0)
                    const overdue   = (d.tasks_overdue ?? d.overdue    ?? 0)
                    const apprPct   = d.appraisal_completion ?? d.appraisal_pct ?? null
                    const color     = DEPT_COLORS[i % DEPT_COLORS.length]

                    return (
                      <tr key={d.id ?? d.name}
                        className="border-t transition-colors"
                        style={{ borderColor: 'rgba(0,0,0,0.05)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>

                        {/* Dept name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-2 h-8 rounded-full shrink-0" style={{ background: color }} />
                            <div>
                              <p className="font-semibold text-gray-800">{d.name}</p>
                              {d.code && <p className="text-xs font-mono mt-0.5" style={{ color }}>{d.code}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Faculty */}
                        <td className="px-5 py-4">
                          <p className="font-semibold" style={{ color: '#1e293b' }}>{d.faculty_count ?? d.members ?? '—'}</p>
                          {d.hod_name && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>HOD: {d.hod_name}</p>}
                        </td>

                        {/* Hours */}
                        <td className="px-5 py-4">
                          <p className="font-semibold" style={{ color: '#1e293b' }}>{d.total_hours ?? d.hours_taught ?? '—'}</p>
                          {d.avg_hours_per_faculty != null &&
                            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                              avg {d.avg_hours_per_faculty.toFixed(1)}/faculty
                            </p>
                          }
                        </td>

                        {/* Tasks summary */}
                        <td className="px-5 py-4 min-w-[120px]">
                          <div className="flex flex-wrap gap-1.5">
                            {open > 0 &&
                              <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                                style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                                {open} open
                              </span>}
                            {overdue > 0 &&
                              <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                                style={{ background: 'rgba(244,63,94,0.1)', color: '#e11d48' }}>
                                {overdue} overdue
                              </span>}
                            {completed > 0 &&
                              <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                                style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                                {completed} done
                              </span>}
                          </div>
                        </td>

                        {/* Completion bar */}
                        <td className="px-5 py-4 min-w-[130px]">
                          <Bar2 value={completed} total={total} color={color} />
                        </td>

                        {/* Appraisal */}
                        <td className="px-5 py-4">
                          {apprPct != null ? (
                            <>
                              <p className="font-semibold" style={{ color: '#1e293b' }}>{apprPct}%</p>
                              <div className="mt-1 w-20 h-1.5 rounded-full overflow-hidden"
                                style={{ background: 'rgba(0,0,0,0.07)' }}>
                                <div className="h-full rounded-full"
                                  style={{ width: `${apprPct}%`, background: C.violet }} />
                              </div>
                            </>
                          ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Empty state when no dept data at all */}
        {depts.length === 0 && deptTaskData.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              Department data will appear here once analytics are populated.
            </p>
          </div>
        )}

      </main>
    </div>
  )
}
