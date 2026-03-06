import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kgaps/creation"
            element={
              <ProtectedRoute>
                <KGAPSCreation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kgaps/verification"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'COORDINATOR']}>
                <VerificationQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kgaps/handling"
            element={
              <ProtectedRoute>
                <KGAPSHandling />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kgaps/handling/verify"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                <HandlingVerificationInbox />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheduler"
            element={
              <ProtectedRoute>
                <Scheduler />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheduler/requests"
            element={
              <ProtectedRoute>
                <SchedulerRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheduler/setup"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                <TimetableSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/new"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                <TaskForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/:id"
            element={
              <ProtectedRoute>
                <TaskDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/tasks/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                <TaskForm />
              </ProtectedRoute>
            }
          />
          <Route path="/departments"
            element={
              <ProtectedRoute>
                <Departments />
              </ProtectedRoute>
            }
          />
          <Route path="/courses"
            element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            }
          />          <Route path="/appraisal"
            element={
              <ProtectedRoute>
                <Appraisal />
              </ProtectedRoute>
            }
          />
          <Route path="/appraisal/templates/new"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                <AppraisalTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route path="/appraisal/templates/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
                <AppraisalTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route path="/appraisal/submissions/:id"
            element={
              <ProtectedRoute>
                <AppraisalDetail />
              </ProtectedRoute>
            }
          />          <Route path="/hod-inbox" element={<ProtectedRoute allowedRoles={['ADMIN','HOD']}><HODInbox /></ProtectedRoute>} />
          <Route path="/my-day" element={<ProtectedRoute><MyDay /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
