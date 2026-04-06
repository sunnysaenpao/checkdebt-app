import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Banknote,
  CalendarDays,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Languages,
  KeyRound,
  Map,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/contexts/LanguageContext';

const navItems = [
  { to: '/', labelKey: 'dashboard', icon: LayoutDashboard },
  { to: '/borrowers', labelKey: 'borrowers', icon: Users },
  { to: '/loans', labelKey: 'loans', icon: Banknote },
  { to: '/calendar', labelKey: 'calendar', icon: CalendarDays },
  { to: '/map', labelKey: 'map', icon: Map },
  { to: '/license', labelKey: 'license', icon: KeyRound },
];

function Sidebar({ collapsed, onToggle, mobile, onClose }) {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useLang();
  const width = collapsed && !mobile ? 'w-16' : 'w-64';

  return (
    <aside
      className={`${width} flex flex-col bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 ${
        mobile ? 'fixed inset-0 z-50' : 'relative hidden md:flex'
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4">
        {(!collapsed || mobile) && (
          <span className="text-lg font-bold tracking-wide">{t('appName')}</span>
        )}
        {mobile && (
          <button onClick={onClose} className="p-1 text-white/70 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-1 px-2">
        {navItems.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/50 text-white'
                  : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'
              } ${collapsed && !mobile ? 'justify-center' : ''}`
            }
          >
            <Icon size={20} className="shrink-0" />
            {(!collapsed || mobile) && <span>{t(labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info + Logout */}
      <div className="border-t border-blue-700/50 p-4">
        {(!collapsed || mobile) && user && (
          <div className="mb-3">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-blue-200">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={toggleLang}
          className={`mb-1 w-full text-blue-100 hover:bg-blue-700/40 hover:text-white ${
            collapsed && !mobile ? 'justify-center px-0' : 'justify-start'
          }`}
        >
          <Languages size={18} className="shrink-0" />
          {(!collapsed || mobile) && (
            <span className="ml-2">{lang === 'en' ? 'ภาษาไทย' : 'English'}</span>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={logout}
          className={`w-full text-blue-100 hover:bg-blue-700/40 hover:text-white ${
            collapsed && !mobile ? 'justify-center px-0' : 'justify-start'
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          {(!collapsed || mobile) && <span className="ml-2">{t('logout')}</span>}
        </Button>
      </div>
    </aside>
  );
}

function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const crumbs = segments.length === 0
    ? [{ label: 'Dashboard' }]
    : segments.map((seg) => ({
        label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
      }));

  return (
    <div className="flex items-center gap-1 text-sm text-gray-500">
      <NavLink to="/" className="hover:text-gray-700">
        Home
      </NavLink>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight size={14} />
          <span className="text-gray-700">{crumb.label}</span>
        </span>
      ))}
    </div>
  );
}

export default function Layout() {
  const { t } = useLang();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

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
              onClick={() => {
                if (window.innerWidth < 768) {
                  setMobileOpen(true);
                } else {
                  setSidebarCollapsed((prev) => !prev);
                }
              }}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <Menu size={20} />
            </button>
            <Breadcrumb />
          </div>

          {user && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 capitalize">
              {t(user.role) || 'User'}
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
