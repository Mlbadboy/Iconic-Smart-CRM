/**
 * Charlie's CRM — Simple Company API Access Frontend Logic
 */
let currentApiKeys = [];
let lastCreatedIntegration = null;

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    loadApiKeys();
});

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

async function loadApiKeys() {
    const token = localStorage.getItem('authToken');
    const tbody = document.getElementById('apiKeysTableBody');
    
    try {
        const res = await fetch('/api/api-keys', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load API keys');
        
        currentApiKeys = await res.json();
        renderTable();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--danger); padding: 2rem;">Error loading API keys: ${err.message}</td></tr>`;
    }
}

function renderTable() {
    const tbody = document.getElementById('apiKeysTableBody');
    if (!currentApiKeys.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div class="empty-state-icon">🔌</div>
                        <h3 style="margin: 0 0 0.5rem 0; color: var(--text-main);">No API Keys Generated Yet</h3>
                        <p style="margin: 0 0 1rem 0;">Generate your first API key to connect external software to your Charlie's CRM workspace.</p>
                        <button class="btn btn-primary btn-sm" onclick="openGenerateModal()">+ Generate API Key</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = currentApiKeys.map(k => {
        const isActive = (k.status === 'ACTIVE');
        const badgeClass = isActive ? 'badge-active' : 'badge-revoked';
        const totalReq = (k.totalRequests || 0).toLocaleString();
        const uniqueSer = (k.uniqueSerials || 0).toLocaleString();
        const successCount = (k.successful || 0).toLocaleString();
        const failCount = (k.failed || 0).toLocaleString();

        return `
            <tr>
                <td><strong>${escapeHtml(k.name)}</strong></td>
                <td><span style="color: var(--text-muted); font-size: 0.9rem;">${escapeHtml(k.feature || 'Serial Number Validation')}</span></td>
                <td><span class="key-code">${escapeHtml(k.maskedKey || 'ik_••••••••••••')}</span></td>
                <td><span class="badge ${badgeClass}">${k.status}</span></td>
                <td><strong>${totalReq}</strong></td>
                <td><strong style="color: var(--primary);">${uniqueSer}</strong></td>
                <td>
                    <span style="color: var(--success); font-weight: 600;">${successCount}</span> / 
                    <span style="color: var(--danger); font-weight: 600;">${failCount}</span>
                </td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                        <a href="/api-access-usage.html?apiKeyId=${k.id}" class="btn btn-secondary btn-sm" title="View detailed usage analytics">
                            📊 Usage
                        </a>
                        <button class="btn btn-secondary btn-sm" onclick="copyExistingIntegration('${k.id}')" title="Copy integration instructions">
                            📋 Copy Details
                        </button>
                        ${isActive ? `
                            <button class="btn btn-danger btn-sm" onclick="revokeApiKey('${k.id}', '${escapeJsString(k.name)}')">
                                🚫 Revoke
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openGenerateModal() {
    document.getElementById('generateForm').reset();
    document.getElementById('generateModal').classList.add('show');
}

function closeGenerateModal() {
    document.getElementById('generateModal').classList.remove('show');
}

async function handleGenerateApiKey(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const name = document.getElementById('apiName').value.trim();
    const feature = document.getElementById('apiFeature').value;
    const description = document.getElementById('apiDescription').value.trim();

    try {
        const res = await fetch('/api/api-keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, feature, description })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Failed to generate API Key');

        closeGenerateModal();
        lastCreatedIntegration = data;
        showResultModal(data);
        loadApiKeys();
    } catch (err) {
        alert(`❌ Error: ${err.message}`);
    }
}

function formatFullIntegrationText(endpoint, key) {
    const origin = window.location.origin;
    const realEndpoint = endpoint.startsWith('http') ? endpoint : `${origin}${endpoint}`;
    const legacyEndpoint = `${origin}/qerp/validatesno.asp`;

    return `======================================================================
SERIAL NUMBER VALIDATION API SPECIFICATION (v1.2)
======================================================================

1. HTTP REQUEST
--------------------------------------------------
Method: POST
Headers:
  Content-Type: application/json
  Cache-Control: no-cache
  X-API-Key: ${key}

Endpoints:
  • Primary: ${realEndpoint}
  • Legacy QERP: ${legacyEndpoint}

2. JSON REQUEST BODY (OPTION A: Header Auth)
--------------------------------------------------
{
  "materialCode": "UTIXK",
  "serialNumber": "IXHFJDGHH",
  "dealerCode": "55262"
}

3. JSON REQUEST BODY (OPTION B: Body accessKey Auth)
--------------------------------------------------
{
  "materialCode": "UTIXK",
  "serialNumber": "IXHFJDGHH",
  "dealerCode": "55262",
  "accessKey": "${key}"
}

4. RESPONSE STATUS CODES & MESSAGES
--------------------------------------------------
Response Status | Response Message
----------------|-----------------------------------------
 0              | Valid Serial Number
-1              | Invalid Serial Number
-2              | Mismatch in model and serial number
-3              | Serial Number Already Validated
-4              | Invalid Material code
-5              | Serial Number not billed to this dealer

5. SAMPLE SUCCESS RESPONSE
--------------------------------------------------
{
  "valid": true,
  "responseStatus": "0",
  "responseMessage": "Valid Serial Number",
  "responeMessage": "Valid Serial Number",
  "materialCode": "UTIXK",
  "serialNumber": "IXHFJDGHH",
  "dealerCode": "55262"
}

6. QUICK-RUN POWERSHELL SCRIPT
--------------------------------------------------
$body = @{
    materialCode = "UTIXK"
    serialNumber = "IXHFJDGHH"
    dealerCode   = "55262"
} | ConvertTo-Json

Invoke-RestMethod -Uri "${realEndpoint}" -Method POST -Headers @{ "X-API-Key" = "${key}" } -ContentType "application/json" -Body $body

7. QUICK-RUN CURL COMMAND
--------------------------------------------------
curl -X POST "${realEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${key}" \\
  -d '{"materialCode":"UTIXK","serialNumber":"IXHFJDGHH","dealerCode":"55262"}'
`;
}

function showResultModal(data) {
    const origin = window.location.origin;
    const realEndpoint = `${origin}/api/v1/serial-validation/validate`;
    document.getElementById('resultApiName').textContent = `${data.apiKey.name} (${data.apiKey.feature})`;
    document.getElementById('resultApiKey').textContent = data.apiKey.key;
    document.getElementById('resultEndpoint').textContent = realEndpoint;

    const snippetText = formatFullIntegrationText(realEndpoint, data.apiKey.key);
    document.getElementById('resultSnippet').textContent = snippetText;

    document.getElementById('resultModal').classList.add('show');
}

function closeResultModal() {
    document.getElementById('resultModal').classList.remove('show');
}

function copyResultKey() {
    if (!lastCreatedIntegration?.apiKey?.key) return;
    navigator.clipboard.writeText(lastCreatedIntegration.apiKey.key);
    showToast('✅ API Key copied to clipboard!');
}

function copyResultEndpoint() {
    const origin = window.location.origin;
    const realEndpoint = `${origin}/api/v1/serial-validation/validate`;
    navigator.clipboard.writeText(realEndpoint);
    showToast('✅ Endpoint copied to clipboard!');
}

function copyIntegrationPackage() {
    const snippet = document.getElementById('resultSnippet').textContent;
    navigator.clipboard.writeText(snippet);
    showToast('✅ Full integration package copied to clipboard!');
}

function copyExistingIntegration(id) {
    const item = currentApiKeys.find(k => k.id === id);
    if (!item) return;

    const keyStr = item.maskedKey || 'YOUR_API_KEY_HERE';
    const origin = window.location.origin;
    const realEndpoint = `${origin}/api/v1/serial-validation/validate`;
    const snippet = formatFullIntegrationText(realEndpoint, keyStr);
    navigator.clipboard.writeText(snippet);
    showToast(`✅ Integration package for "${item.name}" copied!`);
}

async function revokeApiKey(id, name) {
    const confirmed = confirm(`Are you sure you want to revoke "${name}"?\n\nAny external systems using this key will immediately lose access.`);
    if (!confirmed) return;

    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch(`/api/api-keys/${id}/revoke`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to revoke API key');

        showToast(`✅ API Key "${name}" revoked successfully.`);
        loadApiKeys();
    } catch (err) {
        alert(`❌ Error: ${err.message}`);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJsString(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'");
}
