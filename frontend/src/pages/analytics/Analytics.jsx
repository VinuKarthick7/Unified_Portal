/**
 * Analytics.jsx — Phase 5 analytics & reporting page.
 * Charts: workload trend (area), task status (pie), task priority (bar),
 *         department overview (table — HOD/Admin only).
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell, Tooltip, Legend,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'

import {
  getModuleSummary,
  getTaskAnalytics,
  getWorkloadTrend,
  getDepartmentOverview,
} from '../../api/analytics'

// ── Color palette ──────────────────────────────────────────────────────────
const PIE_COLORS   = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const PRIORITY_CLR = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e' }

// ── Small helpers ───────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'bg-white' }) {
  return (
    <div className={`${color} border border-gray-200 rounded-xl p-4 flex flex-col gap-1`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function LoadingBox({ h = 'h-64' }) {
  return <div className={`${h} bg-gray-100 rounded-xl animate-pulse`} />
}

// ── Custom Pie label ────────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (!value) return null
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {value}
    </text>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function Analytics() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isMgmt = ['ADMIN', 'HOD'].includes(user?.role)

  const [summary,  setSummary]  = useState(null)
  const [tasks,    setTasks]    = useState(null)
  const [workload, setWorkload] = useState(null)
  const [depts,    setDepts]    = useState(null)
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    const calls = [
      getModuleSummary().then(({ data }) => setSummary(data)).catch(() => {}),
      getTaskAnalytics().then(({ data }) => setTasks(data)).catch(() => {}),
      getWorkloadTrend().then(({ data }) => setWorkload(data)).catch(() => {}),
    ]
    if (isMgmt) {
      calls.push(getDepartmentOverview().then(({ data }) => setDepts(data)).catch(() => {}))
    }
    Promise.all(calls).finally(() => setLoading(false))
  }, [isMgmt])

  useEffect(() => { load() }, [load])

  // ── Derived data for charts ──────────────────────────────────────────────
  const priorityChartData = (tasks?.priority_distribution ?? []).map(r => ({
    name: r.name,
    count: r.value,
    fill: PRIORITY_CLR[r.name] ?? '#6366f1',
  }))

  const statusPieData  = tasks?.status_distribution  ?? []
  const workloadTrend  = workload?.trend              ?? []
  const deptRows       = depts?.departments           ?? []

  const completionRate = summary
    ? summary.tasks_total > 0
      ? Math.round((summary.tasks_completed / summary.tasks_total) * 100)
      : 0
    : null

  const appraisalRate = summary
    ? summary.appraisals_total > 0
      ? Math.round((summary.appraisals_completed / summary.appraisals_total) * 100)
      : 0
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</button>
        <h1 className="text-lg font-semibold text-gray-800 flex-1">Analytics &amp; Reports</h1>
        <button onClick={load} className="text-xs text-blue-600 hover:text-blue-800">↻ Refresh</button>
      </header>

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* KPI Strip */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array(6).fill(0).map((_, i) => <LoadingBox key={i} h="h-24" />)}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard label="Faculty" value={summary.faculty_count} color="bg-indigo-50" />
            <KpiCard label="Teaching Hours" value={summary.total_handling_hours.toFixed(0)} color="bg-green-50" />
            <KpiCard label="Tasks Total" value={summary.tasks_total} color="bg-amber-50" />
            <KpiCard
              label="Task Completion"
              value={`${completionRate}%`}
              sub={`${summary.tasks_completed} / ${summary.tasks_total}`}
              color="bg-orange-50"
            />
            <KpiCard label="Appraisals" value={summary.appraisals_total} color="bg-pink-50" />
            <KpiCard
              label="Appraisal Done"
              value={`${appraisalRate}%`}
              sub={`${summary.appraisals_completed} completed`}
              color="bg-purple-50"
            />
          </div>
        ) : null}

        {/* Charts row 1: Workload trend + Task status pie */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Workload area chart — 3/5 */}
          <ChartCard title="📈 Monthly Teaching Hours (last 6 months)" className="lg:col-span-3">
            {loading ? <LoadingBox /> : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={workloadTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} hrs`, 'Hours']} />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#hoursGrad)"
                    dot={{ r: 3, fill: '#6366f1' }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Task status pie — 2/5 */}
          <ChartCard title="🍩 Task Status Distribution" className="lg:col-span-2">
            {loading ? <LoadingBox /> : statusPieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No task data</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%" cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    labelLine={false}
                    label={PieLabel}
                  >
                    {statusPieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Charts row 2: Priority bar + (HOD) dept table */}
        <div className={`grid grid-cols-1 ${isMgmt ? 'lg:grid-cols-5' : 'lg:grid-cols-3'} gap-6`}>
          {/* Priority bar chart — 2/5 or 1/3 */}
          <ChartCard title="📊 Tasks by Priority" className={isMgmt ? 'lg:col-span-2' : ''}>
            {loading ? <LoadingBox /> : priorityChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No task data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priorityChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Tasks']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {priorityChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Dept task breakdown bar — HOD/Admin only */}
          {isMgmt && (
            <ChartCard title="🏢 Task Load by Department" className="lg:col-span-3">
              {loading ? <LoadingBox /> : deptRows.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No department data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={deptRows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="dept_code" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="open"       name="Open"       fill="#6366f1" stackId="a" />
                    <Bar dataKey="in_progress" name="In Progress" fill="#f59e0b" stackId="a" />
                    <Bar dataKey="completed"  name="Completed"  fill="#22c55e" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}
        </div>

        {/* Department scorecard table — HOD/Admin only */}
        {isMgmt && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">🏛 Department Scorecards</h3>
            </div>
            {loading ? (
              <div className="p-5 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : deptRows.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No department data found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left">Department</th>
                      <th className="px-4 py-3 text-center">Faculty</th>
                      <th className="px-4 py-3 text-center">Hours Taught</th>
                      <th className="px-4 py-3 text-center">Tasks Open</th>
                      <th className="px-4 py-3 text-center">Tasks Done</th>
                      <th className="px-4 py-3 text-center text-red-500">Overdue</th>
                      <th className="px-4 py-3 text-center">Appraisals</th>
                      <th className="px-4 py-3 text-center">Appraisal %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deptRows.map((d) => {
                      const apPct = d.appraisals_total > 0
                        ? Math.round((d.appraisals_done / d.appraisals_total) * 100)
                        : 0
                      return (
                        <tr key={d.dept_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-800">
                            {d.dept_name}
                            <span className="ml-2 text-xs text-gray-400">{d.dept_code}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{d.faculty_count}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{d.handling_hours.toFixed(1)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              d.tasks_total > 0 ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400'
                            }`}>
                              {d.tasks_total - d.tasks_completed}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              {d.tasks_completed}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {d.tasks_overdue > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                {d.tasks_overdue}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">
                            {d.appraisals_done}/{d.appraisals_total}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-indigo-500 h-1.5 rounded-full"
                                  style={{ width: `${apPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{apPct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
