import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../lib/api'

export default function SelfOrderQR() {
  const [tables, setTables] = useState([])
  const [qrData, setQrData] = useState({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(null)

  useEffect(() => {
    api.get('/tables/').then(r => {
      setTables(r.data)
      setLoading(false)
    })
  }, [])

  const generateQR = async (tableId) => {
    setGenerating(tableId)
    try {
      const res = await api.get(`/orders/self-order-qr/${tableId}`)
      setQrData(prev => ({ ...prev, [tableId]: res.data }))
    } finally {
      setGenerating(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      Loading...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Self Ordering</h1>
        <p className="text-gray-400 text-sm mb-6">
          Generate QR codes for tables. Customers scan to order directly from their phone.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {tables.map(table => (
            <div key={table.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <div className="text-xl font-bold mb-1">Table {table.table_number}</div>
              <div className="text-gray-400 text-sm mb-4">{table.seats} seats</div>

              {qrData[table.id] ? (
                <>
                  <img
                    src={`data:image/png;base64,${qrData[table.id].qr_base64}`}
                    alt={`QR Table ${table.table_number}`}
                    className="w-36 h-36 mx-auto rounded-lg mb-3"
                  />
                  <p className="text-xs text-gray-500 font-mono break-all mb-3">
                    {qrData[table.id].token}
                  </p>
                  <button
                    onClick={() => generateQR(table.id)}
                    className="text-xs text-gray-400 hover:text-white transition"
                  >
                    Regenerate
                  </button>
                </>
              ) : (
                <button
                  onClick={() => generateQR(table.id)}
                  disabled={generating === table.id}
                  className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-gray-950 font-bold py-2 rounded-lg text-sm transition"
                >
                  {generating === table.id ? 'Generating...' : 'Generate QR'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}