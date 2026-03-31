import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loginUser, persistSession } from '../services/api'

const emailPattern = /^[a-zA-Z0-9._%+-]+@(gmail\.com|skcet\.ac\.in)$/

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    if (!email || !password) {
      setError('Missing fields')
      setLoading(false)
      return
    }
    if (!emailPattern.test(email)) {
      setError('Invalid email format')
      setLoading(false)
      return
    }
    try {
      const response = await loginUser(email, password)
      persistSession(response.token, response.user)
      const destination =
        location.state?.from ||
        (response.user.role === 'admin' ? '/dashboard' : response.user.role === 'faculty' ? '/faculty' : '/student')
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">
              <i className="fas fa-lock" />
            </div>
            <h2>Welcome Back</h2>
            <p>Login to your account</p>
          </div>
          {error && <div className="alert alert-danger auth-alert">{error}</div>}
          <form onSubmit={onSubmit} className="auth-form">
            <div className="form-group">
              <label>
                <i className="fas fa-envelope" /> Email
              </label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>
                <i className="fas fa-key" /> Password
              </label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              <i className="fas fa-sign-in-alt" /> {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
