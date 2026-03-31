import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AllocationsPage from './pages/AllocationsPage'
import DashboardPage from './pages/DashboardPage'
import DepartmentsPage from './pages/DepartmentsPage'
import FacultyPage from './pages/FacultyPage'
import LoginPage from './pages/LoginPage'
import NotificationsPage from './pages/NotificationsPage'
import StudentPage from './pages/StudentPage'
import SubjectsPage from './pages/SubjectsPage'
import TimetablePage from './pages/TimetablePage'
import { getStoredUser } from './services/api'

const HomeRedirect = () => {
  const user = getStoredUser()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (user.role === 'faculty') {
    return <Navigate to="/faculty" replace />
  }
  if (user.role === 'student') {
    return <Navigate to="/student" replace />
  }
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="admin">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/departments"
          element={
            <ProtectedRoute role="admin">
              <DepartmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty"
          element={
            <ProtectedRoute role={['admin', 'faculty']}>
              <FacultyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects"
          element={
            <ProtectedRoute role="admin">
              <SubjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/allocation"
          element={
            <ProtectedRoute role="admin">
              <AllocationsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route
          path="/student"
          element={
            <ProtectedRoute role={['admin', 'student']}>
              <StudentPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

export default App
