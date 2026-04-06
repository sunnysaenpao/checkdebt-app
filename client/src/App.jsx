import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Borrowers from '@/pages/Borrowers';
import BorrowerForm from '@/pages/BorrowerForm';
import BorrowerDetail from '@/pages/BorrowerDetail';
import Loans from '@/pages/Loans';
import LoanForm from '@/pages/LoanForm';
import LoanDetail from '@/pages/LoanDetail';
import Calendar from '@/pages/Calendar';
import LicenseActivation from '@/pages/LicenseActivation';
import MapView from '@/pages/MapView';

// Admin pages
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminLenders from '@/pages/admin/AdminLenders';
import AdminLenderDetail from '@/pages/admin/AdminLenderDetail';
import AdminLicenses from '@/pages/admin/AdminLicenses';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="borrowers" element={<Borrowers />} />
            <Route path="borrowers/new" element={<BorrowerForm />} />
            <Route path="borrowers/:id" element={<BorrowerDetail />} />
            <Route path="borrowers/:id/edit" element={<BorrowerForm />} />
            <Route path="loans" element={<Loans />} />
            <Route path="loans/new" element={<LoanForm />} />
            <Route path="loans/:id" element={<LoanDetail />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="map" element={<MapView />} />
            <Route path="license" element={<LicenseActivation />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="lenders" element={<AdminLenders />} />
            <Route path="lenders/:id" element={<AdminLenderDetail />} />
            <Route path="licenses" element={<AdminLicenses />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
