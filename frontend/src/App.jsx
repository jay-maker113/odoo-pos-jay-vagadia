import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FloorView from './pages/FloorView'
import OrderScreen from './pages/OrderScreen'
import PaymentScreen from './pages/PaymentScreen'
import KitchenDisplay from './pages/KitchenDisplay'
import CustomerDisplay from './pages/CustomerDisplay'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/kitchen" element={<KitchenDisplay />} />
          <Route path="/customer-display" element={<CustomerDisplay />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/floor" element={<ProtectedRoute><FloorView /></ProtectedRoute>} />
          <Route path="/order/:tableId" element={<ProtectedRoute><OrderScreen /></ProtectedRoute>} />
          <Route path="/payment/:orderId" element={<ProtectedRoute><PaymentScreen /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
