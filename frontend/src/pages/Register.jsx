import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [accountType, setAccountType] = useState('patient')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const isDoctor = accountType === 'doctor'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (isDoctor && !licenseNumber.trim()) {
      setError('A license number is required to request a doctor account')
      return
    }
    setLoading(true)
    try {
      const payload = isDoctor
        ? { ...form, requestDoctor: true, licenseNumber: licenseNumber.trim() }
        : form
      const data = await api.post('/api/auth/register', payload)
      login(data.token, data.user)
      if (data.doctorRequested) {
        // Pending admin approval — show a confirmation instead of redirecting,
        // since the account is still a patient until approved.
        setSubmitted(true)
        return
      }
      navigate(redirect || '/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Doctor account requested
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Your account was created and your request to become a verified
            doctor is pending review by an administrator. Once approved, open
            the share link again to view the patient's records.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            Create your account
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Start tracking your health today
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['patient', 'doctor'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAccountType(t)}
                    className={`py-2.5 rounded-xl border text-sm font-medium capitalize transition ${
                      accountType === t
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                required
                placeholder="Ana Popescu"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400 transition"
              />
            </div>
            {isDoctor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Medical license number
                </label>
                <input
                  type="text"
                  placeholder="e.g. RO-123456"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400 transition"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Doctor accounts are reviewed by an administrator before they
                  can view patient records.
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-xl transition"
            >
              {loading
                ? 'Creating account…'
                : isDoctor
                  ? 'Request doctor account'
                  : 'Create account'}
            </button>
          </form>
          <p className="text-sm text-center text-gray-500 mt-6">
            Already have an account?{' '}
            <Link
              to={
                redirect
                  ? `/login?redirect=${encodeURIComponent(redirect)}`
                  : '/login'
              }
              className="text-blue-600 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
