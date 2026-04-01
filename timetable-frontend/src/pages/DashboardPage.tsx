import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import Loader from '../components/ui/Loader'
import StatCard from '../components/ui/StatCard'
import { getDashboardData } from '../services/api'
import type { DashboardResponse } from '../types'

const iconOrder = ['building', 'faculty', 'students', 'timetable'] as const

const statIconForKey = (key: string, index: number) => {
  if (key.includes('department')) return 'building'
  if (key.includes('faculty') || key.includes('assigned')) return 'faculty'
  if (key.includes('student') || key.includes('enrolled')) return 'students'
  if (key.includes('timetable')) return 'timetable'
  if (key.includes('semester')) return 'calendar'
  return iconOrder[index % iconOrder.length]
}

const toneForStatus = (status: string) => {
  if (status === 'active') return 'success'
  return 'neutral'
}

const DashboardPage = () => {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex min-h-[240px] items-center justify-center">
          <Loader label="Loading dashboard..." />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(data.stats).map(([key, value], index) => (
          <StatCard
            key={key}
            label={key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
            value={value}
            hint="Updated from live backend data"
            icon={<Icon name={statIconForKey(key, index)} className="h-5 w-5" />}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Recent timetables</CardTitle>
              <p className="mt-1 text-sm text-gray-500">The latest schedules published across your workspace.</p>
            </div>
            <Link to="/timetable">
              <Button variant="secondary">
                <Icon name="eye" className="h-4 w-4" />
                Open workspace
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: 'department',
                  title: 'Department',
                  render: (row) => <span className="font-medium text-gray-900">{row.department_name || 'N/A'}</span>,
                },
                { key: 'semester', title: 'Semester', render: (row) => `Semester ${row.semester}` },
                { key: 'year', title: 'Academic Year', render: (row) => row.academic_year },
                {
                  key: 'status',
                  title: 'Status',
                  render: (row) => <Badge tone={toneForStatus(row.status)}>{row.status}</Badge>,
                },
                {
                  key: 'action',
                  title: 'Action',
                  render: (row) => (
                    <Link to={`/timetable?id=${row.id}`}>
                      <Button variant="secondary" size="sm">
                        <Icon name="eye" className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                  ),
                },
              ]}
              rows={data.recent_timetables}
              getRowKey={(row) => row.id}
              emptyTitle="No timetables yet"
              emptyDescription="Generated timetables will appear here once scheduling begins."
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="relative h-full min-h-[360px] bg-gradient-to-br from-gray-900 via-indigo-900 to-blue-600 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(191,219,254,0.22),_transparent_28%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <Badge tone="info" className="bg-white/10 text-white ring-0">
                  Premium Workspace
                </Badge>
                <h2 className="mt-4 text-2xl font-semibold">Everything aligned for faster academic planning.</h2>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  Review recent timetable releases, keep staffing in sync, and move from planning to publication with less friction.
                </p>
              </div>

              <div className="mt-8 grid gap-3">
                {[
                  ['Faculty coverage', 'Monitor allocations and manage teaching load from one place.'],
                  ['Student readiness', 'Keep semester-level schedules accessible without visual clutter.'],
                  ['Cleaner exports', 'Download reports from the timetable workspace in one step.'],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon name="sparkles" className="h-4 w-4" />
                      <p className="text-sm font-semibold">{title}</p>
                    </div>
                    <p className="text-sm text-white/75">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {!data.recent_timetables.length ? (
        <EmptyState
          title="Dashboard is ready"
          description="You have live stats, but no recent timetables have been created yet."
        />
      ) : null}
    </>
  )
}

export default DashboardPage
