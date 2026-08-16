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
import AppShell from '../components/layout/AppShell';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const admin = isAdmin();

  // Fetch dashboard data
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
  });

  if (error) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4 font-semibold">Error loading dashboard</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg shadow-lg shadow-blue-500/25 transition-all">
            Retry
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">📊 Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Welcome back, <span className="font-semibold text-blue-400">{user?.name}</span>! ({user?.role})</p>
        </div>

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
      </div>
    </AppShell>
  );
}
