// File: client/src/pages/Dashboard.jsx
// Complete dashboard page - REPLACE EXISTING Dashboard.jsx

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getUser, logout, isAdmin } from '../lib/utils';
import { dashboardService } from '../services/dashboardService';
import StatsCards from '../components/dashboard/StatsCards';
import SalesChart from '../components/dashboard/SalesChart';
import StatusChart from '../components/dashboard/StatusChart';
import RecentOrders from '../components/dashboard/RecentOrders';
import QuickActions from '../components/dashboard/QuickActions';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { LogOut, Bell } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const admin = isAdmin();

  // Fetch dashboard data
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading dashboard</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary">Iconic Smart CRM</h1>
              <p className="text-sm text-gray-600">
                Welcome back, <span className="font-medium">{user?.name}</span>!
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Role Badge */}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                admin 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {user?.role}
              </span>

              {/* Notifications (placeholder) */}
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Admin Panel Link */}
              {admin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="btn btn-secondary"
                >
                  Admin Panel
                </button>
              )}
              
              {/* Logout */}
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {isLoading ? (
          <LoadingSpinner text="Loading dashboard..." fullScreen={false} />
        ) : (
          <>
            {/* Statistics Cards */}
            <StatsCards stats={data?.stats} loading={isLoading} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesChart data={data} loading={isLoading} />
              <StatusChart data={data} loading={isLoading} />
            </div>

            {/* Quick Actions */}
            <QuickActions />

            {/* Recent Orders */}
            <RecentOrders orders={data?.recentOrders} loading={isLoading} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <p>© 2025 Iconic Smart CRM. All rights reserved.</p>
            <div className="flex gap-6">
              <button className="hover:text-primary">Help</button>
              <button className="hover:text-primary">Privacy</button>
              <button className="hover:text-primary">Terms</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
