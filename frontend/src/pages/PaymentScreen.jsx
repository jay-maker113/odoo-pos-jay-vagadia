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
  const [receiptData, setReceiptData] = useState(null)
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
      // Fetch order details for receipt
      const orderRes = await api.get(`/orders/${orderId}`)
      setReceiptData(orderRes.data)
      setConfirmed(true)
    } catch (err) {
      alert(err.response?.data?.detail || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt — Velvet & Vapor</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            h2 { text-align: center; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
            .divider { border-top: 1px dashed #ccc; margin: 8px 0; }
            .center { text-align: center; }
            .total { font-weight: bold; font-size: 15px; }
          </style>
        </head>
        <body>
          <h2>Velvet & Vapor Cafe</h2>
          <p class="center" style="font-size:11px">${new Date().toLocaleString()}</p>
          <div class="divider"></div>
          <div class="row"><span>Order</span><span>${receiptData?.order_number || orderId}</span></div>
          <div class="row"><span>Table</span><span>${receiptData?.table_number ? `Table ${receiptData.table_number}` : '-'}</span></div>
          <div class="row"><span>Payment</span><span>${selected?.toUpperCase()}</span></div>
          <div class="divider"></div>
          ${receiptData?.items?.map(i => `
            <div class="row">
              <span>${i.product_name} x${i.quantity}</span>
              <span>Rs. ${(i.unit_price * i.quantity).toFixed(0)}</span>
            </div>
          `).join('') || ''}
          <div class="divider"></div>
          <div class="row total"><span>TOTAL PAID</span><span>Rs. ${amount.toFixed(0)}</span></div>
          <div class="divider"></div>
          <p class="center" style="font-size:11px">Thank you for dining with us!</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  if (confirmed) {
    return (
      <div
        className="min-h-screen bg-gray-950 flex items-center justify-center p-6 cursor-pointer"
        onClick={() => navigate('/floor')}
      >
        <div className="text-center max-w-sm w-full" onClick={e => e.stopPropagation()}>
          {/* Receipt Card */}
          <div id="receipt" className="bg-white text-gray-900 rounded-2xl p-6 mb-4 text-left">
            {/* Header */}
            <div className="text-center mb-4 border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold">Velvet & Vapor Cafe</h2>
              <p className="text-gray-500 text-xs mt-1">Powered by Velvet & Vapor POS</p>
              <p className="text-gray-400 text-xs">{new Date().toLocaleString()}</p>
            </div>

            {/* Order Info */}
            <div className="mb-4 text-sm">
              <div className="flex justify-between text-gray-500 mb-1">
                <span>Order</span>
                <span className="font-mono">{receiptData?.order_number || `#${orderId}`}</span>
              </div>
              <div className="flex justify-between text-gray-500 mb-1">
                <span>Table</span>
                <span>{receiptData?.table_number ? `Table ${receiptData.table_number}` : '-'}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Payment</span>
                <span className="capitalize">{selected}</span>
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-gray-200 pt-3 mb-3">
              <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Items</p>
              {receiptData?.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm mb-1">
                  <span>{item.product_name} x{item.quantity}</span>
                  <span>Rs. {(item.unit_price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t border-gray-900 pt-3">
              <div className="flex justify-between font-bold text-lg">
                <span>Total Paid</span>
                <span>Rs. {amount.toFixed(0)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400">Thank you for dining with us!</p>
              <p className="text-xs text-gray-300 mt-1">Please visit again</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={handlePrint}
              className="flex-1 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold py-3 rounded-xl transition"
            >
              Print Receipt
            </button>
            <button
              onClick={() => navigate('/floor')}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition"
            >
              Done
            </button>
          </div>
          <p className="text-gray-600 text-sm">Tap anywhere outside to dismiss</p>
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
