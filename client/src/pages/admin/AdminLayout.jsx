import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import adminApi from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  LayoutDashboard,
  Building2,
  KeyRound,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/lenders', label: 'Lenders', icon: Building2 },
  { to: '/admin/licenses', label: 'License Codes', icon: KeyRound },
];

function Sidebar({ mobile, onClose }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  return (
    <aside
      className={`w-64 flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 text-white transition-all duration-300 ${
        mobile ? 'fixed inset-0 z-50' : 'relative hidden md:flex'
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield size={22} className="text-purple-400" />
          <span className="text-lg font-bold tracking-wide">CheckDebt Admin</span>
        </div>
        {mobile && (
          <button onClick={onClose} className="p-1 text-white/70 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-1 px-2">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-purple-600/40 text-white'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`
            }
          >
            <Icon size={20} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-700/50 p-4">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-gray-300 hover:bg-gray-700/50 hover:text-white"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="ml-2">Logout</span>
        </Button>
      </div>
    </aside>
  );
}

export default function AdminLayout() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }

    adminApi
      .get('/me')
      .then(({ data }) => {
        setAdmin(data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        navigate('/admin/login', { replace: true });
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar mobile onClose={() => setMobileOpen(false)} />
        </>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-medium text-gray-700">Platform Administration</h1>
          </div>

          <div className="flex items-center gap-3">
            {admin && (
              <span className="text-sm text-gray-600">{admin.name || admin.email}</span>
            )}
            <Badge className="bg-purple-100 text-purple-800">Platform Admin</Badge>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
