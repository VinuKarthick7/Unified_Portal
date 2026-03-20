/**
 * HODDashboard.jsx — Rich visual department dashboard for HOD role.
 * Dept-scoped: faculty progress, pending approvals, task health, appraisals.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getModuleSummary,
  getTaskAnalytics,
  getWorkloadTrend,
  getDepartmentOverview,
  getHODInbox,
} from '../../api/analytics'
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

/* ── palette (teal/emerald for HOD, distinct from admin indigo) ── */
const C = {
  teal:    '#0d9488',
  emerald: '#10b981',
  sky:     '#0ea5e9',
  amber:   '#f59e0b',
  rose:    '#f43f5e',
  violet:  '#8b5cf6',
  indigo:  '#6366f1',
  slate:   '#64748b',
}

/* ── KPI card ─────────────────────────────────────────────────── */
function KPI({ label, value, sub, color = C.teal, onClick }) {
  return (
    <div
      onClick={onClick}
      className={onClick ? 'cursor-pointer' : ''}
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        transition: onClick ? 'box-shadow 0.15s, transform 0.15s' : undefined,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)')}
    >
      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
      </div>
      <p style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{value ?? '—'}</p>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

/* ── section heading ──────────────────────────────────────────── */
function SH({ children }) {
  return (
    <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 16 }}>
      {children}
    </h2>
  )
}

