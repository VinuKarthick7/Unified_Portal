import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import KGAPSCreation from './pages/kgaps/KGAPSCreation'
import VerificationQueue from './pages/kgaps/VerificationQueue'
import KGAPSHandling from './pages/kgaps/KGAPSHandling'
import HandlingVerificationInbox from './pages/kgaps/HandlingVerificationInbox'
import Scheduler from './pages/scheduler/Scheduler'
import SchedulerRequests from './pages/scheduler/SchedulerRequests'
import TimetableSetup from './pages/scheduler/TimetableSetup'
import Tasks from './pages/tasks/Tasks'
import TaskDetail from './pages/tasks/TaskDetail'
import TaskForm from './pages/tasks/TaskForm'
import Appraisal from './pages/appraisal/Appraisal'
import AppraisalDetail from './pages/appraisal/AppraisalDetail'
import AppraisalTemplateForm from './pages/appraisal/AppraisalTemplateForm'
import Departments from './pages/departments/Departments'
import Courses from './pages/courses/Courses'
import HODInbox from './pages/dashboard/HODInbox'
import MyDay from './pages/dashboard/MyDay'
import Analytics from './pages/analytics/Analytics'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import FacultyDashboard from './pages/dashboard/FacultyDashboard'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* All protected routes render inside AppLayout (sidebar + content) */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />

            {/* KG-APS */}
            <Route path="/kgaps/creation" element={<KGAPSCreation />} />
            <Route
              path="/kgaps/verification"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COORDINATOR']}>
                  <VerificationQueue />
                </ProtectedRoute>
              }
            />
            <Route path="/kgaps/handling" element={<KGAPSHandling />} />
            <Route
              path="/kgaps/handling/verify"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                  <HandlingVerificationInbox />
                </ProtectedRoute>
              }
            />

            {/* Scheduler */}
            <Route path="/scheduler" element={<Scheduler />} />
            <Route path="/scheduler/requests" element={<SchedulerRequests />} />
            <Route
              path="/scheduler/setup"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                  <TimetableSetup />
                </ProtectedRoute>
              }
            />

            {/* Tasks */}
            <Route path="/tasks" element={<Tasks />} />
            <Route
              path="/tasks/new"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                  <TaskForm />
                </ProtectedRoute>
              }
            />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route
              path="/tasks/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                  <TaskForm />
                </ProtectedRoute>
              }
            />

            {/* Departments & Courses */}
            <Route path="/departments" element={<Departments />} />
            <Route path="/courses" element={<Courses />} />

            {/* Appraisal */}
            <Route path="/appraisal" element={<Appraisal />} />
            <Route
              path="/appraisal/templates/new"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                  <AppraisalTemplateForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/appraisal/templates/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                  <AppraisalTemplateForm />
                </ProtectedRoute>
              }
            />
            <Route path="/appraisal/submissions/:id" element={<AppraisalDetail />} />

            {/* Dashboard extras */}
            <Route
              path="/hod-inbox"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                  <HODInbox />
                </ProtectedRoute>
              }
            />
            <Route path="/my-day" element={<MyDay />} />
            <Route path="/analytics" element={<Analytics />} />

            {/* Dedicated dashboards */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty-dashboard"
              element={
                <ProtectedRoute allowedRoles={['FACULTY']}>
                  <FacultyDashboard />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
