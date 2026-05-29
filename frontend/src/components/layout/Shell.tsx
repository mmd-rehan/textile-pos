import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Package, LayoutDashboard, History, Menu, Bell } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export default function Shell() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'New Sale', href: '/sales/new', icon: ShoppingCart },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Sales History', href: '/sales/history', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out`}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary-600 overflow-hidden whitespace-nowrap">
            <ShoppingCart className="w-6 h-6 shrink-0" />
            {sidebarOpen && <span className="transition-opacity duration-300">TextilePOS</span>}
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="transition-opacity duration-300">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
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
            <button className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-lg text-gray-700 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                A
              </div>
              <span className="text-sm font-medium hidden md:inline">Admin User</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
