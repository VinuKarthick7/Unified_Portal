/**
 * TimetableSetup.jsx — HOD/Admin page to configure timetables.
 * - Pick a course assignment, then assign day/period/room slots
 * - Submit saves to backend, replacing all existing slots
 */
import { useState, useEffect, useCallback } from 'react'
import { getCourses, getMyAssignments } from '../../api/core'
import { getPeriods, getTimetables, setupTimetable } from '../../api/scheduler'

// reuse api to get ALL assignments (admin view)
import api from '../../api/axios'
const getAllAssignments = () => api.get('/courses/assignments/')

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAY_LABEL = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' }

export default function TimetableSetup() {
  const [timetables, setTimetables] = useState([])
  const [allAssignments, setAllAssignments] = useState([])
  const [periods, setPeriods] = useState([])
  const [selectedTT, setSelectedTT] = useState(null)
  // slots: [ {day_of_week, period, room} ]
  const [slots, setSlots] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tt, p, a] = await Promise.all([getTimetables(), getPeriods(), getAllAssignments()])
      setTimetables(tt.data)
      setPeriods(p.data)
      setAllAssignments(a.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Initialise a new timetable (0 slots) so it can be picked and edited
  const initTimetable = async (assignment) => {
    setSaving(true)
    try {
      await setupTimetable({ course_assignment: assignment.id, slots: [] })
      await load()
    } catch (err) {
      alert('Failed to initialise timetable.')
    } finally { setSaving(false) }
  }

  const scheduledIds = new Set(timetables.map(t => t.course_assignment))
  const unscheduled = allAssignments.filter(a => !scheduledIds.has(a.id))

  const selectTimetable = (tt) => {
    setSelectedTT(tt)
    setSaved(false)
    // Pre-populate existing slots
    setSlots(tt.slots.map(s => ({ day_of_week: s.day_of_week, period: s.period, room: s.room })))
  }

  const toggleSlot = (day, periodId) => {
    const exists = slots.find(s => s.day_of_week === day && s.period === periodId)
    if (exists) {
      setSlots(prev => prev.filter(s => !(s.day_of_week === day && s.period === periodId)))
    } else {
      setSlots(prev => [...prev, { day_of_week: day, period: periodId, room: '' }])
    }
  }

  const setRoom = (day, periodId, room) => {
    setSlots(prev => prev.map(s =>
      s.day_of_week === day && s.period === periodId ? { ...s, room } : s
    ))
  }

  const save = async () => {
    if (!selectedTT) return
    setSaving(true)
    try {
      await setupTimetable({ course_assignment: selectedTT.course_assignment, slots })
      setSaved(true)
      load()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert(Object.values(err.response?.data || {}).flat().join(' ') || 'Save failed.')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Timetable Setup</h1>
        <p className="text-sm text-gray-500 mt-1">Configure weekly timetable slots for each course assignment.</p>
      </div>

      {/* Timetable picker */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Scheduled Assignments</h2>
        {timetables.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No timetables yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {timetables.map(tt => (
              <button key={tt.id} onClick={() => selectTimetable(tt)}
                className={`text-left border rounded-xl p-4 transition-all ${selectedTT?.id === tt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <p className="font-semibold text-sm text-gray-800">{tt.course_code}</p>
                <p className="text-xs text-gray-500 mt-0.5">{tt.course_name}</p>
                <p className="text-xs text-gray-400 mt-1">Sec {tt.section} · {tt.faculty_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{tt.slots.length} slot{tt.slots.length !== 1 ? 's' : ''} configured</p>
              </button>
            ))}
          </div>
        )}

        {unscheduled.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Unscheduled Assignments</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unscheduled.map(a => (
                <div key={a.id} className="border border-dashed border-gray-300 rounded-xl p-4 bg-white flex flex-col gap-2">
                  <p className="font-semibold text-sm text-gray-800">{a.course_code}</p>
                  <p className="text-xs text-gray-500">{a.course_name}</p>
                  <p className="text-xs text-gray-400">Sec {a.section} · {a.faculty_name}</p>
                  <button onClick={() => initTimetable(a)} disabled={saving}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 self-start">
                    + Create timetable
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Grid editor */}
      {selectedTT && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">
              Editing: {selectedTT.course_code} — Sec {selectedTT.section}
            </h2>
            <div className="flex items-center gap-3">
              {saved && <span className="text-sm text-green-600">Saved!</span>}
              <button onClick={save} disabled={saving}
                className="bg-blue-600 text-white px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Timetable'}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            Click a cell to toggle a slot. Click a toggled cell's room field to set the room.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left text-gray-500 text-xs w-28">Period</th>
                  {DAYS.map(d => (
                    <th key={d} className="bg-gray-50 border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                      {DAY_LABEL[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(p => (
                  <tr key={p.id}>
                    <td className="border border-gray-200 px-3 py-2 bg-gray-50">
                      <p className="font-medium text-xs text-gray-700">{p.name}</p>
                      <p className="text-gray-400 text-xs">{p.start_time?.slice(0,5)}–{p.end_time?.slice(0,5)}</p>
                    </td>
                    {DAYS.map(d => {
                      const active = slots.find(s => s.day_of_week === d && s.period === p.id)
                      return (
                        <td key={d}
                          onClick={() => toggleSlot(d, p.id)}
                          className={`border border-gray-200 px-2 py-1 text-center cursor-pointer transition-colors ${active ? 'bg-blue-100' : 'bg-white hover:bg-gray-50'}`}>
                          {active ? (
                            <input
                              type="text"
                              value={active.room}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setRoom(d, p.id, e.target.value)}
                              className="w-full text-xs text-center bg-transparent outline-none text-blue-700 placeholder-blue-300"
                              placeholder="room?"
                            />
                          ) : (
                            <span className="text-gray-200 text-xs">+</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-2">Blue cells are active slots. Type a room name in each cell (optional).</p>
        </div>
      )}
    </div>
  )
}
