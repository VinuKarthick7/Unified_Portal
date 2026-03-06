/**
 * Appraisal.jsx — Faculty: premium template cards + submission status.
 * HOD/Admin: submissions overview table.
 * Faculty sees ONLY their own templates & submissions (abstracted view).
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getTemplates, getSubmissions, startSubmission, getAppraisalStats } from '../../api/appraisal'

/* ── SVG Icon helper ───────────────────────────────────────── */
function Icon({ d, className = 'w-4 h-4', stroke = 'currentColor' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke={stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}
const ICONS = {
  back:      'M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18',
  star:      'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  doc:       'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  check:     'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  clock:     'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  edit:      'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125',
  send:      'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
  eye:       'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  chevron:   'M8.25 4.5l7.5 7.5-7.5 7.5',
  calendar:  'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  plus:      'M12 4.5v15m7.5-7.5h-15',
}

const STATUS_META = {
  DRAFT:      { label: 'Draft',      color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  SUBMITTED:  { label: 'Submitted',  color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  HOD_REVIEW: { label: 'HOD Review', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  COMPLETED:  { label: 'Completed',  color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
}

export default function Appraisal() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isManager = user?.role === 'ADMIN' || user?.role === 'HOD'
  const isFaculty = !isManager

  const [stats, setStats] = useState(null)
  const [templates, setTemplates] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const calls = isManager
      ? [getAppraisalStats(), getTemplates(), getSubmissions(statusFilter !== 'ALL' ? { status: statusFilter } : {})]
      : [getAppraisalStats(), getTemplates(), getSubmissions()]
    Promise.all(calls)
      .then(([s, t, sub]) => { setStats(s.data); setTemplates(t.data); setSubmissions(sub.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isManager, statusFilter])

  useEffect(() => { load() }, [load])

  const handleStart = async templateId => {
    setStarting(templateId)
    try {
      const { data } = await startSubmission(templateId)
      navigate(`/appraisal/submissions/${data.id}`)
    } catch {
      setStarting(null)
    }
  }

  const mySubmissionMap = Object.fromEntries(submissions.map(s => [s.template, s]))
  const TABS = ['ALL', 'DRAFT', 'SUBMITTED', 'HOD_REVIEW', 'COMPLETED']

  // Faculty: compute urgency
  const pendingTemplates = isFaculty ? templates.filter(t => !mySubmissionMap[t.id] || mySubmissionMap[t.id].status === 'DRAFT') : []
  const hasDeadlineSoon = pendingTemplates.some(t => t.deadline && (new Date(t.deadline) - new Date()) / 86400000 <= 7)

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f8fafc 0%, #eef2ff 100%)' }}>
        <div className="p-6 max-w-5xl mx-auto space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
        </div>
      </div>
    )
  }

  return (
    <div className={isFaculty ? 'min-h-screen' : 'p-6 max-w-5xl mx-auto space-y-6'}
      style={isFaculty ? { background: 'linear-gradient(160deg, #f8fafc 0%, #eef2ff 100%)' } : undefined}>

      {isFaculty ? (
        /* ════════════════════════════════════════════════════════
           FACULTY VIEW — Premium card-based appraisal
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
                <h1 className="text-base font-bold" style={{ color: '#0f172a' }}>Faculty Appraisal</h1>
                <p className="text-[11px]" style={{ color: '#94a3b8' }}>Self-evaluation and performance appraisal</p>
              </div>
            </div>
          </header>

          <main className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-6">

            {/* Deadline alert */}
            {hasDeadlineSoon && (
              <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
                style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(245,158,11,0.1)' }}>
                  <Icon d={ICONS.clock} className="w-5 h-5" stroke="#f59e0b" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Appraisal deadline approaching</p>
                  <p className="text-xs text-amber-600 mt-0.5">Complete your pending self-evaluations before the deadline</p>
                </div>
              </div>
            )}

            {/* Stats strip */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Available', value: stats.active_templates, icon: ICONS.doc, accent: '#6366f1' },
                  { label: 'Draft', value: stats.DRAFT, icon: ICONS.edit, accent: '#64748b' },
                  { label: 'Submitted', value: stats.SUBMITTED, icon: ICONS.send, accent: '#3b82f6' },
                  { label: 'Completed', value: stats.COMPLETED, icon: ICONS.check, accent: '#10b981' },
                ].map(k => (
                  <div key={k.label} className="rounded-2xl p-4 flex flex-col gap-1"
                    style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
                             boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${k.accent}14` }}>
                      <Icon d={k.icon} className="w-3.5 h-3.5" stroke={k.accent} />
                    </div>
                    <p className="text-xl font-bold tracking-tight" style={{ color: '#0f172a' }}>{k.value ?? 0}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{k.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Template cards */}
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Icon d={ICONS.star} className="w-3.5 h-3.5" stroke="#6366f1" />
                Appraisal Templates
              </h2>

              {templates.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200"
                  style={{ background: 'rgba(255,255,255,0.6)' }}>
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.08)' }}>
                    <Icon d={ICONS.doc} className="w-6 h-6" stroke="#6366f1" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No active appraisal templates</p>
                  <p className="text-xs text-gray-400 mt-1">Templates will appear when published by administration</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templates.map(t => {
                    const sub = mySubmissionMap[t.id]
                    const meta = sub ? STATUS_META[sub.status] : null
                    const daysLeft = t.deadline ? Math.ceil((new Date(t.deadline) - new Date()) / 86400000) : null

                    return (
                      <div key={t.id} className="rounded-2xl p-5 border border-gray-100 hover:border-indigo-100 transition-all hover:shadow-md flex flex-col gap-4"
                        style={{ background: '#fff' }}>
                        {/* Template info */}
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-gray-900">{t.title}</h3>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                  {t.academic_year}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                                  {t.criteria_count} criteria
                                </span>
                              </div>
                            </div>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(99,102,241,0.08)' }}>
                              <Icon d={ICONS.star} className="w-4 h-4" stroke="#6366f1" />
                            </div>
                          </div>

                          {/* Deadline */}
                          {t.deadline && (
                            <div className={`flex items-center gap-1.5 mt-3 text-xs ${
                              daysLeft !== null && daysLeft <= 7 ? 'text-amber-600' : 'text-gray-400'
                            }`}>
                              <Icon d={ICONS.calendar} className="w-3 h-3" />
                              <span>Deadline: {new Date(t.deadline).toLocaleDateString()}</span>
                              {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
                                <span className="font-medium">({daysLeft}d left)</span>
                              )}
                              {daysLeft !== null && daysLeft <= 0 && (
                                <span className="font-bold text-red-600">Overdue</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action row */}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                          {sub ? (
                            <>
                              <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                                {meta.label}
                              </span>
                              <button onClick={() => navigate(`/appraisal/submissions/${sub.id}`)}
                                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                                {sub.status === 'COMPLETED' ? (
                                  <><Icon d={ICONS.eye} className="w-3.5 h-3.5" /> View Results</>
                                ) : (
                                  <>Continue <Icon d={ICONS.chevron} className="w-3 h-3" /></>
                                )}
                              </button>
                            </>
                          ) : (
                            <button onClick={() => handleStart(t.id)}
                              disabled={starting === t.id}
                              className="ml-auto bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors flex items-center gap-1.5">
                              {starting === t.id ? 'Starting…' : <><Icon d={ICONS.edit} className="w-3.5 h-3.5" /> Begin Self-Evaluation</>}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </main>
        </>
      ) : (
        /* ════════════════════════════════════════════════════════
           MANAGER VIEW — Table-based submissions overview
           ════════════════════════════════════════════════════════ */
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1">
                <Icon d={ICONS.back} className="w-3 h-3" /> Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Faculty Appraisal</h1>
            </div>
            <button onClick={() => navigate('/appraisal/templates/new')}
              className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 flex items-center gap-1.5">
              <Icon d={ICONS.plus} className="w-4 h-4" /> New Template
            </button>
          </div>

          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Active Templates', value: stats.active_templates, color: 'text-pink-600' },
                { label: 'Draft', value: stats.DRAFT, color: 'text-gray-600' },
                { label: 'Submitted', value: stats.SUBMITTED, color: 'text-blue-600' },
                { label: 'Completed', value: stats.COMPLETED, color: 'text-green-600' },
              ].map(c => (
                <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Status tabs */}
          <div className="flex gap-1 border-b border-gray-200 mb-4">
            {TABS.map(t => (
              <button key={t} onClick={() => setStatusFilter(t)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  statusFilter === t
                    ? 'bg-white border border-b-white border-gray-200 text-pink-600 -mb-px'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Templates strip */}
          <div className="mb-4 bg-pink-50 border border-pink-100 rounded-xl p-4">
            <span className="text-sm font-semibold text-pink-700 mb-2 block">Templates ({templates.length})</span>
            <div className="flex flex-wrap gap-2">
              {templates.map(t => (
                <div key={t.id} className="flex items-center gap-2 bg-white border border-pink-100 rounded-lg px-3 py-1.5 text-sm">
                  <span className="text-gray-700 font-medium">{t.title}</span>
                  <span className="text-gray-400 text-xs">{t.academic_year}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => navigate(`/appraisal/templates/${t.id}/edit`)}
                    className="text-xs text-pink-600 hover:underline ml-1">Edit</button>
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
                  {submissions.map(s => {
                    const meta = STATUS_META[s.status] || STATUS_META.DRAFT
                    return (
                      <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{s.faculty_name}</p>
                          <p className="text-xs text-gray-400">{s.faculty_email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{s.template_title}</td>
                        <td className="px-4 py-3 text-gray-500">{s.template_year}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{s.total_self_score ?? '—'} / {s.max_possible_score}</td>
                        <td className="px-4 py-3 text-gray-700">{s.total_hod_score ?? '—'} / {s.max_possible_score}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => navigate(`/appraisal/submissions/${s.id}`)}
                            className="text-pink-600 text-xs font-medium hover:underline">
                            {s.status === 'SUBMITTED' ? 'Review' : 'View'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
