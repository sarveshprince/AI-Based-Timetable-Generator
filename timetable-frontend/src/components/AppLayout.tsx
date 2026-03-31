import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { getStoredUser, logout } from '../services/api'

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/departments': 'Departments',
  '/faculty': 'Faculty',
  '/subjects': 'Subjects',
  '/allocation': 'Subject Allocation',
  '/notifications': 'Notifications',
  '/timetable': 'Timetable',
  '/student': 'Students',
}

const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getStoredUser()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <Sidebar user={user} onLogout={handleLogout} />
      <main className={`main-content ${user ? '' : 'full-width'}`}>
        <header className="topbar">
          <h1 className="page-title">{titleMap[location.pathname] || 'AI Timetable'}</h1>
        </header>
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </>
  )
}

export default AppLayout
