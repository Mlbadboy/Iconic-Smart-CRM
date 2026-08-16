import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Customer360() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer360', id],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/customers/${id}/360`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load Customer 360 data');
      const body = await res.json();
      return body.data;
    }
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-96">
          <LoadingSpinner />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="p-6 bg-red-950/20 border border-red-900/45 rounded-xl text-red-400">
          ⚠️ Error loading customer 360 workspace: {error?.message || 'Customer profile not found.'}
        </div>
      </AppShell>
    );
  }

  const { profile, contacts, leads, opportunities, orders, deliveries, products, serviceCases, complaints, marketingEngagement, communications, escalations, openTasks, financialSummary } = data;

  const tabs = [
    { id: 'overview', label: '🔍 Overview' },
    { id: 'orders', label: '📦 Orders & Finance' },
    { id: 'services', label: '🛠️ Service & Support' },
    { id: 'sales', label: '📈 Sales Pipelines' },
    { id: 'marketing', label: '📣 Marketing' }
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Customer Header card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row justify-between gap-6 shadow-xl">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-xl bg-blue-600/20 border border-blue-500/35 flex items-center justify-center text-4xl">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-100">{profile.retailerName}</h2>
                <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                  profile.active ? 'bg-green-500/10 text-green-400 border border-green-500/25' : 'bg-slate-800 text-slate-400'
                }`}>
                  {profile.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-slate-400 text-sm mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>📧 {profile.email}</span>
                <span>📞 {profile.phone}</span>
                {profile.gstNumber && <span>GSTIN: {profile.gstNumber}</span>}
              </div>
            </div>
          </div>

          <div className="flex gap-8 items-center border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-8">
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Sales</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                ₹{profile.totalAmount?.toLocaleString() || '0'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">LifeCycle</div>
              <div className="text-sm font-semibold text-slate-200 mt-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
                Retailer Hub
              </div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="border-b border-slate-800 flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 flex flex-col gap-6">
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-6">
                {/* Highlights grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
                    <div className="text-xs text-slate-500 font-semibold">Total Orders</div>
                    <div className="text-3xl font-extrabold text-blue-400 mt-1">{orders.length}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
                    <div className="text-xs text-slate-500 font-semibold">Active Cases</div>
                    <div className="text-3xl font-extrabold text-orange-400 mt-1">{openTasks.length}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
                    <div className="text-xs text-slate-500 font-semibold">Open Escalations</div>
                    <div className="text-3xl font-extrabold text-red-500 mt-1">{escalations.length}</div>
                  </div>
                </div>

                {/* Retailer Profile Details */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-slate-200 mb-4">Retailer Profile Detail</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500">Contact Person</div>
                      <div className="text-slate-300 font-medium mt-0.5">{profile.contactPerson || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Company Name</div>
                      <div className="text-slate-300 font-medium mt-0.5">{profile.companyName || 'N/A'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-slate-500">Address</div>
                      <div className="text-slate-300 font-medium mt-0.5">
                        {profile.address ? `${profile.address.street || ''}, ${profile.address.city || ''}, ${profile.address.state || ''}` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contacts Collection */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-slate-200 mb-4">Associated Contacts</h3>
                  {contacts.length === 0 ? (
                    <div className="text-slate-500 text-sm">No associated contacts found.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {contacts.map(c => (
                        <div key={c._id} className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center text-sm">
                          <div>
                            <div className="font-semibold text-slate-200">{c.name}</div>
                            <div className="text-slate-500 text-xs mt-0.5">{c.position} | {c.company}</div>
                          </div>
                          <div className="text-right text-slate-400 text-xs">
                            <div>{c.email}</div>
                            <div>{c.phone}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="flex flex-col gap-6">
                {financialSummary && (
                  <div className="bg-emerald-950/10 border border-emerald-900/40 p-6 rounded-xl flex gap-8">
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase">Pending Payments</div>
                      <div className="text-2xl font-bold text-amber-500 mt-1">{financialSummary.pendingPayments}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase">Failed Payments</div>
                      <div className="text-2xl font-bold text-red-500 mt-1">{financialSummary.failedPayments}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase">Aggregated Value</div>
                      <div className="text-2xl font-bold text-emerald-400 mt-1">₹{financialSummary.totalOrderValue.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-slate-200 mb-4">Orders History</h3>
                  {orders.length === 0 ? (
                    <div className="text-slate-500 text-sm">No orders recorded for this customer.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {orders.map(o => (
                        <div key={o._id} className="p-4 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center text-sm">
                          <div>
                            <div className="font-bold text-slate-200">{o.orderNumber}</div>
                            <div className="text-slate-500 text-xs mt-1">Created: {new Date(o.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-semibold text-slate-200">₹{o.amount.toLocaleString()}</div>
                              <div className="text-slate-500 text-xs capitalize mt-0.5">{o.paymentStatus}</div>
                            </div>
                            <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                              o.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                              o.status === 'processing' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="flex flex-col gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-slate-200 mb-4">Service Cases & Requests</h3>
                  {serviceCases.length === 0 ? (
                    <div className="text-slate-500 text-sm">No service history found.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {serviceCases.map(s => (
                        <div key={s._id} className="p-4 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center text-sm">
                          <div>
                            <div className="font-semibold text-slate-200">{s.serviceId || 'Request ID'}</div>
                            <div className="text-slate-400 text-xs mt-1">{s.description}</div>
                          </div>
                          <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                            s.status === 'resolved' || s.status === 'closed' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-slate-200 mb-4">Associated Complaints</h3>
                  {complaints.length === 0 ? (
                    <div className="text-slate-500 text-sm">No complaints matching keyword.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {complaints.map(c => (
                        <div key={c._id} className="p-3 bg-red-950/10 border border-red-900/30 rounded-lg text-sm text-slate-300">
                          <div className="font-semibold text-red-400">{c.issueType}</div>
                          <div className="mt-1 text-xs">{c.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'sales' && (
              <div className="flex flex-col gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-slate-200 mb-4">Leads</h3>
                  {leads.length === 0 ? (
                    <div className="text-slate-500 text-sm">No sales leads associated.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {leads.map(l => (
                        <div key={l._id} className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center text-sm">
                          <div>
                            <div className="font-semibold text-slate-200">{l.name}</div>
                            <div className="text-slate-500 text-xs mt-0.5">Value: ₹{l.value?.toLocaleString()}</div>
                          </div>
                          <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">{l.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-slate-200 mb-4">Opportunities</h3>
                  {opportunities.length === 0 ? (
                    <div className="text-slate-500 text-sm">No opportunities.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {opportunities.map(o => (
                        <div key={o._id} className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center text-sm">
                          <div>
                            <div className="font-semibold text-slate-200">{o.name}</div>
                            <div className="text-slate-500 text-xs mt-0.5">Probability: {o.probability}% | Target Value: ₹{o.value?.toLocaleString()}</div>
                          </div>
                          <span className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">{o.stage}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'marketing' && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4">Marketing Campaigns & Assets</h3>
                {marketingEngagement.length === 0 ? (
                  <div className="text-slate-500 text-sm">No campaigns targeted.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {marketingEngagement.map(m => (
                      <div key={m._id} className="p-3 bg-slate-900 border border-slate-850 rounded-lg text-sm">
                        <div className="font-semibold text-slate-200">{m.campaignName || m.name}</div>
                        <div className="text-slate-500 text-xs mt-1">Start Date: {new Date(m.startDate || m.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar details */}
          <div className="flex flex-col gap-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-200 mb-4">Open Tasks</h3>
              {openTasks.length === 0 ? (
                <div className="text-slate-500 text-sm">No pending tasks for this client.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {openTasks.map(t => (
                    <div key={t._id} className="p-3 bg-slate-900 border border-slate-850 rounded-lg text-xs">
                      <div className="font-semibold text-slate-200">{t.description || t.issueType}</div>
                      <div className="text-slate-500 mt-1">Priority: {t.priority} | Status: {t.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-200 mb-4">Deliveries</h3>
              {deliveries.length === 0 ? (
                <div className="text-slate-500 text-sm">No shipments pending.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {deliveries.map(d => (
                    <div key={d._id} className="p-3 bg-slate-900 border border-slate-850 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-200">{d.trackingNumber || d.deliveryId}</div>
                        <div className="text-slate-500 mt-1">Order Ref: {d.orderRef}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">{d.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
