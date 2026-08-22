/**
 * Charlie CRM — Super Admin WhatsApp Platform Controller
 */

const SA_API_BASE = '/api/super-admin/whatsapp';
const saToken = localStorage.getItem('authToken');

if (!saToken) {
    window.location.href = '/login.html';
}

function getSaHeaders(extra = {}) {
    return {
        'Authorization': `Bearer ${saToken}`,
        ...extra
    };
}

let loadedTenants = [];

document.addEventListener('DOMContentLoaded', () => {
    loadSuperAdminData();
});

async function loadSuperAdminData() {
    loadOverviewKPIs();
    loadTenantsMatrix();
}

async function loadOverviewKPIs() {
    try {
        const res = await fetch(`${SA_API_BASE}/overview`, { headers: getSaHeaders() });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('saKpiWabas').textContent = `${data.connectedCompanies} / ${data.totalCompanies}`;
            document.getElementById('saKpiToday').textContent = `${Number(data.messagesToday || 0).toLocaleString()} msgs`;
            document.getElementById('saKpiMonth').textContent = `${Number(data.messagesThisMonth || 0).toLocaleString()} msgs`;
            document.getElementById('saKpiDelivery').textContent = `${data.deliveryRate || 0}%`;
            document.getElementById('saKpiRevenue').textContent = `₹${Number(data.platformRevenue || 0).toFixed(2)}`;
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadTenantsMatrix() {
    const tbody = document.getElementById('saTenantsBody');
    try {
        const res = await fetch(`${SA_API_BASE}/tenants`, { headers: getSaHeaders() });
        const data = await res.json();

        if (!data.data || !data.data.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#64748b; padding:30px;">No tenants found</td></tr>`;
            return;
        }

        loadedTenants = data.data;

        tbody.innerHTML = data.data.map(t => `
            <tr>
                <td><strong>${t.name}</strong><br><small style="color:#94a3b8;">Code: ${t.code || '—'}</small></td>
                <td><span class="badge badge-success">${t.plan}</span></td>
                <td>${t.marketingEnabled ? '<span class="badge badge-success">ENABLED</span>' : '<span class="badge badge-danger">DISABLED</span>'}</td>
                <td>${t.connectionStatus === 'CONNECTED' ? `<span class="badge badge-success">CONNECTED</span><br><small>${t.displayPhoneNumber}</small>` : '<span class="badge badge-warning">NOT CONNECTED</span>'}</td>
                <td>${Number(t.dailyLimit || 0).toLocaleString()}</td>
                <td>${Number(t.monthUsage || 0).toLocaleString()}</td>
                <td><b>₹${Number(t.walletBalance || 0).toFixed(2)}</b></td>
                <td>
                    <button class="btn btn-outline" onclick="openConfigModal('${t.id}')"><i class="fa-solid fa-gear"></i> Configure</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="color:#f87171;">Failed to load matrix: ${err.message}</td></tr>`;
    }
}

function openConfigModal(tenantId) {
    const tenant = loadedTenants.find(t => t.id === tenantId);
    if (!tenant) return;

    document.getElementById('configCompanyId').value = tenant.id;
    document.getElementById('configModalTitle').textContent = `Configure ${tenant.name}`;
    document.getElementById('cfgMarketingEnabled').value = String(tenant.marketingEnabled);
    document.getElementById('cfgWhatsappEnabled').value = String(tenant.whatsappEnabled);
    document.getElementById('cfgDailyLimit').value = tenant.dailyLimit || 5000;
    document.getElementById('cfgMonthlyLimit').value = tenant.monthlyLimit || 50000;

    document.getElementById('tenantConfigModal').style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

async function saveTenantConfig() {
    const tenantId = document.getElementById('configCompanyId').value;
    const marketingEnabled = document.getElementById('cfgMarketingEnabled').value === 'true';
    const whatsappEnabled = document.getElementById('cfgWhatsappEnabled').value === 'true';
    const dailyLimit = Number(document.getElementById('cfgDailyLimit').value);
    const monthlyLimit = Number(document.getElementById('cfgMonthlyLimit').value);
    const platformFeeMarkup = Number(document.getElementById('cfgMarkup').value);

    try {
        const res = await fetch(`${SA_API_BASE}/tenants/${tenantId}/config`, {
            method: 'PUT',
            headers: getSaHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ marketingEnabled, whatsappEnabled, dailyLimit, monthlyLimit, platformFeeMarkup })
        });
        const data = await res.json();
        if (res.ok) {
            alert('✅ ' + data.message);
            closeModal('tenantConfigModal');
            loadSuperAdminData();
        } else {
            alert('❌ ' + (data.message || 'Config failed'));
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    }
}
