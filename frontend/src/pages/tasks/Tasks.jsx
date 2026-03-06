/**
 * Tasks.jsx — Task list page
 * Faculty: sees ONLY tasks assigned to them (abstracted view — no dept/institution noise)
 * HOD/Admin: sees all/dept tasks, has "+ New Task" button
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getTasks, getTaskStats } from '../../api/tasks'
import Badge from '../../components/Badge'

const PRIORITY_VARIANT = {
  LOW: 'info', MEDIUM: 'pending', HIGH: 'pending', CRITICAL: 'rejected',
}
const PRIORITY_LABEL_COLOR = {
  LOW: 'text-blue-600 bg-blue-50',
  MEDIUM: 'text-yellow-700 bg-yellow-50',
  HIGH: 'text-orange-700 bg-orange-50',
  CRITICAL: 'text-red-700 bg-red-50',
}
const STATUS_VARIANT = {
  OPEN: 'pending', IN_PROGRESS: 'info', COMPLETED: 'approved', CANCELLED: 'rejected',
}

/* ── SVG Icon helpers ──────────────────────────────────────── */
function Icon({ d, className = 'w-4 h-4', stroke = 'currentColor' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke={stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}
const ICONS = {
  clock:    'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  check:    'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  alert:    'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  list:     'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.007H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.007H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.007H3.75v-.007zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  fire:     'M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z',
  chevron:  'M8.25 4.5l7.5 7.5-7.5 7.5',
  search:   'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  plus:     'M12 4.5v15m7.5-7.5h-15',
  back:     'M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18',
}

/* ── Stat card ─────────────────────────────────────────────── */
function StatCard({ label, value, icon, color, accent }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1.5"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
               boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}14` }}>
        <Icon d={icon} className="w-4 h-4" stroke={accent} />
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: '#0f172a' }}>{value ?? '—'}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{label}</p>
    </div>
  )
}

/* ── Faculty Task Card (premium card layout) ───────────────── */
function FacultyTaskCard({ task, onClick }) {
  const myAssignment = task.assignments?.[0]
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
  const daysLeft = task.due_date ? Math.ceil((new Date(task.due_date) - new Date()) / 86400000) : null

  return (
    <div onClick={onClick}
      className={`relative rounded-2xl p-5 border cursor-pointer transition-all hover:shadow-md group ${
        isOverdue ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-white hover:border-indigo-200'
      }`}>
      {/* Priority indicator stripe */}
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
        style={{ background: task.priority === 'CRITICAL' ? '#ef4444' : task.priority === 'HIGH' ? '#f97316' : task.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6' }} />

      <div className="pl-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
              {task.title}
            </h3>
            {task.category && (
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{task.category}</span>
            )}
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_LABEL_COLOR[task.priority]}`}>
            {task.priority}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Badge label={task.status.replace('_', ' ')} variant={STATUS_VARIANT[task.status]} />
          {myAssignment && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              myAssignment.status === 'COMPLETED' ? 'bg-green-100 text-green-700'
              : myAssignment.status === 'DECLINED' ? 'bg-red-100 text-red-700'
              : myAssignment.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
            }`}>
              My status: {myAssignment.status}
            </span>
          )}
          {task.due_date && (
            <span className={`text-[10px] font-medium flex items-center gap-1 ${isOverdue ? 'text-red-600' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-600' : 'text-gray-400'}`}>
              <Icon d={ICONS.clock} className="w-3 h-3" />
              {isOverdue ? 'Overdue' : task.due_date}
              {!isOverdue && daysLeft !== null && daysLeft <= 7 && (
                <span className="ml-0.5">({daysLeft}d left)</span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
          <span>{task.assignment_count} assigned</span>
          <span>{task.comment_count} comments</span>
          <span className="ml-auto text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium flex items-center gap-0.5">
            Details <Icon d={ICONS.chevron} className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Manager Task Row (table) ──────────────────────────────── */
function TaskRow({ task, onClick }) {
  return (
    <tr onClick={onClick}
      className="hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-800 text-sm">{task.title}</p>
        {task.category && <span className="text-xs text-gray-400">{task.category}</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${PRIORITY_LABEL_COLOR[task.priority]}`}>
          {task.priority}
        </span>
      </td>
      <td className="px-4 py-3">
        <Badge label={task.status.replace('_', ' ')} variant={STATUS_VARIANT[task.status]} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {task.due_date
          ? <span className={new Date(task.due_date) < new Date() && task.status !== 'COMPLETED' ? 'text-red-600 font-medium' : ''}>
              {task.due_date}
            </span>
          : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {task.department_name || <span className="text-gray-300">Institution</span>}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {task.assignment_count} assigned · {task.comment_count} comments
      </td>
    </tr>
  )
}

const FACULTY_TABS = ['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED']
const MANAGER_TABS = ['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export default function Tasks() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState('ALL')
  const [priority, setPriority] = useState('')
  const [search, setSearch] = useState('')

  const isManager = user?.role === 'ADMIN' || user?.role === 'HOD'
  const isFaculty = user?.role === 'FACULTY'
  const tabs = isManager ? MANAGER_TABS : FACULTY_TABS

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusTab !== 'ALL') params.status = statusTab
      if (priority) params.priority = priority
      if (search) params.q = search
      const [t, s] = await Promise.all([getTasks(params), getTaskStats()])
      setTasks(t.data)
      setStats(s.data)
    } finally {
      setLoading(false)
    }
  }, [statusTab, priority, search])

  useEffect(() => { load() }, [load])

  // Faculty: derive urgent / overdue tasks for alert banner
  const overdueTasks = isFaculty ? tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED' && t.status !== 'CANCELLED') : []
  const urgentCount = isFaculty ? tasks.filter(t => t.priority === 'CRITICAL' || t.priority === 'HIGH').length : 0

  return (
    <div className={isFaculty ? 'min-h-screen' : 'p-6 max-w-6xl mx-auto space-y-6'}
      style={isFaculty ? { background: 'linear-gradient(160deg, #f8fafc 0%, #eef2ff 100%)' } : undefined}>

      {isFaculty ? (
        /* ════════════════════════════════════════════════════════
           FACULTY VIEW — Premium card-based layout
           ════════════════════════════════════════════════════════ */
        <>
          {/* Header */}
          <header className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(14px)',
                     borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/faculty-dashboard')}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                <Icon d={ICONS.back} className="w-4 h-4 text-gray-500" />
              </button>
              <div>
                <h1 className="text-base font-bold" style={{ color: '#0f172a' }}>My Tasks</h1>
                <p className="text-[11px]" style={{ color: '#94a3b8' }}>Tasks assigned to you by the administration</p>
              </div>
            </div>
          </header>

          <main className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-6">

            {/* Overdue / Urgent alert banner */}
            {(overdueTasks.length > 0 || urgentCount > 0) && (
              <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
                style={{ background: overdueTasks.length > 0 ? 'linear-gradient(135deg, #fef2f2, #fff1f2)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                         border: overdueTasks.length > 0 ? '1px solid #fecaca' : '1px solid #fde68a' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: overdueTasks.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' }}>
                  <Icon d={ICONS.alert} className="w-5 h-5" stroke={overdueTasks.length > 0 ? '#ef4444' : '#f59e0b'} />
                </div>
                <div>
                  {overdueTasks.length > 0 && (
                    <p className="text-sm font-semibold text-red-700">
                      {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} need your attention
                    </p>
                  )}
                  {urgentCount > 0 && (
                    <p className="text-xs text-amber-700 mt-0.5">
                      {urgentCount} high/critical priority task{urgentCount > 1 ? 's' : ''} assigned
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Stats Strip */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Pending" value={stats.my_pending} icon={ICONS.clock} accent="#f59e0b" />
                <StatCard label="Accepted" value={stats.my_accepted} icon={ICONS.list} accent="#3b82f6" />
                <StatCard label="Completed" value={stats.my_completed} icon={ICONS.check} accent="#10b981" />
                <StatCard label="Overdue" value={stats.overdue} icon={ICONS.fire} accent="#ef4444" />
              </div>
            )}

            {/* Filter bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-0.5 bg-white/70 p-1 rounded-xl border border-gray-100">
                {tabs.map(t => (
                  <button key={t} onClick={() => setStatusTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusTab === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Priorities</option>
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="relative flex-1 min-w-[140px] max-w-[240px]">
                <Icon d={ICONS.search} className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks…"
                  className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Task cards */}
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200"
                style={{ background: 'rgba(255,255,255,0.6)' }}>
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.08)' }}>
                  <Icon d={ICONS.check} className="w-6 h-6" stroke="#6366f1" />
                </div>
                <p className="text-sm font-medium text-gray-500">No tasks found</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(t => (
                  <FacultyTaskCard key={t.id} task={t} onClick={() => navigate(`/tasks/${t.id}`)} />
                ))}
              </div>
            )}
          </main>
        </>
      ) : (
        /* ════════════════════════════════════════════════════════
           MANAGER VIEW — Table layout (unchanged)
           ════════════════════════════════════════════════════════ */
        <>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Task Manager</h1>
              <p className="text-sm text-gray-500 mt-1">Manage and track institutional tasks.</p>
            </div>
            {isManager && (
              <button onClick={() => navigate('/tasks/new')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                + New Task
              </button>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Open" value={stats.open} icon={ICONS.clock} accent="#f59e0b" />
              <StatCard label="In Progress" value={stats.in_progress} icon={ICONS.list} accent="#3b82f6" />
              <StatCard label="Completed" value={stats.completed} icon={ICONS.check} accent="#10b981" />
              <StatCard label="Overdue" value={stats.overdue} icon={ICONS.fire} accent="#ef4444" />
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-0.5 bg-gray-100 p-1 rounded-xl">
              {tabs.map(t => (
                <button key={t} onClick={() => setStatusTab(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    statusTab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Priorities</option>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]" />
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              No tasks found.
              {isManager && (
                <div className="mt-3">
                  <button onClick={() => navigate('/tasks/new')} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Create one →</button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Title', 'Priority', 'Status', 'Due', 'Dept', 'Activity'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => <TaskRow key={t.id} task={t} onClick={() => navigate(`/tasks/${t.id}`)} />)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
