import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">
          Faculty Academic Operations Portal
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user?.first_name} {user?.last_name}
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {user?.role}
            </span>
          </span>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'KG-APS Creation', desc: 'Manage syllabus structure', color: 'bg-indigo-50 border-indigo-200' },
            { label: 'KG-APS Handling', desc: 'Track teaching progress', color: 'bg-green-50 border-green-200' },
            { label: 'Academic Scheduler', desc: 'Timetable & daily entries', color: 'bg-yellow-50 border-yellow-200' },
            { label: 'Task Manager', desc: 'Institutional tasks', color: 'bg-orange-50 border-orange-200' },
            { label: 'Departments', desc: 'Manage departments', color: 'bg-purple-50 border-purple-200' },
            { label: 'Courses', desc: 'Courses & assignments', color: 'bg-blue-50 border-blue-200' },
            { label: 'Appraisal', desc: 'Faculty performance', color: 'bg-pink-50 border-pink-200' },
            { label: 'Analytics', desc: 'Reports & insights', color: 'bg-teal-50 border-teal-200' },
          ].map((m) => (
            <div
              key={m.label}
              className={`border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow ${m.color}`}
            >
              <h2 className="font-semibold text-gray-800 text-sm">{m.label}</h2>
              <p className="text-xs text-gray-500 mt-1">{m.desc}</p>
              <span className="mt-3 inline-block text-xs text-gray-400">Coming soon →</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
