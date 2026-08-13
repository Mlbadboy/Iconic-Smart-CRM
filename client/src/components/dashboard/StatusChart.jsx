// File: client/src/components/dashboard/StatusChart.jsx
// Order status distribution pie chart

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function StatusChart({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  // Format data for chart
  const chartData = data?.statusDistribution?.map(item => ({
    name: formatStatusName(item._id),
    value: item.count,
    status: item._id,
  })) || [];

  // Define colors for each status
  const COLORS = {
    pending: '#fbbf24',      // yellow
    confirmed: '#3b82f6',    // blue
    processing: '#6366f1',   // indigo
    'ready-to-ship': '#8b5cf6', // purple
    dispatched: '#06b6d4',   // cyan
    shipped: '#3b82f6',      // blue
    delivered: '#10b981',    // green
    completed: '#059669',    // green dark
    cancelled: '#ef4444',    // red
  };

  const getColor = (status) => COLORS[status] || '#6b7280';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Order Status</h3>
        <p className="text-sm text-gray-600">Distribution by status</p>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.status)} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p>No order data available</p>
            <p className="text-sm mt-2">Create orders to see distribution</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format status names
function formatStatusName(status) {
  const names = {
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'processing': 'Processing',
    'ready-to-ship': 'Ready to Ship',
    'dispatched': 'Dispatched',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  };
  return names[status] || status;
}
