/**
 * Charlie's CRM — Platform Analytics & SaaS Command Center Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    loadAllPlatformAnalytics();
});

async function loadAllPlatformAnalytics() {
    const token = localStorage.getItem('authToken');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        // 1. KPIs
        const kpiRes = await fetch('/api/platform/analytics/kpis', { headers });
        if (kpiRes.ok) {
            const kpis = await kpiRes.json();
            document.getElementById('kpiCompanies').textContent = (kpis.totalCompanies || 0).toLocaleString();
            document.getElementById('kpiActiveCompanies').textContent = `${kpis.activeCompanies || 0} Active • ${kpis.suspendedCompanies || 0} Suspended`;
            document.getElementById('kpiUsers').textContent = (kpis.totalUsers || 0).toLocaleString();
            document.getElementById('kpiActiveUsers').textContent = `${kpis.activeUsers || 0} Active Users`;
            document.getElementById('kpiUnits').textContent = (kpis.totalUnits || 0).toLocaleString();
            document.getElementById('kpiTransactions').textContent = (kpis.totalTransactions || 0).toLocaleString();
            document.getElementById('kpiApiRequests').textContent = (kpis.totalApiRequests || 0).toLocaleString();
            document.getElementById('kpiSerialValidations').textContent = `${(kpis.totalSerialValidations || 0).toLocaleString()} Unique Serials`;
        }

        // 2. Feature Utilization
        const featRes = await fetch('/api/platform/analytics/features', { headers });
        if (featRes.ok) {
            const featData = await featRes.json();
            renderFeaturesTable(featData.breakdown || []);
        }

        // 3. Company Comparison
        const compRes = await fetch('/api/platform/analytics/companies', { headers });
        if (compRes.ok) {
            const compList = await compRes.json();
            renderCompaniesTable(compList);
        }

        // 4. Platform Health
        const healthRes = await fetch('/api/platform/analytics/health', { headers });
        if (healthRes.ok) {
            const health = await healthRes.json();
            document.getElementById('healthStatus').textContent = health.status;
            document.getElementById('healthDb').textContent = health.databaseStatus;
            document.getElementById('healthMemory').textContent = `${health.memoryUsageMb} MB`;
            document.getElementById('healthUptime').textContent = `${Math.floor(health.uptimeSeconds / 60)}m ${health.uptimeSeconds % 60}s`;
        }

    } catch (err) {
        console.error('Failed to load platform analytics:', err);
    }
}

function renderFeaturesTable(features) {
    const tbody = document.getElementById('featuresTableBody');
    if (!features.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No feature actions recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = features.map(f => `
        <tr>
            <td><strong>${escapeHtml(f.label)}</strong></td>
            <td><strong>${(f.totalUsage || 0).toLocaleString()}</strong></td>
            <td>${f.activeCompanies} Tenants</td>
            <td>${f.activeUsers} Users</td>
            <td>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 2px;">
                    <span>${f.percentage}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${Math.max(f.percentage, 2)}%;"></div>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderCompaniesTable(companies) {
    const tbody = document.getElementById('companiesTableBody');
    if (!companies.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No tenant companies registered.</td></tr>`;
        return;
    }

    tbody.innerHTML = companies.map(c => `
        <tr>
            <td>
                <strong>${escapeHtml(c.companyName)}</strong><br>
                <code style="font-size: 0.75rem; color: #818cf8;">${escapeHtml(c.subdomain || 'N/A')}</code>
            </td>
            <td><span style="font-size: 0.85rem; color: var(--text-muted);">${c.plan}</span></td>
            <td>${c.users}</td>
            <td>${c.orders}</td>
            <td>${c.units}</td>
            <td>${c.apiCalls}</td>
            <td>${c.serialChecks}</td>
            <td>
                <span class="tier-badge tier-${c.adoptionTier}">
                    ${c.adoptionScore}/100 • ${c.adoptionTier}
                </span>
            </td>
            <td style="text-align: right;">
                <button class="btn btn-sm" onclick="viewCompanySummary('${c.companyId}')">
                    🔍 Summary
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewCompanySummary(companyId) {
    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch(`/api/platform/analytics/companies/${companyId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load company details');
        const data = await res.json();

        document.getElementById('modalCompanyName').textContent = `${data.company.name} (${data.company.subdomain})`;
        document.getElementById('modalDetails').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: #0f172a; padding: 1rem; border-radius: 8px;">
                <div><span style="color: var(--text-muted); font-size: 0.85rem;">Plan:</span> <strong>${data.company.plan}</strong></div>
                <div><span style="color: var(--text-muted); font-size: 0.85rem;">Status:</span> <strong>${data.company.status}</strong></div>
                <div><span style="color: var(--text-muted); font-size: 0.85rem;">Total Users:</span> <strong>${data.metrics.users}</strong></div>
                <div><span style="color: var(--text-muted); font-size: 0.85rem;">Total Orders:</span> <strong>${data.metrics.orders}</strong></div>
                <div><span style="color: var(--text-muted); font-size: 0.85rem;">Product Units:</span> <strong>${data.metrics.totalUnits}</strong></div>
                <div><span style="color: var(--text-muted); font-size: 0.85rem;">Sold Units:</span> <strong>${data.metrics.soldUnits}</strong></div>
                <div><span style="color: var(--text-muted); font-size: 0.85rem;">API Requests:</span> <strong>${data.metrics.apiRequests}</strong></div>
                <div><span style="color: var(--text-muted); font-size: 0.85rem;">Serial Validations:</span> <strong>${data.metrics.serialValidations}</strong></div>
            </div>
            <div style="background: #0f172a; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">MOST USED FEATURE</div>
                <div style="font-size: 1.1rem; font-weight: 700; color: #818cf8;">${data.metrics.mostUsedFeature}</div>
            </div>
        `;

        document.getElementById('companyModal').classList.add('show');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function closeModal() {
    document.getElementById('companyModal').classList.remove('show');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
