import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FullPageLoader } from './components/LoadingSpinner';

// Layouts
import AppShell from './layout/AppShell';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WorkOrders from './pages/WorkOrders';
import Technicians from './pages/Technicians';
import Costs from './pages/Costs';
import Proposals from './pages/Proposals';
import Files from './pages/Files';
import Calendar from './pages/Calendar';
import Commission from './pages/Commission';
import IncomeStatement from './pages/IncomeStatement';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Login is the entry point for non-authenticated users */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      
      {/* Protected app routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/workorders" element={<Navigate to="/work-orders" replace />} />
        <Route path="/technicians" element={<Technicians />} />
        <Route path="/costs" element={<Costs />} />
        <Route path="/proposals" element={<Proposals />} />
        <Route path="/files" element={<Files />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/commission" element={<Commission />} />
        <Route path="/income-statement" element={<IncomeStatement />} />
      </Route>

      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
