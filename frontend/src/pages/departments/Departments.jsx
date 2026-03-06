/**
 * Departments.jsx — Read-only directory for all roles.
 * Department creation / editing is managed by the developer via the backend.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDepartments } from '../../api/core'

export default function Departments() {
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    getDepartments()
      .then(r => setDepartments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse"
            style={{ background: 'rgba(99,102,241,0.06)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto"
      style={{ background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 100%)' }}>

      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition-colors"
          style={{ color: '#6366f1' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </button>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1e1b4b' }}>
          Departments
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
          {departments.length} department{departments.length !== 1 ? 's' : ''} registered
        </p>
      </div>

      {/* Grid */}
      {departments.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(99,102,241,0.1)' }}>
            <svg className="w-8 h-8" style={{ color: '#6366f1' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <p className="font-medium" style={{ color: '#6b7280' }}>No departments found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((d, idx) => {
            const palette = [
              { bg: 'rgba(99,102,241,0.08)', accent: '#6366f1', badge: 'rgba(99,102,241,0.12)', badgeText: '#4f46e5' },
              { bg: 'rgba(14,165,233,0.08)', accent: '#0ea5e9', badge: 'rgba(14,165,233,0.12)', badgeText: '#0284c7' },
              { bg: 'rgba(20,184,166,0.08)', accent: '#14b8a6', badge: 'rgba(20,184,166,0.12)', badgeText: '#0d9488' },
              { bg: 'rgba(245,158,11,0.08)', accent: '#f59e0b', badge: 'rgba(245,158,11,0.12)', badgeText: '#d97706' },
              { bg: 'rgba(236,72,153,0.08)', accent: '#ec4899', badge: 'rgba(236,72,153,0.12)', badgeText: '#db2777' },
              { bg: 'rgba(139,92,246,0.08)', accent: '#8b5cf6', badge: 'rgba(139,92,246,0.12)', badgeText: '#7c3aed' },
            ]
            const p = palette[idx % palette.length]

            return (
              <div key={d.id}
                className="rounded-2xl p-5 flex flex-col gap-3 transition-shadow hover:shadow-lg"
                style={{ background: '#ffffff', border: `1px solid ${p.bg.replace('0.08', '0.2')}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

                {/* Top row */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: p.bg }}>
                    <svg className="w-5 h-5" style={{ color: p.accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800 leading-tight">{d.name}</h2>
                    <span className="inline-block mt-0.5 text-xs font-mono px-2 py-0.5 rounded-md"
                      style={{ background: p.badge, color: p.badgeText }}>
                      {d.code}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="pt-2 border-t flex gap-4" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#9ca3af' }}>HOD</p>
                    <p className="text-sm font-semibold text-gray-700 mt-0.5">{d.hod_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#9ca3af' }}>Members</p>
                    <p className="text-sm font-semibold text-gray-700 mt-0.5">{d.member_count}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
