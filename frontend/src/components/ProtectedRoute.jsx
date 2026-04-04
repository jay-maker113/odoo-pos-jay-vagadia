import { useAuth } from '../context/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'
import TerminalPicker from './TerminalPicker'

const TERMINAL_FREE_ROUTES = ['/reports', '/settings', '/self-ordering']

export default function ProtectedRoute({ children }) {
  const { user, loading, activeTerminal } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>
  }

  if (!user) return <Navigate to="/login" />

  const needsTerminal = !TERMINAL_FREE_ROUTES.includes(location.pathname)
  if (needsTerminal && !activeTerminal) return <TerminalPicker />

  return children
}
