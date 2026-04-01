import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Input from '../components/ui/Input'
import { loginUser, persistSession } from '../services/api'

const emailPattern = /^[a-zA-Z0-9._%+-]+@(gmail\.com|skcet\.ac\.in)$/

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    let valid = true
    setEmailError('')
    setPasswordError('')
    setFormError('')

    if (!email.trim()) {
      setEmailError('Email is required.')
      valid = false
    } else if (!emailPattern.test(email.trim().toLowerCase())) {
      setEmailError('Use a valid @gmail.com or @skcet.ac.in address.')
      valid = false
    }

    if (!password) {
      setPasswordError('Password is required.')
      valid = false
    }

    return valid
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) {
      return
    }

    setLoading(true)
    setFormError('')

    try {
      const response = await loginUser(email.trim().toLowerCase(), password)
      persistSession(response.token, response.user)
      const destination =
        location.state?.from ||
        (response.user.role === 'admin' ? '/dashboard' : response.user.role === 'faculty' ? '/faculty' : '/student')
      navigate(destination, { replace: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to log in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-500 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(191,219,254,0.22),_transparent_30%)]" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
              <Icon name="calendar" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">AI Timetable System</p>
              <p className="text-sm text-indigo-100/80">Premium academic scheduling platform</p>
            </div>
          </div>

          <div className="relative z-10 max-w-xl space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-100/80">Operational Clarity</p>
              <h1 className="text-5xl font-semibold leading-tight">
                Smarter timetable operations
              </h1>
              <p className="max-w-lg text-lg text-indigo-100/85">
                Manage departments, faculty, students, and timetable generation from a calm, polished interface built for daily use.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Responsive workspace built for admins, faculty, and students',
                'Faster scheduling reviews with cleaner timetable visualization',
                'Focused controls and soft motion for a premium experience',
                'Production-ready forms, tables, and loading states',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="mb-3 inline-flex rounded-xl bg-white/15 p-2">
                    <Icon name="sparkles" className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-6 text-white/90">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-sm text-indigo-100/80">
            Timetable intelligence for institutions that want cleaner workflows.
          </p>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-md animate-[fadeUp_400ms_ease-out] rounded-[28px] border border-gray-200 bg-white p-8 shadow-lg sm:p-10">
            <div className="mb-8 space-y-3 text-center lg:text-left">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 lg:mx-0">
                <Icon name="lock" className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Welcome back</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Sign in to continue managing timetables, faculty, and notifications.
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={onSubmit}>
              <Input
                label="Email"
                type="email"
                placeholder="you@skcet.ac.in"
                value={email}
                error={emailError}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                error={passwordError}
                onChange={(event) => setPassword(event.target.value)}
              />

              {formError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              ) : null}

              <Button type="submit" fullWidth size="lg" loading={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-8 rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">
              <p className="font-medium text-gray-700">Allowed domains</p>
              <p className="mt-1">Only `@gmail.com` and `@skcet.ac.in` email addresses are accepted.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default LoginPage
