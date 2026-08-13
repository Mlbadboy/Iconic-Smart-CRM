// File: client/src/components/users/UserList.jsx
// User list with search, filters, and admin actions

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { formatDate } from '../../lib/utils';
import RoleBadge from './RoleBadge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Search, Filter, Edit, Trash2, ToggleLeft, ToggleRight, Plus, Users as UsersIcon } from 'lucide-react';

export default function UserList({ onEdit, onCreateClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getUsers,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      alert('✅ User deleted successfully!');
    },
    onError: (error) => {
      alert('❌ Failed to delete user: ' + (error.response?.data?.message || error.message));
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: userService.toggleUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      alert('✅ User status updated!');
    },
    onError: (error) => {
      alert('❌ Failed to update status: ' + (error.response?.data?.message || error.message));
    },
  });

  // Filter users
  const filteredUsers = users?.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  const handleDelete = (user) => {
    if (window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(user._id);
    }
  };

  const handleToggleStatus = (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user "${user.name}"?`)) {
      toggleStatusMutation.mutate(user._id);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading users..." />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <p className="text-red-600 mb-4">Error loading users: {error.message}</p>
        <button onClick={() => refetch()} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Users" value={users?.length || 0} color="blue" />
        <StatCard label="Admins" value={users?.filter(u => u.role === 'admin').length || 0} color="red" />
        <StatCard label="Sales" value={users?.filter(u => u.role === 'sales').length || 0} color="green" />
        <StatCard label="Support" value={users?.filter(u => u.role === 'support').length || 0} color="purple" />
        <StatCard label="Active" value={users?.filter(u => u.isActive).length || 0} color="cyan" />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="sales">Sales</option>
              <option value="support">Support</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Add User Button */}
          <button onClick={onCreateClick} className="btn btn-primary flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <UsersIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg mb-2">No users found</p>
          <p className="text-gray-400 mb-6">
            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first user'}
          </p>
          <button onClick={onCreateClick} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2 inline" />
            Add First User
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isActive ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => onEdit(user)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={user.isActive ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? <ToggleRight className="w-4 h-4 inline" /> : <ToggleLeft className="w-4 h-4 inline" />}
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t text-sm text-gray-600 text-center">
            Showing {filteredUsers.length} of {users?.length || 0} users
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card
function StatCard({ label, value, color }) {
  const colors = {
    blue: 'border-blue-200',
    red: 'border-red-200',
    green: 'border-green-200',
    purple: 'border-purple-200',
    cyan: 'border-cyan-200',
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${colors[color]}`}>
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
