import { useState, useEffect, useCallback } from 'react'
import { getCourses, getMyAssignments } from '../../api/core'
import { getCourseStructure } from '../../api/kgaps'
import SyllabusTree from '../../components/kgaps/SyllabusTree'
import { useAuth } from '../../context/AuthContext'

export default function KGAPSCreation() {
  const { user } = useAuth()
  const isFaculty = user?.role === 'FACULTY'

  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAllTopics, setShowAllTopics] = useState(false)

  // Load courses on mount — Faculty sees only assigned courses, others see all
  useEffect(() => {
    if (isFaculty) {
      getMyAssignments()
        .then(({ data }) => {
          // Deduplicate by course id (faculty may have same course in multiple sections)
          const seen = new Set()
          const facultyCourses = data
            .filter(a => { if (seen.has(a.course)) return false; seen.add(a.course); return true })
            .map(a => ({ id: a.course, code: a.course_code, name: a.course_name, department_names: a.department_names, semester: a.semester }))
          setCourses(facultyCourses)
          // Auto-select if faculty handles exactly one course
          if (facultyCourses.length === 1) {
            setSelectedCourse(String(facultyCourses[0].id))
            loadStructure(String(facultyCourses[0].id))
          }
        })
        .catch(() => setError('Failed to load your course assignments.'))
    } else {
      getCourses()
        .then(({ data }) => setCourses(data))
        .catch(() => setError('Failed to load courses.'))
    }
  }, [])

  const loadStructure = useCallback(async (courseId) => {
    if (!courseId) { setUnits([]); return }
    setLoading(true)
    setError('')
    try {
      const { data } = await getCourseStructure(courseId)
      setUnits(data)
    } catch {
      setError('Failed to load course structure.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCourseChange = (e) => {
    setSelectedCourse(e.target.value)
    loadStructure(e.target.value)
  }

  const selectedCourseObj = courses.find((c) => String(c.id) === selectedCourse)

  // For faculty: filter units to only show topics that still need material upload
  // (no materials at all, or all materials rejected — i.e. no APPROVED or PENDING material)
  const displayUnits = (isFaculty && !showAllTopics)
    ? units
        .map(unit => ({
          ...unit,
          topics: (unit.topics ?? []).filter(t => {
            const mats = t.materials ?? []
            const hasApprovedOrPending = mats.some(m =>
              m.verification_status === 'APPROVED' || m.verification_status === 'PENDING'
            )
            return !hasApprovedOrPending
          }),
        }))
        .filter(unit => unit.topics.length > 0)
    : units

  // Count topics that need upload vs total
  const totalTopics = units.reduce((s, u) => s + (u.topics?.length ?? 0), 0)
  const needUploadTopics = units.reduce((s, u) => {
    return s + (u.topics ?? []).filter(t => {
      const mats = t.materials ?? []
      return !mats.some(m => m.verification_status === 'APPROVED' || m.verification_status === 'PENDING')
    }).length
  }, 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isFaculty ? 'Material Upload' : 'KG-APS — Syllabus Structure'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isFaculty
            ? 'Upload materials for topics assigned to you. Only topics that still need materials are shown.'
            : 'Browse units, topics, and materials for each course. Faculty can upload materials; coordinators verify them.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Course selector */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">
          {isFaculty ? 'Your Course' : 'Select Course'}
        </label>
        {isFaculty && courses.length === 1 ? (
          /* Single assignment — show as read-only chip instead of dropdown */
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-sm font-medium text-blue-800">
              {courses[0].code} — {courses[0].name}
            </span>
          </div>
        ) : (
          <select
            value={selectedCourse}
            onChange={handleCourseChange}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-sm w-full"
          >
            <option value="">— choose a course —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        )}

        {selectedCourseObj && (
          <span className="text-xs text-gray-400">
            Dept: {Array.isArray(selectedCourseObj.department_names)
              ? selectedCourseObj.department_names.map(d => d.name).join(', ') || '—'
              : (selectedCourseObj.department_names ?? '—')} · Sem {selectedCourseObj.semester}
          </span>
        )}
      </div>

      {/* Faculty: upload summary strip + filter toggle */}
      {isFaculty && selectedCourse && !loading && units.length > 0 && (
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border"
          style={{ background: needUploadTopics > 0 ? '#fffbeb' : '#f0fdf4',
                   borderColor: needUploadTopics > 0 ? '#fcd34d' : '#86efac' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{needUploadTopics > 0 ? '📤' : '🎉'}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: needUploadTopics > 0 ? '#92400e' : '#166534' }}>
                {needUploadTopics > 0
                  ? `${needUploadTopics} of ${totalTopics} topics need material upload`
                  : 'All topics have materials uploaded!'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {needUploadTopics > 0
                  ? 'Topics with approved or pending materials are hidden below.'
                  : 'Materials are either approved or pending review.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAllTopics(p => !p)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 shrink-0 transition-colors"
          >
            {showAllTopics ? 'Show needs-upload only' : 'Show all topics'}
          </button>
        </div>
      )}

      {/* Syllabus tree */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-600" />
        </div>
      ) : selectedCourse ? (
        displayUnits.length === 0 && isFaculty && !showAllTopics ? (
          <div className="text-center py-16 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
            <span className="text-3xl block mb-3">✅</span>
            All topics in this course already have materials uploaded.
            <br />
            <button onClick={() => setShowAllTopics(true)}
              className="mt-3 text-blue-600 hover:text-blue-800 font-medium text-xs">
              Show all topics →
            </button>
          </div>
        ) : (
          <SyllabusTree
            units={displayUnits}
            onRefresh={() => loadStructure(selectedCourse)}
          />
        )
      ) : (
        <div className="text-center py-16 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          {isFaculty && courses.length === 0
            ? 'No courses are assigned to you yet. Contact your HOD or coordinator.'
            : 'Select a course above to view its syllabus structure.'}
        </div>
      )}
    </div>
  )
}
