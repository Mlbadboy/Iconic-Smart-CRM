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