/* ── mini progress bar ────────────────────────────────────────── */
function MiniBar({ value, total, color }) {
  const pct = total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 9999, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 9999, width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

/* ── quick action card ────────────────────────────────────────── */
function ActionCard({ icon, label, desc, badge, onClick, color = C.teal }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer relative"
      style={{
        background: '#fff',
        border: `1px solid ${color}22`,
        borderRadius: 14,
        padding: '16px',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px ${color}20`; e.currentTarget.style.borderColor = `${color}55` }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = `${color}22` }}
    >
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: 10, right: 10,
          minWidth: 20, height: 20, padding: '0 6px',
          borderRadius: 9999, background: C.rose, color: '#fff',
          fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, fontSize: 18 }}>
        {icon}
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{label}</p>
      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{desc}</p>
    </div>
  )
}

/* ── main component ───────────────────────────────────────────── */
export default function HODDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [summary,  setSummary]  = useState(null)
  const [tasks,    setTasks]    = useState([])
  const [workload, setWorkload] = useState([])
  const [dept,     setDept]     = useState(null)   // single dept object
  const [inbox,    setInbox]    = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      getModuleSummary(),
      getTaskAnalytics(),
      getWorkloadTrend(),
      getDepartmentOverview(),
      getHODInbox(),
    ])
      .then(([s, t, w, d, h]) => {
        setSummary(s.data)
        setTasks(Array.isArray(t.data) ? t.data : t.data?.dept_breakdown ?? [])
        setWorkload(Array.isArray(w.data) ? w.data : w.data?.trend ?? [])
        const depts = Array.isArray(d.data) ? d.data : d.data?.departments ?? []
        setDept(depts[0] ?? null)   // HOD sees exactly their own dept
        setInbox(h.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  /* derived values */
  const s = summary ?? {}
  const counts = inbox?.counts ?? {}
  const pendingTotal = counts.total ?? 0

  const tasksDeptData = tasks         // dept_breakdown already scoped by backend
  const taskOpen       = tasksDeptData.reduce((a, d) => a + (d.open ?? 0), 0)
  const taskInProgress = tasksDeptData.reduce((a, d) => a + (d.in_progress ?? 0), 0)
  const taskOverdue    = tasksDeptData.reduce((a, d) => a + (d.overdue ?? 0), 0)
  const taskCompleted  = s.tasks_completed ?? tasksDeptData.reduce((a, d) => a + (d.completed ?? 0), 0)
  const taskTotal      = s.tasks_total ?? (taskOpen + taskInProgress + taskCompleted + taskOverdue)

  const apprTotal     = s.appraisals_total ?? 0
  const apprCompleted = s.appraisals_completed ?? 0
  const apprPct       = apprTotal > 0 ? Math.round((apprCompleted / apprTotal) * 100) : null

  /* pending actions donut */
  const pendingRing = [
    { name: 'Handling',     value: counts.handling_verification ?? 0, color: C.sky },
    { name: 'Swaps',        value: counts.swap_requests ?? counts.swap_request ?? 0, color: C.amber },
    { name: 'Extra Class',  value: counts.extra_classes ?? counts.extra_class ?? 0, color: C.violet },
    { name: 'Appraisals',   value: counts.appraisals ?? counts.appraisal ?? 0, color: C.rose },
    { name: 'Overdue Tasks',value: counts.overdue_tasks ?? counts.task ?? 0, color: C.emerald },
  ].filter(r => r.value > 0)

  /* task status ring */
  const taskRing = [
    { name: 'Completed',   value: taskCompleted,  color: C.emerald },
    { name: 'In Progress', value: taskInProgress, color: C.sky },
    { name: 'Open',        value: taskOpen,        color: C.amber },
    { name: 'Overdue',     value: taskOverdue,     color: C.rose },
  ].filter(r => r.value > 0)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0fdf9, #ecfdf5)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="w-10 h-10 rounded-full border-2 border-t-teal-500 border-teal-100 animate-spin" />
          <p style={{ fontSize: 13, fontWeight: 500, color: C.teal }}>Loading department dashboard…</p>
        </div>
      </div>
    )
  }

  const deptName = dept?.dept_name ?? user?.department_name ?? 'Your Department'
  const deptCode = dept?.dept_code ?? ''

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0fdf9 0%, #ecfdf5 50%, #f0f9ff 100%)' }}>

      {/* ── HERO HEADER ────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(13,148,136,0.12)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${C.teal}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            🏫
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{deptName}</p>
            <p style={{ fontSize: 12, color: C.slate }}>HOD Dashboard {deptCode && `· ${deptCode}`}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {pendingTotal > 0 && (
            <button
              onClick={() => navigate('/hod-inbox')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, background: `${C.rose}10`, border: `1px solid ${C.rose}30`, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.rose }}
            >
              <span style={{ minWidth: 20, height: 20, borderRadius: 9999, background: C.rose, color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{pendingTotal > 99 ? '99+' : pendingTotal}</span>
              Pending Actions
            </button>
          )}
          <div style={{ fontSize: 13, color: C.slate, fontWeight: 500 }}>
            Dr. {user?.first_name} {user?.last_name}
          </div>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── KPI ROW ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
          <KPI label="Faculty" value={s.faculty_count ?? dept?.faculty_count} color={C.teal} sub="in your department" />
          <KPI label="Teaching Hours" value={dept?.handling_hours != null ? `${Math.round(dept.handling_hours)}h` : (s.total_handling_hours != null ? `${Math.round(s.total_handling_hours)}h` : null)} color={C.sky} sub="approved this semester" />
          <KPI label="Pending Actions" value={pendingTotal > 0 ? pendingTotal : '✓ All clear'} color={pendingTotal > 0 ? C.rose : C.emerald} onClick={pendingTotal > 0 ? () => navigate('/hod-inbox') : undefined} sub={pendingTotal > 0 ? 'need your attention' : 'nothing pending'} />
          <KPI label="Tasks" value={taskTotal ?? '—'} color={C.amber} sub={taskOverdue > 0 ? `${taskOverdue} overdue` : `${taskCompleted} completed`} />
          <KPI label="Appraisals" value={apprPct != null ? `${apprPct}%` : '—'} color={C.violet} sub={apprTotal > 0 ? `${apprCompleted}/${apprTotal} completed` : 'no submissions yet'} />
        </div>

        {/* ── QUICK ACTIONS ────────────────────────────────────── */}
        <section>
          <SH>Quick Actions</SH>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <ActionCard icon="📥" label="HOD Inbox" desc="All pending approvals" badge={pendingTotal} color={C.rose} onClick={() => navigate('/hod-inbox')} />
            <ActionCard icon="📋" label="Handling Verify" desc="Review teaching logs" badge={counts.handling_verification ?? 0} color={C.sky} onClick={() => navigate('/kgaps/handling/verify')} />
            <ActionCard icon="🔄" label="Swap Requests" desc="Approve / reject swaps" badge={counts.swap_requests ?? counts.swap_request ?? 0} color={C.amber} onClick={() => navigate('/scheduler/requests')} />
            <ActionCard icon="📊" label="Appraisals" desc="Review submissions" badge={counts.appraisals ?? counts.appraisal ?? 0} color={C.violet} onClick={() => navigate('/appraisal')} />
            <ActionCard icon="📖" label="Teaching Progress" desc="KG-APS handling log" color={C.teal} onClick={() => navigate('/kgaps/handling')} />
            <ActionCard icon="📅" label="Timetable" desc="Configure schedules" color={C.indigo} onClick={() => navigate('/scheduler/setup')} />
            <ActionCard icon="✅" label="Tasks" desc="Dept task tracker" badge={taskOverdue > 0 ? taskOverdue : 0} color={C.emerald} onClick={() => navigate('/tasks')} />
            <ActionCard icon="🎓" label="Courses" desc="Browse course list" color={C.slate} onClick={() => navigate('/courses')} />
          </div>
        </section>

        {/* ── WORKLOAD TREND + PENDING ACTIONS DONUT ───────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
          {/* Workload trend */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderRadius: 16, padding: 24 }}>
            <SH>Monthly Teaching Hours — {deptCode || 'Department'}</SH>
            {workload.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>No teaching records yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={workload} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="hodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.teal} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Area type="monotone" dataKey="hours" name="Hours" stroke={C.teal} strokeWidth={2} fill="url(#hodGrad)" dot={{ r: 3, fill: C.teal }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pending actions donut */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderRadius: 16, padding: 24, minWidth: 220 }}>
            <SH>Pending Actions</SH>
            {pendingRing.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#10b981' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>All clear!</p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>No actions needed.</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pendingRing} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none">
                      {pendingRing.map((r, i) => <Cell key={i} fill={r.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pendingRing.map(r => (
                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                        <span style={{ color: '#475569' }}>{r.name}</span>
                      </span>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── TASK STATUS ROW ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>

          {/* Task stacked bar */}
          {tasksDeptData.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderRadius: 16, padding: 24 }}>
              <SH>Task Distribution</SH>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tasksDeptData} margin={{ top: 4, right: 4, bottom: 20, left: -10 }} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="dept" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="completed"   stackId="s" fill={C.emerald} name="Completed" />
                  <Bar dataKey="in_progress" stackId="s" fill={C.sky}     name="In Progress" />
                  <Bar dataKey="open"        stackId="s" fill={C.amber}   name="Open" />
                  <Bar dataKey="overdue"     stackId="s" fill={C.rose}    name="Overdue"   radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Task status ring */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderRadius: 16, padding: 24, minWidth: 220 }}>
            <SH>Task Health</SH>
            {taskRing.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>No tasks assigned yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={taskRing} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none">
                      {taskRing.map((r, i) => <Cell key={i} fill={r.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {taskRing.map(r => (
                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                        <span style={{ color: '#475569' }}>{r.name}</span>
                      </span>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── FACULTY SCORECARD ────────────────────────────────── */}
        {dept && (
          <section>
            <SH>Department Scorecard — {deptName}</SH>
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderRadius: 16, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead style={{ background: `${C.teal}08` }}>
                  <tr>
                    {['Metric', 'Value', 'Progress'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Faculty Members', value: dept.faculty_count, total: null, color: C.teal },
                    { label: 'Teaching Hours (Approved)', value: `${Math.round(dept.handling_hours ?? 0)}h`, total: null, color: C.sky },
                    { label: 'Tasks Completed', value: `${dept.tasks_completed ?? 0} / ${dept.tasks_total ?? 0}`, rawValue: dept.tasks_completed, rawTotal: dept.tasks_total, color: C.emerald },
                    { label: 'Tasks Overdue', value: dept.tasks_overdue ?? 0, total: null, warn: (dept.tasks_overdue ?? 0) > 0, color: C.rose },
                    { label: 'Appraisals Completed', value: `${dept.appraisals_done ?? 0} / ${dept.appraisals_total ?? 0}`, rawValue: dept.appraisals_done, rawTotal: dept.appraisals_total, color: C.violet },
                  ].map(row => (
                    <tr key={row.label} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
                      onMouseEnter={e => e.currentTarget.style.background = `${C.teal}04`}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '14px 20px', color: '#475569', fontWeight: 500 }}>{row.label}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: row.warn ? C.rose : '#1e293b' }}>{row.value}</td>
                      <td style={{ padding: '14px 20px', minWidth: 160 }}>
                        {row.rawTotal > 0
                          ? <MiniBar value={row.rawValue ?? 0} total={row.rawTotal} color={row.color} />
                          : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── APPRAISAL PROGRESS BAR ───────────────────────────── */}
        {apprTotal > 0 && (
          <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderRadius: 16, padding: 24 }}>
            <SH>Appraisal Overview</SH>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {[
                { label: 'Completed', value: apprCompleted, total: apprTotal, color: C.emerald },
                { label: 'Under Review', value: (apprTotal - apprCompleted - (s.appraisals_total - s.appraisals_completed - (s.appraisals_total - apprCompleted - (apprTotal - apprCompleted)) > 0 ? 0 : 0)), total: apprTotal, color: C.amber },
                { label: 'Pending Submission', value: Math.max(0, apprTotal - apprCompleted), total: apprTotal, color: C.rose },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.value} / {item.total}</span>
                  </div>
                  <MiniBar value={item.value} total={item.total} color={item.color} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => navigate('/appraisal')}
                style={{ fontSize: 12, fontWeight: 600, color: C.violet, background: `${C.violet}10`, border: `1px solid ${C.violet}30`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
              >
                Review Appraisals →
              </button>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
