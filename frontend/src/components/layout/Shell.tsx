import {
  Archive,
  Award,
  Bell,
  ChevronDown,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Tag,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'New Sale', href: '/sales/new', icon: ShoppingCart, permission: 'write:sales' },
  { name: 'Inventory', href: '/inventory', icon: Package, permission: 'read:inventory' },
  { name: 'Sales History', href: '/sales/history', icon: History, permission: 'read:sales' },
];

const catalogLinks: NavItem[] = [
  { name: 'Products', href: '/catalog/products', icon: Tag, permission: 'read:products' },
  { name: 'Categories', href: '/catalog/categories', icon: Layers, permission: 'read:products' },
  { name: 'Brands', href: '/catalog/brands', icon: Award, permission: 'read:products' },
  { name: 'Batches', href: '/catalog/batches', icon: Archive, permission: 'read:inventory' },
];

export default function Shell() {
  const { sidebarOpen, toggleSidebar, showNotification } = useAppStore();
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [catalogOpen, setCatalogOpen] = useState(location.pathname.startsWith('/catalog'));

  const isCatalog = location.pathname.startsWith('/catalog');

  const permissions = user?.permissions ?? [];
  const can = (p: string) => permissions.includes(p);

  const visibleNav = navigation.filter((item) => !item.permission || can(item.permission));
  const visibleCatalog = catalogLinks.filter((item) => !item.permission || can(item.permission));
  const showCatalogSection = visibleCatalog.length > 0;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort
    }
    clearAuth();
    navigate('/login', { replace: true });
    showNotification('You have been signed out.', 'info');
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? 'U';
  const displayName = user?.username ?? 'User';
  const roleLabel = user?.roles.map((r) => r.name).join(', ') ?? '';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out`}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary-600 overflow-hidden whitespace-nowrap">
            <ShoppingCart className="w-6 h-6 shrink-0" />
            {sidebarOpen && <span className="transition-opacity duration-300">TextilePOS</span>}
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${isActive
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="transition-opacity duration-300">{item.name}</span>}
              </Link>
            );
          })}

          {/* Catalog section */}
          {showCatalogSection && (
            <div className="pt-2">
              {sidebarOpen ? (
                <button
                  onClick={() => setCatalogOpen((o) => !o)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${isCatalog
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 shrink-0" />
                    <span>Catalog</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${catalogOpen ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <Link
                  to="/catalog/products"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${isCatalog
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <Tag className="w-5 h-5 shrink-0" />
                </Link>
              )}

              {sidebarOpen && catalogOpen && (
                <div className="ml-8 mt-1 space-y-0.5">
                  {visibleCatalog.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User info at bottom of sidebar */}
        {sidebarOpen && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                {initials}
              </div>
              <span className="text-sm font-medium hidden md:inline text-gray-700">{displayName}</span>
              <button
                onClick={handleLogout}
                className="ml-1 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
