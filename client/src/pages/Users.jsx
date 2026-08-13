// File: client/src/pages/Users.jsx
// Main users page (Admin Only)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserList from '../components/users/UserList';
import UserForm from '../components/users/UserForm';
import { Plus, List, ArrowLeft } from 'lucide-react';

export default function Users() {
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedUser, setSelectedUser] = useState(null);

  const handleEdit = (user) => {
    setSelectedUser(user);
    setView('edit');
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setView('create');
  };

  const handleSuccess = () => {
    setView('list');
    setSelectedUser(null);
  };

  const handleCancel = () => {
    setView('list');
    setSelectedUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  User Management
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Admin Only</span>
                </h1>
                <p className="text-sm text-gray-600">
                  {view === 'list' 
                    ? 'Manage system users and permissions' 
                    : view === 'create'
                    ? 'Add new user'
                    : 'Edit user'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setView('list')}
                className={`btn ${view === 'list' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
              >
                <List className="w-4 h-4" />
                View Users
              </button>
              {(view === 'create' || view === 'edit') && (
                <button
                  onClick={handleCancel}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'list' ? (
          <UserList 
            onEdit={handleEdit}
            onCreateClick={handleCreate}
          />
        ) : (
          <UserForm
            user={selectedUser}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        )}
      </main>
    </div>
  );
}
