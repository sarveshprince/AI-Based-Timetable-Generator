import { useEffect, useState } from 'react'
import { getNotifications } from '../services/api'
import type { Notification } from '../types'

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getNotifications()
      .then((response) => setNotifications(response.notifications))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load notifications'))
  }, [])

  return (
    <div className="dashboard-section">
      <h2 className="section-title">
        <i className="fas fa-bell" /> Notifications
      </h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {notifications.length > 0 ? (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div key={notification.id} className={`notification-card ${notification.is_read ? '' : 'notification-card--unread'}`}>
              <div className="notification-copy">
                <div className="notification-title">{notification.message}</div>
                <div className="notification-time">{notification.created_at}</div>
              </div>
              <span className={`badge badge-${notification.notification_type}`}>{notification.notification_type}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <i className="fas fa-bell-slash" />
          <p>No notifications</p>
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
