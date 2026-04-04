import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import { Plus, Minus, Trash2, Send, CreditCard, Mic, MicOff } from 'lucide-react'

export default function OrderScreen() {
  const { tableId } = useParams()
  const [searchParams] = useSearchParams()
  const tableNum = searchParams.get('tableNum')
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [existingOrder, setExistingOrder] = useState(null)
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [variantModal, setVariantModal] = useState(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    fetchData()
  }, [tableId])

  const fetchData = async () => {
    const [prodRes, catRes] = await Promise.all([
      api.get('/products/'),
      api.get('/products/categories')
    ])
    setProducts(prodRes.data)
    setCategories(['All', ...catRes.data.map(c => c.name)])

    // Check for existing order on this table
    try {
      const orderRes = await api.get(`/orders/table/${tableId}`)
      setExistingOrder(orderRes.data)
      // Pre-populate cart from existing order
      setCart(orderRes.data.items.map(i => ({
        product_id: i.product_id,
        name: i.product_name,
        price: i.unit_price,
        quantity: i.quantity
      })))
    } catch {
      // No existing order, fresh start
    }
  }

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }]
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

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return alert('Cart is empty')
    setSending(true)
    try {
      let order = existingOrder
      const items = cart.map(i => ({ product_id: i.product_id, quantity: i.quantity }))

      if (!order) {
        const res = await api.post('/orders/', { table_id: parseInt(tableId), items })
        order = res.data
      } else {
        await api.patch(`/orders/${order.id}/items`, { items })
      }
      await api.post(`/orders/${order.id}/send-to-kitchen`)
      navigate('/floor')
    } catch (err) {
      alert(err.response?.data?.detail || 'Error sending order')
    } finally {
      setSending(false)
    }
  }

  const handlePayment = async () => {
    if (cart.length === 0) return alert('Cart is empty')
    try {
      let order = existingOrder
      const items = cart.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
      if (!order) {
        const res = await api.post('/orders/', { table_id: parseInt(tableId), items })
        order = res.data
      } else {
        await api.patch(`/orders/${order.id}/items`, { items })
      }
      navigate(`/payment/${order.id}?amount=${total}`)
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating order')
    }
  }

  // Voice ordering
  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return alert('Voice not supported in this browser. Use Chrome.')

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase()
      parseVoiceOrder(transcript)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognition.start()
    setListening(true)
  }

  const parseVoiceOrder = (transcript) => {
    const numberWords = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      a: 1, an: 1
    }
    let matched = 0
    products.forEach(product => {
      const nameLower = product.name.toLowerCase()
      // Check if product name appears in transcript
      const keywords = nameLower.split(' ')
      const found = keywords.some(kw => kw.length > 3 && transcript.includes(kw))
      if (found) {
        // Try to find a quantity word before the product name
        let qty = 1
        const words = transcript.split(' ')
        const productIndex = words.findIndex(w => nameLower.includes(w) && w.length > 3)
        if (productIndex > 0) {
          const prev = words[productIndex - 1]
          qty = parseInt(prev) || numberWords[prev] || 1
        }
        for (let i = 0; i < qty; i++) addToCart(product)
        matched++
      }
    })
    if (matched === 0) alert(`Couldn't match any items from: "${transcript}"`)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Products Panel */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Table {tableNum}</h2>
            <button
              onClick={listening ? () => recognitionRef.current?.stop() : startVoice}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition
                ${listening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {listening ? <><MicOff size={16} /> Listening...</> : <><Mic size={16} /> Voice Order</>}
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition
                  ${activeCategory === cat
                    ? 'bg-amber-400 text-gray-950 font-medium'
                    : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto">
            {filtered.map(product => (
              <button
                key={product.id}
                onClick={() => product.attributes?.length > 0
                  ? setVariantModal(product)
                  : addToCart(product)
                }
                className="bg-gray-900 border border-gray-800 hover:border-amber-400/50 rounded-xl p-4 text-left transition"
              >
                <div className="font-medium text-sm">{product.name}</div>
                <div className="text-amber-400 font-bold mt-1">₹{product.price}</div>
                {product.category && (
                  <div className="text-gray-500 text-xs mt-1">{product.category}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-bold text-lg">Order</h3>
            {existingOrder && (
              <span className="text-xs text-amber-400">#{existingOrder.order_number}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-sm text-center mt-8">No items yet. Tap a product or use Voice Order.</p>
            ) : (
              cart.map(item => (
                <div key={item.product_id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    <div className="text-amber-400 text-sm">₹{(item.price * item.quantity).toFixed(0)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product_id, -1)}
                      className="w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product_id, 1)}
                      className="w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-800 space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-amber-400">₹{total.toFixed(0)}</span>
            </div>
            <button
              onClick={handleSendToKitchen}
              disabled={sending || cart.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium py-3 rounded-lg transition"
            >
              <Send size={16} />
              {sending ? 'Sending...' : 'Send to Kitchen'}
            </button>
            <button
              onClick={handlePayment}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-gray-950 font-bold py-3 rounded-lg transition"
            >
              <CreditCard size={16} />
              Payment
            </button>
          </div>
        </div>
      </div>

      {variantModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-lg mb-1">{variantModal.name}</h3>
            <p className="text-gray-400 text-sm mb-4">Base price: Rs. {variantModal.price}</p>
            {variantModal.attributes.map(attr => (
              <div key={attr.id} className="mb-4">
                <p className="text-sm text-gray-400 mb-2">{attr.name}</p>
                <div className="space-y-2">
                  {attr.values.map(val => (
                    <button
                      key={val.id}
                      onClick={() => {
                        addToCart({
                          ...variantModal,
                          name: `${variantModal.name} (${val.value})`,
                          price: variantModal.price + val.extra_price
                        })
                        setVariantModal(null)
                      }}
                      className="w-full flex justify-between items-center bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-amber-400 rounded-lg px-4 py-2 transition"
                    >
                      <span>{val.value}</span>
                      <span className="text-amber-400">
                        Rs. {variantModal.price + val.extra_price}
                        {val.extra_price > 0 &&
                          <span className="text-green-400 text-xs ml-1">+{val.extra_price}</span>
                        }
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => setVariantModal(null)}
              className="w-full mt-3 text-gray-500 hover:text-gray-300 text-sm py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
