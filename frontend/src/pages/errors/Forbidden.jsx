import { useNavigate } from 'react-router-dom'

export default function Forbidden() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-rose-100 flex items-center justify-center">
          <svg className="w-9 h-9 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">403</h1>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 mb-6">You don't have permission to view this page.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}
