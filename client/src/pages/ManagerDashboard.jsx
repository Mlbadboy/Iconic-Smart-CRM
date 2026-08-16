import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppShell from '../components/layout/AppShell';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function ManagerDashboard() {
  const queryClient = useQueryClient();

  // 1. Fetch SLA Escalations
  const { data: escalations, isLoading: loadingEscalations } = useQuery({
    queryKey: ['escalations'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/slas/escalations?status=open', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load escalations');
      const body = await res.json();
      return body.data;
    }
  });

  // 2. Fetch Pending Approvals
  const { data: approvals, isLoading: loadingApprovals } = useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/approvals?status=pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load approvals');
      const body = await res.json();
      return body.data;
    }
  });

  // 3. Fetch Tasks
  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/tasks?status=pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load tasks');
      const body = await res.json();
      return body.data;
    }
  });

  // Approval Mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, action, note }) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/approvals/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ responseReason: note })
      });
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.message || 'Action failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    }
  });

  // Escalation Resolution Mutation
  const resolveEscalationMutation = useMutation({
    mutationFn: async ({ id, note }) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/slas/escalations/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ note })
      });
      if (!res.ok) throw new Error('Failed to resolve escalation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalations'] });
    }
  });

  const isLoading = loadingEscalations || loadingApprovals || loadingTasks;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-96">
          <LoadingSpinner />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">🛡️ Manager Attention Center</h2>
          <p className="text-slate-400 text-sm mt-1">Review critical SLA breaches, approvals, and team work queues.</p>
        </div>

        {/* Top critical grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SLA Escalations card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col gap-4 shadow-lg">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                <span>🚨</span> Open SLA Escalations ({escalations?.length || 0})
              </h3>
            </div>
            {escalations?.length === 0 ? (
              <div className="text-slate-500 text-sm py-4 text-center">No open escalations</div>
            ) : (
              <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                {escalations?.map(esc => (
                  <div key={esc._id} className="p-4 bg-slate-900 border border-slate-850 rounded-lg text-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">{esc.entityType}</span>
                        <div className="font-semibold text-slate-200 mt-1">ID: {esc.entityId}</div>
                      </div>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                        {esc.priority}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs">{esc.reason}</div>
                    <div className="flex justify-between items-center border-t border-slate-850 pt-2.5 mt-1">
                      <span className="text-xs text-slate-500">Owner: {esc.previousOwner}</span>
                      <button
                        onClick={() => resolveEscalationMutation.mutate({ id: esc._id, note: 'Resolved by dashboard manager' })}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-1.5 px-3 rounded transition-colors"
                      >
                        ✅ Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Approvals card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col gap-4 shadow-lg">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                <span>📝</span> Pending Approvals ({approvals?.length || 0})
              </h3>
            </div>
            {approvals?.length === 0 ? (
              <div className="text-slate-500 text-sm py-4 text-center">No pending approvals</div>
            ) : (
              <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                {approvals?.map(app => (
                  <div key={app._id} className="p-4 bg-slate-900 border border-slate-850 rounded-lg text-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">{app.type.replace('_', ' ')}</span>
                        <div className="font-semibold text-slate-200 mt-1">Ref: {app.entityId}</div>
                      </div>
                      {app.amount && (
                        <div className="text-right font-bold text-slate-200">
                          ₹{app.amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="text-slate-400 text-xs">{app.reason}</div>
                    
                    <div className="flex justify-end gap-2 border-t border-slate-850 pt-2.5 mt-1">
                      <button
                        onClick={() => approveMutation.mutate({ id: app._id, action: 'approve', note: 'Approved' })}
                        disabled={approveMutation.isPending}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 px-3 rounded transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => approveMutation.mutate({ id: app._id, action: 'reject', note: 'Rejected' })}
                        disabled={approveMutation.isPending}
                        className="text-xs bg-red-950/40 border border-red-900/40 text-red-400 hover:bg-red-950/60 font-semibold py-1.5 px-3 rounded transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                    {approveMutation.isError && (
                      <div className="text-xs text-red-400 mt-1">{approveMutation.error.message}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tasks Section */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-3 mb-4">
            📋 Pending Tasks Queue
          </h3>
          {tasks?.length === 0 ? (
            <div className="text-slate-500 text-sm py-4">No pending tasks found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tasks?.map(task => (
                <div key={task._id} className="p-4 bg-slate-900 border border-slate-850 rounded-lg flex flex-col justify-between gap-3 text-sm">
                  <div>
                    <div className="font-semibold text-slate-200">{task.title}</div>
                    <div className="text-slate-400 text-xs mt-1">{task.description}</div>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-850">
                    <span className="text-xs text-slate-500">Category: {task.category}</span>
                    <span className={`px-2 py-0.5 text-xs rounded font-semibold ${
                      task.priority === 'high' || task.priority === 'urgent' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
