/**
 * AppLayout.jsx — Persistent layout wrapper.
 * Renders sidebar (desktop) + mobile hamburger + main content area.
 * Wraps every protected page except /login.
 */
import { useState } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

function HamburgerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()

  /* Derive a short page title from the pathname */
  const pageTitle = (() => {
    const p = location.pathname
    if (p === '/') return 'Module Hub'
    if (p === '/faculty-dashboard') return 'Faculty Dashboard'
    if (p === '/admin-dashboard') return 'Admin Dashboard'
    if (p.startsWith('/kgaps/creation')) return 'Upload Material'
    if (p.startsWith('/kgaps/verification')) return 'Material Verification'
    if (p.startsWith('/kgaps/handling/verify')) return 'Verify Teaching Logs'
    if (p.startsWith('/kgaps/handling')) return 'Teaching Progress'
    if (p.startsWith('/scheduler/setup')) return 'Timetable Setup'
    if (p.startsWith('/scheduler/requests')) return 'Swap Requests'
    if (p.startsWith('/scheduler')) return 'Daily Scheduler'
    if (p.startsWith('/tasks')) return 'Tasks'
    if (p.startsWith('/appraisal')) return 'Appraisal'
    if (p.startsWith('/hod-inbox')) return 'HOD Inbox'
    if (p.startsWith('/my-day')) return 'My Day'
    if (p.startsWith('/analytics')) return 'Analytics'
    if (p.startsWith('/departments')) return 'Departments'
    if (p.startsWith('/courses')) return 'Courses'
    return 'Portal'
  })()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar — only visible on small screens */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <HamburgerIcon />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{pageTitle}</p>
          </div>
          {user && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #0ea5e9)' }}>
                {(user.first_name?.[0] ?? user.username?.[0] ?? '?').toUpperCase()}
              </div>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
