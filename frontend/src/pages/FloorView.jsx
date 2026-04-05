import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const STATUS_STYLES = {
  free: 'bg-green-500/20 border-green-500/40 text-green-400 hover:border-green-400',
  occupied: 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:border-amber-400',
  bill_requested: 'bg-red-500/20 border-red-500/40 text-red-400 hover:border-red-400',
}

const STATUS_LABEL = {
  free: 'Free',
  occupied: 'Occupied',
  bill_requested: 'Bill Requested',
}

export default function FloorView() {
  const [tables, setTables] = useState([])
  const [floors, setFloors] = useState([])
  const [activeFloor, setActiveFloor] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { activeTerminal } = useAuth()

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchAll = async () => {
    try {
      const [tablesRes, floorsRes] = await Promise.all([
        api.get('/tables/'),
        api.get('/tables/floors')
      ])
      setTables(tablesRes.data)
      setFloors(floorsRes.data)
      if (!activeFloor && floorsRes.data.length > 0) {
        setActiveFloor(floorsRes.data[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTableClick = async (table) => {
    if (!activeTerminal) {
      alert('No active terminal selected. Pick a terminal first.')
      return
    }
    if (table.status === 'free' || table.status === 'occupied') {
      navigate(`/order/${table.id}?tableNum=${table.table_number}`)
    }
  }

  const filtered = tables.filter(t => t.is_active && (!activeFloor || t.floor_id === activeFloor))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        Loading floor plan...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Floor View</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition"
            >
              Go to Backend
            </button>
            <button
              onClick={fetchAll}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition"
            >
              Reload Data
            </button>
            {floors.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFloor(f.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition
                  ${activeFloor === f.id
                    ? 'bg-amber-400 text-gray-950'
                    : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 mb-6 text-sm">
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full border ${STATUS_STYLES[key]}`} />
              <span className="text-gray-400">{label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(table => (
            <button
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`border-2 rounded-xl p-5 text-center transition cursor-pointer
                ${STATUS_STYLES[table.status] || STATUS_STYLES.free}`}
            >
              <div className="text-2xl font-bold mb-1">T{table.table_number}</div>
              <div className="text-xs opacity-70">{table.seats} seats</div>
              <div className="text-xs mt-2 font-medium">{STATUS_LABEL[table.status]}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
