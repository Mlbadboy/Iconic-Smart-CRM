/**
 * Charlie CRM — WhatsApp Marketing Hub Client Controller
 */

const API_BASE = '/api/whatsapp';
let currentToken = localStorage.getItem('authToken');
let selectedCsvFile = null;
let socket = null;

// Auth check
if (!currentToken) {
    window.location.href = '/login.html';
}

function getAuthHeaders(extra = {}) {
    return {
        'Authorization': `Bearer ${currentToken}`,
        ...extra
    };
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    loadDashboardKPIs();
    loadCampaigns();
    loadWabaAccount();
});

function initSocket() {
    try {
        socket = io({ auth: { token: currentToken } });
        socket.on('campaign:progress', (data) => {
            updateLiveCampaignRow(data);
        });
    } catch (e) {
        console.warn('Socket.IO connection notice:', e.message);
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');

    const pane = document.getElementById(`tab-${tabId}`);
    if (pane) pane.classList.add('active');

    if (tabId === 'overview') loadCampaigns();
    if (tabId === 'contacts') loadContacts();
    if (tabId === 'templates') loadTemplates();
    if (tabId === 'media') loadMedia();
    if (tabId === 'waba') loadWabaAccount();
    if (tabId === 'inbox') loadInbox();
    if (tabId === 'wallet') loadWallet();
}

async function loadDashboardKPIs() {
    try {
        const [analyticsRes, walletRes] = await Promise.all([
            fetch(`${API_BASE}/analytics/overview`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/wallet`, { headers: getAuthHeaders() })
        ]);

        if (analyticsRes.ok) {
            const data = await analyticsRes.json();
            document.getElementById('kpiCampaigns').textContent = data.totalCampaigns || 0;
            document.getElementById('kpiSent').textContent = Number(data.sentCount || 0).toLocaleString();
            document.getElementById('kpiDeliveryRate').textContent = `${data.rates?.deliveryRate || 0}%`;
            document.getElementById('kpiReadRate').textContent = `${data.rates?.readRate || 0}%`;
        }

        if (walletRes.ok) {
            const wData = await walletRes.json();
            document.getElementById('kpiWallet').textContent = `₹${Number(wData.balance || 0).toFixed(2)}`;
            if (document.getElementById('rateMarketing')) {
                document.getElementById('rateMarketing').textContent = `₹${wData.rateCard?.MARKETING || 0.99} / msg`;
            }
            if (document.getElementById('rateUtility')) {
                document.getElementById('rateUtility').textContent = `₹${wData.rateCard?.UTILITY || 0.40} / msg`;
            }
        }
    } catch (err) {
        console.error('KPI load error:', err);
    }
}

async function loadCampaigns() {
    const tbody = document.getElementById('campaignsTableBody');
    try {
        const res = await fetch(`${API_BASE}/campaigns`, { headers: getAuthHeaders() });
        const data = await res.json();

        if (!data.success || !data.data.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:30px;">No campaigns yet. Click "Create Campaign" to launch your first WhatsApp broadcast!</td></tr>`;
            return;
        }

        tbody.innerHTML = data.data.map(c => {
            const stats = c.stats || {};
            const total = stats.eligibleCount || stats.totalRecipients || 1;
            const sent = (stats.sentCount || 0) + (stats.failedCount || 0);
            const percent = Math.min(100, Math.round((sent / total) * 100));

            let statusBadge = `<span class="badge badge-info">${c.status}</span>`;
            if (c.status === 'PROCESSING') statusBadge = `<span class="badge badge-warning"><i class="fa-solid fa-spinner fa-spin"></i> SENDING (${percent}%)</span>`;
            if (c.status === 'COMPLETED') statusBadge = `<span class="badge badge-success"><i class="fa-solid fa-check"></i> COMPLETED</span>`;
            if (c.status === 'PAUSED') statusBadge = `<span class="badge badge-danger"><i class="fa-solid fa-pause"></i> PAUSED</span>`;

            return `
                <tr id="campaign-row-${c._id}">
                    <td><strong>${c.name}</strong><br><small style="color:#64748b;">${new Date(c.createdAt).toLocaleDateString()}</small></td>
                    <td><code>${c.templateName}</code></td>
                    <td><b>${stats.eligibleCount || 0}</b></td>
                    <td style="min-width:140px;">
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width:${percent}%"></div>
                        </div>
                        <small style="color:#64748b;">${stats.sentCount || 0} sent • ${stats.deliveredCount || 0} dlvd • ${stats.readCount || 0} read</small>
                    </td>
                    <td>${statusBadge}</td>
                    <td>₹${c.actualCost || c.estimatedCost || 0}</td>
                    <td>
                        ${c.status === 'DRAFT' ? `<button class="btn btn-whatsapp btn-sm" onclick="sendCampaign('${c._id}')"><i class="fa-solid fa-paper-plane"></i> Launch</button>` : ''}
                        ${c.status === 'PROCESSING' ? `<button class="btn btn-outline btn-sm" onclick="pauseCampaign('${c._id}')"><i class="fa-solid fa-pause"></i> Pause</button>` : ''}
                        ${c.status === 'PAUSED' ? `<button class="btn btn-whatsapp btn-sm" onclick="resumeCampaign('${c._id}')"><i class="fa-solid fa-play"></i> Resume</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef4444;">Failed to load campaigns: ${err.message}</td></tr>`;
    }
}

function updateLiveCampaignRow(data) {
    const row = document.getElementById(`campaign-row-${data.campaignId}`);
    if (!row) return;
    loadCampaigns(); // Refresh rows on socket event
}

async function sendCampaign(id) {
    if (!confirm('Are you sure you want to launch this campaign to all eligible recipients?')) return;
    try {
        const res = await fetch(`${API_BASE}/campaigns/${id}/send`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' })
        });
        const data = await res.json();
        if (res.ok) {
            alert('🚀 ' + data.message);
            loadCampaigns();
            loadDashboardKPIs();
        } else {
            alert('❌ Launch failed: ' + (data.message || 'Error'));
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    }
}

async function pauseCampaign(id) {
    try {
        const res = await fetch(`${API_BASE}/campaigns/${id}/pause`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' })
        });
        if (res.ok) loadCampaigns();
    } catch (e) {
        console.error(e);
    }
}

async function resumeCampaign(id) {
    try {
        const res = await fetch(`${API_BASE}/campaigns/${id}/resume`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' })
        });
        if (res.ok) loadCampaigns();
    } catch (e) {
        console.error(e);
    }
}

async function loadContacts() {
    const tbody = document.getElementById('contactsTableBody');
    const search = document.getElementById('contactSearch')?.value || '';
    const type = document.getElementById('contactTypeFilter')?.value || '';

    try {
        const res = await fetch(`${API_BASE}/contacts?search=${encodeURIComponent(search)}&customerType=${type}`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (!data.data || !data.data.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:30px;">No contacts found. Click "Import Contacts CSV" to add records.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.data.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td><code>${c.normalizedPhone}</code></td>
                <td>${c.email || '—'}</td>
                <td>${c.city ? `${c.city}, ${c.state || ''}` : '—'}</td>
                <td><span class="badge badge-info">${c.customerType}</span></td>
                <td>${c.whatsappOptIn && !c.whatsappOptOut ? '<span class="badge badge-success"><i class="fa-solid fa-check"></i> OPTED-IN</span>' : '<span class="badge badge-danger">OPTED-OUT</span>'}</td>
                <td><span class="badge badge-success">${c.status}</span></td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef4444;">Error loading contacts</td></tr>`;
    }
}

let searchTimer = null;
function debounceLoadContacts() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadContacts, 300);
}

async function loadTemplates() {
    const grid = document.getElementById('templatesGrid');
    try {
        const res = await fetch(`${API_BASE}/templates`, { headers: getAuthHeaders() });
        const data = await res.json();

        if (!data.data || !data.data.length) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#94a3b8; padding:40px;">No templates found. Click "Sync from Meta WABA" to fetch approved templates.</div>`;
            return;
        }

        grid.innerHTML = data.data.map(t => `
            <div class="item-card">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                        <h4 style="margin:0; font-size:1rem; color:#0f172a;">${t.name}</h4>
                        <span class="badge badge-success">${t.status}</span>
                    </div>
                    <div style="font-size:0.8rem; color:#64748b; margin-bottom:12px;">Category: <b>${t.category}</b> • Language: <b>${t.language}</b></div>
                    <div style="background:#f8fafc; padding:12px; border-radius:6px; font-size:0.85rem; border:1px solid #e2e8f0; margin-bottom:12px;">
                        ${t.bodyText.replace(/\n/g, '<br>')}
                    </div>
                </div>
                <div style="font-size:0.8rem; color:#64748b;">Variables: ${(t.variables || []).length ? t.variables.map(v => `<code>{{${v.position}}}</code>`).join(' ') : 'None'}</div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<div style="color:#ef4444;">Failed to load templates</div>`;
    }
}

async function syncTemplatesFromMeta() {
    try {
        const res = await fetch(`${API_BASE}/templates/sync`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' })
        });
        const data = await res.json();
        if (res.ok) {
            alert('✅ ' + data.message);
            loadTemplates();
        } else {
            alert('❌ Template sync failed: ' + (data.message || 'Error'));
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    }
}

async function loadMedia() {
    const grid = document.getElementById('mediaGrid');
    try {
        const res = await fetch(`${API_BASE}/media`, { headers: getAuthHeaders() });
        const data = await res.json();

        if (!data.data || !data.data.length) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#94a3b8; padding:40px;">No media files uploaded yet. Click "Upload Media" to add images, videos, or PDFs.</div>`;
            return;
        }

        grid.innerHTML = data.data.map(m => `
            <div class="item-card">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span class="badge badge-info">${m.fileType}</span>
                        <small style="color:#64748b;">${(m.fileSize / 1024 / 1024).toFixed(2)} MB</small>
                    </div>
                    <h4 style="margin:0 0 10px 0; font-size:0.95rem; word-break:break-all;">${m.originalName}</h4>
                    ${m.fileType === 'IMAGE' ? `<img src="${m.storageUrl}" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-bottom:10px;">` : ''}
                </div>
                <div style="font-size:0.75rem; color:#64748b;">Uploaded: ${new Date(m.createdAt).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<div style="color:#ef4444;">Failed to load media library</div>`;
    }
}

async function loadWabaAccount() {
    try {
        const res = await fetch(`${API_BASE}/account`, { headers: getAuthHeaders() });
        const data = await res.json();
        const badge = document.getElementById('wabaStatusBadge');

        if (data.connected && data.account) {
            badge.className = 'badge badge-success';
            badge.textContent = `CONNECTED (${data.account.qualityRating} Rating • ${data.account.messagingLimit})`;
            document.getElementById('wabaIdInput').value = data.account.wabaId || '';
            document.getElementById('phoneIdInput').value = data.account.phoneNumberId || '';
            document.getElementById('displayPhoneInput').value = data.account.displayPhoneNumber || '';
            document.getElementById('portfolioIdInput').value = data.account.businessPortfolioId || '';
            document.getElementById('tokenInput').placeholder = data.account.maskedToken || '••••••••';
        } else {
            badge.className = 'badge badge-warning';
            badge.textContent = 'DISCONNECTED';
        }
    } catch (err) {
        console.error(err);
    }
}

async function saveWabaConfig(e) {
    e.preventDefault();
    const wabaId = document.getElementById('wabaIdInput').value.trim();
    const phoneNumberId = document.getElementById('phoneIdInput').value.trim();
    const displayPhoneNumber = document.getElementById('displayPhoneInput').value.trim();
    const businessPortfolioId = document.getElementById('portfolioIdInput').value.trim();
    const accessToken = document.getElementById('tokenInput').value.trim();

    try {
        const res = await fetch(`${API_BASE}/account`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ wabaId, phoneNumberId, displayPhoneNumber, businessPortfolioId, accessToken })
        });
        const data = await res.json();
        if (res.ok) {
            alert('🎉 ' + data.message);
            loadWabaAccount();
        } else {
            alert('❌ ' + (data.message || 'Save failed'));
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    }
}

async function testWabaConnection() {
    try {
        const res = await fetch(`${API_BASE}/account/test`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
            alert(`✅ Verified Meta Connection!\n\nVerified Name: ${data.verifiedName}\nPhone: ${data.displayPhoneNumber}\nQuality: ${data.qualityRating}`);
            loadWabaAccount();
        } else {
            alert('❌ Test Failed: ' + (data.error || 'Check WABA credentials'));
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    }
}

async function loadInbox() {
    const tbody = document.getElementById('inboxTableBody');
    try {
        const res = await fetch(`${API_BASE}/inbox/conversations`, { headers: getAuthHeaders() });
        const data = await res.json();

        if (!data.data || !data.data.length) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:30px;">No inbound customer replies yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.data.map(conv => `
            <tr>
                <td><strong>${conv._id}</strong></td>
                <td>${conv.lastMessage || '—'}</td>
                <td>${new Date(conv.lastTimestamp).toLocaleString()}</td>
                <td><button class="btn btn-outline btn-sm" onclick="alert('Viewing conversation thread for ${conv._id}')">View</button></td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:#ef4444;">Error loading inbox</td></tr>`;
    }
}

async function loadWallet() {
    const tbody = document.getElementById('walletTxBody');
    try {
        const res = await fetch(`${API_BASE}/wallet`, { headers: getAuthHeaders() });
        const data = await res.json();

        if (!data.transactions || !data.transactions.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">No wallet transactions recorded.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.transactions.map(tx => `
            <tr>
                <td>${new Date(tx.createdAt).toLocaleString()}</td>
                <td><span class="badge ${tx.type === 'CREDIT' ? 'badge-success' : 'badge-danger'}">${tx.type}</span></td>
                <td><b>${tx.type === 'CREDIT' ? '+' : '-'}₹${tx.amount.toFixed(2)}</b></td>
                <td>₹${tx.balanceAfter.toFixed(2)}</td>
                <td>${tx.description}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:#ef4444;">Error loading transactions</td></tr>`;
    }
}

// Modal Handlers
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function openImportModal() {
    document.getElementById('importResultCard').style.display = 'none';
    document.getElementById('selectedFileName').textContent = '';
    selectedCsvFile = null;
    openModal('importModal');
}

function handleCsvSelected(e) {
    if (e.target.files && e.target.files[0]) {
        selectedCsvFile = e.target.files[0];
        document.getElementById('selectedFileName').textContent = `Selected: ${selectedCsvFile.name} (${(selectedCsvFile.size / 1024).toFixed(1)} KB)`;
    }
}

async function submitCsvImport() {
    if (!selectedCsvFile) {
        alert('Please choose a CSV file first');
        return;
    }

    const btn = document.getElementById('btnUploadCsv');
    btn.disabled = true;
    btn.textContent = 'Processing Import...';

    const formData = new FormData();
    formData.append('file', selectedCsvFile);

    try {
        const res = await fetch(`${API_BASE}/contacts/import`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        const data = await res.json();

        if (res.ok && data.stats) {
            document.getElementById('importResultCard').style.display = 'block';
            document.getElementById('statTotal').textContent = data.stats.total;
            document.getElementById('statValid').textContent = data.stats.valid;
            document.getElementById('statImported').textContent = data.stats.imported;
            document.getElementById('statDuplicate').textContent = data.stats.duplicate;
            document.getElementById('statExisting').textContent = data.stats.existing;
            document.getElementById('statInvalid').textContent = data.stats.invalid;
            loadContacts();
        } else {
            alert('Import failed: ' + (data.message || 'Error'));
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload & Import';
    }
}

function openMediaUploadModal() {
    openModal('mediaModal');
}

async function submitMediaUpload() {
    const fileInput = document.getElementById('mediaFileInput');
    if (!fileInput.files || !fileInput.files[0]) {
        alert('Please choose a media file');
        return;
    }

    const formData = new FormData();
    formData.append('media', fileInput.files[0]);

    try {
        const res = await fetch(`${API_BASE}/media/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            alert('✅ Media uploaded successfully');
            closeModal('mediaModal');
            loadMedia();
        } else {
            alert('❌ Upload failed: ' + (data.message || 'Error'));
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    }
}

function openRechargeModal() {
    openModal('rechargeModal');
}

async function submitWalletRecharge() {
    const amount = document.getElementById('rechargeAmountInput').value;
    const paymentMethod = document.getElementById('paymentMethodInput').value;

    try {
        const res = await fetch(`${API_BASE}/wallet/recharge`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ amount, paymentMethod })
        });
        const data = await res.json();
        if (res.ok) {
            alert('🎉 ' + data.message);
            closeModal('rechargeModal');
            loadDashboardKPIs();
            loadWallet();
        } else {
            alert('Recharge failed: ' + (data.message || 'Error'));
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    }
}
