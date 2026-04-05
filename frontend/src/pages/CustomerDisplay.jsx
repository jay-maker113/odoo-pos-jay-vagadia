import { useEffect, useRef, useState } from 'react'
import { CheckCircle, ChefHat } from 'lucide-react'
import api from '../lib/api'

export default function CustomerDisplay() {
  const [event, setEvent] = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    fetchCurrentOrder()
    connectWebSocket()
    return () => wsRef.current?.close()
  }, [])

  const fetchCurrentOrder = async () => {
    try {
      const res = await api.get('/orders/customer-display/current')
      setEvent(res.data)
    } catch {
      setEvent(null)
    }
  }

  const connectWebSocket = () => {
    const ws = new WebSocket('ws://127.0.0.1:8002/ws/customer-display')
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      setTimeout(connectWebSocket, 3000)
    }
    ws.onerror = () => ws.close()

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setEvent(data)
      if (data.event === 'payment_confirmed') {
        setTimeout(() => setEvent(null), 8000)
      }
    }
  }

  const isPaid = event?.event === 'payment_confirmed'
  const isKitchenUpdate = event?.event === 'kitchen_update'
  const isOrderUpdate = event?.event === 'order_update'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Velvet & Vapor Cafe</h1>
          <p className="text-gray-400 text-sm">Customer Display</p>
        </div>
        <div className="flex items-center gap-3">
          {event && !isPaid && (
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1 rounded-full font-medium">
              UNPAID
            </span>
          )}
          {isPaid && (
            <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-3 py-1 rounded-full font-medium">
              PAID
            </span>
          )}
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-500">{connected ? 'Connected' : 'Reconnecting...'}</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        {!event && (
          <div className="text-center -mt-6">
            <div className="relative h-44 w-44 mx-auto mb-2">
              <div className="absolute inset-6 rounded-full bg-amber-400/12 blur-2xl" />
              <img
                src="/customer-display-logo.png"
                alt="Velvet & Vapor Cafe"
                className="relative h-full w-full object-contain drop-shadow-[0_0_18px_rgba(251,191,36,0.12)]"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-300">Welcome to</h2>
            <h2 className="text-4xl font-bold text-amber-400 mt-1">Velvet & Vapor</h2>
            <p className="text-gray-500 mt-3 text-lg">Your order details will appear here</p>
          </div>
        )}

        {isOrderUpdate && !isPaid && (
          <div className="w-full max-w-lg">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-amber-400">Your Order</h2>
              <p className="text-gray-400 text-sm mt-1">
                Table {event.table_number} - Order {event.order_number}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-4">
              <div className="divide-y divide-gray-800">
                {event.items?.map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-amber-400/20 text-amber-400 text-xs px-2 py-1 rounded font-bold">
                        x{item.quantity}
                      </span>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">Rs. {item.price}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center px-5 py-4 bg-gray-800/50 border-t border-gray-800">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold text-amber-400">Rs. {event.total}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${event.status === 'ready' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`}></div>
              <span className="text-gray-400 text-sm">
                {event.status === 'ready' ? 'Ready for collection' : 'Being prepared in kitchen'}
              </span>
            </div>
          </div>
        )}

        {isPaid && (
          <div className="text-center animate-pulse">
            <CheckCircle className="text-green-400 mx-auto mb-6" size={120} />
            <h2 className="text-4xl font-bold text-green-400">Payment Confirmed!</h2>
            <p className="text-gray-300 text-2xl mt-4">
              Rs. {event.amount?.toFixed(0)} via {event.method?.toUpperCase()}
            </p>
            {event.order_number && (
              <p className="text-gray-500 mt-2">Order: {event.order_number}</p>
            )}
            <p className="text-gray-400 mt-6 text-lg">Thank you for dining with us!</p>
          </div>
        )}

        {isKitchenUpdate && !isPaid && (
          <div className="text-center">
            {event.stage === 'preparing' && (
              <>
                <ChefHat className="text-amber-400 mx-auto mb-6" size={100} />
                <h2 className="text-3xl font-bold text-amber-400">Your order is being prepared</h2>
                <p className="text-gray-400 mt-3 text-lg">Our chefs are working on it</p>
              </>
            )}
            {event.stage === 'completed' && (
              <>
                <div className="text-8xl mb-6">🍽️</div>
                <h2 className="text-3xl font-bold text-green-400">Order Ready!</h2>
                <p className="text-gray-400 mt-3 text-lg">Please collect your order at the counter</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-900 border-t border-gray-800 px-8 py-3 text-center">
        <p className="text-gray-600 text-sm">Powered by Velvet & Vapor POS • Odoo Integrated</p>
      </div>
    </div>
  )
}
