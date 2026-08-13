// File: client/src/components/users/RoleBadge.jsx
// Role badge component

import { Shield, UserCog, ShoppingCart, Headphones, User } from 'lucide-react';

export default function RoleBadge({ role }) {
  const roleConfig = {
    admin: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'Admin',
      icon: Shield,
    },
    manager: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      label: 'Manager',
      icon: UserCog,
    },
    sales: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Sales',
      icon: ShoppingCart,
    },
    support: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Support',
      icon: Headphones,
    },
    customer: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: 'Customer',
      icon: User,
    },
  };

  const config = roleConfig[role?.toLowerCase()] || roleConfig.customer;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
