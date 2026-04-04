import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import { TrendingUp, ShoppingBag, Table2, Clock } from 'lucide-react'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const navigate = useNavigate()

  const fetchDashboard = () => api.get('/dashboard/').then(r => setData(r.data))

  useEffect(() => { fetchDashboard() }, [])

  const openSession = async () => {
    setSessionLoading(true)
    try {
      await api.post('/sessions/open')
      await fetchDashboard()
    } finally {
      setSessionLoading(false)
    }
  }

  const stats = data ? [
    { label: "Today's Revenue", value: `₹${data.today_revenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-400' },
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
          {data && !data.session_open && (
            <button
              onClick={openSession}
              disabled={sessionLoading}
              className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-6 py-2 rounded-lg transition"
            >
              {sessionLoading ? 'Opening...' : 'Open POS Session'}
            </button>
          )}
          {data?.session_open && (
            <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg text-sm font-medium">
              ● Session Active
            </span>
          )}
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

        {data?.top_products?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Top Products Today</h2>
            <div className="space-y-3">
              {data.top_products.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-5">{i + 1}</span>
                    <span>{p.name}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-gray-400">{p.qty} sold</span>
                    <span className="text-green-400 font-medium">₹{p.revenue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => navigate('/floor')}
            className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-amber-400/50 rounded-xl p-6 text-left transition group"
          >
            <div className="text-amber-400 font-bold text-lg group-hover:text-amber-300">Go to Floor View →</div>
            <div className="text-gray-400 text-sm mt-1">Select a table and start taking orders</div>
          </button>
        </div>
      </div>
    </div>
  )
}