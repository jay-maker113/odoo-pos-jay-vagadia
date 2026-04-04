import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { CheckCircle } from 'lucide-react'

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

  useEffect(() => {
    api.get('/payments/methods').then(r => {
      setMethods(r.data)
    })
  }, [])

  const selectMethod = async (method) => {
    setSelected(method.name)
    setQrData(null)
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
    setProcessing(true)
    try {
      await api.post('/payments/', {
        order_id: parseInt(orderId),
        method: selected,
        amount: amount
      })
      setConfirmed(true)
      setTimeout(() => navigate('/floor'), 2500)
    } catch (err) {
      alert(err.response?.data?.detail || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  if (confirmed) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <CheckCircle className="text-green-400 mx-auto mb-4" size={80} />
        <h2 className="text-white text-3xl font-bold">Payment Confirmed!</h2>
        <p className="text-gray-400 mt-2">₹{amount.toFixed(0)} received via {selected}</p>
        <p className="text-gray-500 text-sm mt-4">Returning to floor view...</p>
      </div>
    </div>
  )

  const methodLabels = { cash: '💵 Cash', digital: '💳 Card / Digital', upi: '📱 UPI QR' }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">Payment</h1>
        <p className="text-center text-gray-400 mb-6">Order #{orderId}</p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 text-center">
          <div className="text-gray-400 text-sm mb-1">Total Amount</div>
          <div className="text-4xl font-bold text-amber-400">₹{amount.toFixed(0)}</div>
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

        {/* UPI QR Code */}
        {selected === 'upi' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 text-center">
            {loadingQr ? (
              <p className="text-gray-400">Generating QR...</p>
            ) : qrData ? (
              <>
                <img
                  src={`data:image/png;base64,${qrData.qr_base64}`}
                  alt="UPI QR Code"
                  className="w-48 h-48 mx-auto rounded-lg"
                />
                <p className="text-gray-400 text-sm mt-3">UPI ID: {qrData.upi_id}</p>
                <p className="text-amber-400 font-bold mt-1">₹{amount.toFixed(0)}</p>
              </>
            ) : null}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected || processing}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-lg transition"
        >
          {processing ? 'Processing...' : 'Confirm Payment'}
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