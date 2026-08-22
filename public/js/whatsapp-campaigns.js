/**
 * Charlie CRM — WhatsApp Campaign Builder Controller
 */

const API_BASE = '/api/whatsapp';
const currentToken = localStorage.getItem('authToken');

if (!currentToken) {
    window.location.href = '/login.html';
}

function getAuthHeaders(extra = {}) {
    return {
        'Authorization': `Bearer ${currentToken}`,
        ...extra
    };
}

let currentStep = 1;
let loadedTemplates = [];
let loadedMedia = [];
let selectedTemplate = null;
let parsedCsvContacts = [];
let rateCard = { MARKETING: 0.99, UTILITY: 0.40 };
let currentCampaignId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadWalletBalance();
    loadTemplates();
    loadMedia();
});

async function loadWalletBalance() {
    try {
        const res = await fetch(`${API_BASE}/wallet`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('walletBadge').textContent = `Wallet: ₹${Number(data.balance || 0).toFixed(2)}`;
            if (data.rateCard) rateCard = data.rateCard;
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadTemplates() {
    try {
        const res = await fetch(`${API_BASE}/templates?status=APPROVED`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.data) {
            loadedTemplates = data.data;
            const select = document.getElementById('templateSelect');
            select.innerHTML = '<option value="">Select an approved template...</option>' +
                loadedTemplates.map(t => `<option value="${t._id}">${t.name} (${t.category} - ${t.language})</option>`).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadMedia() {
    try {
        const res = await fetch(`${API_BASE}/media`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.data) {
            loadedMedia = data.data;
            const select = document.getElementById('campaignMediaSelect');
            select.innerHTML = '<option value="">None (Text only)</option>' +
                loadedMedia.map(m => `<option value="${m._id}">${m.originalName} (${m.fileType})</option>`).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

function goToStep(step) {
    if (step === 2 && !document.getElementById('campaignName').value.trim()) {
        alert('Please enter a campaign name first');
        return;
    }

    if (step === 4 && !selectedTemplate) {
        alert('Please select a template first');
        return;
    }

    document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
    const targetSection = document.getElementById(`step-${step}`);
    if (targetSection) targetSection.classList.add('active');

    currentStep = step;

    if (step === 5) renderPreview();
    if (step === 6) calculateCostSummary();
}

function toggleAudienceType() {
    const val = document.getElementById('audienceType').value;
    document.getElementById('csvUploadBox').style.display = val === 'CSV_UPLOAD' ? 'block' : 'none';
    document.getElementById('audienceSegmentBox').style.display = val === 'SAVED_SEGMENT' ? 'block' : 'none';
}

function handleCampaignCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const text = evt.target.result;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length <= 1) return;

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
        parsedCsvContacts = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim());
            const rowObj = {};
            headers.forEach((h, idx) => { rowObj[h] = cols[idx] || ''; });
            parsedCsvContacts.push({
                name: rowObj.name || rowObj.fullname || 'Valued Customer',
                mobile: rowObj.mobile || rowObj.phone || '',
                email: rowObj.email || null,
                product: rowObj.product || null,
                dealerCode: rowObj.dealercode || null
            });
        }
        alert(`Parsed ${parsedCsvContacts.length} contacts from CSV file`);
    };
    reader.readAsText(file);
}

function handleTemplateSelected() {
    const tId = document.getElementById('templateSelect').value;
    selectedTemplate = loadedTemplates.find(t => t._id === tId);

    if (!selectedTemplate) {
        document.getElementById('templateDetailCard').style.display = 'none';
        return;
    }

    document.getElementById('templateDetailCard').style.display = 'block';
    document.getElementById('templateBodyPreview').innerHTML = selectedTemplate.bodyText.replace(/\n/g, '<br>');

    // Setup variables mapper
    const container = document.getElementById('variableMappingContainer');
    const vars = selectedTemplate.variables || [];

    if (vars.length === 0) {
        container.innerHTML = '<p style="color:#64748b; font-size:0.9rem;">This template has no dynamic variable placeholders.</p>';
    } else {
        container.innerHTML = vars.map(v => `
            <div class="form-group">
                <label class="form-label">Placeholder {{${v.position}}} (${v.name || 'Value'})</label>
                <select class="form-control var-map-select" data-pos="${v.position}">
                    <option value="{{name}}">Customer Name</option>
                    <option value="{{mobile}}">Mobile Number</option>
                    <option value="{{email}}">Email Address</option>
                    <option value="{{city}}">City</option>
                    <option value="{{state}}">State</option>
                    <option value="{{product}}">Product Model</option>
                    <option value="{{dealerCode}}">Dealer Code</option>
                </select>
            </div>
        `).join('');
    }

    // Toggle media select
    document.getElementById('mediaSelectGroup').style.display = selectedTemplate.headerType !== 'NONE' ? 'block' : 'none';
}

function renderPreview() {
    if (!selectedTemplate) return;

    let body = selectedTemplate.bodyText;
    const selects = document.querySelectorAll('.var-map-select');
    selects.forEach(s => {
        const pos = s.getAttribute('data-pos');
        body = body.replace(new RegExp(`\\{\\{${pos}\\}\\}`, 'g'), `<b>[${s.value.replace(/[{}]/g, '')}]</b>`);
    });

    document.getElementById('previewBodyText').innerHTML = body.replace(/\n/g, '<br>');
    document.getElementById('previewHeader').textContent = selectedTemplate.headerText || '';
    document.getElementById('previewFooter').textContent = selectedTemplate.footerText || 'Charlie CRM';
}

async function calculateCostSummary() {
    const audienceType = document.getElementById('audienceType').value;
    let count = 0;

    if (audienceType === 'CSV_UPLOAD') {
        count = parsedCsvContacts.length;
    } else {
        try {
            const res = await fetch(`${API_BASE}/contacts`, { headers: getAuthHeaders() });
            const data = await res.json();
            count = data.pagination?.total || 0;
        } catch (e) {
            count = 1;
        }
    }

    const unitRate = selectedTemplate?.category === 'UTILITY' ? rateCard.UTILITY : rateCard.MARKETING;
    const totalCost = (count * unitRate).toFixed(2);

    document.getElementById('summaryRecipients').textContent = count;
    document.getElementById('summaryUnitRate').textContent = `₹${unitRate}`;
    document.getElementById('summaryTotalCost').textContent = `₹${totalCost}`;
}

async function sendTestMessage() {
    const testPhone = document.getElementById('testPhoneInput').value.trim();
    if (!testPhone) {
        alert('Please enter a test phone number (e.g. +919876543210)');
        return;
    }

    // If campaign is not saved yet, save draft first
    await saveDraftCampaign();

    if (!currentCampaignId) {
        alert('Failed to initialize campaign draft for test send');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/campaigns/${currentCampaignId}/test-message`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ testPhone })
        });
        const data = await res.json();
        if (res.ok) {
            alert('✅ Test message sent! Check WhatsApp on ' + testPhone);
        } else {
            alert('❌ Test send error: ' + (data.message || 'Error'));
        }
    } catch (e) {
        alert('Network error: ' + e.message);
    }
}

async function saveDraftCampaign() {
    if (currentCampaignId) return currentCampaignId;

    const name = document.getElementById('campaignName').value.trim();
    const audienceType = document.getElementById('audienceType').value;
    const mediaId = document.getElementById('campaignMediaSelect')?.value || null;

    const variableMappings = {};
    document.querySelectorAll('.var-map-select').forEach(s => {
        variableMappings[s.getAttribute('data-pos')] = s.value;
    });

    const payload = {
        name,
        templateId: selectedTemplate._id,
        audienceType,
        mediaId: mediaId || null,
        variableMappings,
        csvContacts: audienceType === 'CSV_UPLOAD' ? parsedCsvContacts : []
    };

    try {
        const res = await fetch(`${API_BASE}/campaigns`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.campaign) {
            currentCampaignId = data.campaign._id;
            return currentCampaignId;
        }
    } catch (e) {
        console.error(e);
    }
    return null;
}

async function launchCampaignFinal() {
    const btn = document.getElementById('btnLaunch');
    btn.disabled = true;
    btn.textContent = 'Launching...';

    const cId = await saveDraftCampaign();
    if (!cId) {
        alert('Failed to save campaign');
        btn.disabled = false;
        btn.textContent = 'Launch Campaign Now';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/campaigns/${cId}/send`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' })
        });
        const data = await res.json();
        if (res.ok) {
            alert('🎉 ' + data.message);
            window.location.href = '/marketing.html';
        } else {
            alert('❌ Launch failed: ' + (data.message || 'Error'));
            btn.disabled = false;
            btn.textContent = 'Launch Campaign Now';
        }
    } catch (err) {
        alert('Network error: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Launch Campaign Now';
    }
}
