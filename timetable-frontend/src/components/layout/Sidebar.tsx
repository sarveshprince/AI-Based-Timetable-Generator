import { NavLink } from 'react-router-dom'

import type { User } from '../../types'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Icon from '../ui/Icon'

type SidebarProps = {
  user: User
  open: boolean
  onClose: () => void
  onLogout: () => void
}

type NavItem = {
  to: string
  label: string
  icon: 'dashboard' | 'building' | 'faculty' | 'subjects' | 'allocation' | 'students' | 'timetable' | 'notifications'
}

const homePathByRole: Record<User['role'], string> = {
  admin: '/dashboard',
  faculty: '/faculty',
  student: '/student',
}

const homeLabelByRole: Record<User['role'], string> = {
  admin: 'Dashboard',
  faculty: 'Faculty Desk',
  student: 'Student Desk',
}

const roleLabelByRole: Record<User['role'], string> = {
  admin: 'Administrator',
  faculty: 'Faculty',
  student: 'Student',
}

const Sidebar = ({ user, open, onClose, onLogout }: SidebarProps) => {
  const navigation: NavItem[] = [
    { to: homePathByRole[user.role], label: homeLabelByRole[user.role], icon: 'dashboard' },
    ...(user.role === 'admin'
      ? [
          { to: '/departments', label: 'Departments', icon: 'building' as const },
          { to: '/faculty', label: 'Faculty', icon: 'faculty' as const },
          { to: '/subjects', label: 'Subjects', icon: 'subjects' as const },
          { to: '/allocation', label: 'Allocations', icon: 'allocation' as const },
          // { to: '/student', label: 'Students', icon: 'students' as const },
        ]
      : []),
    { to: '/timetable', label: 'Timetable', icon: 'timetable' },
    { to: '/notifications', label: 'Notifications', icon: 'notifications' },
  ]

  return (
    <>
      <div
        className={[
          'fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-200 dark:bg-black/60 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={onClose}
      />
      <aside
        className={[
          'fixed left-0 top-0 z-50 flex h-screen w-[292px] flex-col border-r border-gray-200 bg-white transition-transform duration-200 dark:border-gray-800 dark:bg-gray-900 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-6 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-md">
                <Icon name="calendar" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Timetable</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Academic Operations</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 lg:hidden"
            onClick={onClose}
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Workspace</p>
                <p className="text-lg font-semibold">{roleLabelByRole[user.role]}</p>
              </div>
              <Badge tone="info" className="bg-white/15 text-white ring-0">
                Live
              </Badge>
            </div>
            <p className="mt-4 text-sm text-white/80">
              Monitor schedules, people, and notifications from a single clean dashboard.
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="px-2 pb-3 text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
            Navigation
          </div>
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={`${item.to}-${item.label}`}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-300'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={[
                        'rounded-xl p-2 transition-all duration-200',
                        isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 group-hover:bg-white dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-gray-700',
                      ].join(' ')}
                    >
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                    <Icon
                      name="chevronRight"
                      className={[
                        'ml-auto h-4 w-4 transition-transform duration-200',
                        isActive ? 'translate-x-0 text-indigo-500 dark:text-indigo-400' : '-translate-x-1 text-transparent group-hover:translate-x-0 group-hover:text-gray-400 dark:group-hover:text-gray-500',
                      ].join(' ')}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* <div className="border-t border-gray-100 px-6 py-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-sm font-semibold text-white">
              {user.full_name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{user.full_name}</p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <Button variant="secondary" fullWidth onClick={onLogout}>
            <Icon name="logout" className="h-4 w-4" />
            Logout
          </Button>
        </div> */}
      </aside>
    </>
  )
}

export default Sidebar
