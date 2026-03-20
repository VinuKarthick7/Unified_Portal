/**
 * FacultyDashboard.jsx — Professional faculty-centric dashboard.
 *
 * Sections:
 *  1. Greeting header with date, dept, notification bell
 *  2. Quick-stat KPI cards
 *  3. Today's schedule timeline
 *  4. Teaching pipeline (Upload → Review → Teach → Complete → Verified)
 *  5. Ready-to-teach queue & material upload queue
 *  6. My tasks (from admin / HOD)
 *  7. Appraisal summary
 *  8. Syllabus coverage (progress rings)
 *  9. Weekly timetable grid
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyDay, getDashboardStats, getWorkloadTrend } from '../../api/analytics'
import { getMyAssignments } from '../../api/core'
import { getCourseStructure } from '../../api/kgaps'
import { getProgress } from '../../api/kgaps_handling'
import { getTimetables, getPeriods } from '../../api/scheduler'
import { getSubmissions } from '../../api/appraisal'
import NotificationBell from '../../components/NotificationBell'
import ProgressRing from '../../components/ProgressRing'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

/* ── SVG Icon helper ─────────────────────────────────────────── */
function SvgIcon({ d, className = 'w-4 h-4', stroke = 'currentColor' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke={stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}
const IC = {
  calendar:  'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  upload:    'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
  search:    'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  check:     'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  clipboard: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25',
  chart:     'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  inbox:     'M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3',
  sparkle:   'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z',
  target:    'M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3 3 0 013.438 3.168A3.75 3.75 0 0118 18.75H6.75z',
  book:      'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  trophy:    'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.024 6.024 0 01-2.77.896c-.956.078-1.944.078-2.9 0a6.024 6.024 0 01-2.77-.896',
  clock:     'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  pencil:    'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125',
  swap:      'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
  trending:  'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  eye:       'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  chevron:   'M8.25 4.5l7.5 7.5-7.5 7.5',
  xmark:     'M6 18L18 6M6 6l12 12',
}

/* ── colour tokens ──────────────────────────────────────────── */
const C = {
  sky: '#0ea5e9', indigo: '#6366f1', emerald: '#10b981',
  amber: '#f59e0b', rose: '#f43f5e', violet: '#8b5cf6',
  teal: '#14b8a6', blue: '#3b82f6', slate: '#64748b',
}
const PIPE_COLORS = {
  upload:   { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', dot: C.amber },
  review:   { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', dot: C.blue },
  ready:    { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46', dot: C.emerald },
  taught:   { bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3', dot: C.indigo },
  verified: { bg: '#ccfbf1', border: '#5eead4', text: '#134e4a', dot: C.teal },
}

/* ── day / time helpers ─────────────────────────────────────── */
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAY_LABEL = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' }
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
function todayStr() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

const PRIORITY_META = {
  HIGH:     { label: 'High',     cls: 'bg-red-100 text-red-700' },
  CRITICAL: { label: 'Critical', cls: 'bg-red-200 text-red-800' },
  MEDIUM:   { label: 'Medium',   cls: 'bg-amber-100 text-amber-700' },
  LOW:      { label: 'Low',      cls: 'bg-green-100 text-green-700' },
}
const STATUS_META = {
  PENDING:     { label: 'Pending',     cls: 'bg-gray-100 text-gray-600' },
  ACCEPTED:    { label: 'Accepted',    cls: 'bg-green-100 text-green-700' },
  SUBMITTED:   { label: 'Submitted',   cls: 'bg-purple-100 text-purple-700' },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
  REJECTED:    { label: 'Rejected',    cls: 'bg-red-100 text-red-700' },
}
const APPRAISAL_STATUS = {
  DRAFT:      { label: 'Draft',       cls: 'bg-gray-100 text-gray-600' },
  SUBMITTED:  { label: 'Submitted',   cls: 'bg-blue-100 text-blue-700' },
  HOD_REVIEW: { label: 'Under Review', cls: 'bg-amber-100 text-amber-700' },
  COMPLETED:  { label: 'Completed',   cls: 'bg-green-100 text-green-700' },
}

/* ── small reusable atoms ───────────────────────────────────── */
function KPI({ label, value, sub, color = C.indigo, iconPath }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1 group hover:shadow-lg transition-shadow"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
               boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}>
          <SvgIcon d={iconPath} className="w-4.5 h-4.5" stroke={color} />
        </div>
        {sub && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: `${color}12`, color }}>{sub}</span>}
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: '#0f172a' }}>
        {value ?? '—'}
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
        {label}
      </p>
    </div>
  )
}

