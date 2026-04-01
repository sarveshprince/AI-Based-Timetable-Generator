import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import { getStoredUser, logout } from '../../services/api'
import { useTheme } from '../../theme'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const titleMap: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Overview Dashboard',
    subtitle: 'Track departments, staffing, and recent timetables from one premium control center.',
  },
  '/departments': {
    title: 'Departments',
    subtitle: 'Manage academic departments and keep your organizational structure clean.',
  },
  '/faculty': {
    title: 'Faculty Management',
    subtitle: 'Review faculty members, access credentials, and department alignment.',
  },
  '/subjects': {
    title: 'Subjects',
    subtitle: 'Organize the curriculum by department, semester, and delivery pattern.',
  },
  '/allocation': {
    title: 'Subject Allocation',
    subtitle: 'Assign faculty to subjects with a cleaner scheduling workflow.',
  },
  '/notifications': {
    title: 'Notifications',
    subtitle: 'Stay on top of important scheduling updates and timetable events.',
  },
  '/timetable': {
    title: 'Timetable Workspace',
    subtitle: 'Generate, review, and export timetable layouts without losing context.',
  },
  '/student': {
    title: 'Students',
    subtitle: 'Manage student records and review active timetable coverage.',
  },
}

const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getStoredUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  if (!user) {
    return null
  }

  const currentPage = titleMap[location.pathname] ?? {
    title: 'AI Timetable System',
    subtitle: 'Academic workflow platform',
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100">
      <Sidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      <div className="min-h-screen lg:pl-[292px]">
        <Topbar
          user={user}
          title={currentPage.title}
          subtitle={currentPage.subtitle}
          onMenuToggle={() => setSidebarOpen((value) => !value)}
          onLogout={handleLogout}
          theme={theme}
          onThemeToggle={toggleTheme}
        />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
