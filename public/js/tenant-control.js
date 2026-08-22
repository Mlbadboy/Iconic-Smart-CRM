/**
 * Charlie's CRM — Super Admin Tenant Control Center JavaScript
 */
let companiesControlList = [];
let activeTargetCompanyId = null;

const ALL_FEATURES = [
    { key: 'dashboard', label: '📊 Dashboard & Analytics' },
    { key: 'sales', label: '💰 Sales & Opportunities' },
    { key: 'customers', label: '👥 Customers & 360' },
    { key: 'orders', label: '🛒 Orders & Invoicing' },
    { key: 'products', label: '🏷️ Products & Catalog' },
    { key: 'inventory', label: '📦 Product Units Inventory' },
    { key: 'distribution', label: '🚚 Stock Transfers & Distribution' },
    { key: 'serial_validation', label: '🔍 Serial Number Validation' },
    { key: 'qr_verification', label: '📱 QR Code Verification' },
    { key: 'service', label: '🛠️ Service & Support Cases' },
    { key: 'warranty', label: '🛡️ Warranty Engine' },
    { key: 'marketing', label: '📢 Marketing & Campaigns' },
    { key: 'finance', label: '💳 Finance & Invoices' },
    { key: 'field_force', label: '📍 Field Force & Beat Tracker' },
    { key: 'logistics', label: '📦 Logistics & Deliveries' },
    { key: 'reports', label: '📑 Operational Reports' },
    { key: 'api_access', label: '🔌 Partner API Access' },
    { key: 'analytics', label: '📈 Analytics & KPIs' },
    { key: 'bulk_import', label: '📥 Bulk CSV Import Center' }
];

const PLAN_DEFAULTS = {
    STARTER: ['dashboard', 'sales', 'customers', 'orders', 'products', 'reports'],
    PROFESSIONAL: ['dashboard', 'sales', 'customers', 'orders', 'products', 'inventory', 'distribution', 'serial_validation', 'qr_verification', 'service', 'warranty', 'field_force', 'logistics', 'reports', 'api_access', 'analytics', 'bulk_import'],
    ENTERPRISE: ALL_FEATURES.map(f => f.key)
};

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    loadTenantControlList();
});

async function loadTenantControlList() {
    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch('/api/tenant-control/overview/list', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load tenant control overview');

        companiesControlList = await res.json();
        renderTable();
    } catch (err) {
        console.error('Error loading tenant control:', err);
    }
}

