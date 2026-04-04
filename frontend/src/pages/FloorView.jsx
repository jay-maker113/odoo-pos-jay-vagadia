import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../lib/api'

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
  const [sessionOpen, setSessionOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAll()
    // Poll table status every 10 seconds
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchAll = async () => {
    try {
      const [tablesRes, floorsRes, sessionRes] = await Promise.all([
        api.get('/tables/'),
        api.get('/tables/floors'),
        api.get('/sessions/active').catch(() => null)
      ])
      setTables(tablesRes.data)
      setFloors(floorsRes.data)
      setSessionOpen(!!sessionRes)
      if (!activeFloor && floorsRes.data.length > 0) {
        setActiveFloor(floorsRes.data[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTableClick = async (table) => {
    if (!sessionOpen) {
      alert('No active POS session. Open a session from Dashboard first.')
      return
    }
    if (table.status === 'free') {
      navigate(`/order/${table.id}?tableNum=${table.table_number}`)
    } else if (table.status === 'occupied') {
      navigate(`/order/${table.id}?tableNum=${table.table_number}`)
    }
  }

  const filtered = tables.filter(t => !activeFloor || t.floor_id === activeFloor)

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      Loading floor plan...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Floor View</h1>
          <div className="flex gap-2">
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

        {/* Legend */}
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