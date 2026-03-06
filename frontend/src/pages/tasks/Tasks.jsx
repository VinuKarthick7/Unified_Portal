/**
 * Tasks.jsx — Task list page
 * Faculty: sees tasks assigned to them, can filter by status
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

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function TaskRow({ task, onClick }) {
  // Find current user's assignment if any
  const myAssignment = task.assignments?.[0]

  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
    >
      <td className="px-4 py-3">
        <p className="font-medium text-gray-800 text-sm">{task.title}</p>
        {task.category && (
          <span className="text-xs text-gray-400">{task.category}</span>
        )}
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
      <td className="px-4 py-3">
        {myAssignment && (
          <Badge
            label={myAssignment.status}
            variant={myAssignment.status === 'COMPLETED' ? 'approved' : myAssignment.status === 'DECLINED' ? 'rejected' : 'pending'}
          />
        )}
      </td>
    </tr>
  )
}

const STATUS_TABS = ['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Task Manager</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isManager ? 'Manage and track institutional tasks.' : 'Your assigned tasks and progress.'}
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => navigate('/tasks/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + New Task
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isManager ? (
            <>
              <StatCard label="Open" value={stats.open} color="bg-yellow-50 border-yellow-200" />
              <StatCard label="In Progress" value={stats.in_progress} color="bg-blue-50 border-blue-200" />
              <StatCard label="Completed" value={stats.completed} color="bg-green-50 border-green-200" />
              <StatCard label="Overdue" value={stats.overdue} color="bg-red-50 border-red-200" />
            </>
          ) : (
            <>
              <StatCard label="Pending" value={stats.my_pending} color="bg-yellow-50 border-yellow-200" />
              <StatCard label="Accepted" value={stats.my_accepted} color="bg-blue-50 border-blue-200" />
              <StatCard label="Completed" value={stats.my_completed} color="bg-green-50 border-green-200" />
              <StatCard label="Overdue" value={stats.overdue} color="bg-red-50 border-red-200" />
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex gap-0.5 bg-gray-100 p-1 rounded-xl">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setStatusTab(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusTab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Priorities</option>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          No tasks found.
          {isManager && (
            <div className="mt-3">
              <button onClick={() => navigate('/tasks/new')}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                Create one →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Title', 'Priority', 'Status', 'Due', 'Dept', 'Activity', 'My Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} onClick={() => navigate(`/tasks/${t.id}`)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
