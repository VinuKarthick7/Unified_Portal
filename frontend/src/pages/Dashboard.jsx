import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats } from '../api/analytics'
import NotificationBell from '../components/NotificationBell'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({})

  // Admin users get their own visual dashboard
  useEffect(() => {
    if (user?.role === 'ADMIN') navigate('/admin-dashboard', { replace: true })
    if (user?.role === 'FACULTY') navigate('/faculty-dashboard', { replace: true })
  }, [user?.role])

  useEffect(() => {
    getDashboardStats()
      .then(({ data }) => setStats(data))
      .catch(() => {})
  }, [])

  const role = user?.role

  // Badge helpers — returns a positive integer or 0
  const b = (...keys) => keys.reduce((sum, k) => sum + (parseInt(stats[k]) || 0), 0)

  // Role-aware badge values
  const isMgmt = role === 'HOD' || role === 'ADMIN' || role === 'COORDINATOR'

  const tasksBadge      = isMgmt ? b('tasks_open', 'tasks_in_progress') : b('tasks_pending', 'tasks_accepted')
  const handlingBadge   = b('handling_pending_review')
  const schedulerBadge  = b('swap_requests_pending', 'extra_classes_pending')
  const appraisalBadge  = isMgmt ? b('appraisals_need_action', 'appraisals_submitted') : b('appraisals_draft')
  const hodInboxBadge   = b('handling_pending_review', 'swap_requests_pending', 'extra_classes_pending', 'appraisals_need_action')

  const modules = [
    {
      label: 'KG-APS Creation',
      desc: 'Manage syllabus structure',
      color: 'bg-indigo-50 border-indigo-200',
      route: '/kgaps/creation',
    },
    {
      label: 'KG-APS Handling',
      desc: 'Track teaching progress',
      color: 'bg-green-50 border-green-200',
      route: '/kgaps/handling',
      badge: handlingBadge,
    },
    {
      label: 'Academic Scheduler',
      desc: 'Timetable & daily entries',
      color: 'bg-yellow-50 border-yellow-200',
      route: '/scheduler',
    },
    {
      label: 'Scheduler Requests',
      desc: 'Swaps & extra classes',
      color: 'bg-amber-50 border-amber-200',
      route: '/scheduler/requests',
      badge: schedulerBadge,
    },
    {
      label: 'Task Manager',
      desc: 'Institutional tasks',
      color: 'bg-orange-50 border-orange-200',
      route: '/tasks',
      badge: tasksBadge,
    },
    {
      label: 'Departments',
      desc: 'Manage departments',
      color: 'bg-purple-50 border-purple-200',
      route: '/departments',
    },
    {
      label: 'Courses',
      desc: 'Courses & assignments',
      color: 'bg-blue-50 border-blue-200',
      route: '/courses',
    },
    {
      label: 'Appraisal',
      desc: 'Faculty performance',
      color: 'bg-pink-50 border-pink-200',
      route: '/appraisal',
      badge: appraisalBadge,
    },
    {
      label: 'Analytics',
      desc: 'Reports & insights',
      color: 'bg-teal-50 border-teal-200',
      route: '/analytics',
    },
    // Faculty-only: My Day
    ...(role === 'FACULTY'
      ? [{
          label: 'My Day',
          desc: "Today's schedule & tasks",
          color: 'bg-emerald-50 border-emerald-200',
          route: '/my-day',
          badge: b('tasks_pending', 'handling_pending_review'),
        }]
      : []),
    // HOD / Admin: Unified inbox
    ...(role === 'HOD' || role === 'ADMIN'
      ? [{
          label: 'HOD Inbox',
          desc: 'All pending approvals',
          color: 'bg-red-50 border-red-200',
          route: '/hod-inbox',
          badge: hodInboxBadge,
        }]
      : []),
    // Coordinator / Admin: material verification
    ...(role === 'ADMIN' || role === 'COORDINATOR'
      ? [{ label: 'Material Verification', desc: 'Review uploaded materials', color: 'bg-lime-50 border-lime-200', route: '/kgaps/verification' }]
      : []),
    // HOD / Admin: handling verify + timetable
    ...(role === 'ADMIN' || role === 'HOD'
      ? [
          { label: 'Handling Verification', desc: 'Verify faculty teaching logs', color: 'bg-cyan-50 border-cyan-200', route: '/kgaps/handling/verify', badge: handlingBadge },
          { label: 'Timetable Setup',        desc: 'Configure weekly timetables',  color: 'bg-sky-50 border-sky-200',  route: '/scheduler/setup' },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">
          Faculty Academic Operations Portal
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user?.first_name} {user?.last_name}
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {user?.role}
            </span>
          </span>
          <NotificationBell />
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Module grid */}
      <main className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((m) => (
            <div
              key={m.label}
              onClick={() => m.route && navigate(m.route)}
              className={`relative border rounded-xl p-5 ${m.color} ${
                m.route
                  ? 'cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all'
                  : 'opacity-60 cursor-not-allowed'
              }`}
            >
              {/* Badge */}
              {m.badge > 0 && (
                <span className="absolute top-3 right-3 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold leading-none">
                  {m.badge > 99 ? '99+' : m.badge}
                </span>
              )}
              <h2 className="font-semibold text-gray-800 text-sm">{m.label}</h2>
              <p className="text-xs text-gray-500 mt-1">{m.desc}</p>
              <span className="mt-3 inline-block text-xs text-gray-400">
                {m.route ? 'Open →' : 'Coming soon'}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}