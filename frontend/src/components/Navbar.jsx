import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, UtensilsCrossed, ChefHat, Settings, LogOut } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const links = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/floor', label: 'Floor View', icon: UtensilsCrossed },
    { path: '/kitchen', label: 'Kitchen', icon: ChefHat },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 font-bold text-lg">Velvet & Vapor</span>
        <span className="text-gray-600 text-sm ml-2">Cafe POS</span>
      </div>
      <div className="flex items-center gap-1">
        {links.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
              ${location.pathname === path
                ? 'bg-amber-400 text-gray-950'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm">{user?.name}</span>
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition text-sm"
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  )
}
