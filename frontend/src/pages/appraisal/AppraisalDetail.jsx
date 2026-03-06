/**
 * AppraisalDetail.jsx — Submission scoring page.
 * Faculty: fill self-scores + submit.
 * HOD/Admin pass 1 — review (SUBMITTED → HOD_REVIEW): save draft HOD scores + remarks.
 * HOD/Admin pass 2 — finalise (HOD_REVIEW → COMPLETED): lock and complete.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getSubmission, selfUpdateSubmission, submitAppraisal,
  reviewAppraisal, finaliseAppraisal, getAppraisalReport,
} from '../../api/appraisal'

const STATUS_COLORS = {
  DRAFT:      'bg-gray-100 text-gray-600',
  SUBMITTED:  'bg-blue-100 text-blue-700',
  HOD_REVIEW: 'bg-yellow-100 text-yellow-700',
  COMPLETED:  'bg-green-100 text-green-700',
}

export default function AppraisalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isManager = user?.role === 'ADMIN' || user?.role === 'HOD'

  const [sub,        setSub]        = useState(null)
  const [scores,     setScores]     = useState([])   // local editable copy
  const [selfRemarks, setSelfRemarks] = useState('')
  const [hodRemarks,  setHodRemarks]  = useState('')
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error,      setError]      = useState('')

  const load = () => {
    setLoading(true)
    getSubmission(id)
      .then(({ data }) => {
        setSub(data)
        setScores(data.scores.map(s => ({
          id:           s.id,
          criteria:     s.criteria,
          criteria_title: s.criteria_title,
          criteria_max: s.criteria_max,
          criteria_desc: s.criteria_desc,
          self_score:   s.self_score ?? '',
          self_comment: s.self_comment,
          hod_score:    s.hod_score ?? '',
          hod_comment:  s.hod_comment,
        })))
        setSelfRemarks(data.self_remarks)
        setHodRemarks(data.hod_remarks)
      })
      .catch(() => navigate('/appraisal'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const updateScore = (idx, field, value) => {
    setScores(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const handleSaveSelf = async () => {
    setSaving(true)
    setError('')
    try {
      await selfUpdateSubmission(id, {
        self_remarks: selfRemarks,
        scores: scores.map(s => ({
          id: s.id,
          self_score:   s.self_score === '' ? null : Number(s.self_score),
          self_comment: s.self_comment,
        })),
      })
      load()
    } catch {
      setError('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await submitAppraisal(id)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Submit failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReview = async () => {
    setSaving(true)
    setError('')
    try {
      await reviewAppraisal(id, {
        hod_remarks: hodRemarks,
        scores: scores.map(s => ({
          id: s.id,
          hod_score:   s.hod_score === '' ? null : Number(s.hod_score),
          hod_comment: s.hod_comment,
        })),
      })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Review failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleFinalise = async () => {
    if (!confirm('Finalise this appraisal? This will mark it as COMPLETED and lock it.')) return
    setSaving(true)
    setError('')
    try {
      await finaliseAppraisal(id, {
        hod_remarks: hodRemarks,
        scores: scores.map(s => ({
          id: s.id,
          hod_score:   s.hod_score === '' ? null : Number(s.hod_score),
          hod_comment: s.hod_comment,
        })),
      })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Finalise failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadReport = async () => {
    setDownloading(true)
    try {
      const res = await getAppraisalReport(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `appraisal_${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not download report.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading || !sub) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        {[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  const isDraft       = sub.status === 'DRAFT'
  const isSubmitted   = sub.status === 'SUBMITTED'
  const isHodReview   = sub.status === 'HOD_REVIEW'
  const isCompleted   = sub.status === 'COMPLETED'
  const canSelf       = !isManager && isDraft
  const canReview     = isManager && isSubmitted          // pass 1: save HOD draft
  const canFinalise   = isManager && isHodReview          // pass 2: lock and complete
  const canDownload   = isManager || isCompleted          // completed report available
  const totalSelf     = scores.reduce((acc, s) => acc + (Number(s.self_score) || 0), 0)
  const totalHOD      = scores.reduce((acc, s) => acc + (Number(s.hod_score) || 0), 0)
  const maxTotal      = scores.reduce((acc, s) => acc + s.criteria_max, 0)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/appraisal')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← Back to Appraisals
      </button>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{sub.template_detail?.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {sub.template_detail?.academic_year}
              {sub.template_detail?.department_name && ` · ${sub.template_detail.department_name}`}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[sub.status]}`}>
            {sub.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2">
          <span>Faculty: <strong className="text-gray-700">{sub.faculty_name}</strong></span>
          {sub.submitted_at && <span>Submitted: {new Date(sub.submitted_at).toLocaleDateString()}</span>}
          {sub.reviewed_at  && <span>Reviewed:  {new Date(sub.reviewed_at).toLocaleDateString()} by {sub.reviewed_by_name}</span>}
        </div>
        {/* Score summary bar */}
        {maxTotal > 0 && (
          <div className="flex gap-6 pt-2 text-sm">
            <span className="text-gray-500">Self: <strong className="text-gray-800">{totalSelf}/{maxTotal}</strong></span>
            {(isManager || isCompleted) && (
              <span className="text-gray-500">HOD: <strong className="text-pink-600">{totalHOD}/{maxTotal}</strong></span>
            )}
          </div>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Criteria scoring */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Criteria Scoring</h2>
        {scores.map((s, idx) => (
          <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-800">{s.criteria_title}</p>
                {s.criteria_desc && <p className="text-xs text-gray-400 mt-0.5">{s.criteria_desc}</p>}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">Max: {s.criteria_max}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Self score column */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Self Assessment</p>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={s.criteria_max}
                    value={s.self_score}
                    onChange={e => updateScore(idx, 'self_score', e.target.value)}
                    disabled={!canSelf}
                    className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:bg-gray-50 disabled:text-gray-400"
                    placeholder="—"
                  />
                  <span className="text-xs text-gray-400">/ {s.criteria_max}</span>
                </div>
                <textarea rows={2} value={s.self_comment}
                  onChange={e => updateScore(idx, 'self_comment', e.target.value)}
                  disabled={!canSelf}
                  placeholder="Comment…"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              {/* HOD score column */}
              {(isManager || isCompleted) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">HOD Assessment</p>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={s.criteria_max}
                      value={s.hod_score}
                      onChange={e => updateScore(idx, 'hod_score', e.target.value)}
                      disabled={!canReview}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:bg-gray-50 disabled:text-gray-400"
                      placeholder="—"
                    />
                    <span className="text-xs text-gray-400">/ {s.criteria_max}</span>
                  </div>
                  <textarea rows={2} value={s.hod_comment}
                    onChange={e => updateScore(idx, 'hod_comment', e.target.value)}
                    disabled={!canReview}
                    placeholder="HOD comment…"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Remarks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Self Remarks</label>
          <textarea rows={3} value={selfRemarks}
            onChange={e => setSelfRemarks(e.target.value)}
            disabled={!canSelf}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:bg-gray-50 disabled:text-gray-400"
            placeholder="Overall self-assessment remarks…"
          />
        </div>
        {(isManager || isCompleted) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HOD Remarks</label>
            <textarea rows={3} value={hodRemarks}
              onChange={e => setHodRemarks(e.target.value)}
              disabled={!canReview}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:bg-gray-50 disabled:text-gray-400"
              placeholder="HOD's overall remarks…"
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-end pb-4">
        {/* Faculty actions */}
        {canSelf && (
          <>
            <button onClick={handleSaveSelf} disabled={saving}
              className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="bg-pink-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          </>
        )}

        {/* HOD pass 1: move to HOD_REVIEW (saves draft) */}
        {canReview && (
          <button onClick={handleReview} disabled={saving}
            className="bg-yellow-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save HOD Draft →'}
          </button>
        )}

        {/* HOD pass 2: finalise → COMPLETED */}
        {canFinalise && (
          <>
            <button onClick={handleReview} disabled={saving}
              className="border border-yellow-300 text-yellow-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-yellow-50 disabled:opacity-50">
              {saving ? 'Saving…' : 'Update HOD Draft'}
            </button>
            <button onClick={handleFinalise} disabled={saving}
              className="bg-pink-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50">
              {saving ? 'Finalising…' : 'Finalise Review ✓'}
            </button>
          </>
        )}

        {/* Download PDF when review started */}
        {(isHodReview || isCompleted) && canDownload && (
          <button onClick={handleDownloadReport} disabled={downloading}
            className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5">
            {downloading ? 'Downloading…' : '⬇ Download Report'}
          </button>
        )}

        {isCompleted && !canFinalise && !canReview && (
          <span className="text-sm text-green-600 font-medium py-2">Review completed ✓</span>
        )}
      </div>
    </div>
  )
}
