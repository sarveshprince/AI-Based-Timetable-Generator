import { useEffect, useState } from 'react'

import Badge from '../components/ui/Badge'
import { Card, CardContent } from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import Loader from '../components/ui/Loader'
import PageHeader from '../components/ui/PageHeader'
import { getNotifications } from '../services/api'
import type { Notification } from '../types'

const toneForNotification = (type: string) => {
  if (type === 'timetable_update') {
    return 'info'
  }
  return 'neutral'
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNotifications()
      .then((response) => setNotifications(response.notifications))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load notifications'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Recent activity across timetable publishing and academic scheduling updates."
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div> : null}

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader label="Loading notifications..." />
            </div>
          ) : notifications.length ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={[
                    'flex flex-col gap-4 rounded-2xl border px-5 py-4 transition-all duration-200 md:flex-row md:items-center md:justify-between',
                    notification.is_read ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50/70',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-white p-3 text-indigo-600 shadow-sm">
                      <Icon name="notifications" className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{notification.message}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <Icon name="clock" className="h-4 w-4" />
                        {notification.created_at}
                      </div>
                    </div>
                  </div>
                  <Badge tone={toneForNotification(notification.notification_type)}>{notification.notification_type.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No notifications"
              description="You are all caught up. New timetable updates will land here."
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default NotificationsPage
