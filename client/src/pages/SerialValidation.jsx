import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppShell from '../components/layout/AppShell';

export default function SerialValidation() {
  const queryClient = useQueryClient();
  const [materialCode, setMaterialCode] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [dealerCode, setDealerCode] = useState('');
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState('');

  // Get current user role to gate history visibility
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const showHistory = ['admin', 'administrator', 'manager', 'crm-manager', 'service-manager', 'sales-manager', 'finance-manager', 'operations-manager', 'auditor'].includes(user.role);

  // Fetch recent validation history
  const { data: history, isLoading: loadingHistory, error: historyError } = useQuery({
    queryKey: ['serialHistory'],
    queryFn: async () => {
      if (!showHistory) return [];
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/serial-validation/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not fetch validation history');
      const body = await res.json();
      return body.data;
    },
    enabled: showHistory
  });

  // State for Unit Management (Edit / Delete mistaken uploads)
  const [unitSearch, setUnitSearch] = useState('');
  const [editingUnit, setEditingUnit] = useState(null);
  const [editForm, setEditForm] = useState({
    serialNumber: '',
    materialCode: '',
    dealerCode: '',
    status: 'IN_STOCK',
    customer: '',
    reason: ''
  });
  const [unitActionMsg, setUnitActionMsg] = useState({ text: '', type: '' });

  // Fetch Registered Units
  const { data: unitsList, isLoading: loadingUnits } = useQuery({
    queryKey: ['serialUnits'],
    queryFn: async () => {
      if (!showHistory) return [];
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/v1/serial-registry/units', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not fetch registered serial units');
      const body = await res.json();
      return body.data?.units || [];
    },
    enabled: showHistory
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/serial-registry/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.message || 'Failed to update serial unit');
      }
      return res.json();
    },
    onSuccess: () => {
      setUnitActionMsg({ text: 'Serial unit updated successfully!', type: 'success' });
      setEditingUnit(null);
      queryClient.invalidateQueries({ queryKey: ['serialUnits'] });
      setTimeout(() => setUnitActionMsg({ text: '', type: '' }), 4000);
    },
    onError: (err) => {
      setUnitActionMsg({ text: err.message, type: 'error' });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/serial-registry/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Mistaken upload removed from React UI' })
      });
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.message || 'Failed to delete serial unit');
      }
      return res.json();
    },
    onSuccess: () => {
      setUnitActionMsg({ text: 'Serial unit deleted successfully.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['serialUnits'] });
      setTimeout(() => setUnitActionMsg({ text: '', type: '' }), 4000);
    },
    onError: (err) => {
      setUnitActionMsg({ text: err.message, type: 'error' });
    }
  });

  const handleStartEdit = (unit) => {
    setEditingUnit(unit);
    setEditForm({
      serialNumber: unit.serialNumber || '',
      materialCode: unit.materialCode || '',
      dealerCode: unit.dealerCode || '',
      status: unit.status || 'IN_STOCK',
      customer: unit.customer || '',
      reason: ''
    });
  };

  const handleSaveEditSubmit = (e) => {
    e.preventDefault();
    if (!editingUnit) return;
    editMutation.mutate({
      id: editingUnit._id,
      payload: editForm
    });
  };

  const handleDeleteUnit = (unit) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete mistakenly uploaded serial "${unit.serialNumber}"?\n\nThis action will permanently delete the record and will be logged for Super Admin review.`
    );
    if (!confirmed) return;
    deleteMutation.mutate(unit._id);
  };

  const filteredUnits = (unitsList || []).filter(u => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.serialNumber && u.serialNumber.toLowerCase().includes(q)) ||
      (u.materialCode && u.materialCode.toLowerCase().includes(q)) ||
      (u.dealerCode && u.dealerCode.toLowerCase().includes(q)) ||
      (u.customer && u.customer.toLowerCase().includes(q))
    );
  });

  // Mutation for validating serial number
  const validateMutation = useMutation({
    mutationFn: async (payload) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/serial-validation/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.message || 'Validation request failed');
      }
      const body = await res.json();
      return body.data;
    },
    onSuccess: (data) => {
      setResult(data);
      if (showHistory) {
        queryClient.invalidateQueries({ queryKey: ['serialHistory'] });
      }
    },
    onError: (err) => {
      setFormError(err.message);
      setResult(null);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setResult(null);

    const mCode = materialCode.trim();
    const sNo = serialNumber.trim();
    const dCode = dealerCode.trim();

    if (!mCode || !sNo || !dCode) {
      setFormError('All fields are required.');
      return;
    }

    validateMutation.mutate({
      materialCode: mCode,
      serialNumber: sNo,
      dealerCode: dCode
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VALID':
        return 'bg-green-500/10 text-green-400 border border-green-500/25';
      case 'ALREADY_VALIDATED':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
      case 'SERVICE_UNAVAILABLE':
        return 'bg-slate-700/20 text-slate-400 border border-slate-700/30';
      default:
        return 'bg-red-500/10 text-red-400 border border-red-500/25';
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">🔌 Serial Number Validation</h2>
          <p className="text-slate-400 text-sm mt-1">Verify product material codes and serial numbers directly with the central manufacturer registry.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Validation Form */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-slate-200 mb-4 border-b border-slate-850 pb-2">Verification details</h3>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Material Code</label>
                  <input
                    type="text"
                    value={materialCode}
                    onChange={(e) => setMaterialCode(e.target.value)}
                    placeholder="Enter Material Code"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-sm text-slate-200 transition-colors placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Serial Number</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Enter Serial Number"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-sm text-slate-200 transition-colors placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Dealer Code</label>
                  <input
                    type="text"
                    value={dealerCode}
                    onChange={(e) => setDealerCode(e.target.value)}
                    placeholder="Enter Dealer Code"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-sm text-slate-200 transition-colors placeholder-slate-600"
                  />
                </div>

                {formError && (
                  <div className="p-2.5 bg-red-950/20 border border-red-900/30 text-xs text-red-400 rounded-lg">
                    ⚠️ {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={validateMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg shadow-lg shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 mt-2"
                >
                  {validateMutation.isPending ? 'Validating...' : '🔌 Validate Serial Number'}
                </button>
              </form>
            </div>
          </div>

          {/* Validation Result Box */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl flex-1 flex flex-col justify-center min-h-[300px]">
              {!result && !validateMutation.isPending && (
                <div className="text-center py-12 text-slate-500">
                  <span className="text-4xl block mb-3">📡</span>
                  Please enter material details and submit to run validation.
                </div>
              )}

              {validateMutation.isPending && (
                <div className="text-center py-12 text-blue-400">
                  <div className="animate-spin text-3xl mb-3">🔄</div>
                  Querying registry, please wait...
                </div>
              )}

              {result && (
                <div className="flex flex-col gap-6">
                  <div className={`p-6 rounded-xl border flex flex-col gap-3 ${
                    result.status === 'VALID' ? 'bg-green-950/20 border-green-900/50 text-green-300' :
                    result.status === 'ALREADY_VALIDATED' ? 'bg-amber-950/20 border-amber-900/50 text-amber-300' :
                    'bg-red-950/20 border-red-900/50 text-red-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {result.status === 'VALID' ? '✅' : result.status === 'ALREADY_VALIDATED' ? '⚠️' : '❌'}
                      </span>
                      <div>
                        <div className="text-lg font-bold">
                          {result.status === 'VALID' ? 'Serial Number Validated' : result.status.replace('_', ' ')}
                        </div>
                        <div className="text-sm opacity-80 mt-0.5">{result.message}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 bg-slate-900 border border-slate-850 p-4 rounded-xl text-sm">
                    <div>
                      <div className="text-slate-500 text-xs">Material Code</div>
                      <div className="font-semibold text-slate-200 mt-1">{materialCode}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs">Serial Number</div>
                      <div className="font-semibold text-slate-200 mt-1">{serialNumber}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs">Dealer Code</div>
                      <div className="font-semibold text-slate-200 mt-1">{dealerCode}</div>
                    </div>
                  </div>

                  {result.canProceed && result.statusCode === '0' && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => alert('Proceeding to next workflow step...')}
                        className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-6 rounded-lg shadow-lg shadow-green-500/25 transition-all duration-200"
                      >
                        Proceed
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Uploaded Serial Units Management Card */}
        {showHistory && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-200">📦 Registered Serial Registry Units</h3>
                <p className="text-slate-400 text-xs mt-1">Manage, modify, or delete mistakenly uploaded serial numbers. All operations are logged in the audit trail.</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Search serial, material, dealer..."
                  className="bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 w-64"
                />
                <button
                  onClick={() => refetchUnits()}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {unitActionMsg.text && (
              <div className={`p-3 rounded-lg text-xs font-medium ${
                unitActionMsg.type === 'success' ? 'bg-green-950/30 text-green-400 border border-green-900/50' : 'bg-red-950/30 text-red-400 border border-red-900/50'
              }`}>
                {unitActionMsg.text}
              </div>
            )}

            {loadingUnits ? (
              <div className="text-slate-500 text-sm py-4">Loading registered units...</div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-slate-500 text-sm py-4">No registered serial units found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                      <th className="py-3 px-4">Serial Number</th>
                      <th className="py-3 px-4">Material Code</th>
                      <th className="py-3 px-4">Dealer Code</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnits.map((unit) => (
                      <tr key={unit._id} className="border-b border-slate-850 hover:bg-slate-900/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">{unit.serialNumber}</td>
                        <td className="py-3.5 px-4 text-slate-400">{unit.materialCode || '-'}</td>
                        <td className="py-3.5 px-4 text-slate-400">{unit.dealerCode || '-'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(unit.status)}`}>
                            {unit.status || 'IN_STOCK'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{unit.customer || '-'}</td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs">{unit.createdAt ? new Date(unit.createdAt).toLocaleDateString() : '-'}</td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleStartEdit(unit)}
                            className="bg-indigo-950/40 text-indigo-400 hover:bg-indigo-900/50 border border-indigo-800/40 px-2.5 py-1 rounded text-xs font-semibold mr-2 transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUnit(unit)}
                            className="bg-red-950/40 text-red-400 hover:bg-red-900/50 border border-red-800/40 px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editingUnit && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
                <h4 className="text-base font-bold text-slate-100">✏️ Edit Serial Number</h4>
                <button onClick={() => setEditingUnit(null)} className="text-slate-400 hover:text-slate-200 text-lg">&times;</button>
              </div>
              <form onSubmit={handleSaveEditSubmit} className="flex flex-col gap-3.5 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={editForm.serialNumber}
                    onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                    required
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2 text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Material Code</label>
                  <input
                    type="text"
                    value={editForm.materialCode}
                    onChange={(e) => setEditForm({ ...editForm, materialCode: e.target.value })}
                    required
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2 text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Dealer Code</label>
                  <input
                    type="text"
                    value={editForm.dealerCode}
                    onChange={(e) => setEditForm({ ...editForm, dealerCode: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2 text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2 text-slate-200 text-sm"
                  >
                    <option value="IN_STOCK">IN_STOCK</option>
                    <option value="IN_TRANSIT">IN_TRANSIT</option>
                    <option value="TRANSFERRED">TRANSFERRED</option>
                    <option value="SOLD">SOLD</option>
                    <option value="REGISTERED">REGISTERED</option>
                    <option value="VALIDATED">VALIDATED</option>
                    <option value="DEFECTIVE">DEFECTIVE</option>
                    <option value="DEACTIVATED">DEACTIVATED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Customer</label>
                  <input
                    type="text"
                    value={editForm.customer}
                    onChange={(e) => setEditForm({ ...editForm, customer: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2 text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Reason for Modification (Logged in Audit Trail)</label>
                  <input
                    type="text"
                    value={editForm.reason}
                    onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                    placeholder="e.g. Corrected typo in serial number"
                    required
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2 text-slate-200 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2.5 mt-3 pt-3 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setEditingUnit(null)}
                    className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {editMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* History Table */}
        {showHistory && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-200 mb-4 border-b border-slate-850 pb-2">Recent Validation History</h3>
            {loadingHistory ? (
              <div className="text-slate-500 text-sm py-4">Loading history...</div>
            ) : historyError ? (
              <div className="text-red-400 text-sm py-4">Error loading history.</div>
            ) : history?.length === 0 ? (
              <div className="text-slate-500 text-sm py-4">No validation history found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                      <th className="py-3 px-4">Serial Number</th>
                      <th className="py-3 px-4">Dealer</th>
                      <th className="py-3 px-4">Material</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Latency</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item._id} className="border-b border-slate-850 hover:bg-slate-900/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-300">{item.serialNumber}</td>
                        <td className="py-3.5 px-4 text-slate-400">{item.dealerCode}</td>
                        <td className="py-3.5 px-4 text-slate-400">{item.materialCode}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(item.validationResult)}`}>
                            {item.validationResult}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{item.validatedBy?.name || 'Unknown'}</td>
                        <td className="py-3.5 px-4 text-slate-500">{item.latency ? `${item.latency}ms` : '-'}</td>
                        <td className="py-3.5 px-4 text-slate-500">{new Date(item.validatedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
