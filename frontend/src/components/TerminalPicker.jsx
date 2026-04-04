import { useEffect, useState } from 'react'
import { Monitor, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function TerminalPicker() {
  const { user, selectTerminal } = useAuth()
  const [activeSessions, setActiveSessions] = useState([])
  const [newTerminalName, setNewTerminalName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.get('/sessions/active')
      .then((response) => {
        setActiveSessions(response.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const joinTerminal = (session) => {
    selectTerminal({
      id: session.id,
      terminal_name: session.terminal_name,
      opened_at: session.opened_at,
    })
  }

  const createTerminal = async () => {
    if (!newTerminalName.trim()) return

    setCreating(true)
    try {
      const response = await api.post('/sessions/open', {
        terminal_name: newTerminalName.trim(),
      })
      selectTerminal({
        id: response.data.id,
        terminal_name: response.data.terminal_name,
        opened_at: response.data.opened_at,
      })
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create terminal')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-400">Velvet & Vapor</h1>
          <p className="text-gray-400 mt-1">Welcome, {user?.name}</p>
          <p className="text-gray-500 text-sm mt-1">Select a terminal to begin</p>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center">Loading terminals...</p>
        ) : (
          <>
            {activeSessions.length > 0 && (
              <div className="mb-6">
                <p className="text-gray-400 text-sm font-medium mb-3">
                  Active Terminals ({activeSessions.length})
                </p>
                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => joinTerminal(session)}
                      className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-amber-400/50 rounded-xl p-4 transition text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <Monitor className="text-amber-400" size={20} />
                        <div>
                          <div className="font-medium">{session.terminal_name}</div>
                          <div className="text-gray-500 text-xs mt-0.5">
                            Session #{session.id} - {session.order_count} orders
                          </div>
                        </div>
                      </div>
                      <span className="text-amber-400 text-sm opacity-0 group-hover:opacity-100 transition">
                        Join -&gt;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!showNew ? (
              <button
                onClick={() => setShowNew(true)}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-700 hover:border-amber-400/50 rounded-xl p-4 text-gray-400 hover:text-white transition"
              >
                <Plus size={18} />
                Open New Terminal
              </button>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-sm text-gray-400 mb-3 font-medium">New Terminal</p>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 mb-3"
                  placeholder="e.g. Counter 1, Drive-Through, Table Service"
                  value={newTerminalName}
                  onChange={(e) => setNewTerminalName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createTerminal()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNew(false)}
                    className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTerminal}
                    disabled={creating || !newTerminalName.trim()}
                    className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-gray-950 font-bold py-2 rounded-lg text-sm transition"
                  >
                    {creating ? 'Opening...' : 'Open Terminal'}
                  </button>
                </div>
              </div>
            )}

            {activeSessions.length === 0 && !showNew && (
              <p className="text-gray-600 text-sm text-center mt-4">
                No active terminals. Open one to start taking orders.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
