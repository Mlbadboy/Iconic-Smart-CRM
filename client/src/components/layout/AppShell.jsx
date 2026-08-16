import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user') || '{}';
    try {
      setUser(JSON.parse(userStr));
    } catch (e) {
      setUser({ name: 'User', role: 'user' });
    }

    // Mock initial notifications
    setNotifications([
      { id: '1', title: 'SLA Warning', message: 'Service SR000001 is nearing SLA threshold.', type: 'warning' },
      { id: '2', title: 'New Approval Request', message: 'Order ORD000005 requires value approval.', type: 'info' }
    ]);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { label: '📊 Dashboard', path: '/dashboard' },
    { label: '👥 Customers', path: '/customers' },
    { label: '📦 Orders', path: '/orders' },
    { label: '🛠️ Service Requests', path: '/service-requests' },
    { label: '🏷️ Products', path: '/products' },
    { label: '🔌 Serial Validation', path: '/serial-validation' },
    { label: '📋 SLA & Escalations', path: '/slas' },
    { label: '📝 Approvals', path: '/approvals' },
    { label: '✅ Tasks', path: '/tasks' },
    { label: '👤 Users', path: '/users', roles: ['admin', 'administrator'] },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans">
      {/* Sidebar Layout */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <h1 className="text-xl font-bold tracking-wider text-blue-400">ICONIC CRM</h1>
          </div>
          <nav className="p-4 flex flex-col gap-1">
            {navItems.map((item) => {
              if (item.roles && user && !item.roles.includes(user.role)) return null;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
          {user && (
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white uppercase">
                {user.name ? user.name[0] : 'U'}
              </div>
              <div className="truncate">
                <div className="font-semibold text-slate-200 truncate">{user.name}</div>
                <div className="text-xs text-slate-500 capitalize">{user.role}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full mt-2 bg-slate-900 hover:bg-red-950/40 hover:text-red-400 border border-slate-800 hover:border-red-900/60 text-slate-400 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-slate-950/80 border-b border-slate-850 px-8 flex items-center justify-between backdrop-blur-md z-30">
          <div className="w-96 relative">
            <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Global Search (leads, orders, customers)..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 transition-colors"
            >
              <span>🔔</span>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-xs text-white rounded-full flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-slate-950 border border-slate-800 shadow-xl rounded-xl p-4 z-50 flex flex-col gap-2">
                <div className="font-semibold text-slate-200 border-b border-slate-800 pb-2 flex justify-between">
                  <span>Notifications</span>
                  <button onClick={() => setNotifications([])} className="text-xs text-blue-400 hover:underline">Clear all</button>
                </div>
                {notifications.length === 0 ? (
                  <div className="text-slate-500 text-sm py-4 text-center">No new alerts</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-850 text-xs">
                        <div className="font-semibold text-slate-300">{n.title}</div>
                        <div className="text-slate-400 mt-0.5">{n.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Content Panel */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-900/40">
          {children}
        </main>
      </div>
    </div>
  );
}
