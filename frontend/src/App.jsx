import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import LogSymptom from './pages/LogSymptom'
import History from './pages/History'
import Profile from './pages/Profile'
import Compare from './pages/Compare'
import Medications from './pages/Medications'

function P({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <P>
                <Dashboard />
              </P>
            }
          />
          <Route
            path="/log"
            element={
              <P>
                <LogSymptom />
              </P>
            }
          />
          <Route
            path="/history"
            element={
              <P>
                <History />
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
          <Route
            path="/compare"
            element={
              <P>
                <Compare />
              </P>
            }
          />
          <Route
            path="/medications"
            element={
              <P>
                <Medications />
              </P>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
