import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../lib/api'

export default function Reports() {
  const [orders, setOrders] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/orders/history'),
      api.get('/dashboard/')
    ]).then(([ordersRes, dashRes]) => {
      setOrders(ordersRes.data)
      setDashboard(dashRes.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      Loading reports...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
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

        {/* Order History */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="font-bold">Order History</h2>
            <p className="text-gray-400 text-sm">Last 20 completed orders</p>
          </div>
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No completed orders yet</div>
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
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-5 py-3 font-mono text-xs text-gray-300">
                      {order.order_number}
                    </td>
                    <td className="px-5 py-3">Table {order.table_number}</td>
                    <td className="px-5 py-3 text-gray-400">
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