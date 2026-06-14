import { createContext, useState, useEffect } from 'react'

export const AuthContext = createContext(null)

// Safely parse stored user — returns null if anything is wrong
function parseStoredUser(str) {
  try {
    const u = JSON.parse(str)
    if (!u || typeof u !== 'object') return null
    // Ensure role has a safe default for users registered before RBAC
    if (!u.role) u.role = 'patient'
    // Ensure onboarding has a safe default for old accounts
    if (!u.onboarding)
      u.onboarding = {
        completed: true,
        profileFilled: true,
        firstEntryLogged: true,
      }
    return u
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      const parsed = parseStoredUser(storedUser)
      if (parsed) {
        setToken(storedToken)
        setUser(parsed)
      } else {
        // Corrupted data — clear it
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = (tokenValue, userData) => {
    // Ensure safe defaults when logging in
    const safeUser = {
      ...userData,
      role: userData.role ?? 'patient',
      onboarding: userData.onboarding ?? {
        completed: true,
        profileFilled: true,
        firstEntryLogged: true,
      },
    }
    localStorage.setItem('token', tokenValue)
    localStorage.setItem('user', JSON.stringify(safeUser))
    setToken(tokenValue)
    setUser(safeUser)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading,
        updateUser,
        isAuthenticated: !!token,
        isPatient: user?.role === 'patient',
        isDoctor: user?.role === 'doctor',
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

import { useContext } from 'react'
export function useAuth() {
  return useContext(AuthContext)
}
