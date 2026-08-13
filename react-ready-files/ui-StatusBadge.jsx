// File: client/src/components/ui/StatusBadge.jsx
// Reusable status badge component

export default function StatusBadge({ status }) {
  const statusConfig = {
    pending: { 
      bg: 'bg-yellow-100', 
      text: 'text-yellow-800', 
      label: 'Pending',
      dot: 'bg-yellow-500'
    },
    confirmed: { 
      bg: 'bg-blue-100', 
      text: 'text-blue-800', 
      label: 'Confirmed',
      dot: 'bg-blue-500'
    },
    processing: { 
      bg: 'bg-indigo-100', 
      text: 'text-indigo-800', 
      label: 'Processing',
      dot: 'bg-indigo-500'
    },
    'ready-to-ship': { 
      bg: 'bg-purple-100', 
      text: 'text-purple-800', 
      label: 'Ready to Ship',
      dot: 'bg-purple-500'
    },
    dispatched: { 
      bg: 'bg-cyan-100', 
      text: 'text-cyan-800', 
      label: 'Dispatched',
      dot: 'bg-cyan-500'
    },
    shipped: { 
      bg: 'bg-blue-100', 
      text: 'text-blue-800', 
      label: 'Shipped',
      dot: 'bg-blue-500'
    },
    delivered: { 
      bg: 'bg-green-100', 
      text: 'text-green-800', 
      label: 'Delivered',
      dot: 'bg-green-500'
    },
    completed: { 
      bg: 'bg-green-100', 
      text: 'text-green-800', 
      label: 'Completed',
      dot: 'bg-green-500'
    },
    cancelled: { 
      bg: 'bg-red-100', 
      text: 'text-red-800', 
      label: 'Cancelled',
      dot: 'bg-red-500'
    },
    paid: { 
      bg: 'bg-green-100', 
      text: 'text-green-800', 
      label: 'Paid',
      dot: 'bg-green-500'
    },
    unpaid: { 
      bg: 'bg-red-100', 
      text: 'text-red-800', 
      label: 'Unpaid',
      dot: 'bg-red-500'
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {config.label}
    </span>
  );
}
