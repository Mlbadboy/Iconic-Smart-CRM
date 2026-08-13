// File: client/src/components/dashboard/QuickActions.jsx
// Quick action buttons for dashboard

import { useNavigate } from 'react-router-dom';
import { isAdmin } from '../../lib/utils';
import { Plus, Package, Wrench, FileText, Users, BarChart3, Settings } from 'lucide-react';

export default function QuickActions() {
  const navigate = useNavigate();
  const admin = isAdmin();

  const actions = [
    {
      title: 'Create Order',
      description: 'New customer order',
      icon: Plus,
      color: 'blue',
      path: '/orders',
      forAll: true,
    },
    {
      title: 'Service Request',
      description: 'Create service ticket',
      icon: Wrench,
      color: 'orange',
      path: '/services',
      forAll: true,
    },
    {
      title: 'Products',
      description: 'Manage products',
      icon: Package,
      color: 'purple',
      path: '/products',
      forAll: true,
    },
    {
      title: 'Reports',
      description: 'View analytics',
      icon: BarChart3,
      color: 'green',
      path: '/reports',
      forAll: true,
    },
    {
      title: 'Manage Users',
      description: 'User administration',
      icon: Users,
      color: 'red',
      path: '/users',
      forAll: false, // Admin only
    },
    {
      title: 'Settings',
      description: 'System settings',
      icon: Settings,
      color: 'gray',
      path: '/settings',
      forAll: false, // Admin only
    },
  ];

  // Filter actions based on user role
  const visibleActions = actions.filter(action => action.forAll || admin);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-600">Frequently used features</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {visibleActions.map((action, index) => (
          <ActionCard key={index} {...action} onClick={() => navigate(action.path)} />
        ))}
      </div>
    </div>
  );
}

function ActionCard({ title, description, icon: Icon, color, onClick }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
    orange: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
    purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
    green: 'bg-green-100 text-green-600 hover:bg-green-200',
    red: 'bg-red-100 text-red-600 hover:bg-red-200',
    gray: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 hover:border-primary transition-all group"
    >
      <div className={`p-3 rounded-lg ${colorClasses[color]} transition-colors mb-3`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="font-medium text-gray-900 text-sm text-center">{title}</p>
      <p className="text-xs text-gray-500 text-center mt-1">{description}</p>
    </button>
  );
}
