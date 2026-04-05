import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, ShoppingCart, ChefHat, Settings, BarChart2, QrCode, LogOut, Repeat } from 'lucide-react'

export default function Navbar() {
  const { user, logout, activeTerminal, clearTerminal } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const links = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/floor', label: 'Register', icon: ShoppingCart },
    { path: '/kitchen', label: 'Kitchen', icon: ChefHat },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/reports', label: 'Reports', icon: BarChart2 },
    { path: '/self-ordering', label: 'Self Order', icon: QrCode },
  ]

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout()
      navigate('/login')
    }
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
        <div className="h-16 w-16 rounded-2xl overflow-hidden ring-2 ring-amber-400/20 group-hover:ring-amber-400/50 transition-all bg-white/95 p-1 flex-shrink-0 shadow-sm">
          <img
            src="/velvet-vapor-logo.png"
            alt="Velvet & Vapor Cafe"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="leading-tight">
          <span className="block text-amber-400 font-bold text-2xl tracking-tight">Velvet & Vapor</span>
          <span className="block text-gray-500 text-sm uppercase tracking-[0.24em]">Cafe POS</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {links.map(({ path, label, icon: Icon }) => (
          <button
            key={label}
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
        {activeTerminal && (
          <button
            onClick={() => { clearTerminal(); navigate('/') }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition"
            title="Leave current terminal and pick another one"
          >
            <Repeat size={16} />
            Switch Terminal
          </button>
        )}
        <span className="text-gray-400 text-sm">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition text-sm"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  )
}