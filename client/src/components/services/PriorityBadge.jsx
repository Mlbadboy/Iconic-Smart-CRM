// File: client/src/components/services/PriorityBadge.jsx
// Priority badge component for service requests

import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function PriorityBadge({ priority }) {
  const priorityConfig = {
    low: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Low',
      icon: Info,
      dot: 'bg-green-500',
    },
    medium: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Medium',
      icon: AlertCircle,
      dot: 'bg-yellow-500',
    },
    high: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      label: 'High',
      icon: AlertTriangle,
      dot: 'bg-orange-500',
    },
    urgent: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'Urgent',
      icon: AlertTriangle,
      dot: 'bg-red-500',
    },
  };

  const config = priorityConfig[priority?.toLowerCase()] || priorityConfig.medium;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
