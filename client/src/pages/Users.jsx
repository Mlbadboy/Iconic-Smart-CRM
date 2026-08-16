// File: client/src/pages/Users.jsx
// Main users page (Admin Only)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserList from '../components/users/UserList';
import UserForm from '../components/users/UserForm';
import { Plus, List, ArrowLeft } from 'lucide-react';
import AppShell from '../components/layout/AppShell';

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
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              User Management
              <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">Admin Only</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {view === 'list' 
                ? 'Manage system users and permissions' 
                : view === 'create'
                ? 'Add new user'
                : 'Edit user'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 border text-sm transition-all ${
                view === 'list' 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-slate-100'
              }`}
            >
              <List className="w-4 h-4" />
              View Users
            </button>
            {(view === 'create' || view === 'edit') && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg font-semibold border text-sm bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-slate-100 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
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
        </div>
      </div>
    </AppShell>
  );
}
