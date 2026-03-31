import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getStoredUser } from '../services/api'
import type { User } from '../types'

type ProtectedRouteProps = {
  children: ReactElement
  role?: User['role'] | User['role'][]
}

const defaultPathByRole: Record<User['role'], string> = {
  admin: '/dashboard',
  faculty: '/faculty',
  student: '/student',
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const location = useLocation()
  const user = getStoredUser()

  if (!user || !localStorage.getItem('token')) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role]
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to={defaultPathByRole[user.role]} replace />
    }
  }

  return children
}

export default ProtectedRoute
