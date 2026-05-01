import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    to: '/log',
    label: 'Log symptom',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 8v8M8 12h8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 8v4l3 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M3.05 11a9 9 0 1 0 .5-3M3 4v4h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
]

function NavItem({ item, onClick }) {
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
          isActive
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col py-6 px-4 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21C6.37 15.5 1 10.7 1 6.6 1 3.2 4.07 2 6.28 2c1.31 0 4.15.5 5.72 4.5C13.57 2.5 16.4 2 17.72 2 19.93 2 23 3.2 23 6.6 23 10.7 17.63 15.5 12 21z"
                fill="#3B82F6"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            SymptomTracker
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21C6.37 15.5 1 10.7 1 6.6 1 3.2 4.07 2 6.28 2c1.31 0 4.15.5 5.72 4.5C13.57 2.5 16.4 2 17.72 2 19.93 2 23 3.2 23 6.6 23 10.7 17.63 15.5 12 21z"
                fill="#3B82F6"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            SymptomTracker
          </span>
        </div>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="p-2 rounded-lg hover:bg-gray-50 transition"
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 18L18 6M6 6l12 12"
                stroke="#374151"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="#374151"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile slide-down menu ── */}
      {menuOpen && (
        <div className="md:hidden fixed top-12 left-0 right-0 z-20 bg-white border-b border-gray-100 px-4 py-3 shadow-lg">
          <nav className="flex flex-col gap-1 mb-3">
            {NAV.map((item) => (
              <NavItem
                key={item.to}
                item={item}
                onClick={() => setMenuOpen(false)}
              />
            ))}
          </nav>
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-gray-600">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto md:pt-0 pt-14">{children}</main>
    </div>
  )
}
