// File: client/src/components/dashboard/StatsCards.jsx
// Statistics cards for dashboard

import { TrendingUp, TrendingDown, Package, DollarSign, Users, Wrench } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export default function StatsCards({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      change: stats?.ordersChange || 0,
    },
    {
      title: 'Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      change: stats?.revenueChange || 0,
    },
    {
      title: 'Customers',
      value: stats?.uniqueRetailers || 0,
      icon: Users,
      color: 'purple',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
      change: stats?.customersChange || 0,
    },
    {
      title: 'Active Services',
      value: stats?.activeServices || 0,
      icon: Wrench,
      color: 'orange',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
      change: stats?.servicesChange || 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, bgColor, textColor, change }) {
  const isPositive = change >= 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${textColor}`} />
        </div>
        {change !== undefined && change !== 0 && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-gray-600 text-sm mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
