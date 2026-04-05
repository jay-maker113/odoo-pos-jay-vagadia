import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function PaymentScreen() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const amount = parseFloat(searchParams.get('amount') || 0)
  const navigate = useNavigate()

  const [methods, setMethods] = useState([])
  const [selected, setSelected] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [upiConfirmed, setUpiConfirmed] = useState(false)
  const [cardForm, setCardForm] = useState({
    number: '', expiry: '', cvv: '', name: ''
  })

  useEffect(() => {
    api.get('/payments/methods').then(r => {
      setMethods(r.data)
    })
  }, [])

  const formatCardNumber = (val) => {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }

  const formatExpiry = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 4)
    return clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean
  }

  const isDigitalFormValid =
    !!cardForm.name &&
    cardForm.number.replace(/\s/g, '').length >= 16 &&
    !!cardForm.expiry &&
    cardForm.cvv.length >= 3

  const selectMethod = async (method) => {
    setSelected(method.name)
    setQrData(null)
    setUpiConfirmed(false)

    if (method.name === 'upi') {
      setLoadingQr(true)
      try {
        const res = await api.get(`/payments/upi-qr?amount=${amount}`)
        setQrData(res.data)
      } finally {
        setLoadingQr(false)
      }
    }
  }

  const handleConfirm = async () => {
    if (!selected) return
    if (selected === 'digital' && !isDigitalFormValid) {
      return alert('Please fill in all card details')
    }

    setProcessing(true)
    try {
      await api.post('/payments/', {
        order_id: parseInt(orderId),
        method: selected,
        amount: amount
      })
      setConfirmed(true)
    } catch (err) {
      alert(err.response?.data?.detail || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  if (confirmed) {
    return (
      <div
        className="min-h-screen bg-gray-950 flex items-center justify-center cursor-pointer"
        onClick={() => navigate('/floor')}
      >
        <div className="text-center">
          <div className="text-8xl mb-6">✓</div>
          <h2 className="text-white text-3xl font-bold">Payment Confirmed!</h2>
          <p className="text-gray-400 mt-2">
            Rs. {amount.toFixed(0)} received via {selected?.toUpperCase()}
          </p>
          <p className="text-gray-600 text-sm mt-6">Tap anywhere to continue</p>
        </div>
      </div>
    )
  }

  const methodLabels = { cash: 'Cash', digital: 'Card / Digital', upi: 'UPI QR' }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">Payment</h1>
        <p className="text-center text-gray-400 mb-6">Order #{orderId}</p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 text-center">
          <div className="text-gray-400 text-sm mb-1">Total Amount</div>
          <div className="text-4xl font-bold text-amber-400">Rs. {amount.toFixed(0)}</div>
        </div>

        <div className="space-y-3 mb-6">
          {methods.map(method => (
            <button
              key={method.name}
              onClick={() => selectMethod(method)}
              className={`w-full p-4 rounded-xl border-2 text-left font-medium transition
                ${selected === method.name
                  ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                  : 'border-gray-700 bg-gray-900 text-white hover:border-gray-600'}`}
            >
              {methodLabels[method.name] || method.name}
            </button>
          ))}
        </div>

        {selected === 'digital' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="font-medium mb-4 text-gray-300">Card Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Cardholder Name</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                  placeholder="Jay Vagadia"
                  value={cardForm.name}
                  onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Card Number</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400 font-mono"
                  placeholder="4242 4242 4242 4242"
                  value={cardForm.number}
                  onChange={e => setCardForm(f => ({ ...f, number: formatCardNumber(e.target.value) }))}
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Expiry</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400 font-mono"
                    placeholder="MM/YY"
                    value={cardForm.expiry}
                    onChange={e => setCardForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">CVV</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400 font-mono"
                    placeholder="***"
                    type="password"
                    value={cardForm.cvv}
                    onChange={e => setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    maxLength={3}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-xs text-gray-400">Secured by 256-bit SSL encryption</span>
            </div>
          </div>
        )}

        {selected === 'upi' && !upiConfirmed && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 text-center">
            {loadingQr ? (
              <p className="text-gray-400">Generating QR...</p>
            ) : qrData ? (
              <>
                <p className="text-gray-400 text-sm mb-3">
                  Scan to pay Rs. {amount.toFixed(0)} via UPI
                </p>
                <img
                  src={`data:image/png;base64,${qrData.qr_base64}`}
                  alt="UPI QR"
                  className="w-48 h-48 mx-auto rounded-lg mb-3"
                />
                <p className="text-gray-400 text-sm">UPI ID: {qrData.upi_id}</p>
                <p className="text-amber-400 font-bold text-xl mt-1">
                  Rs. {amount.toFixed(0)}
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setSelected(null)}
                    className="flex-1 bg-gray-800 text-gray-400 py-2 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setUpiConfirmed(true)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg text-sm transition"
                  >
                    Payment Done
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {selected === 'upi' && upiConfirmed && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-6 text-center">
            <div className="text-4xl mb-2">✓</div>
            <p className="text-green-400 font-bold">UPI Payment Confirmed</p>
            <p className="text-gray-400 text-sm mt-1">Rs. {amount.toFixed(0)} received</p>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={
            !selected || processing ||
            (selected === 'upi' && !upiConfirmed) ||
            (selected === 'digital' && !isDigitalFormValid)
          }
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-lg transition"
        >
          {processing ? 'Processing...'
            : selected === 'upi' && !upiConfirmed ? 'Waiting for UPI confirmation...'
            : 'Validate Payment'}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full mt-3 text-gray-500 hover:text-gray-300 text-sm py-2 transition"
        >
          ← Back to Order
        </button>
      </div>
    </div>
  )
}
