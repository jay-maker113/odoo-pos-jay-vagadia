import { Contrast } from 'lucide-react'
import { useColorMode } from '../context/ColorModeContext'

export default function ColorModeToggle() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <button
      type="button"
      onClick={toggleColorMode}
      className="fixed right-4 bottom-4 z-[100] flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900/90 px-4 py-2 text-sm font-medium text-gray-200 shadow-lg backdrop-blur hover:bg-gray-800 transition"
      title={colorMode === 'bw' ? 'Switch to full color mode' : 'Switch to black and white mode'}
    >
      <Contrast size={16} />
      {colorMode === 'bw' ? 'Color Mode' : 'B/W Mode'}
    </button>
  )
}
