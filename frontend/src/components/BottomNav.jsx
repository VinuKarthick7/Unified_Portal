/**
 * BottomNav.jsx — Mobile-only bottom navigation bar (md:hidden).
 * Shows the most important 5 items for each role.
 */
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function NavIcon({ d }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const IC = {
  home:      'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  calendar:  'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  chart:     'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  clipboard: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25',
  bell:      'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  inbox:     'M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3',
  book:      'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  upload:    'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
}

const BOTTOM_ITEMS = {
  FACULTY: [
    { label: 'Home',      path: '/faculty-dashboard', icon: IC.home     },
    { label: 'Log',       path: '/scheduler',          icon: IC.calendar },
    { label: 'Progress',  path: '/kgaps/handling',     icon: IC.chart    },
    { label: 'Tasks',     path: '/tasks',              icon: IC.clipboard },
    { label: 'Alerts',    path: '/notifications',      icon: IC.bell     },
  ],
  HOD: [
    { label: 'Hub',       path: '/',                    icon: IC.home     },
    { label: 'Inbox',     path: '/hod-inbox',           icon: IC.inbox    },
    { label: 'KG-APS',    path: '/kgaps/creation',      icon: IC.book     },
    { label: 'Tasks',     path: '/tasks',               icon: IC.clipboard },
    { label: 'Alerts',    path: '/notifications',       icon: IC.bell     },
  ],
  ADMIN: [
    { label: 'Dashboard', path: '/admin-dashboard',     icon: IC.chart    },
    { label: 'Inbox',     path: '/hod-inbox',           icon: IC.inbox    },
    { label: 'KG-APS',    path: '/kgaps/creation',      icon: IC.book     },
    { label: 'Tasks',     path: '/tasks',               icon: IC.clipboard },
    { label: 'Alerts',    path: '/notifications',       icon: IC.bell     },
  ],
  COORDINATOR: [
    { label: 'Hub',       path: '/',                    icon: IC.home     },
    { label: 'Upload',    path: '/kgaps/creation',      icon: IC.upload   },
    { label: 'Verify',    path: '/kgaps/verification',  icon: IC.book     },
    { label: 'Tasks',     path: '/tasks',               icon: IC.clipboard },
    { label: 'Alerts',    path: '/notifications',       icon: IC.bell     },
  ],
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const items = BOTTOM_ITEMS[user?.role] ?? BOTTOM_ITEMS.COORDINATOR

  const isActive = path => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-area-bottom"
      style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
      <div className="flex">
        {items.map(item => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <NavIcon d={item.icon} />
              <span className={`text-[10px] font-medium ${active ? 'text-indigo-600' : ''}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-indigo-500 rounded-t-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
