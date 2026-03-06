import { useState, useEffect, useCallback } from 'react'
import { getCourses } from '../../api/core'
import { getCourseStructure } from '../../api/kgaps'
import SyllabusTree from '../../components/kgaps/SyllabusTree'
import { useAuth } from '../../context/AuthContext'

export default function KGAPSCreation() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load courses on mount
  useEffect(() => {
    getCourses()
      .then(({ data }) => setCourses(data))
      .catch(() => setError('Failed to load courses.'))
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">KG-APS — Syllabus Structure</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse units, topics, and materials for each course. Faculty can upload materials; coordinators verify them.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Course selector */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">Select Course</label>
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

        {selectedCourseObj && (
          <span className="text-xs text-gray-400">
            Dept: {selectedCourseObj.department_name} · Sem {selectedCourseObj.semester}
          </span>
        )}
      </div>

      {/* Syllabus tree */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-600" />
        </div>
      ) : selectedCourse ? (
        <SyllabusTree
          units={units}
          onRefresh={() => loadStructure(selectedCourse)}
        />
      ) : (
        <div className="text-center py-16 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          Select a course above to view its syllabus structure.
        </div>
      )}
    </div>
  )
}
