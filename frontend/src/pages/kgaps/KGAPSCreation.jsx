import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCourses, getMyAssignments } from '../../api/core'
import { getCourseStructure } from '../../api/kgaps'
import SyllabusTree from '../../components/kgaps/SyllabusTree'
import { useAuth } from '../../context/AuthContext'

// ── helpers ──────────────────────────────────────────────────────────────────

/** Normalise a course object to a consistent shape regardless of source API */
function normaliseCourse(c) {
  const deptArray = Array.isArray(c.department_names)
    ? c.department_names                                // getCourses: [{id,name}]
    : typeof c.department_names === 'string'
      ? c.department_names.split(',').map(n => ({ id: n.trim(), name: n.trim() }))
      : []
  return {
    id: c.id,
    code: c.code ?? '',
    name: c.name ?? c.course_name ?? '',
    deptList: deptArray,                               // [{id, name}]
    deptStr: deptArray.map(d => d.name).join(', ') || '—',
    semester: c.semester ?? null,
  }
}

const SORTS = [
  { value: 'code',    label: 'Code A→Z'       },
  { value: 'name',    label: 'Name A→Z'       },
  { value: 'sem_asc', label: 'Semester ↑'     },
  { value: 'sem_desc',label: 'Semester ↓'     },
]

function applySortFilter(courses, { search, deptId, sem, sort }) {
  let out = courses
  if (search.trim()) {
    const q = search.toLowerCase()
    out = out.filter(c =>
      c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    )
  }
  if (deptId) {
    out = out.filter(c => c.deptList.some(d => String(d.id) === String(deptId)))
  }
  if (sem) {
    out = out.filter(c => String(c.semester) === String(sem))
  }
  return [...out].sort((a, b) => {
    if (sort === 'code')     return a.code.localeCompare(b.code)
    if (sort === 'name')     return a.name.localeCompare(b.name)
    if (sort === 'sem_asc')  return (a.semester ?? 99) - (b.semester ?? 99)
    if (sort === 'sem_desc') return (b.semester ?? 99) - (a.semester ?? 99)
    return 0
  })
}

// ── component ─────────────────────────────────────────────────────────────────

