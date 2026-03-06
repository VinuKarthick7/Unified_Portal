/**
 * Sidebar.jsx — Role-aware persistent navigation sidebar.
 * Desktop: icon-rail (64px) that expands to full sidebar (220px) on hover.
 * Mobile: hidden by default; toggled via the hamburger button in AppLayout.
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

/* ── SVG Icon helper ──────────────────────────────────────── */
function Icon({ d, className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

/* ── Icon paths ────────────────────────────────────────────── */
const IC = {
  home:       'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  faculty:    'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605',
  calendar:   'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  upload:     'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
  book:       'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  chart:      'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  clipboard:  'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25',
  star:       'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  inbox:      'M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3',
  analytics:  'M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z',
  building:   'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z',
  graduationCap: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5',
  magnify:    'M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.773 4.773zM21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  checkDoc:   'M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12',
  table:      'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c-.621 0-1.125.504-1.125 1.125v1.5m2.25-2.625h7.5m-7.5 0A1.125 1.125 0 0110.875 12v1.5m1.125 0v-1.5m0 0h7.5m0 0c.621 0 1.125.504 1.125 1.125v1.5',
  swap:       'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
  sun:        'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z',
  chevronLeft: 'M15.75 19.5L8.25 12l7.5-7.5',
  bars:       'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  signout:    'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
}

/* ── Nav item definitions per role ─────────────────────────── */
function useNavItems() {
  const { user } = useAuth()
  const role = user?.role

  const allItems = {
    FACULTY: [
      { label: 'Dashboard',         path: '/faculty-dashboard',  icon: IC.faculty  },
      { label: 'Daily Log',          path: '/scheduler',           icon: IC.calendar },
      { label: 'Upload Material',    path: '/kgaps/creation',      icon: IC.upload   },
      { label: 'Teaching Progress',  path: '/kgaps/handling',      icon: IC.chart    },
      { label: 'My Tasks',           path: '/tasks',               icon: IC.clipboard },
      { label: 'Appraisal',          path: '/appraisal',           icon: IC.star     },
      { label: 'Swap Requests',      path: '/scheduler/requests',  icon: IC.swap     },
    ],
    HOD: [
      { label: 'Module Hub',         path: '/',                    icon: IC.home        },
      { label: 'KG-APS Creation',    path: '/kgaps/creation',      icon: IC.book        },
      { label: 'Verify Handling',    path: '/kgaps/handling/verify',icon: IC.checkDoc   },
      { label: 'HOD Inbox',          path: '/hod-inbox',           icon: IC.inbox       },
      { label: 'Scheduler',          path: '/scheduler',           icon: IC.calendar    },
      { label: 'Timetable Setup',    path: '/scheduler/setup',     icon: IC.table       },
      { label: 'Swap Requests',      path: '/scheduler/requests',  icon: IC.swap        },
      { label: 'Tasks',              path: '/tasks',               icon: IC.clipboard   },
      { label: 'Appraisal',          path: '/appraisal',           icon: IC.star        },
      { label: 'Analytics',          path: '/analytics',           icon: IC.analytics   },
      { label: 'Courses',            path: '/courses',             icon: IC.graduationCap},
    ],
    ADMIN: [
      { label: 'Admin Dashboard',    path: '/admin-dashboard',     icon: IC.chart       },
      { label: 'Module Hub',         path: '/',                    icon: IC.home        },
      { label: 'KG-APS Creation',    path: '/kgaps/creation',      icon: IC.book        },
      { label: 'Material Verify',    path: '/kgaps/verification',  icon: IC.magnify     },
      { label: 'Verify Handling',    path: '/kgaps/handling/verify',icon: IC.checkDoc   },
      { label: 'HOD Inbox',          path: '/hod-inbox',           icon: IC.inbox       },
      { label: 'Scheduler',          path: '/scheduler',           icon: IC.calendar    },
      { label: 'Timetable Setup',    path: '/scheduler/setup',     icon: IC.table       },
      { label: 'Swap Requests',      path: '/scheduler/requests',  icon: IC.swap        },
      { label: 'Tasks',              path: '/tasks',               icon: IC.clipboard   },
      { label: 'Appraisal',          path: '/appraisal',           icon: IC.star        },
      { label: 'Departments',        path: '/departments',         icon: IC.building    },
      { label: 'Courses',            path: '/courses',             icon: IC.graduationCap},
      { label: 'Analytics',          path: '/analytics',           icon: IC.analytics   },
    ],
    COORDINATOR: [
      { label: 'Module Hub',         path: '/',                    icon: IC.home        },
      { label: 'KG-APS Creation',    path: '/kgaps/creation',      icon: IC.book        },
      { label: 'Material Verify',    path: '/kgaps/verification',  icon: IC.magnify     },
      { label: 'Scheduler',          path: '/scheduler',           icon: IC.calendar    },
      { label: 'Swap Requests',      path: '/scheduler/requests',  icon: IC.swap        },
      { label: 'Tasks',              path: '/tasks',               icon: IC.clipboard   },
      { label: 'Analytics',          path: '/analytics',           icon: IC.analytics   },
    ],
  }

  return allItems[role] ?? allItems.COORDINATOR
}

/* ── Sidebar Component ─────────────────────────────────────── */
export default function Sidebar({ mobileOpen, onMobileClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const navItems = useNavItems()
  const [expanded, setExpanded] = useState(false)

  const isActive = path => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleNav = path => {
    navigate(path)
    onMobileClose?.()
  }

  const sidebarContent = (isMobile = false) => (
    <div className={`flex flex-col h-full`}
      style={{ width: isMobile ? 240 : (expanded ? 220 : 64), transition: 'width 0.22s ease' }}>

      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-5 shrink-0" style={{ minHeight: 64 }}>
        <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #6366f1, #0ea5e9)' }}>
          F
        </div>
        {(expanded || isMobile) && (
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-gray-900 leading-tight whitespace-nowrap">Faculty Portal</p>
            <p className="text-[10px] text-gray-400 whitespace-nowrap">{user?.role}</p>
          </div>
        )}
      </div>

      <div className="w-full h-px bg-gray-100 shrink-0" />

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {navItems.map(item => {
          const active = isActive(item.path)
          return (
            <button key={item.path + item.label}
              onClick={() => handleNav(item.path)}
              title={!expanded && !isMobile ? item.label : undefined}
              className={`relative w-full flex items-center gap-3 px-4 py-2.5 my-0.5 transition-all rounded-none group
                ${active ? 'text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`}
              style={{ background: active ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
              {/* Active indicator stripe */}
              {active && (
                <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-r-full bg-indigo-500" />
              )}
              <span className="shrink-0">
                <Icon d={item.icon} className="w-5 h-5" />
              </span>
              {(expanded || isMobile) && (
                <span className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.label}
                </span>
              )}
              {/* Tooltip on collapsed */}
              {!expanded && !isMobile && (
                <span className="pointer-events-none opacity-0 group-hover:opacity-100 absolute left-14 z-50 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap transition-opacity"
                  style={{ background: '#1e293b' }}>
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="w-full h-px bg-gray-100 shrink-0" />

      {/* User footer */}
      <div className="shrink-0 px-3 py-3 space-y-1">
        {/* Sign out */}
        <button onClick={logout}
          title={!expanded && !isMobile ? 'Sign out' : undefined}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all group">
          <span className="shrink-0"><Icon d={IC.signout} className="w-4 h-4" /></span>
          {(expanded || isMobile) && <span className="text-xs font-medium">Sign out</span>}
          {!expanded && !isMobile && (
            <span className="pointer-events-none opacity-0 group-hover:opacity-100 absolute left-14 z-50 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap transition-opacity"
              style={{ background: '#1e293b' }}>
              Sign out
            </span>
          )}
        </button>
        {/* Expand/collapse toggle */}
        {!isMobile && (
          <button onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <span className="shrink-0">
              <svg className={`w-4 h-4 transition-transform ${expanded ? '' : 'rotate-180'}`}
                fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={IC.chevronLeft} />
              </svg>
            </span>
            {expanded && <span className="text-xs font-medium">Collapse</span>}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col h-screen sticky top-0 shrink-0 overflow-hidden transition-all duration-200"
        style={{
          width: expanded ? 220 : 64,
          background: '#ffffff',
          borderRight: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '1px 0 8px rgba(0,0,0,0.03)',
        }}>
        {sidebarContent(false)}
      </aside>

      {/* ── Mobile overlay ──────────────────────────────── */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={onMobileClose} />
          <aside className="fixed left-0 top-0 bottom-0 z-50 flex flex-col md:hidden"
            style={{
              width: 240,
              background: '#ffffff',
              borderRight: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
            }}>
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #0ea5e9)' }}>F</div>
                <p className="text-sm font-bold text-gray-900">Faculty Portal</p>
              </div>
              <button onClick={onMobileClose} className="p-1.5 rounded-lg hover:bg-gray-100">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sidebarContent(true)}
          </aside>
        </>
      )}
    </>
  )
}
