import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import LogSymptom from './pages/LogSymptom'
import History from './pages/History'
import Profile from './pages/Profile'
import Compare from './pages/Compare'
import Medications from './pages/Medications'
import ShareManager from './pages/ShareManager'
import DoctorView from './pages/DoctorView'
import DoctorPatients from './pages/DoctorPatients'
import AdminPanel from './pages/AdminPanel'

// Smart redirect based on role + onboarding status
function HomeRedirect() {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <svg
          className="animate-spin w-6 h-6 text-gray-300"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    )

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (user?.role === 'admin') return <Navigate to="/admin" replace />
  if (user?.role === 'doctor') return <Navigate to="/doctor/patients" replace />

  // Patient: check onboarding safely (old accounts won't have this field)
  const onboardingDone = user?.onboarding?.completed ?? true
  if (!onboardingDone) return <Navigate to="/onboarding" replace />

  return <Navigate to="/dashboard" replace />
}

const P = ({ children, roles }) => (
  <ProtectedRoute allowedRoles={roles}>{children}</ProtectedRoute>
)

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Doctor share link — no auth needed to view the accept page */}
      <Route path="/doctor/view/:token" element={<DoctorView />} />

      {/* Doctor dashboard */}
      <Route
        path="/doctor/patients"
        element={
          <P roles={['doctor', 'admin']}>
            <DoctorPatients />
          </P>
        }
      />

      {/* Onboarding */}
      <Route
        path="/onboarding"
        element={
          <P roles={['patient', 'admin']}>
            <Onboarding />
          </P>
        }
      />

      {/* Patient + admin */}
      <Route
        path="/dashboard"
        element={
          <P roles={['patient', 'doctor', 'admin']}>
            <Dashboard />
          </P>
        }
      />
      <Route
        path="/log"
        element={
          <P roles={['patient', 'admin']}>
            <LogSymptom />
          </P>
        }
      />
      <Route
        path="/history"
        element={
          <P roles={['patient', 'doctor', 'admin']}>
            <History />
          </P>
        }
      />
      <Route
        path="/compare"
        element={
          <P roles={['patient', 'admin']}>
            <Compare />
          </P>
        }
      />
      <Route
        path="/medications"
        element={
          <P roles={['patient', 'admin']}>
            <Medications />
          </P>
        }
      />
      <Route
        path="/share"
        element={
          <P roles={['patient', 'admin']}>
            <ShareManager />
          </P>
        }
      />
      <Route
        path="/profile"
        element={
          <P>
            <Profile />
          </P>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <P roles={['admin']}>
            <AdminPanel />
          </P>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
