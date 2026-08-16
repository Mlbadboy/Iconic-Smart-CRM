// File: client/src/pages/ServiceRequests.jsx
// Main service requests page with create/view tabs

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceRequestList from '../components/services/ServiceRequestList';
import ServiceRequestForm from '../components/services/ServiceRequestForm';
import { Plus, List, ArrowLeft } from 'lucide-react';
import AppShell from '../components/layout/AppShell';

export default function ServiceRequests() {
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list' or 'create'

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">🛠️ Service Requests</h2>
            <p className="text-slate-400 text-sm mt-1">
              {view === 'list' ? 'Manage service requests' : 'Create new service request'}
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
              View Requests
            </button>
            <button
              onClick={() => setView('create')}
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 border text-sm transition-all ${
                view === 'create' 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-slate-100'
              }`}
            >
              <Plus className="w-4 h-4" />
              New Request
            </button>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
          {view === 'list' ? (
            <ServiceRequestList onCreateClick={() => setView('create')} />
          ) : (
            <ServiceRequestForm 
              onSuccess={() => setView('list')} 
              onCancel={() => setView('list')} 
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
