import { Routes, Route, Navigate } from 'react-router-dom'
import { getUser } from './auth'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'

function RequireAuth({ children }) {
  const user = getUser()
  return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
