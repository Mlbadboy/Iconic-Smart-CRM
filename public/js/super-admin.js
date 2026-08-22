/**
 * Super Admin Platform Console JavaScript Logic
 */
let companiesList = [];

// Initialize Console
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const profileRes = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!profileRes.ok) throw new Error('Auth invalid');
        const user = await profileRes.json();

        const role = String(user.role || '').toLowerCase();
        if (role !== 'super-admin' && role !== 'superadmin') {
            alert('Access Denied: Super Administrator privileges required.');
            window.location.href = '/dashboard.html';
            return;
        }

        loadCompanies();
        loadApiOverview();
    } catch (err) {
        console.error(err);
        localStorage.removeItem('authToken');
        window.location.href = '/login.html';
    }
});

async function loadApiOverview() {
    const token = localStorage.getItem('authToken');
    const tbody = document.getElementById('apiOverviewTableBody');
    if (!tbody) return;

    try {
        const res = await fetch('/api/api-keys/platform-overview', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load API overview');
        const list = await res.json();

        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No API key activity across companies.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(item => {
            const lastActive = item.lastActivity ? new Date(item.lastActivity).toLocaleString() : 'Never';
            const totalReq = (item.totalRequests || 0).toLocaleString();
            const uniqueSer = (item.uniqueSerials || 0).toLocaleString();
            const successCount = (item.successfulValidations || 0).toLocaleString();
            const failCount = (item.failedValidations || 0).toLocaleString();

            return `
                <tr>
                    <td><strong>${escapeHtml(item.companyName)}</strong></td>
                    <td><code style="background: #334155; padding: 2px 6px; border-radius: 4px;">${escapeHtml(item.subdomain || 'N/A')}</code></td>
                    <td><strong>${item.totalApis}</strong></td>
                    <td><span class="status-badge status-ACTIVE">${item.activeApis} Active</span></td>
                    <td><strong>${totalReq}</strong></td>
                    <td><strong style="color: #818cf8;">${uniqueSer}</strong></td>
                    <td>
                        <span style="color: #34d399; font-weight: 600;">${successCount}</span> / 
                        <span style="color: #f87171; font-weight: 600;">${failCount}</span>
                    </td>
                    <td><span style="font-size: 0.85rem; color: var(--text-muted);">${lastActive}</span></td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading API overview:', err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: #ef4444;">Error: ${err.message}</td></tr>`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function loadCompanies() {
    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch('/api/companies', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load companies');
        companiesList = await res.json();
        renderCompanies();
    } catch (err) {
        console.error('Error loading companies:', err);
        document.getElementById('tenantsTableBody').innerHTML = `<tr><td colspan="7" style="text-align:center; color: #ef4444;">Error loading companies: ${err.message}</td></tr>`;
    }
}

function renderCompanies() {
    const tbody = document.getElementById('tenantsTableBody');
    if (!companiesList.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No tenant companies registered.</td></tr>`;
        return;
    }

    let activeCount = 0;
    let suspendedCount = 0;

    tbody.innerHTML = companiesList.map(comp => {
        const status = comp.status || (comp.isActive ? 'ACTIVE' : 'DEACTIVATED');
        if (status === 'ACTIVE') activeCount++;
        if (status === 'SUSPENDED' || status === 'DEACTIVATED') suspendedCount++;

        const plan = comp.billing?.plan || 'STARTER';
        const logoUrl = comp.branding?.logo || comp.logo;
        const logoHtml = logoUrl 
            ? `<img src="${logoUrl}" alt="${comp.name}">` 
            : `<span>${comp.code.substring(0, 2)}</span>`;

        const subdomain = comp.subdomain || comp.code.toLowerCase();
        const hostname = window.location.hostname;
        const isLocalhost = hostname.includes('localhost') || hostname === '127.0.0.1';
        const tenantUrl = isLocalhost 
            ? `http://${subdomain}.localhost:${window.location.port || 7000}/dashboard.html`
            : `https://${subdomain}.charliescrm.com/dashboard.html`;

        const adminEmail = comp.primaryAdminId?.email || comp.contactEmail || 'N/A';

        return `
            <tr>
                <td>
                    <div class="company-cell">
                        <div class="company-logo-avatar">${logoHtml}</div>
                        <div>
                            <strong>${comp.displayName || comp.name}</strong>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${comp.name}</div>
                        </div>
                    </div>
                </td>
                <td><code style="background: #334155; padding: 2px 6px; border-radius: 4px;">${comp.code}</code></td>
                <td>
                    <a href="${tenantUrl}" target="_blank" class="subdomain-link">
                        🌐 ${subdomain}
                    </a>
                </td>
                <td><strong>${plan}</strong></td>
                <td><span class="status-badge status-${status}">${status}</span></td>
                <td>${adminEmail}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="switchContext('${comp._id}')">
                            👁️ Open
                        </button>
                        ${status === 'ACTIVE' 
                            ? `<button class="btn btn-warning" style="padding: 4px 8px; font-size: 0.8rem;" onclick="changeCompanyStatus('${comp._id}', 'SUSPENDED')">⏸️ Suspend</button>`
                            : `<button class="btn btn-success" style="padding: 4px 8px; font-size: 0.8rem;" onclick="changeCompanyStatus('${comp._id}', 'ACTIVE')">▶️ Activate</button>`
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('metricTotalCompanies').textContent = companiesList.length;
    document.getElementById('metricActiveCompanies').textContent = activeCount;
    document.getElementById('metricSuspendedCompanies').textContent = suspendedCount;
}

function openCreateModal() {
    document.getElementById('createModal').style.display = 'flex';
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    document.getElementById('provisionForm').reset();
}

async function handleCreateCompany(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');

    const formData = new FormData();
    formData.append('name', document.getElementById('companyName').value.trim());
    formData.append('code', document.getElementById('companyCode').value.trim().toUpperCase());
    formData.append('subdomain', document.getElementById('subdomain').value.trim().toLowerCase());
    formData.append('displayName', document.getElementById('displayName').value.trim());
    formData.append('adminName', document.getElementById('adminName').value.trim());
    formData.append('adminEmail', document.getElementById('adminEmail').value.trim().toLowerCase());
    formData.append('adminPassword', document.getElementById('adminPassword').value);
    formData.append('billing', JSON.stringify({ plan: document.getElementById('plan').value }));
    formData.append('branding', JSON.stringify({ primaryColor: document.getElementById('primaryColor').value }));

    const logoFile = document.getElementById('logoFile').files[0];
    if (logoFile) {
        formData.append('logo', logoFile);
    }

    try {
        const res = await fetch('/api/companies', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create company');

        alert(`✅ Company ${data.company.name} provisioned successfully!`);
        closeCreateModal();
        loadCompanies();
    } catch (err) {
        alert(`❌ Error: ${err.message}`);
    }
}

async function changeCompanyStatus(companyId, newStatus) {
    const confirmMsg = `Are you sure you want to change company status to ${newStatus}?`;
    if (!confirm(confirmMsg)) return;

    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch(`/api/companies/${companyId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update status');

        loadCompanies();
    } catch (err) {
        alert(`❌ Error: ${err.message}`);
    }
}

function switchContext(companyId) {
    localStorage.setItem('activeCompanyId', companyId);
    window.location.href = `/dashboard.html?companyId=${companyId}`;
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('activeCompanyId');
    window.location.href = '/login.html';
}