function SH({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>
        {children}
      </h2>
      {action}
    </div>
  )
}

function Card({ children, className = '', ...rest }) {
  return (
    <div className={`rounded-2xl p-6 ${className}`}
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
               boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      {...rest}>
      {children}
    </div>
  )
}

function EmptyState({ text, iconPath = IC.inbox }) {
  return (
    <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
      <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
        style={{ background: 'rgba(99,102,241,0.06)' }}>
        <SvgIcon d={iconPath} className="w-5 h-5" stroke="#94a3b8" />
      </div>
      {text}
    </div>
  )
}

function PipelineStage({ label, count, color, active }) {
  return (
    <div className={`flex-1 rounded-xl px-3 py-3 text-center transition-all cursor-default
      ${active ? 'ring-2 ring-offset-1 scale-105' : 'hover:scale-[1.02]'}`}
      style={{
        background: color.bg, borderColor: color.border,
        border: `1.5px solid ${color.border}`,
        ...(active ? { ringColor: color.dot } : {}),
      }}>
      <p className="text-xl font-bold" style={{ color: color.text }}>{count}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
        style={{ color: color.text, opacity: 0.7 }}>{label}</p>
    </div>
  )
}

/* ── loading skeleton ───────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-sky-500 border-sky-100 animate-spin" />
        <p className="text-sm font-medium" style={{ color: C.sky }}>Loading your dashboard…</p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function FacultyDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  /* ── state ──────────────────────────────────────────────── */
  const [loading, setLoading]         = useState(true)
  const [myDay, setMyDay]             = useState(null)
  const [stats, setStats]             = useState({})
  const [assignments, setAssignments] = useState([])
  const [progress, setProgress]       = useState([])
  const [timetables, setTimetables]   = useState([])
  const [periods, setPeriods]         = useState([])
  const [submissions, setSubs]        = useState([])
  const [structures, setStructures]   = useState({})   // { courseId: units[] }
  const [workload, setWorkload]       = useState([])
  const [scheduleView, setScheduleView] = useState('week') // week | month
  const [pipelineFilter, setPipelineFilter] = useState(null) // null=all, or stage key

  /* ── data fetching (two waves) ──────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [md, st, asgn, prog, tt, per, subs, wl] = await Promise.all([
        getMyDay().then(r => r.data).catch(() => null),
        getDashboardStats().then(r => r.data).catch(() => ({})),
        getMyAssignments().then(r => r.data).catch(() => []),
        getProgress().then(r => r.data).catch(() => []),
        getTimetables().then(r => r.data).catch(() => []),
        getPeriods().then(r => r.data).catch(() => []),
        getSubmissions().then(r => r.data).catch(() => []),
        getWorkloadTrend().then(r => r.data?.trend ?? r.data ?? []).catch(() => []),
      ])
      setMyDay(md); setStats(st); setAssignments(asgn)
      setProgress(Array.isArray(prog) ? prog : [])
      setTimetables(Array.isArray(tt) ? tt : [])
      setPeriods(Array.isArray(per) ? per : [])
      setSubs(Array.isArray(subs) ? subs : subs?.results ?? [])
      setWorkload(Array.isArray(wl) ? wl : [])

      // Wave 2 — fetch course structures for each assigned course
      const courseIds = [...new Set(asgn.map(a => a.course))]
      const structs = {}
      await Promise.all(
        courseIds.map(cid =>
          getCourseStructure(cid)
            .then(r => { structs[cid] = r.data })
            .catch(() => { structs[cid] = [] })
        )
      )
      setStructures(structs)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  /* ── derived data ───────────────────────────────────────── */

  // Teaching pipeline counts
  const pipeline = useMemo(() => {
    const counts = { upload: 0, review: 0, ready: 0, taught: 0, verified: 0 }
    const items  = { upload: [], review: [], ready: [], taught: [], verified: [] }

    Object.entries(structures).forEach(([courseId, units]) => {
      const cid = Number(courseId)
      const assgn = assignments.find(a => a.course === cid)
      const courseLabel = assgn ? `${assgn.course_code} · ${assgn.course_name}` : `Course ${cid}`

      ;(Array.isArray(units) ? units : []).forEach(unit => {
        ;(unit.topics ?? []).forEach(topic => {
          const mats = topic.materials ?? []
          const hasApproved = mats.some(m => m.verification_status === 'APPROVED')
          const hasPending  = mats.some(m => m.verification_status === 'PENDING')
          const allRejected = mats.length > 0 && mats.every(m => m.verification_status === 'REJECTED')
          const hoursHandled = parseFloat(topic.hours_handled ?? 0)
          const hoursPlanned = parseFloat(topic.planned_hours ?? 1)
          const fullyTaught  = hoursHandled >= hoursPlanned

          // Determine stage
          const entry = {
            topicId: topic.id,
            topicTitle: topic.topic_title,
            unitTitle: unit.title,
            unitNumber: unit.unit_number,
            courseId: cid,
            courseLabel,
            courseCode: assgn?.course_code ?? '',
            plannedHours: hoursPlanned,
            hoursHandled,
            order: topic.order,
            materialsCount: mats.length,
          }

          // Check progress data for verified status
          const prog = progress.find(p => p.course_id === cid)

          if (!mats.length || allRejected) {
            counts.upload++; items.upload.push(entry)
          } else if (hasPending && !hasApproved) {
            counts.review++; items.review.push(entry)
          } else if (hasApproved && !fullyTaught) {
            counts.ready++; items.ready.push(entry)
          } else if (fullyTaught) {
            // Check if verified (handled_topics in progress = approved handling verifications)
            // We approximate: if fully taught, it's either "taught" (pending verification) or "verified"
            // We'll put it in "taught" and use pending_topics from progress to differentiate
            counts.taught++; items.taught.push(entry)
          } else {
            counts.upload++; items.upload.push(entry)
          }
        })
      })
    })

    // Re-distribute: some "taught" may actually be verified based on progress data
    // Use progress.handled_topics vs pending_topics as proxy
    progress.forEach(p => {
      const verifiedCount = (p.handled_topics ?? 0) - (p.pending_topics ?? 0)
      if (verifiedCount > 0) {
        const courseItems = items.taught.filter(i => i.courseId === p.course_id)
        const toMove = courseItems.slice(0, Math.min(verifiedCount, courseItems.length))
        toMove.forEach(item => {
          const idx = items.taught.indexOf(item)
          if (idx >= 0) {
            items.taught.splice(idx, 1)
            counts.taught--
            items.verified.push(item)
            counts.verified++
          }
        })
      }
    })

    return { counts, items }
  }, [structures, assignments, progress])

  const totalTopics = Object.values(pipeline.counts).reduce((s, v) => s + v, 0)

  // Today's schedule helpers
  const todaySlots = myDay?.today_slots ?? []
  const loggedIds = new Set(myDay?.logged_today?.map(e => e.course_assignment_id) ?? [])
  const summary = myDay?.summary ?? {}

  // Weekly timetable grid
  const weeklyGrid = useMemo(() => {
    if (!timetables.length || !periods.length) return null
    const lookup = {}
    timetables.forEach(tt => {
      ;(tt.slots ?? []).forEach(s => {
        const key = `${s.day_of_week}-${s.period}`
        lookup[key] = {
          courseCode: tt.course_code,
          courseName: tt.course_name,
          room: s.room,
          section: tt.section,
        }
      })
    })
    return { lookup, periods: periods.sort((a, b) => a.order - b.order) }
  }, [timetables, periods])

  // Appraisal data
  const latestAppraisal = submissions.length > 0
    ? submissions.sort((a, b) => new Date(b.submitted_at ?? b.created_at ?? 0) - new Date(a.submitted_at ?? a.created_at ?? 0))[0]
    : null

  // Pending tasks
  const pendingTasks = myDay?.pending_tasks ?? []

  // Handling awaiting approval
  const pendingHandling = myDay?.pending_handling ?? []

  // Overall syllabus completion
  const overallCompletion = useMemo(() => {
    if (!progress.length) return 0
    const total = progress.reduce((s, p) => s + (p.total_topics ?? 0), 0)
    const handled = progress.reduce((s, p) => s + (p.handled_topics ?? 0), 0)
    return total > 0 ? Math.round((handled / total) * 100) : 0
  }, [progress])

  // Hours data for mini chart
  const hoursData = useMemo(() => {
    return progress.map(p => ({
      name: p.course_code,
      planned: p.total_topics * 1,   // approximate — use total_hours when avail
      taught: parseFloat(p.total_hours ?? 0),
    }))
  }, [progress])

  // Pipeline filter items
  const filteredPipelineItems = pipelineFilter
    ? (pipeline.items[pipelineFilter] ?? [])
    : []

  /* ── render ─────────────────────────────────────────────── */
  if (loading) return <Skeleton />

  return (
    <div className="min-h-screen"
      style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)' }}>

      {/* ════ HEADER ═══════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(14px)',
                 borderBottom: '1px solid rgba(14,165,233,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
            <span className="text-white font-bold text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </span>
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: '#0f172a' }}>
              {greeting()}, {user?.first_name}
            </h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>{todayStr()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user?.department_name && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium hidden sm:inline-block"
              style={{ background: 'rgba(14,165,233,0.08)', color: C.sky }}>
              {user.department_name}
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: 'rgba(99,102,241,0.1)', color: C.indigo }}>
            FACULTY
          </span>
          <NotificationBell />
          <button onClick={logout}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(244,63,94,0.08)', color: C.rose }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-8 max-w-7xl mx-auto space-y-8">

        {/* ════ TOP ACTION BAR — Highlighted Quick Actions ═════ */}
        <section>
          <div className="rounded-2xl p-4 sm:p-5"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(14,165,233,0.06) 100%)',
                     border: '1px solid rgba(99,102,241,0.12)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                style={{ color: '#6366f1' }}>
                <SvgIcon d={IC.sparkle} className="w-4 h-4" stroke="#6366f1" />
                Quick Actions
              </h2>
              <span className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>
                {(pipeline.counts.upload > 0 || (summary.tasks_pending ?? stats.tasks_pending ?? 0) > 0) && 'Items need your attention'}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: 'Upload Material',  iconPath: IC.upload,    route: '/kgaps/creation',       color: C.amber,   count: pipeline.counts.upload },
                { label: 'My Materials',      iconPath: IC.eye,       route: '/kgaps/creation?all=1', color: C.sky,     count: null },
                { label: 'View Tasks',        iconPath: IC.clipboard, route: '/tasks',                color: C.rose,    count: summary.tasks_pending ?? stats.tasks_pending ?? 0 },
                { label: 'Teaching Progress', iconPath: IC.trending,  route: '/kgaps/handling',       color: C.emerald, count: null },
                { label: 'Appraisal',         iconPath: IC.chart,     route: '/appraisal',            color: C.indigo,  count: null },
                { label: 'Swap Request',      iconPath: IC.swap,      route: '/scheduler/requests',   color: C.violet,  count: null },
              ].map(q => (
                <button key={q.label} onClick={() => navigate(q.route)}
                  className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/70 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-md transition-all group">
                  <div className="relative w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${q.color}12` }}>
                    <SvgIcon d={q.iconPath} className="w-5 h-5" stroke={q.color} />
                    {q.count > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1 shadow-sm"
                        style={{ background: q.color }}>
                        {q.count}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-center leading-tight"
                    style={{ color: '#475569' }}>{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ════ KPI STRIP ═══════════════════════════════════════ */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPI iconPath={IC.calendar} label="Classes Today"   value={summary.slots_today ?? 0}
              sub={`${summary.entries_logged ?? 0} logged`} color={C.sky} />
            <KPI iconPath={IC.upload} label="Need Upload"     value={pipeline.counts.upload}
              color={C.amber} />
            <KPI iconPath={IC.search} label="Under Review"    value={pipeline.counts.review}
              color={C.blue} />
            <KPI iconPath={IC.check} label="Ready to Teach"  value={pipeline.counts.ready}
              color={C.emerald} />
            <KPI iconPath={IC.clipboard} label="Tasks Pending"   value={summary.tasks_pending ?? stats.tasks_pending ?? 0}
              color={C.rose} />
            <KPI iconPath={IC.chart} label="Syllabus"        value={`${overallCompletion}%`}
              sub={`${progress.length} courses`} color={C.indigo} />
          </div>
        </section>

        {/* ════ TODAY'S SCHEDULE ══════════════════════════════════ */}
        <Card>
          <SH action={
            <button onClick={() => navigate('/scheduler')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'rgba(14,165,233,0.08)', color: C.sky }}>
              Full Schedule →
            </button>
          }>Today's Schedule</SH>
          {todaySlots.length === 0 ? (
            <EmptyState text="No classes scheduled for today" iconPath={IC.sparkle} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todaySlots.map(slot => {
                const logged = loggedIds.has(slot.assignment_id)
                return (
                  <div key={slot.slot_id}
                    className={`relative rounded-xl p-4 border transition-all ${
                      logged
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-white border-gray-150 hover:border-sky-200 hover:shadow-sm'
                    }`}>
                    {logged && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="text-center min-w-[56px] py-1 px-2 rounded-lg"
                        style={{ background: logged ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.08)' }}>
                        <p className="text-xs font-bold" style={{ color: logged ? C.emerald : C.sky }}>
                          {slot.period}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                          {slot.period_start?.slice(0, 5)}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                          {slot.course_code}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{slot.course_name}</p>
                        {slot.room && (
                          <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>
                            Room {slot.room}
                          </p>
                        )}
                      </div>
                    </div>
                    {!logged && (
                      <button onClick={() => navigate('/scheduler')}
                        className="mt-3 w-full text-xs font-medium py-1.5 rounded-lg transition-colors text-center"
                        style={{ background: 'rgba(14,165,233,0.08)', color: C.sky }}>
                        Log Entry →
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* ════ TEACHING PIPELINE ═══════════════════════════════ */}
        <Card>
          <SH action={
            <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
              {totalTopics} total topics
            </span>
          }>Teaching Pipeline</SH>

          {/* Stage bar */}
          <div className="flex gap-2 mb-6">
            {[
              { key: 'upload',   label: 'Need Upload' },
              { key: 'review',   label: 'Under Review' },
              { key: 'ready',    label: 'Ready to Teach' },
              { key: 'taught',   label: 'Taught' },
              { key: 'verified', label: 'Verified' },
            ].map(stage => (
              <div key={stage.key}
                onClick={() => setPipelineFilter(pipelineFilter === stage.key ? null : stage.key)}
                className="cursor-pointer">
                <PipelineStage
                  label={stage.label}
                  count={pipeline.counts[stage.key]}
                  color={PIPE_COLORS[stage.key]}
                  active={pipelineFilter === stage.key}
                />
              </div>
            ))}
          </div>

          {/* Pipeline progress bar */}
          {totalTopics > 0 && (
            <div className="flex rounded-full h-2.5 overflow-hidden mb-6" style={{ background: 'rgba(0,0,0,0.06)' }}>
              {['upload', 'review', 'ready', 'taught', 'verified'].map(key => {
                const pct = (pipeline.counts[key] / totalTopics) * 100
                return pct > 0 ? (
                  <div key={key} style={{ width: `${pct}%`, background: PIPE_COLORS[key].dot }}
                    className="transition-all" />
                ) : null
              })}
            </div>
          )}

          {/* Arrows connecting stages */}
          <div className="hidden sm:flex items-center justify-center gap-1 mb-4 -mt-4">
            {['Upload', '', 'Review', '', 'Teach', '', 'Complete', '', 'Verify'].map((t, i) =>
              t ? null : (
                <svg key={i} className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )
            )}
          </div>

          {/* Filtered list */}
          {pipelineFilter && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#334155' }}>
                  {pipelineFilter === 'upload' && <><SvgIcon d={IC.upload} className="w-4 h-4" stroke={C.amber} /> Topics Needing Material Upload</>}
                  {pipelineFilter === 'review' && <><SvgIcon d={IC.search} className="w-4 h-4" stroke={C.blue} /> Materials Under Review</>}
                  {pipelineFilter === 'ready' && <><SvgIcon d={IC.check} className="w-4 h-4" stroke={C.emerald} /> Ready to Teach</>}
                  {pipelineFilter === 'taught' && <><SvgIcon d={IC.book} className="w-4 h-4" stroke={C.indigo} /> Taught (Awaiting Verification)</>}
                  {pipelineFilter === 'verified' && <><SvgIcon d={IC.trophy} className="w-4 h-4" stroke={C.teal} /> Verified &amp; Complete</>}
                </h3>
                <button onClick={() => setPipelineFilter(null)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                  <SvgIcon d={IC.xmark} className="w-3.5 h-3.5" />
                </button>
              </div>
              {filteredPipelineItems.length === 0 ? (
                <EmptyState text="No topics in this stage" iconPath={IC.inbox} />
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {filteredPipelineItems
                    .sort((a, b) => a.unitNumber - b.unitNumber || a.order - b.order)
                    .map(item => (
                    <div key={`${item.courseId}-${item.topicId}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: PIPE_COLORS[pipelineFilter].bg }}>
                        <span className="text-xs font-bold" style={{ color: PIPE_COLORS[pipelineFilter].text }}>
                          {item.unitNumber}.{item.order}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#1e293b' }}>
                          {item.topicTitle}
                        </p>
                        <p className="text-[11px]" style={{ color: '#94a3b8' }}>
                          {item.courseCode} · Unit {item.unitNumber}: {item.unitTitle}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium" style={{ color: '#64748b' }}>
                          {item.hoursHandled}/{item.plannedHours}h
                        </p>
                      </div>
                      {pipelineFilter === 'upload' && (
                        <button onClick={() => navigate('/kgaps/creation')}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg shrink-0"
                          style={{ background: 'rgba(245,158,11,0.1)', color: C.amber }}>
                          Upload
                        </button>
                      )}
                      {pipelineFilter === 'ready' && (
                        <button onClick={() => navigate('/scheduler')}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg shrink-0"
                          style={{ background: 'rgba(16,185,129,0.1)', color: C.emerald }}>
                          Log →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ════ TWO-COLUMN: Tasks+Handling | Appraisal+Progress ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Tasks + Handling ──────────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* My Tasks */}
            <Card>
              <SH action={
                <button onClick={() => navigate('/tasks')}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'rgba(244,63,94,0.08)', color: C.rose }}>
                  All Tasks →
                </button>
              }>My Tasks</SH>
              {pendingTasks.length === 0 ? (
                <EmptyState text="No pending tasks — you're all caught up!" iconPath={IC.target} />
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {pendingTasks.map(t => {
                    const pMeta = PRIORITY_META[t.priority] ?? PRIORITY_META.MEDIUM
                    const sMeta = STATUS_META[t.status] ?? STATUS_META.PENDING
                    return (
                      <div key={t.assignment_id}
                        onClick={() => navigate(`/tasks/${t.task_id}`)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${
                          t.is_overdue ? 'bg-red-50/70 border-red-200' : 'bg-white border-gray-100 hover:border-blue-200'
                        }`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#1e293b' }}>
                            {t.task_title}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>
                            Due: {t.due_date ?? 'No deadline'}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pMeta.cls}`}>
                          {pMeta.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sMeta.cls}`}>
                          {sMeta.label}
                        </span>
                        {t.is_overdue && (
                          <span className="text-[10px] font-bold text-red-600">Overdue</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Handling Awaiting Approval */}
            {pendingHandling.length > 0 && (
              <Card>
                <SH>Awaiting HOD Verification</SH>
                <div className="space-y-2">
                  {pendingHandling.map(h => (
                    <div key={h.verification_id}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-amber-50/50 border-amber-200/60">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <SvgIcon d={IC.clock} className="w-4 h-4" stroke="#d97706" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#1e293b' }}>
                          {h.topic}
                        </p>
                        <p className="text-[11px]" style={{ color: '#94a3b8' }}>
                          {h.course_code} · {h.hours}h taught
                        </p>
                      </div>
                      <span className="text-xs" style={{ color: '#94a3b8' }}>{h.date}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Workload Trend (mini bar chart) */}
            {workload.length > 0 && (
              <Card>
                <SH>Teaching Hours Trend</SH>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={workload} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Bar dataKey="hours" name="Hours" fill={C.sky} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>

          {/* ── Right: Appraisal + Progress ────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Appraisal Card */}
            <Card>
              <SH action={
                <button onClick={() => navigate('/appraisal')}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'rgba(139,92,246,0.08)', color: C.violet }}>
                  View →
                </button>
              }>Appraisal</SH>
              {!latestAppraisal ? (
                <EmptyState text="No appraisal submissions yet" iconPath={IC.chart} />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                        {latestAppraisal.template_name ?? latestAppraisal.template_title ?? 'Appraisal'}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>
                        {latestAppraisal.academic_year ?? ''}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                      (APPRAISAL_STATUS[latestAppraisal.status] ?? APPRAISAL_STATUS.DRAFT).cls
                    }`}>
                      {(APPRAISAL_STATUS[latestAppraisal.status] ?? APPRAISAL_STATUS.DRAFT).label}
                    </span>
                  </div>
                  {(latestAppraisal.total_self_score != null || latestAppraisal.total_hod_score != null) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl p-3 text-center"
                        style={{ background: 'rgba(99,102,241,0.06)' }}>
                        <p className="text-lg font-bold" style={{ color: C.indigo }}>
                          {latestAppraisal.total_self_score ?? '—'}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                          Self Score
                        </p>
                      </div>
                      <div className="rounded-xl p-3 text-center"
                        style={{ background: 'rgba(16,185,129,0.06)' }}>
                        <p className="text-lg font-bold" style={{ color: C.emerald }}>
                          {latestAppraisal.total_hod_score ?? '—'}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                          HOD Score
                        </p>
                      </div>
                    </div>
                  )}
                  {latestAppraisal.deadline && (
                    <p className="text-[11px] text-center" style={{ color: '#94a3b8' }}>
                      Deadline: {latestAppraisal.deadline}
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* Syllabus Coverage */}
            <Card>
              <SH>Syllabus Coverage</SH>
              {progress.length === 0 ? (
                <EmptyState text="No course assignments found" iconPath={IC.book} />
              ) : (
                <div className="space-y-5">
                  {progress.map(p => {
                    const pct = Math.round(p.completion_percent ?? 0)
                    return (
                      <div key={p.assignment_id} className="flex items-center gap-4">
                        <ProgressRing percent={pct} size={64} stroke={6}
                          label={`${pct}%`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: '#1e293b' }}>
                            {p.course_code}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>
                            {p.course_name}
                          </p>
                          <div className="flex gap-3 mt-1.5 text-[10px]">
                            <span style={{ color: C.emerald }}>
                              ● {p.handled_topics ?? 0} done
                            </span>
                            <span style={{ color: C.amber }}>
                              ● {p.pending_topics ?? 0} pending
                            </span>
                            <span style={{ color: '#94a3b8' }}>
                              {p.total_topics ?? 0} total
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold" style={{ color: '#1e293b' }}>
                            {parseFloat(p.total_hours ?? 0).toFixed(1)}h
                          </p>
                          <p className="text-[10px]" style={{ color: '#94a3b8' }}>taught</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Quick Actions — Highlighted */}
            <Card>
              <SH>Quick Actions</SH>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Upload Material',   iconPath: IC.upload,    route: '/kgaps/creation',        color: C.amber,   count: pipeline.counts.upload },
                  { label: 'My Materials',       iconPath: IC.eye,       route: '/kgaps/creation?all=1',  color: C.sky,     count: null },
                  { label: 'View Tasks',         iconPath: IC.clipboard, route: '/tasks',                 color: C.rose,    count: summary.tasks_pending ?? stats.tasks_pending ?? 0 },
                  { label: 'Swap Request',       iconPath: IC.swap,      route: '/scheduler/requests',    color: C.violet,  count: null },
                  { label: 'Teaching Progress',  iconPath: IC.trending,  route: '/kgaps/handling',        color: C.emerald, count: null },
                  { label: 'Appraisal',          iconPath: IC.chart,     route: '/appraisal',             color: C.indigo,  count: null },
                ].map(q => (
                  <button key={q.label}
                    onClick={() => navigate(q.route)}
                    className="relative flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-left group"
                    style={{ background: 'rgba(255,255,255,0.6)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                      style={{ background: `${q.color}14` }}>
                      <SvgIcon d={q.iconPath} className="w-4 h-4" stroke={q.color} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: '#475569' }}>{q.label}</span>
                    {q.count > 0 && (
                      <span className="absolute top-2 right-2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1"
                        style={{ background: q.color }}>
                        {q.count}
                      </span>
                    )}
                    <SvgIcon d={IC.chevron} className="w-3 h-3 ml-auto text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ════ WEEKLY SCHEDULE GRID ════════════════════════════ */}
        {weeklyGrid && (
          <Card>
            <SH action={
              <div className="flex gap-1">
                {['week', 'month'].map(v => (
                  <button key={v} onClick={() => setScheduleView(v)}
                    className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                      scheduleView === v
                        ? 'bg-sky-500 text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}>
                    {v === 'week' ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>
            }>Weekly Schedule</SH>

            {scheduleView === 'week' ? (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-500 w-24"
                        style={{ background: 'rgba(14,165,233,0.04)' }}>Period</th>
                      {DAYS.map(d => (
                        <th key={d} className="px-3 py-2.5 text-center font-semibold text-gray-600"
                          style={{ background: 'rgba(14,165,233,0.04)' }}>
                          {DAY_LABEL[d]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyGrid.periods.map(p => (
                      <tr key={p.id} className="border-t border-gray-100">
                        <td className="px-3 py-3 text-gray-500"
                          style={{ background: 'rgba(0,0,0,0.01)' }}>
                          <span className="font-medium text-gray-700 block">{p.name}</span>
                          <span className="text-gray-400" style={{ fontSize: '10px' }}>
                            {p.start_time?.slice(0, 5)}–{p.end_time?.slice(0, 5)}
                          </span>
                        </td>
                        {DAYS.map(d => {
                          const slot = weeklyGrid.lookup[`${d}-${p.id}`]
                          return (
                            <td key={d} className="px-2 py-2 text-center">
                              {slot ? (
                                <div className="rounded-lg px-2 py-1.5"
                                  style={{ background: 'rgba(14,165,233,0.06)' }}>
                                  <p className="font-semibold" style={{ color: C.sky }}>
                                    {slot.courseCode}
                                  </p>
                                  <p className="text-gray-400 mt-0.5" style={{ fontSize: '9px' }}>
                                    {slot.room ? `Room ${slot.room}` : slot.section}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-200">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Month view — calendar-style display */
              <MonthView timetables={timetables} periods={weeklyGrid.periods} />
            )}
          </Card>
        )}

        {/* ════ FOOTER ══════════════════════════════════════════ */}
        <div className="text-center pb-4">
          <button onClick={() => navigate('/')}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to Module Hub
          </button>
        </div>

      </main>
    </div>
  )
}

/* ── Month View sub-component ──────────────────────────────── */
function MonthView({ timetables, periods }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7  // Monday=0

  // Build day → class map from timetables
  const dayMap = {}
  const dayCodeMap = { 0: 'MON', 1: 'TUE', 2: 'WED', 3: 'THU', 4: 'FRI', 5: 'SAT' }
  timetables.forEach(tt => {
    ;(tt.slots ?? []).forEach(s => {
      const dayCode = s.day_of_week
      if (!dayMap[dayCode]) dayMap[dayCode] = []
      dayMap[dayCode].push({
        courseCode: tt.course_code,
        period: periods.find(p => p.id === s.period)?.name ?? '',
      })
    })
  })

  const cells = []
  // Pad start
  for (let i = 0; i < startOffset; i++) cells.push(null)
  // Fill days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    const dow = (date.getDay() + 6) % 7  // Monday=0
    const dayCode = dayCodeMap[dow]
    cells.push({
      day: d,
      isToday: d === today.getDate(),
      isSunday: date.getDay() === 0,
      classes: dayMap[dayCode] ?? [],
    })
  }

  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div>
      <p className="text-sm font-medium text-center mb-4" style={{ color: '#475569' }}>
        {monthName}
      </p>
      <div className="grid grid-cols-7 gap-1 text-[10px]">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center font-semibold py-1" style={{ color: '#94a3b8' }}>
            {d}
          </div>
        ))}
        {cells.map((cell, i) => (
          <div key={i}
            className={`min-h-[48px] rounded-lg p-1 border ${
              cell === null
                ? 'border-transparent'
                : cell.isToday
                  ? 'border-sky-300 bg-sky-50'
                  : cell.isSunday
                    ? 'border-gray-100 bg-gray-50/50'
                    : 'border-gray-100 bg-white'
            }`}>
            {cell && (
              <>
                <span className={`text-[10px] font-medium ${
                  cell.isToday ? 'text-sky-600' : cell.isSunday ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {cell.day}
                </span>
                {cell.classes.length > 0 && !cell.isSunday && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {cell.classes.slice(0, 3).map((c, j) => (
                      <span key={j} className="block px-1 py-0.5 rounded text-[8px] font-medium truncate"
                        style={{ background: 'rgba(14,165,233,0.1)', color: C.sky, maxWidth: '100%' }}>
                        {c.courseCode}
                      </span>
                    ))}
                    {cell.classes.length > 3 && (
                      <span className="text-[8px] text-gray-400">+{cell.classes.length - 3}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
