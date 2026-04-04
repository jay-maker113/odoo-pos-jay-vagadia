import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'

export default function SelfOrder() {
  const { token } = useParams()
  const [tableInfo, setTableInfo] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [orderNumber, setOrderNumber] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Decode token to get table_id
    try {
      const decoded = atob(token)
      const tableId = decoded.split(':')[1]
      setTableInfo({ table_id: parseInt(tableId) })
      
      Promise.all([
        api.get('/products/'),
        api.get('/products/categories')
      ]).then(([prodRes, catRes]) => {
        setProducts(prodRes.data)
        setCategories(['All', ...catRes.data.map(c => c.name)])
      })
    } catch {
      setError('Invalid QR code. Please scan again.')
    }
  }, [token])

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }]
    })
  }

  const updateQty = (productId, delta) => {
    setCart(prev => prev
      .map(i => i.product_id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0))
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const filtered = activeCategory === 'All'
    ? products
    : products.filter(p => p.category === activeCategory)

  const handleSubmit = async () => {
    if (cart.length === 0) return alert('Add at least one item')
    setSubmitting(true)
    try {
      const res = await api.post('/orders/self-order', {
        table_id: tableInfo.table_id,
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
      })
      setOrderNumber(res.data.order_number)
      setSubmitted(true)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to place order. Please ask staff for help.')
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="text-center p-8">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-red-400">{error}</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-400 mb-2">Order Placed!</h2>
        <p className="text-gray-400 mb-1">Your order is being prepared</p>
        <p className="text-amber-400 font-mono text-sm mt-3">{orderNumber}</p>
        <p className="text-gray-500 text-sm mt-6">
          Payment will be collected at the table
        </p>
      </div>
    </div>
  )

  if (!tableInfo) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      Loading...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-40">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-amber-400">Velvet & Vapor Cafe</h1>
        <p className="text-gray-400 text-sm">Table {tableInfo.table_id} — Self Order</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-gray-800">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition
              ${activeCategory === cat
                ? 'bg-amber-400 text-gray-950 font-medium'
                : 'bg-gray-800 text-gray-400'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {filtered.map(product => {
          const cartItem = cart.find(i => i.product_id === product.id)
          return (
            <div
              key={product.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              <div className="font-medium text-sm mb-1">{product.name}</div>
              <div className="text-amber-400 font-bold mb-3">Rs. {product.price}</div>
              {cartItem ? (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => updateQty(product.id, -1)}
                    className="w-8 h-8 bg-gray-700 rounded-full text-white font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold">{cartItem.quantity}</span>
                  <button
                    onClick={() => updateQty(product.id, 1)}
                    className="w-8 h-8 bg-amber-400 rounded-full text-gray-950 font-bold"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(product)}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold py-1.5 rounded-lg text-sm transition"
                >
                  Add
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Sticky Cart */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-400">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
              <span className="font-bold text-amber-400">Rs. {total.toFixed(0)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-gray-950 font-bold py-3 rounded-xl transition"
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}