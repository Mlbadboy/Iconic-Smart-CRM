// File: client/src/components/users/UserForm.jsx
// Add/Edit user form (Admin only)

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { Users, Mail, Lock, Shield } from 'lucide-react';

export default function UserForm({ user, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const isEditMode = !!user;

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'sales',
    isActive: user?.isActive ?? true,
  });

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: (data) => 
      isEditMode 
        ? userService.updateUser(user._id, data)
        : userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      alert(isEditMode ? '✅ User updated successfully!' : '✅ User created successfully!');
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      alert('❌ Failed to save user: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      alert('Please enter user name');
      return;
    }

    if (!formData.email.trim()) {
      alert('Please enter email');
      return;
    }

    if (!isEditMode && !formData.password) {
      alert('Please enter password for new user');
      return;
    }

    const dataToSubmit = { ...formData };
    if (isEditMode && !formData.password) {
      delete dataToSubmit.password; // Don't update password if not provided
    }

    mutation.mutate(dataToSubmit);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit User' : 'Add New User'}
          </h2>
        </div>
        <p className="text-gray-600">
          {isEditMode ? 'Update user information and permissions' : 'Create a new user account'}
        </p>
      </div>

      {/* User Details */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">User Details</h3>

        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              disabled={isEditMode} // Can't change email in edit mode
            />
            {isEditMode && (
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed after creation</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password {!isEditMode && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={isEditMode ? 'Leave blank to keep current' : 'Enter password'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required={!isEditMode}
            />
            {isEditMode && (
              <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
            )}
          </div>
        </div>
      </div>

      {/* Role & Permissions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Role & Permissions
        </h3>

        <div className="space-y-6">
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Role <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="admin">Admin - Full system access</option>
              <option value="manager">Manager - Manage team & operations</option>
              <option value="sales">Sales - Create orders, manage customers</option>
              <option value="support">Support - Handle service requests</option>
              <option value="customer">Customer - View own orders only</option>
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-5 h-5 text-primary rounded focus:ring-primary"
            />
            <label className="ml-3 text-sm font-medium text-gray-700">
              User is Active
              <p className="text-xs text-gray-500 font-normal mt-1">
                Inactive users cannot log in to the system
              </p>
            </label>
          </div>
        </div>

        {/* Role Descriptions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-2">Role Capabilities:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• <strong>Admin:</strong> Full access including user management</li>
            <li>• <strong>Manager:</strong> View all data, manage operations</li>
            <li>• <strong>Sales:</strong> Create/manage orders and retailers</li>
            <li>• <strong>Support:</strong> Handle service requests and tickets</li>
            <li>• <strong>Customer:</strong> View own orders and create service requests</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary flex-1"
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                {isEditMode ? 'Update User' : 'Create User'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
