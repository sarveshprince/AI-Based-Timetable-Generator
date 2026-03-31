import { NavLink } from 'react-router-dom'
import type { User } from '../types'

type SidebarProps = {
  user: User | null
  onLogout: () => void
}

const Sidebar = ({ user, onLogout }: SidebarProps) => {
  if (!user) {
    return null
  }

  const navClass = ({ isActive }: { isActive: boolean }) => `nav-item${isActive ? ' active' : ''}`
  const homePath = user.role === 'admin' ? '/dashboard' : user.role === 'faculty' ? '/faculty' : '/student'
  const homeLabel = user.role === 'student' ? 'Student Home' : user.role === 'faculty' ? 'Faculty Home' : 'Dashboard'

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <i className="fas fa-calendar-alt" />
        <h2>AI Timetable</h2>
      </div>
      <nav className="sidebar-nav">
        <NavLink to={homePath} className={navClass}>
          <i className="fas fa-home" />
          <span>{homeLabel}</span>
        </NavLink>
        {user.role === 'admin' && (
          <>
            <div className="nav-section">Management</div>
            <NavLink to="/departments" className={navClass}>
              <i className="fas fa-building" />
              <span>Departments</span>
            </NavLink>
            <NavLink to="/faculty" className={navClass}>
              <i className="fas fa-chalkboard-teacher" />
              <span>Faculty</span>
            </NavLink>
            <NavLink to="/subjects" className={navClass}>
              <i className="fas fa-book" />
              <span>Subjects</span>
            </NavLink>
            <NavLink to="/allocation" className={navClass}>
              <i className="fas fa-link" />
              <span>Allocate Subjects</span>
            </NavLink>
            <NavLink to="/student" className={navClass}>
              <i className="fas fa-user-graduate" />
              <span>Students</span>
            </NavLink>
          </>
        )}
        <NavLink to="/timetable" className={navClass}>
          <i className="fas fa-calendar-check" />
          <span>Timetable</span>
        </NavLink>
        <NavLink to="/notifications" className={navClass}>
          <i className="fas fa-bell" />
          <span>Notifications</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user.full_name.charAt(0)}</div>
          <div className="user-details">
            <div className="user-name">{user.full_name}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </div>
        <button type="button" className="logout-btn" onClick={onLogout}>
          <i className="fas fa-sign-out-alt" />
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