export default function KGAPSCreation() {
  const { user } = useAuth()
  const isFaculty = user?.role === 'FACULTY'
  const isCoordinator = user?.role === 'COORDINATOR'

  const [searchParams] = useSearchParams()
  const [rawCourses, setRawCourses] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAllTopics, setShowAllTopics] = useState(() => searchParams.get('all') === '1')

  // filter / sort state
  const [search, setSearch]   = useState('')
  const [deptId, setDeptId]   = useState('')
  const [sem, setSem]         = useState('')
  const [sort, setSort]       = useState('code')

  // ── load courses ──────────────────────────────────────────────────────────
  useEffect(() => {
    setCoursesLoading(true)
    const load = isFaculty
      ? getMyAssignments().then(({ data }) => {
          const seen = new Set()
          return data
            .filter(a => { if (seen.has(a.course)) return false; seen.add(a.course); return true })
            .map(a => normaliseCourse({
              id: a.course, code: a.course_code, name: a.course_name,
              department_names: a.department_names, semester: a.semester,
            }))
        })
      : getCourses().then(({ data }) => data.map(normaliseCourse))

    load
      .then(courses => {
        setRawCourses(courses)
        if (courses.length === 1) {
          setSelectedId(String(courses[0].id))
          loadStructure(String(courses[0].id))
        }
      })
      .catch(() => setError('Failed to load courses.'))
      .finally(() => setCoursesLoading(false))
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

  const handleSelect = (id) => {
    const sid = String(id)
    setSelectedId(sid)
    setShowAllTopics(false)
    loadStructure(sid)
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const allDepts = useMemo(() => {
    const map = {}
    rawCourses.forEach(c => c.deptList.forEach(d => { map[d.id] = d.name }))
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [rawCourses])

  const allSems = useMemo(() =>
    [...new Set(rawCourses.map(c => c.semester).filter(Boolean))].sort((a, b) => a - b),
    [rawCourses]
  )

  const filtered = useMemo(
    () => applySortFilter(rawCourses, { search, deptId, sem, sort }),
    [rawCourses, search, deptId, sem, sort]
  )

  const selected = rawCourses.find(c => String(c.id) === selectedId)

  // upload progress for faculty
  const totalTopics = units.reduce((s, u) => s + (u.topics?.length ?? 0), 0)
  const needUploadTopics = units.reduce((s, u) =>
    s + (u.topics ?? []).filter(t => {
      const mats = t.materials ?? []
      return !mats.some(m => m.verification_status === 'APPROVED' || m.verification_status === 'PENDING')
    }).length, 0)

  const displayUnits = (isFaculty && !showAllTopics)
    ? units
        .map(unit => ({
          ...unit,
          topics: (unit.topics ?? []).filter(t => {
            const mats = t.materials ?? []
            return !mats.some(m => m.verification_status === 'APPROVED' || m.verification_status === 'PENDING')
          }),
        }))
        .filter(unit => unit.topics.length > 0)
    : units

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 p-5">
        <h1 className="text-2xl font-bold text-gray-900">
          {isFaculty ? 'Material Upload' : 'Syllabus Structure'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {isFaculty
            ? 'Upload materials for topics assigned to you. Topics that still need materials are highlighted.'
            : 'Browse units, topics, and materials for any course. Use the filters below to search efficiently.'}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-white/80 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Courses</div>
            <div className="text-lg font-semibold text-gray-900">{rawCourses.length}</div>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Units</div>
            <div className="text-lg font-semibold text-gray-900">{units.length}</div>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Topics</div>
            <div className="text-lg font-semibold text-gray-900">{totalTopics}</div>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Need Upload</div>
            <div className="text-lg font-semibold text-gray-900">{isFaculty ? needUploadTopics : '-'}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* ── Course Browser (non-faculty or faculty with >1 course) ── */}
      {(!isFaculty || rawCourses.length > 1) && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">

          {/* Filter bar */}
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-center bg-gray-50/60">
            {/* Search */}
            <div className="relative flex-1 min-w-44">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search code or name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>

            {/* Dept filter */}
            {allDepts.length > 0 && (
              <select
                value={deptId}
                onChange={e => setDeptId(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-600"
              >
                <option value="">All Depts</option>
                {allDepts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}

            {/* Semester tabs */}
            {allSems.length > 0 && (
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg bg-white px-1.5 py-1">
                <button
                  onClick={() => setSem('')}
                  className={`text-xs font-medium px-2 py-0.5 rounded-md transition-colors ${sem === '' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >All</button>
                {allSems.map(s => (
                  <button key={s}
                    onClick={() => setSem(String(s) === sem ? '' : String(s))}
                    className={`text-xs font-medium px-2 py-0.5 rounded-md transition-colors ${String(s) === sem ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  >S{s}</button>
                ))}
              </div>
            )}

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-600"
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            {/* Result count */}
            <span className="text-xs text-gray-400 ml-auto shrink-0">
              {filtered.length} / {rawCourses.length} course{rawCourses.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Course list */}
          {coursesLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-t-indigo-500 border-indigo-100 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">
              No courses match your filters.
              <button onClick={() => { setSearch(''); setDeptId(''); setSem(''); }}
                className="block mx-auto mt-2 text-indigo-500 hover:text-indigo-700 text-xs font-medium">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {filtered.map(c => {
                const active = String(c.id) === selectedId
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c.id)}
                    className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-indigo-50/40 transition-colors group"
                    style={{ background: active ? 'rgba(99,102,241,0.06)' : undefined }}
                  >
                    {/* Code pill */}
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded-md shrink-0"
                      style={{
                        background: active ? 'rgba(99,102,241,0.15)' : '#f3f4f6',
                        color: active ? '#4338ca' : '#374151',
                      }}>
                      {c.code}
                    </span>

                    {/* Name */}
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate"
                      style={{ color: active ? '#4338ca' : undefined }}>
                      {c.name}
                    </span>

                    {/* Dept + Sem */}
                    <span className="text-xs text-gray-400 shrink-0 hidden sm:block truncate max-w-52">{c.deptStr}</span>
                    {c.semester && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-md shrink-0"
                        style={{ background: active ? 'rgba(99,102,241,0.12)' : '#f3f4f6', color: active ? '#4338ca' : '#6b7280' }}>
                        Sem {c.semester}
                      </span>
                    )}

                    {/* Active indicator */}
                    {active && (
                      <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Faculty single-course chip */}
      {isFaculty && rawCourses.length === 1 && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-sm font-medium text-indigo-800">
            {rawCourses[0].code} — {rawCourses[0].name}
          </span>
          {rawCourses[0].deptStr && (
            <span className="text-xs text-gray-400">{rawCourses[0].deptStr} · Sem {rawCourses[0].semester}</span>
          )}
        </div>
      )}

      {/* ── Selected course info strip ── */}
      {selected && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-sm">
          <span className="font-semibold text-indigo-700">{selected.code}</span>
          <span className="text-gray-600">{selected.name}</span>
          <span className="ml-auto text-xs text-indigo-400">{selected.deptStr}{selected.semester ? ` · Semester ${selected.semester}` : ''}</span>
        </div>
      )}

      {/* ── Faculty upload summary ── */}
      {isFaculty && selectedId && !loading && units.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border"
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

      {/* ── Syllabus tree ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-indigo-500" />
        </div>
      ) : selectedId ? (
        displayUnits.length === 0 && isFaculty && !showAllTopics ? (
          <div className="text-center py-16 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
            <span className="text-3xl block mb-3">✅</span>
            All topics in this course already have materials uploaded.
            <br />
            <button onClick={() => setShowAllTopics(true)}
              className="mt-3 text-indigo-500 hover:text-indigo-700 font-medium text-xs">
              Show all topics →
            </button>
          </div>
        ) : (
          <SyllabusTree
            units={displayUnits}
            onRefresh={() => loadStructure(selectedId)}
            onMaterialUploaded={() => setShowAllTopics(true)}
            courseId={selectedId ? Number(selectedId) : null}
            isCoordinator={isCoordinator}
          />
        )
      ) : (
        <div className="text-center py-16 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          {isFaculty && rawCourses.length === 0
            ? 'No courses are assigned to you yet. Contact your HOD or coordinator.'
            : 'Select a course above to view its syllabus structure.'}
        </div>
      )}
    </div>
  )
}

