import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)