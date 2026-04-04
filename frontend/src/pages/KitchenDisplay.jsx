import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const STAGES = ['to_cook', 'preparing', 'completed']
const STAGE_LABELS = {
  to_cook: 'To Cook',
  preparing: 'Preparing',
  completed: 'Completed',
}
const STAGE_STYLES = {
  to_cook: 'border-red-500/50 bg-red-500/10',
  preparing: 'border-amber-500/50 bg-amber-500/10',
  completed: 'border-green-500/50 bg-green-500/10',
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const navigate = useNavigate()
  const { activeTerminal } = useAuth()

  useEffect(() => {
    fetchActiveOrders()
    connectWebSocket()
    return () => wsRef.current?.close()
  }, [])

  const fetchActiveOrders = async () => {
    try {
      const res = await api.get('/orders/')
      const kitchenOrders = res.data.filter((order) =>
        order.status === 'sent_to_kitchen' || order.status === 'ready'
      )
      setOrders(kitchenOrders)
    } catch (err) {
      console.error('Failed to fetch orders', err)
    }
  }

  const connectWebSocket = () => {
    const ws = new WebSocket('ws://127.0.0.1:8002/ws/kitchen')
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      setTimeout(connectWebSocket, 3000)
    }
    ws.onerror = () => ws.close()

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.event === 'new_order') {
        setOrders((prev) => {
          const exists = prev.find((order) => order.id === data.order.id)
          if (exists) return prev
          return [data.order, ...prev]
        })
      }
    }
  }

  const advanceStage = async (order) => {
    const currentIndex = STAGES.indexOf(order.kitchen_stage)
    if (currentIndex === STAGES.length - 1) return

    const nextStage = STAGES[currentIndex + 1]
    try {
      await api.patch(`/orders/${order.id}/kitchen-stage`, { stage: nextStage })
      setOrders((prev) => prev.map((item) =>
        item.id === order.id
          ? { ...item, kitchen_stage: nextStage, status: nextStage === 'completed' ? 'ready' : item.status }
          : item
      ))
    } catch (err) {
      console.error('Stage update failed', err)
    }
  }

  const ordersByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = orders.filter((order) => order.kitchen_stage === stage)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-amber-400">Velvet & Vapor - Kitchen Display</h1>
          <p className="text-gray-400 text-sm">Live order management</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition"
          >
            {activeTerminal ? `Back to ${activeTerminal.terminal_name}` : 'Back to Dashboard'}
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-400">{connected ? 'Live' : 'Reconnecting...'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 p-6 h-[calc(100vh-73px)]">
        {STAGES.map((stage) => (
          <div key={stage} className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{STAGE_LABELS[stage]}</h2>
              <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full">
                {ordersByStage[stage].length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {ordersByStage[stage].length === 0 ? (
                <div className="border border-dashed border-gray-800 rounded-xl p-6 text-center text-gray-600 text-sm">
                  No orders
                </div>
              ) : (
                ordersByStage[stage].map((order) => (
                  <div
                    key={order.id}
                    onClick={() => advanceStage(order)}
                    className={`border-2 rounded-xl p-4 cursor-pointer hover:opacity-80 transition ${STAGE_STYLES[stage]}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm">{order.order_number}</span>
                      <span className="text-xs text-gray-400">Table {order.table_number}</span>
                    </div>
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm">
                          <span className="bg-gray-700 text-white text-xs px-2 py-0.5 rounded font-bold">
                            x{item.quantity}
                          </span>
                          <span className="text-gray-200">{item.product_name}</span>
                        </div>
                      ))}
                    </div>
                    {stage !== 'completed' && (
                      <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-center text-gray-400">
                        Tap to advance -&gt;
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
