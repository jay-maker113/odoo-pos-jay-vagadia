import { useEffect, useState, useRef } from 'react'
import { CheckCircle, Clock, ChefHat } from 'lucide-react'

export default function CustomerDisplay() {
  const [event, setEvent] = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    connectWebSocket()
    return () => wsRef.current?.close()
  }, [])

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
      // Clear paid status after 8 seconds, return to idle
      if (data.event === 'payment_confirmed') {
        setTimeout(() => setEvent(null), 8000)
      }
    }
  }

  const isPaid = event?.event === 'payment_confirmed'
  const isKitchenUpdate = event?.event === 'kitchen_update'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Velvet & Vapor Cafe</h1>
          <p className="text-gray-400 text-sm">Customer Display</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-500">{connected ? 'Connected' : 'Reconnecting...'}</span>
        </div>
      </div>

      {/* Main Display */}
      <div className="flex-1 flex items-center justify-center p-8">
        {!event && (
          <div className="text-center">
            <div className="text-8xl mb-6">☕</div>
            <h2 className="text-3xl font-bold text-gray-300">Welcome to</h2>
            <h2 className="text-4xl font-bold text-amber-400 mt-1">Velvet & Vapor</h2>
            <p className="text-gray-500 mt-4 text-lg">Your order details will appear here</p>
          </div>
        )}

        {isPaid && (
          <div className="text-center animate-pulse">
            <CheckCircle className="text-green-400 mx-auto mb-6" size={120} />
            <h2 className="text-4xl font-bold text-green-400">Payment Confirmed!</h2>
            <p className="text-gray-300 text-2xl mt-4">
              ₹{event.amount?.toFixed(0)} via {event.method?.toUpperCase()}
            </p>
            {event.order_number && (
              <p className="text-gray-500 mt-2">Order: {event.order_number}</p>
            )}
            <p className="text-gray-400 mt-6 text-lg">Thank you for dining with us! 🙏</p>
          </div>
        )}

        {isKitchenUpdate && !isPaid && (
          <div className="text-center">
            {event.stage === 'preparing' && (
              <>
                <ChefHat className="text-amber-400 mx-auto mb-6" size={100} />
                <h2 className="text-3xl font-bold text-amber-400">Your order is being prepared</h2>
                <p className="text-gray-400 mt-3 text-lg">Our chefs are working on it 👨‍🍳</p>
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

      {/* Footer */}
      <div className="bg-gray-900 border-t border-gray-800 px-8 py-3 text-center">
        <p className="text-gray-600 text-sm">Powered by Velvet & Vapor POS • Odoo Integrated</p>
      </div>
    </div>
  )
}