/**
 * Charlie's CRM — API Usage Analytics JavaScript Logic
 */
let currentApiKeyId = null;
let currentPeriod = '7d';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    currentApiKeyId = urlParams.get('apiKeyId') || urlParams.get('id');

    if (!currentApiKeyId) {
        alert('No API key specified.');
        window.location.href = '/api-access.html';
        return;
    }

    loadAnalytics();
});

function setPeriod(period, btnElement) {
    currentPeriod = period;
    document.querySelectorAll('.filter-buttons .btn').forEach(b => b.classList.remove('btn-active'));
    if (btnElement) btnElement.classList.add('btn-active');
    loadAnalytics();
}

async function loadAnalytics() {
    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch(`/api/api-keys/${currentApiKeyId}/analytics?period=${currentPeriod}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load analytics');

        const data = await res.json();
        renderAnalytics(data);
    } catch (err) {
        console.error('Error loading analytics:', err);
        document.getElementById('apiKeyTitle').textContent = `Error: ${err.message}`;
    }
}

function renderAnalytics(data) {
    // 1. Header Information
    document.getElementById('apiKeyTitle').textContent = data.apiKey.name || 'API Analytics';
    document.getElementById('apiKeyFeature').textContent = `Feature: ${data.apiKey.feature || 'Serial Number Validation'}`;
    document.getElementById('apiKeyMasked').textContent = `Key: ${data.apiKey.maskedKey || 'ik_••••••••••••'}`;
    document.getElementById('apiKeyStatus').textContent = `Status: ${data.apiKey.status || 'ACTIVE'}`;

    // 2. Metrics
    document.getElementById('metricTotalRequests').textContent = data.metrics.totalRequests.toLocaleString();
    document.getElementById('metricUniqueSerials').textContent = data.metrics.uniqueSerials.toLocaleString();
    document.getElementById('metricSuccess').textContent = data.metrics.successfulValidations.toLocaleString();
    document.getElementById('metricFailed').textContent = data.metrics.failedValidations.toLocaleString();
    document.getElementById('metricSuccessRate').textContent = `${data.metrics.successRate}%`;

    // 3. Outcome Breakdown
    const container = document.getElementById('outcomesContainer');
    const outcomes = data.outcomeBreakdown || {};

    const OUTCOME_CONFIG = {
        'VALID': { label: 'Valid Verifications', color: '#059669', badgeClass: 'badge-VALID' },
        'INVALID_SERIAL': { label: 'Invalid Serial Numbers', color: '#d97706', badgeClass: 'badge-INVALID_SERIAL' },
        'DEALER_MISMATCH': { label: 'Dealer Mismatches', color: '#dc2626', badgeClass: 'badge-DEALER_MISMATCH' },
        'MODEL_SERIAL_MISMATCH': { label: 'Model Mismatches', color: '#dc2626', badgeClass: 'badge-ERROR' },
        'ALREADY_VALIDATED': { label: 'Already Validated', color: '#4f46e5', badgeClass: 'badge-ALREADY_VALIDATED' },
        'INVALID_MATERIAL_CODE': { label: 'Invalid Material Code', color: '#dc2626', badgeClass: 'badge-ERROR' },
        'UNAUTHORIZED': { label: 'Unauthorized Requests', color: '#64748b', badgeClass: 'badge-ERROR' },
        'RATE_LIMITED': { label: 'Rate Limited', color: '#64748b', badgeClass: 'badge-ERROR' },
        'SERVICE_ERROR': { label: 'Internal Errors', color: '#64748b', badgeClass: 'badge-ERROR' }
    };

    container.innerHTML = Object.entries(outcomes).map(([key, count]) => {
        const config = OUTCOME_CONFIG[key] || { label: key, color: '#64748b' };
        return `
            <div class="outcome-item">
                <div>
                    <div class="outcome-name">${config.label}</div>
                    <small style="color: var(--text-muted); font-family: monospace; font-size: 0.75rem;">${key}</small>
                </div>
                <div class="outcome-count" style="color: ${config.color};">${count.toLocaleString()}</div>
            </div>
        `;
    }).join('');

    // 4. Recent Logs
    const tbody = document.getElementById('logsTableBody');
    if (!data.recentLogs || !data.recentLogs.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No request logs recorded in this time window.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.recentLogs.map(l => {
        const dateStr = l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A';
        const badgeClass = `badge-${l.result}` in OUTCOME_CONFIG ? OUTCOME_CONFIG[l.result]?.badgeClass : 'badge-ERROR';

        return `
            <tr>
                <td>${dateStr}</td>
                <td><code style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${escapeHtml(l.maskedSerial)}</code></td>
                <td>${escapeHtml(l.materialCode)}</td>
                <td>${escapeHtml(l.dealerCode)}</td>
                <td><span class="badge ${badgeClass}">${escapeHtml(l.result)}</span></td>
                <td><span style="font-size: 0.85rem; color: var(--text-muted);">${l.latencyMs}ms</span></td>
            </tr>
        `;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
