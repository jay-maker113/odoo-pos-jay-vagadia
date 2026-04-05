import { useEffect, useState } from 'react'
import { Clock, Monitor, ShoppingBag, Table2, TrendingUp } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [activeSessions, setActiveSessions] = useState([])
  const [currentSessionDetails, setCurrentSessionDetails] = useState(null)
  const [sessionHistory, setSessionHistory] = useState([])
  const { activeTerminal } = useAuth()

  const fetchDashboard = async () => {
    const requests = [
      api.get('/dashboard/'),
      api.get('/sessions/active'),
      api.get('/sessions/history/closed'),
    ]
    if (activeTerminal?.id) {
      requests.push(api.get(`/sessions/${activeTerminal.id}`))
    }

    const responses = await Promise.all(requests)
    const [dashRes, activeRes, historyRes, currentRes] = responses
    setData(dashRes.data)
    setActiveSessions(activeRes.data)
    setSessionHistory(historyRes.data)
    setCurrentSessionDetails(currentRes?.data || null)
  }

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 10000)
    return () => clearInterval(interval)
  }, [activeTerminal?.id])

  const stats = data ? [
    { label: "Today's Revenue", value: `Rs. ${data.today_revenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-400' },
    { label: "Today's Orders", value: data.today_orders, icon: ShoppingBag, color: 'text-blue-400' },
    { label: 'Occupied Tables', value: `${data.occupied_tables}/${data.total_tables}`, icon: Table2, color: 'text-amber-400' },
    { label: 'Active Orders', value: data.active_orders, icon: Clock, color: 'text-purple-400' },
  ] : []

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg text-sm font-medium">
              Terminal: {activeTerminal?.terminal_name} - Session #{activeTerminal?.id}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <Icon className={`${color} mb-3`} size={24} />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-gray-400 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>

        {activeTerminal && currentSessionDetails && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 border border-amber-400/30 rounded-xl p-5">
              <div className="text-gray-400 text-sm mb-1">This Terminal Sales</div>
              <div className="text-2xl font-bold text-amber-400">
                Rs. {Number(currentSessionDetails.total_sales || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {currentSessionDetails.terminal_name} - Session #{currentSessionDetails.id}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-gray-400 text-sm mb-1">Paid Orders This Session</div>
              <div className="text-2xl font-bold">{currentSessionDetails.paid_orders}</div>
              <div className="text-xs text-gray-500 mt-2">
                Closed by register end, not restaurant-wide
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-gray-400 text-sm mb-1">Active Orders This Session</div>
              <div className="text-2xl font-bold">{currentSessionDetails.active_orders}</div>
              <div className="text-xs text-gray-500 mt-2">
                Draft, kitchen, and ready orders on this terminal
              </div>
            </div>
          </div>
        )}

        {activeSessions.length > 0 && (
          <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-bold mb-3">
              Active Terminals
              <span className="ml-2 text-xs text-gray-500 font-normal">
                {activeSessions.length} running
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-lg p-3 border ${
                    session.id === activeTerminal?.id
                      ? 'bg-amber-400/10 border-amber-400/40'
                      : 'bg-gray-800 border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Monitor
                      size={14}
                      className={session.id === activeTerminal?.id ? 'text-amber-400' : 'text-gray-400'}
                    />
                    <span className="font-medium text-sm">{session.terminal_name}</span>
                    {session.id === activeTerminal?.id && (
                      <span className="text-xs text-amber-400 ml-auto">You</span>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs">Session #{session.id}</div>
                  <div className="text-gray-400 text-xs">{session.order_count} orders</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sessionHistory.length > 0 && (
          <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-bold mb-3">Recent Closed Sessions</h2>
            <div className="space-y-3">
              {sessionHistory.slice(0, 5).map((session) => (
                <div key={session.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-gray-800/60 pb-3 last:border-b-0 last:pb-0">
                  <div>
                    <div className="font-medium text-sm">{session.terminal_name}</div>
                    <div className="text-gray-400 text-xs">
                      Session #{session.id} by {session.opened_by}
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <span className="text-gray-400">{session.paid_orders} paid orders</span>
                    <span className="text-green-400 font-medium">Rs. {Number(session.total_sales || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
