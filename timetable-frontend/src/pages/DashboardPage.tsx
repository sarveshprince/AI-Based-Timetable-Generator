import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardData } from '../services/api'
import type { DashboardResponse } from '../types'

const DashboardPage = () => {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
  }, [])

  if (error) {
    return <div className="alert alert-danger">{error}</div>
  }

  if (!data) {
    return <div className="dashboard-section">Loading dashboard...</div>
  }

  return (
    <>
      <div className="stats-grid">
        {Object.entries(data.stats).map(([key, value]) => (
          <div className="stat-card" key={key}>
            <div className="stat-icon bg-blue">
              <i className="fas fa-chart-bar" />
            </div>
            <div className="stat-content">
              <h3>{value}</h3>
              <p>{key.replace(/_/g, ' ')}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-section">
        <h2 className="section-title">
          <i className="fas fa-calendar-check" /> Recent Timetables
        </h2>
        {data.recent_timetables.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Semester</th>
                <th>Year</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_timetables.map((item) => (
                <tr key={item.id}>
                  <td>{item.department_name}</td>
                  <td>{item.semester}</td>
                  <td>{item.academic_year}</td>
                  <td>
                    <span className={`badge badge-${item.status}`}>{item.status}</span>
                  </td>
                  <td>
                    <Link to={`/timetable?id=${item.id}`} className="btn btn-sm btn-primary">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <i className="fas fa-calendar-times" />
            <p>No timetables available</p>
          </div>
        )}
      </div>
    </>
  )
}

export default DashboardPage
