import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTerminal, setActiveTerminal] = useState(() => {
    const stored = sessionStorage.getItem('active_terminal')
    return stored ? JSON.parse(stored) : null
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const name = localStorage.getItem('user_name')
    const isAdmin = localStorage.getItem('is_admin') === 'true'
    if (token) setUser({ token, name, isAdmin })
    setLoading(false)
  }, [])

  const login = (data) => {
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user_name', data.user_name)
    localStorage.setItem('is_admin', data.is_admin)
    setUser({ token: data.access_token, name: data.user_name, isAdmin: data.is_admin })
    sessionStorage.removeItem('active_terminal')
    setActiveTerminal(null)
  }

  const selectTerminal = (terminal) => {
    sessionStorage.setItem('active_terminal', JSON.stringify(terminal))
    setActiveTerminal(terminal)
  }

  const clearTerminal = () => {
    sessionStorage.removeItem('active_terminal')
    setActiveTerminal(null)
  }

  const logout = () => {
    localStorage.clear()
    sessionStorage.removeItem('active_terminal')
    setUser(null)
    setActiveTerminal(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      activeTerminal,
      selectTerminal,
      clearTerminal,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
