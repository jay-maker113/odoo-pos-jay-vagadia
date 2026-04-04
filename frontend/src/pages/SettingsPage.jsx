import { Fragment, useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import { Plus, Save, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const TABS = ['Products', 'Payment Methods', 'POS Terminal', 'Floor Plan']

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
        {activeTab === 'Floor Plan' && <FloorPlanTab />}
      </div>
    </div>
  )
}

function ProductsTab() {
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '', price: '', category_id: '', tax_percent: 5,
    attributes: []
  })
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)
  const [expandedProduct, setExpandedProduct] = useState(null)

  useEffect(() => {
    fetchProducts()
    api.get('/products/categories').then(r => setCategories(r.data))
  }, [])

  const fetchProducts = () => {
    api.get('/products/').then(r => setProducts(r.data))
  }

  const addAttribute = () => {
    setForm(f => ({
      ...f,
      attributes: [...f.attributes, { name: '', values: [{ value: '', extra_price: 0 }] }]
    }))
  }

  const updateAttribute = (attrIndex, field, value) => {
    setForm(f => {
      const attrs = [...f.attributes]
      attrs[attrIndex] = { ...attrs[attrIndex], [field]: value }
      return { ...f, attributes: attrs }
    })
  }

  const addAttributeValue = (attrIndex) => {
    setForm(f => {
      const attrs = [...f.attributes]
      attrs[attrIndex].values = [...attrs[attrIndex].values, { value: '', extra_price: 0 }]
      return { ...f, attributes: attrs }
    })
  }

  const updateAttributeValue = (attrIndex, valIndex, field, value) => {
    setForm(f => {
      const attrs = [...f.attributes]
      attrs[attrIndex].values[valIndex] = {
        ...attrs[attrIndex].values[valIndex],
        [field]: field === 'extra_price' ? parseFloat(value) || 0 : value
      }
      return { ...f, attributes: attrs }
    })
  }

  const removeAttribute = (attrIndex) => {
    setForm(f => ({
      ...f,
      attributes: f.attributes.filter((_, i) => i !== attrIndex)
    }))
  }

  const handleAdd = async () => {
    if (!form.name || !form.price) return alert('Name and price required')
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        category_id: form.category_id ? parseInt(form.category_id) : null,
        tax_percent: parseFloat(form.tax_percent),
        attributes: form.attributes.filter(a => a.name.trim())
      }
      await api.post('/products/', payload)
      fetchProducts()
      setShowModal(false)
      setForm({ name: '', price: '', category_id: '', tax_percent: 5, attributes: [] })
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
              <th className="text-left px-4 py-3">Variants</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <Fragment key={p.id}>
                <tr
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => setExpandedProduct(expandedProduct === p.id ? null : p.id)}
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-400">{p.category || 'None'}</td>
                  <td className="px-4 py-3 text-amber-400 font-bold">Rs. {p.price}</td>
                  <td className="px-4 py-3 text-gray-400">{p.tax_percent}%</td>
                  <td className="px-4 py-3 text-gray-400">
                    {p.attributes?.length > 0
                      ? <span className="bg-amber-400/20 text-amber-400 text-xs px-2 py-1 rounded-full">
                          {p.attributes.length} attr
                        </span>
                      : <span className="text-gray-600">None</span>
                    }
                  </td>
                </tr>
                {expandedProduct === p.id && p.attributes?.length > 0 && (
                  <tr className="border-b border-gray-800/50 bg-gray-800/20">
                    <td colSpan={5} className="px-6 py-3">
                      {p.attributes.map(attr => (
                        <div key={attr.id} className="mb-2">
                          <span className="text-gray-400 text-xs font-medium uppercase">{attr.name}: </span>
                          {attr.values.map(v => (
                            <span key={v.id} className="inline-block mr-2 text-sm">
                              {v.value}
                              {v.extra_price > 0 &&
                                <span className="text-green-400 ml-1">+Rs.{v.extra_price}</span>
                              }
                            </span>
                          ))}
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg mx-4">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Base Price (Rs.) *</label>
                  <input
                    type="number"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="150"
                  />
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

              {/* Variants Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">Product Variants</label>
                  <button
                    onClick={addAttribute}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Attribute
                  </button>
                </div>

                {form.attributes.map((attr, attrIdx) => (
                  <div key={attrIdx} className="bg-gray-800 rounded-lg p-3 mb-2">
                    <div className="flex gap-2 mb-2">
                      <input
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-amber-400"
                        placeholder="Attribute name (e.g. Pack)"
                        value={attr.name}
                        onChange={e => updateAttribute(attrIdx, 'name', e.target.value)}
                      />
                      <button onClick={() => removeAttribute(attrIdx)}>
                        <X size={16} className="text-gray-500 hover:text-red-400" />
                      </button>
                    </div>
                    {attr.values.map((val, valIdx) => (
                      <div key={valIdx} className="flex gap-2 mb-1">
                        <input
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-amber-400"
                          placeholder="Value (e.g. 6 items)"
                          value={val.value}
                          onChange={e => updateAttributeValue(attrIdx, valIdx, 'value', e.target.value)}
                        />
                        <input
                          type="number"
                          className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-amber-400"
                          placeholder="+Price"
                          value={val.extra_price}
                          onChange={e => updateAttributeValue(attrIdx, valIdx, 'extra_price', e.target.value)}
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => addAttributeValue(attrIdx)}
                      className="text-xs text-gray-400 hover:text-white mt-1"
                    >
                      + Add value
                    </button>
                  </div>
                ))}
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
  const [sessionStats, setSessionStats] = useState(null)
  const [closing, setClosing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const { activeTerminal, clearTerminal } = useAuth()

  useEffect(() => {
    if (!activeTerminal?.id) {
      setSessionStats(null)
      return
    }

    api.get(`/sessions/${activeTerminal.id}`)
      .then(r => setSessionStats(r.data))
      .catch(() => setSessionStats(null))
  }, [activeTerminal?.id])

  const closeSession = async () => {
    if (!activeTerminal) return
    setClosing(true)
    try {
      const res = await api.post(`/sessions/${activeTerminal.id}/close`)
      clearTerminal()
      setConfirmClose(false)
      alert(`Session closed. Total sales: Rs. ${res.data.total_sales}`)
    } catch {
      alert('Failed to close session')
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="max-w-md">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4">POS Terminal</h3>
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Terminal Name</span>
            <span>{activeTerminal?.terminal_name || 'None'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Session ID</span>
            <span>#{activeTerminal?.id || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Session Status</span>
            <span className={activeTerminal ? 'text-green-400' : 'text-red-400'}>
              {activeTerminal ? 'Open' : 'Closed'}
            </span>
          </div>
          {sessionStats && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">This Session Sales</span>
                <span className="text-amber-400">Rs. {Number(sessionStats.total_sales || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Paid Orders</span>
                <span>{sessionStats.paid_orders}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Active Orders</span>
                <span>{sessionStats.active_orders}</span>
              </div>
            </>
          )}
        </div>
        {activeTerminal ? (
          !confirmClose ? (
            <button
              onClick={() => setConfirmClose(true)}
              className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-medium py-3 rounded-lg transition"
            >
              Close This Terminal
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 text-center">
                Close terminal {activeTerminal.terminal_name}? This finalizes its sales.
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
            Pick a terminal before using POS terminal controls
          </p>
        )}
      </div>
    </div>
  )
}

function FloorPlanTab() {
  const [tables, setTables] = useState([])
  const [floors, setFloors] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editTable, setEditTable] = useState(null)
  const [form, setForm] = useState({ table_number: '', seats: 4, floor_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = () => {
    return Promise.all([
      api.get('/tables/all'),
      api.get('/tables/floors')
    ]).then(([t, f]) => {
      setTables(t.data)
      setFloors(f.data)
      if (f.data.length > 0 && !form.floor_id) {
        setForm(prev => ({ ...prev, floor_id: f.data[0].id }))
      }
    })
  }

  const openAdd = () => {
    setEditTable(null)
    setForm({ table_number: '', seats: 4, floor_id: floors[0]?.id || '' })
    setShowModal(true)
  }

  const openEdit = (table) => {
    setEditTable(table)
    setForm({ table_number: table.table_number, seats: table.seats, floor_id: table.floor_id })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.table_number || !form.floor_id) return alert('Table number and floor required')
    setSaving(true)
    try {
      if (editTable) {
        await api.patch(`/tables/${editTable.id}`, { seats: parseInt(form.seats) })
      } else {
        await api.post('/tables/', {
          table_number: parseInt(form.table_number),
          seats: parseInt(form.seats),
          floor_id: parseInt(form.floor_id)
        })
      }
      await fetchAll()
      setShowModal(false)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save table')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (table) => {
    if (table.status === 'occupied' && table.is_active) {
      alert('Cannot disable an occupied table. Clear the order first.')
      return
    }
    try {
      await api.patch(`/tables/${table.id}`, { is_active: !table.is_active })
      fetchAll()
    } catch {
      alert('Failed to update table')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-400 text-sm">{tables.length} tables across {floors.length} floors</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-4 py-2 rounded-lg text-sm transition"
        >
          <Plus size={16} /> Add Table
        </button>
      </div>

      {floors.map(floor => (
        <div key={floor.id} className="mb-6">
          <h3 className="font-bold text-amber-400 mb-3">{floor.name}</h3>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {tables.filter(t => t.floor_id === floor.id).map(table => (
              <div
                key={table.id}
                className={`bg-gray-900 border rounded-xl p-4 text-center
                  ${table.is_active ? 'border-gray-800' : 'border-gray-700 opacity-50'}`}
              >
                <div className="text-lg font-bold">T{table.table_number}</div>
                <div className="text-gray-400 text-xs mt-1">{table.seats} seats</div>
                <div className={`text-xs mt-1 font-medium
                  ${table.status === 'free' ? 'text-green-400' :
                    table.status === 'occupied' ? 'text-amber-400' : 'text-red-400'}`}>
                  {table.status}
                </div>
                <div className="flex gap-1 mt-3">
                  <button
                    onClick={() => openEdit(table)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1 rounded transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(table)}
                    className={`flex-1 text-xs py-1 rounded transition
                      ${table.is_active
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                  >
                    {table.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg">{editTable ? 'Edit Table' : 'Add Table'}</h3>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-gray-400 hover:text-white" />
              </button>
            </div>
            <div className="space-y-4">
              {!editTable && (
                <>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Table Number *</label>
                    <input
                      type="number"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                      value={form.table_number}
                      onChange={e => setForm(f => ({ ...f, table_number: e.target.value }))}
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Floor *</label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                      value={form.floor_id}
                      onChange={e => setForm(f => ({ ...f, floor_id: e.target.value }))}
                    >
                      {floors.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="text-sm text-gray-400 block mb-1">Seats</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  value={form.seats}
                  onChange={e => setForm(f => ({ ...f, seats: e.target.value }))}
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-5 bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-gray-950 font-bold py-3 rounded-lg transition"
            >
              {saving ? 'Saving...' : editTable ? 'Update Table' : 'Add Table'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
