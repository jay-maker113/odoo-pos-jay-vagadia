import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import { Plus, Save, X } from 'lucide-react'

const TABS = ['Products', 'Payment Methods', 'POS Terminal']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Products')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium transition border-b-2 -mb-px
                ${activeTab === tab
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-gray-400 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === 'Products' && <ProductsTab />}
        {activeTab === 'Payment Methods' && <PaymentMethodsTab />}
        {activeTab === 'POS Terminal' && <POSTerminalTab />}
      </div>
    </div>
  )
}

function ProductsTab() {
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', category_id: '', tax_percent: 5 })
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/products/').then(r => setProducts(r.data))
    api.get('/products/categories').then(r => setCategories(r.data))
  }, [])

  const handleAdd = async () => {
    if (!form.name || !form.price) return alert('Name and price required')
    setSaving(true)
    try {
      const res = await api.post('/products/', {
        name: form.name,
        price: parseFloat(form.price),
        category_id: form.category_id ? parseInt(form.category_id) : null,
        tax_percent: parseFloat(form.tax_percent),
      })
      setProducts(prev => [...prev, res.data])
      setShowModal(false)
      setForm({ name: '', price: '', category_id: '', tax_percent: 5 })
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-400 text-sm">{products.length} products configured</p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-4 py-2 rounded-lg text-sm transition"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Price</th>
              <th className="text-left px-4 py-3">Tax %</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-400">{p.category || 'None'}</td>
                <td className="px-4 py-3 text-amber-400 font-bold">Rs. {p.price}</td>
                <td className="px-4 py-3 text-gray-400">{p.tax_percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold">Add Product</h3>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-gray-400 hover:text-white" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Product Name *</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Espresso"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Price (Rs.) *</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="150"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Category</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                >
                  <option value="">No category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Tax %</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  value={form.tax_percent}
                  onChange={e => setForm(f => ({ ...f, tax_percent: e.target.value }))}
                />
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="w-full mt-5 bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-gray-950 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentMethodsTab() {
  const [methods, setMethods] = useState([])
  const [upiId, setUpiId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/payments/methods-all').then(r => {
      setMethods(r.data)
      const upi = r.data.find(m => m.name === 'upi')
      if (upi?.upi_id) setUpiId(upi.upi_id)
    })
  }, [])

  const toggleMethod = async (method) => {
    try {
      const res = await api.patch(`/payments/methods/${method.id}`, {
        is_enabled: !method.is_enabled
      })
      setMethods(prev => prev.map(m =>
        m.id === method.id ? { ...m, is_enabled: res.data.is_enabled } : m
      ))
    } catch {
      alert('Failed to update payment method')
    }
  }

  const saveUpiId = async () => {
    setSaving(true)
    try {
      const upi = methods.find(m => m.name === 'upi')
      if (upi) {
        await api.patch(`/payments/methods/${upi.id}`, { upi_id: upiId })
        alert('UPI ID saved')
      }
    } finally {
      setSaving(false)
    }
  }

  const labels = { cash: 'Cash', digital: 'Card / Digital', upi: 'UPI QR' }

  return (
    <div className="space-y-4">
      {methods.map(method => (
        <div key={method.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="font-medium">{labels[method.name] || method.name}</span>
            <button
              onClick={() => toggleMethod(method)}
              className={`relative w-12 h-6 rounded-full transition-colors
                ${method.is_enabled ? 'bg-amber-400' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                ${method.is_enabled ? 'translate-x-7' : 'translate-x-1'}`}
              />
            </button>
          </div>
          {method.name === 'upi' && method.is_enabled && (
            <div className="mt-4 flex gap-3">
              <input
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="yourname@ybl"
              />
              <button
                onClick={saveUpiId}
                disabled={saving}
                className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-4 py-2 rounded-lg text-sm transition"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function POSTerminalTab() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  useEffect(() => {
    api.get('/sessions/active')
      .then(r => setSession(r.data))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [])

  const closeSession = async () => {
    if (!session) return
    setClosing(true)
    try {
      const res = await api.post(`/sessions/${session.id}/close`)
      setSession(null)
      setConfirmClose(false)
      alert(`Session closed. Total sales: Rs. ${res.data.total_sales}`)
    } catch {
      alert('Failed to close session')
    } finally {
      setClosing(false)
    }
  }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div className="max-w-md">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4">POS Terminal</h3>
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Terminal Name</span>
            <span>Velvet and Vapor - Main</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Session Status</span>
            <span className={session ? 'text-green-400' : 'text-red-400'}>
              {session ? 'Open' : 'Closed'}
            </span>
          </div>
          {session && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Session ID</span>
              <span>#{session.id}</span>
            </div>
          )}
        </div>
        {session ? (
          !confirmClose ? (
            <button
              onClick={() => setConfirmClose(true)}
              className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-medium py-3 rounded-lg transition"
            >
              Close Session
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 text-center">
                Are you sure? This finalizes all sales.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmClose(false)}
                  className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={closeSession}
                  disabled={closing}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg text-sm transition"
                >
                  {closing ? 'Closing...' : 'Confirm Close'}
                </button>
              </div>
            </div>
          )
        ) : (
          <p className="text-gray-500 text-sm text-center">
            Open a session from the Dashboard
          </p>
        )}
      </div>
    </div>
  )
}