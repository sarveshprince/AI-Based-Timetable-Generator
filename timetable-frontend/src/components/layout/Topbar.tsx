import type { User } from '../../types'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import type { ThemeMode } from '../../theme'
import ThemeToggle from './ThemeToggle'

type TopbarProps = {
  user: User
  title: string
  subtitle: string
  onMenuToggle: () => void
  onLogout: () => void
  theme: ThemeMode
  onThemeToggle: () => void
}

const roleToneByUser: Record<User['role'], 'indigo' | 'info' | 'success'> = {
  admin: 'indigo',
  faculty: 'info',
  student: 'success',
}

const Topbar = ({ user, title, subtitle, onMenuToggle, onLogout, theme, onThemeToggle }: TopbarProps) => (
  <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900/90">
    <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 lg:hidden"
          onClick={onMenuToggle}
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 sm:text-2xl">{title}</h1>
          <p className="hidden text-sm text-gray-500 dark:text-gray-400 sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle isDark={theme === 'dark'} onToggle={onThemeToggle} />
        <div className="hidden items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-semibold text-indigo-700">
            {user.full_name.slice(0, 1).toUpperCase()}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.full_name}</p>
            <div className="flex items-center justify-end gap-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.username}</p>
              {/* <p className="text-xs text-gray-500">{user.email}</p> */}
              <Badge tone={roleToneByUser[user.role]}>{user.role}</Badge>
            </div>
          </div>
        </div>
        <Button variant="secondary" className="hidden sm:inline-flex" onClick={onLogout}>
          <Icon name="logout" className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  </header>
)

export default Topbar
