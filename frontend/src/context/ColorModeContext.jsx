import { createContext, useContext, useEffect, useState } from 'react'

const ColorModeContext = createContext(null)

export function ColorModeProvider({ children }) {
  const [colorMode, setColorMode] = useState(() => {
    return localStorage.getItem('color_mode') || 'color'
  })

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode
    localStorage.setItem('color_mode', colorMode)
  }, [colorMode])

  const toggleColorMode = () => {
    setColorMode((current) => current === 'color' ? 'bw' : 'color')
  }

  return (
    <ColorModeContext.Provider value={{ colorMode, toggleColorMode }}>
      {children}
    </ColorModeContext.Provider>
  )
}

export function useColorMode() {
  return useContext(ColorModeContext)
}