function renderTable() {
    const tbody = document.getElementById('tenantControlTableBody');
    if (!companiesControlList.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-muted);">No tenant companies registered.</td></tr>`;
        return;
    }

    tbody.innerHTML = companiesControlList.map(c => {
        const isSuspended = c.status === 'SUSPENDED';
        const expiryStr = c.subscriptionEnd ? new Date(c.subscriptionEnd).toLocaleDateString() : 'No Expiry';

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(c.name)}</strong><br>
                    <code style="color: #818cf8; font-size: 0.75rem;">${escapeHtml(c.subdomain || 'N/A')}</code>
                </td>
                <td><span class="status-badge status-${c.status}">${c.status}</span></td>
                <td><strong style="color: #c7d2fe;">${c.plan}</strong></td>
                <td><span style="font-size: 0.85rem; color: var(--text-muted);">${expiryStr}</span></td>
                <td><span style="font-size: 0.85rem;">${c.paymentStatus}</span></td>
                <td>
                    <div style="font-size: 0.8rem; margin-bottom: 2px;">${c.storagePercent}% Used</div>
                    <div style="background: #334155; height: 6px; border-radius: 99px; overflow: hidden; width: 80px;">
                        <div style="background: ${c.storagePercent > 90 ? '#ef4444' : '#6366f1'}; height: 100%; width: ${Math.min(c.storagePercent, 100)}%;"></div>
                    </div>
                </td>
                <td>
                    <strong>${c.enabledFeaturesCount} / ${c.totalFeaturesCount}</strong> Active
                </td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                        <button class="btn btn-sm" onclick="openFeaturesModal('${c.id}')" title="Configure Feature Access">
                            ⚙️ Features
                        </button>
                        <button class="btn btn-sm" onclick="openSubscriptionModal('${c.id}')" title="Configure Plan & Storage">
                            💳 Plan
                        </button>
                        ${isSuspended ? `
                            <button class="btn btn-success btn-sm" onclick="reactivateCompany('${c.id}', '${escapeJs(c.name)}')">
                                ▶️ Reactivate
                            </button>
                        ` : `
                            <button class="btn btn-danger btn-sm" onclick="openSuspendModal('${c.id}', '${escapeJs(c.name)}')">
                                ⏸️ Suspend
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 1. Features Modal Handling
function openFeaturesModal(companyId) {
    activeTargetCompanyId = companyId;
    const company = companiesControlList.find(c => c.id === companyId);
    if (!company) return;

    document.getElementById('featuresModalTitle').textContent = `Feature Entitlements — ${company.name}`;
    const container = document.getElementById('featuresGridContainer');

    const companyFeatures = company.features || {};

    container.innerHTML = ALL_FEATURES.map(f => {
        const isChecked = companyFeatures[f.key] !== false; // default true if not false
        return `
            <label class="feature-checkbox-label">
                <input type="checkbox" name="feature_${f.key}" value="${f.key}" ${isChecked ? 'checked' : ''}>
                <span>${f.label}</span>
            </label>
        `;
    }).join('');

    document.getElementById('featuresModal').classList.add('show');
}

function applyPlanDefaults(planKey) {
    const allowed = PLAN_DEFAULTS[planKey] || [];
    ALL_FEATURES.forEach(f => {
        const input = document.querySelector(`input[name="feature_${f.key}"]`);
        if (input) {
            input.checked = allowed.includes(f.key);
        }
    });
}

async function saveFeatures(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const featuresPayload = {};

    ALL_FEATURES.forEach(f => {
        const input = document.querySelector(`input[name="feature_${f.key}"]`);
        featuresPayload[f.key] = Boolean(input && input.checked);
    });

    try {
        const res = await fetch(`/api/tenant-control/${activeTargetCompanyId}/features`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ features: featuresPayload })
        });
        if (!res.ok) throw new Error('Failed to update feature entitlements');

        closeModal('featuresModal');
        loadTenantControlList();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// 2. Subscription Modal Handling
function openSubscriptionModal(companyId) {
    activeTargetCompanyId = companyId;
    const company = companiesControlList.find(c => c.id === companyId);
    if (!company) return;

    document.getElementById('subscriptionModalTitle').textContent = `Subscription & Limits — ${company.name}`;
    document.getElementById('subPlan').value = company.plan || 'STARTER';
    document.getElementById('subPaymentStatus').value = company.paymentStatus || 'PAID';

    if (company.subscriptionEnd) {
        document.getElementById('subExpiry').value = new Date(company.subscriptionEnd).toISOString().split('T')[0];
    } else {
        document.getElementById('subExpiry').value = '';
    }

    const storageGb = Math.round((company.storageLimitBytes || 5368709120) / (1024 * 1024 * 1024));
    document.getElementById('subStorageGb').value = storageGb;

    document.getElementById('subscriptionModal').classList.add('show');
}

async function saveSubscription(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');

    const plan = document.getElementById('subPlan').value;
    const billingCycle = document.getElementById('subBillingCycle').value;
    const expiryVal = document.getElementById('subExpiry').value;
    const paymentStatus = document.getElementById('subPaymentStatus').value;
    const storageGb = Number(document.getElementById('subStorageGb').value) || 5;
    const autoApply = document.getElementById('subAutoApplyFeatures').checked;

    try {
        const res = await fetch(`/api/tenant-control/${activeTargetCompanyId}/subscription`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                plan,
                billingCycle,
                subscriptionEnd: expiryVal || null,
                paymentStatus,
                storageLimitBytes: storageGb * 1024 * 1024 * 1024,
                applyPlanDefaultFeatures: autoApply
            })
        });
        if (!res.ok) throw new Error('Failed to update subscription');

        closeModal('subscriptionModal');
        loadTenantControlList();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// 3. Suspend Modal Handling
function openSuspendModal(companyId, companyName) {
    activeTargetCompanyId = companyId;
    document.getElementById('suspendReasonInput').value = 'Subscription payment overdue';
    document.getElementById('suspendModal').classList.add('show');
}

async function confirmSuspend(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const reason = document.getElementById('suspendReasonInput').value;

    try {
        const res = await fetch(`/api/tenant-control/${activeTargetCompanyId}/suspend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason })
        });
        if (!res.ok) throw new Error('Failed to suspend company');

        closeModal('suspendModal');
        loadTenantControlList();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function reactivateCompany(companyId, companyName) {
    if (!confirm(`Are you sure you want to REACTIVATE ${companyName}? Normal CRM access will be restored immediately.`)) return;

    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch(`/api/tenant-control/${companyId}/reactivate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to reactivate company');

        loadTenantControlList();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'");
}
