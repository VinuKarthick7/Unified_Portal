/**
 * Appraisal.jsx — Faculty: templates + start submission. HOD/Admin: submissions overview.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getTemplates, getSubmissions, startSubmission, getAppraisalStats } from '../../api/appraisal'

const STATUS_COLORS = {
  DRAFT:      'bg-gray-100 text-gray-600',
  SUBMITTED:  'bg-blue-100 text-blue-700',
  HOD_REVIEW: 'bg-yellow-100 text-yellow-700',
  COMPLETED:  'bg-green-100 text-green-700',
}

export default function Appraisal() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isManager = user?.role === 'ADMIN' || user?.role === 'HOD'

  const [stats,       setStats]       = useState(null)
  const [templates,   setTemplates]   = useState([])
  const [submissions, setSubmissions] = useState([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading]  = useState(true)
  const [starting, setStarting] = useState(null)  // templateId being started

  const load = useCallback(() => {
    setLoading(true)
    const calls = isManager
      ? [
          getAppraisalStats(),
          getTemplates(),
          getSubmissions(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ]
      : [
          getAppraisalStats(),
          getTemplates(),
          getSubmissions(),
        ]

    Promise.all(calls)
      .then(([s, t, sub]) => {
        setStats(s.data)
        setTemplates(t.data)
        setSubmissions(sub.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isManager, statusFilter])

  useEffect(() => { load() }, [load])

  const handleStart = async (templateId) => {
    setStarting(templateId)
    try {
      const { data } = await startSubmission(templateId)
      navigate(`/appraisal/submissions/${data.id}`)
    } catch {
      setStarting(null)
    }
  }

  const mySubmissionMap = Object.fromEntries(
    submissions.map((s) => [s.template, s])
  )

  const TABS = ['ALL', 'DRAFT', 'SUBMITTED', 'HOD_REVIEW', 'COMPLETED']

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Faculty Appraisal</h1>
        </div>
        {isManager && (
          <button onClick={() => navigate('/appraisal/templates/new')}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-700">
            + New Template
          </button>
        )}
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: isManager ? 'Active Templates' : 'Available', value: stats.active_templates, color: 'text-pink-600' },
            { label: 'Draft',      value: stats.DRAFT,      color: 'text-gray-600' },
            { label: 'Submitted',  value: stats.SUBMITTED,  color: 'text-blue-600' },
            { label: 'Completed',  value: stats.COMPLETED,  color: 'text-green-600' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ---- FACULTY VIEW: template cards ---- */}
      {!isManager && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Active Templates</h2>
          {templates.length === 0 ? (
            <p className="text-gray-400 text-sm">No active appraisal templates available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map(t => {
                const sub = mySubmissionMap[t.id]
                return (
                  <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{t.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{t.academic_year} · {t.criteria_count} criteria</p>
                      {t.deadline && (
                        <p className="text-xs text-gray-400">Deadline: {new Date(t.deadline).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      {sub ? (
                        <>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sub.status]}`}>
                            {sub.status.replace('_', ' ')}
                          </span>
                          <button onClick={() => navigate(`/appraisal/submissions/${sub.id}`)}
                            className="text-sm text-pink-600 font-medium hover:underline">
                            {sub.status === 'COMPLETED' ? 'View' : 'Continue →'}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleStart(t.id)}
                          disabled={starting === t.id}
                          className="ml-auto bg-pink-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50">
                          {starting === t.id ? 'Starting…' : 'Start'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ---- HOD/ADMIN VIEW: status tabs + submissions table ---- */}
      {isManager && (
        <section>
          {/* Status tabs */}
          <div className="flex gap-1 border-b border-gray-200 mb-4">
            {TABS.map(t => (
              <button key={t}
                onClick={() => setStatusFilter(t)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  statusFilter === t
                    ? 'bg-white border border-b-white border-gray-200 text-pink-600 -mb-px'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Templates management strip */}
          <div className="mb-4 bg-pink-50 border border-pink-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-pink-700">Templates ({templates.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map(t => (
                <div key={t.id} className="flex items-center gap-2 bg-white border border-pink-100 rounded-lg px-3 py-1.5 text-sm">
                  <span className="text-gray-700 font-medium">{t.title}</span>
                  <span className="text-gray-400 text-xs">{t.academic_year}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => navigate(`/appraisal/templates/${t.id}/edit`)}
                    className="text-xs text-pink-600 hover:underline ml-1">
                    Edit
                  </button>
                </div>
              ))}
              {templates.length === 0 && <span className="text-sm text-gray-400">No templates yet.</span>}
            </div>
          </div>

          {/* Submissions table */}
          {submissions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No submissions found.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Faculty', 'Template', 'Year', 'Status', 'Self Score', 'HOD Score', 'Submitted', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(s => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{s.faculty_name}</p>
                        <p className="text-xs text-gray-400">{s.faculty_email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{s.template_title}</td>
                      <td className="px-4 py-3 text-gray-500">{s.template_year}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status]}`}>
                          {s.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {s.total_self_score ?? '—'} / {s.max_possible_score}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {s.total_hod_score ?? '—'} / {s.max_possible_score}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/appraisal/submissions/${s.id}`)}
                          className="text-pink-600 text-xs font-medium hover:underline">
                          {s.status === 'SUBMITTED' ? 'Review →' : 'View →'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
