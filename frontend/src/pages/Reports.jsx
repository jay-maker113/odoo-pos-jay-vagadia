import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export default function Reports() {
  const [filters, setFilters] = useState({
    date_from: '', date_to: '', session_id: '', product_name: ''
  })
  const [results, setResults] = useState(null)
  const [sessions, setSessions] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/sessions-list'),
      api.get('/dashboard/')
    ]).then(([sessRes, dashRes]) => {
      setSessions(sessRes.data)
      setDashboard(dashRes.data)
    }).finally(() => setInitialLoading(false))

    fetchFiltered()
  }, [])

  const fetchFiltered = async (overrides = {}) => {
    setLoading(true)
    const params = { ...filters, ...overrides }
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v) query.append(k, v) })
    try {
      const res = await api.get(`/dashboard/orders-filtered?${query}`)
      setResults(res.data)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value }
    setFilters(updated)
  }

  const applyFilters = () => fetchFiltered()

  const clearFilters = () => {
    const cleared = { date_from: '', date_to: '', session_id: '', product_name: '' }
    setFilters(cleared)
    fetchFiltered(cleared)
  }

  const exportPDF = () => {
    if (!results || results.orders.length === 0) return alert('No data to export')
    
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.setTextColor(40)
    doc.text('Velvet & Vapor Cafe', 14, 20)
    
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Order Report - Generated ${new Date().toLocaleDateString()}`, 14, 28)
    doc.text(`Total Orders: ${results.order_count} | Total Revenue: Rs. ${results.total_revenue?.toFixed(0)}`, 14, 35)

    autoTable(doc, {
      startY: 42,
      head: [['Order #', 'Table', 'Items', 'Total', 'Status']],
      body: results.orders.map(o => [
        o.order_number,
        `Table ${o.table_number}`,
        o.items.map(i => `${i.product_name} x${i.quantity}`).join(', '),
        `Rs. ${o.total_amount}`,
        'Paid'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [251, 191, 36], textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    })

    doc.save(`velvet-vapor-report-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  const exportXLS = () => {
    if (!results || results.orders.length === 0) return alert('No data to export')

    const rows = results.orders.map(o => ({
      'Order Number': o.order_number,
      'Table': `Table ${o.table_number}`,
      'Items': o.items.map(i => `${i.product_name} x${i.quantity}`).join(', '),
      'Total (Rs.)': o.total_amount,
      'Status': 'Paid'
    }))

    const summary = [
      { 'Order Number': 'SUMMARY', 'Table': '', 'Items': '', 'Total (Rs.)': '', 'Status': '' },
      { 'Order Number': 'Total Orders', 'Table': results.order_count, 'Items': '', 'Total (Rs.)': '', 'Status': '' },
      { 'Order Number': 'Total Revenue', 'Table': `Rs. ${results.total_revenue?.toFixed(0)}`, 'Items': '', 'Total (Rs.)': '', 'Status': '' },
    ]

    const ws = XLSX.utils.json_to_sheet([...rows, ...summary])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')
    XLSX.writeFile(wb, `velvet-vapor-report-${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  if (initialLoading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      Loading...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-gray-400 text-sm mb-1">Today Revenue</div>
            <div className="text-2xl font-bold text-green-400">
              Rs. {dashboard?.today_revenue?.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-gray-400 text-sm mb-1">Orders Today</div>
            <div className="text-2xl font-bold text-blue-400">
              {dashboard?.today_orders || 0}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-gray-400 text-sm mb-1">Avg Order Value</div>
            <div className="text-2xl font-bold text-amber-400">
              Rs. {dashboard?.today_orders
                ? Math.round(dashboard.today_revenue / dashboard.today_orders)
                : 0}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="font-bold mb-4">Filters</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date From</label>
              <input
                type="date"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                value={filters.date_from}
                onChange={e => handleFilterChange('date_from', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date To</label>
              <input
                type="date"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                value={filters.date_to}
                onChange={e => handleFilterChange('date_to', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Session</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                value={filters.session_id}
                onChange={e => handleFilterChange('session_id', e.target.value)}
              >
                <option value="">All Sessions</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    Session #{s.id} — Rs. {s.total_sales}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Product</label>
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                placeholder="e.g. Pizza"
                value={filters.product_name}
                onChange={e => handleFilterChange('product_name', e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={applyFilters}
              disabled={loading}
              className="bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-gray-950 font-bold px-6 py-2 rounded-lg text-sm transition"
            >
              {loading ? 'Filtering...' : 'Apply Filters'}
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded-lg text-sm transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results Summary */}
        {results && (
          <div className="flex gap-4 mb-4">
            <span className="text-gray-400 text-sm">
              {results.order_count} orders found
            </span>
            <span className="text-green-400 text-sm font-medium">
              Total: Rs. {results.total_revenue?.toFixed(0)}
            </span>
          </div>
        )}

        {/* Top Products */}
        {dashboard?.top_products?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h2 className="font-bold mb-4">Top Products Today</h2>
            <div className="space-y-2">
              {dashboard.top_products.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 w-4">{i + 1}</span>
                    <span>{p.name}</span>
                  </div>
                  <div className="flex gap-6">
                    <span className="text-gray-400">{p.qty} sold</span>
                    <span className="text-green-400 font-medium">Rs. {p.revenue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h2 className="font-bold">Order History</h2>
              <p className="text-gray-400 text-sm">Completed orders</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Export PDF
              </button>
              <button
                onClick={exportXLS}
                className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Export XLS
              </button>
            </div>
          </div>
          {!results || results.orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No orders match the filters</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left px-5 py-3">Order</th>
                  <th className="text-left px-5 py-3">Table</th>
                  <th className="text-left px-5 py-3">Items</th>
                  <th className="text-left px-5 py-3">Total</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.orders.map(order => (
                  <tr key={order.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-5 py-3 font-mono text-xs text-gray-300">
                      {order.order_number}
                    </td>
                    <td className="px-5 py-3">Table {order.table_number}</td>
                    <td className="px-5 py-3 text-gray-400 max-w-xs truncate">
                      {order.items.map(i => `${i.product_name} x${i.quantity}`).join(', ')}
                    </td>
                    <td className="px-5 py-3 text-amber-400 font-bold">
                      Rs. {order.total_amount}
                    </td>
                    <td className="px-5 py-3">
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                        Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
