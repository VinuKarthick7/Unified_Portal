/**
 * Courses.jsx — Read-only view of courses and assignments for all roles.
 * Course and assignment management is handled by the developer via the backend.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getDepartments, getCourses, getAssignments,
} from '../../api/core'

export default function Courses() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const isFaculty = user?.role === 'FACULTY'

  const [tab,         setTab]         = useState(isFaculty ? 'assignments' : 'courses')
  const [courses,     setCourses]     = useState([])
  const [assignments, setAssignments] = useState([])
  const [departments, setDepartments] = useState([])
  const [deptFilter,  setDeptFilter]  = useState('')
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      getDepartments(),
      getCourses(deptFilter ? { department: deptFilter } : {}),
      getAssignments({}),
    ])
      .then(([d, c, a]) => {
        setDepartments(d.data)
        setCourses(c.data)
        setAssignments(a.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [deptFilter])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-12 rounded-xl animate-pulse"
            style={{ background: 'rgba(14,165,233,0.07)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto"
      style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}>

      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition-colors"
          style={{ color: '#0284c7' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </button>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#0c1a2e' }}>
          Courses &amp; Assignments
        </h1>
      </div>

      {/* Tabs + filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(14,165,233,0.1)' }}>
          {(!isFaculty ? ['courses', 'assignments'] : ['assignments']).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
              style={tab === t
                ? { background: '#fff', color: '#0284c7', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
                : { color: '#64748b' }}>
              {t === 'courses' ? `Courses (${courses.length})` : `Assignments (${assignments.length})`}
            </button>
          ))}
        </div>

        {!isFaculty && (
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'rgba(14,165,233,0.3)', background: '#fff', color: '#334155' }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      {/* COURSES TABLE */}
      {tab === 'courses' && (
        courses.length === 0 ? (
          <p className="text-center py-16" style={{ color: '#94a3b8' }}>No courses found.</p>
        ) : (
          <div className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: '#fff', border: '1px solid rgba(14,165,233,0.15)' }}>
            <table className="w-full text-sm">
              <thead style={{ background: 'rgba(14,165,233,0.06)' }}>
                <tr>
                  {['Code', 'Name', 'Department', 'Semester', 'Credits', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#64748b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.map((c, i) => (
                  <tr key={c.id}
                    className="border-t transition-colors hover:bg-sky-50/50"
                    style={{ borderColor: 'rgba(14,165,233,0.08)' }}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: '#0284c7' }}>{c.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-3" style={{ color: '#64748b' }}>{c.department_name}</td>
                    <td className="px-4 py-3" style={{ color: '#64748b' }}>{c.semester ?? '—'}</td>
                    <td className="px-4 py-3" style={{ color: '#64748b' }}>{c.credits ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={c.is_active
                          ? { background: 'rgba(16,185,129,0.1)', color: '#059669' }
                          : { background: 'rgba(156,163,175,0.15)', color: '#6b7280' }}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ASSIGNMENTS TABLE */}
      {tab === 'assignments' && (
        assignments.length === 0 ? (
          <p className="text-center py-16" style={{ color: '#94a3b8' }}>No assignments found.</p>
        ) : (
          <div className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: '#fff', border: '1px solid rgba(14,165,233,0.15)' }}>
            <table className="w-full text-sm">
              <thead style={{ background: 'rgba(14,165,233,0.06)' }}>
                <tr>
                  {['Faculty', 'Course', 'Dept', 'Section', 'Year', 'Semester'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#64748b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id}
                    className="border-t transition-colors hover:bg-sky-50/50"
                    style={{ borderColor: 'rgba(14,165,233,0.08)' }}>
                    <td className="px-4 py-3 font-medium text-gray-800">{a.faculty_name}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{a.course_name}</p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: '#0284c7' }}>{a.course_code}</p>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#64748b' }}>{a.department_name}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#334155' }}>{a.section}</td>
                    <td className="px-4 py-3" style={{ color: '#64748b' }}>{a.academic_year}</td>
                    <td className="px-4 py-3" style={{ color: '#64748b' }}>{a.semester ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
