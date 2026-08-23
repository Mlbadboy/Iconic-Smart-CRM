// Super Admin Omnichannel Marketing Governance Controller

const TOKEN_KEY = 'token';
let allCompanies = [];

function getToken() {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('authToken') || sessionStorage.getItem('token');
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }
  loadOverview();
});

async function loadOverview() {
  try {
    const res = await fetch('/api/super-admin/marketing/overview', { headers: getAuthHeaders() });
    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        alert('Super Admin privileges required');
        window.location.href = '/dashboard.html';
      }
      return;
    }

    const data = await res.json();
    const m = data.metrics || {};
    allCompanies = data.companies || [];

    document.getElementById('metricActiveTenants').innerText = `${m.marketingEnabledCount || 0} / ${m.totalCompanies || 0}`;
    document.getElementById('metricWABACount').innerText = m.connectedWABACount || 0;
    document.getElementById('metricMetaCount').innerText = m.connectedMetaCount || 0;
    document.getElementById('metricSocialPosts').innerText = m.totalSocialPosts || 0;
    document.getElementById('metricMetaAds').innerText = m.totalMetaAds || 0;

    renderTenantsTable();
  } catch (err) {
    console.error('Error loading Super Admin marketing overview:', err);
  }
}

function renderTenantsTable() {
  const tbody = document.getElementById('tenantsTableBody');
  if (!tbody) return;

  if (allCompanies.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">No companies registered.</td></tr>`;
    return;
  }

  tbody.innerHTML = allCompanies.map(c => {
    const isMasterOn = c.features?.marketing === true;
    const cfg = c.features?.marketing_config || {};

    return `
      <tr>
        <td><strong>${c.name}</strong><br><small style="color: var(--text-muted);">${c.code || ''}</small></td>
        <td><span class="status-pill ${isMasterOn ? 'status-active' : 'status-disabled'}">${isMasterOn ? 'ENABLED' : 'DISABLED'}</span></td>
        <td>${cfg.whatsapp ? '<span style="color: #25d366;">✓ Active</span>' : '<span style="color: var(--text-muted);">-</span>'}</td>
        <td>${cfg.social ? '<span style="color: #60a5fa;">✓ Active</span>' : '<span style="color: var(--text-muted);">-</span>'}</td>
        <td>${cfg.meta_ads ? '<span style="color: #f59e0b;">✓ Active</span>' : '<span style="color: var(--text-muted);">-</span>'}</td>
        <td>${cfg.content_studio ? '<span style="color: #ec4899;">✓ Active</span>' : '<span style="color: var(--text-muted);">-</span>'}</td>
        <td>${cfg.calendar ? '<span style="color: #a855f7;">✓ Active</span>' : '<span style="color: var(--text-muted);">-</span>'}</td>
        <td>${(cfg.monthly_message_limit || 50000).toLocaleString()} msgs</td>
        <td>
          <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="openEditModal('${c._id}')">
            <i class="fa-solid fa-gear"></i> Configure
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openEditModal(companyId) {
  const company = allCompanies.find(c => String(c._id) === String(companyId));
  if (!company) return;

  document.getElementById('editCompanyId').value = company._id;
  document.getElementById('modalTenantTitle').innerText = `Configure Entitlements - ${company.name}`;
  document.getElementById('editMasterSwitch').value = company.features?.marketing ? 'true' : 'false';

  const cfg = company.features?.marketing_config || {};
  document.getElementById('subWhatsApp').checked = cfg.whatsapp !== false;
  document.getElementById('subBulkWa').checked = cfg.bulk_whatsapp !== false;
  document.getElementById('subSocial').checked = cfg.social !== false;
  document.getElementById('subReels').checked = cfg.reels !== false;
  document.getElementById('subMetaAds').checked = cfg.meta_ads !== false;
  document.getElementById('subContent').checked = cfg.content_studio !== false;
  document.getElementById('subCalendar').checked = cfg.calendar !== false;
  document.getElementById('subAi').checked = cfg.ai_marketing !== false;
  document.getElementById('subApprovals').checked = cfg.approval_workflow !== false;

  document.getElementById('editMonthlyMsgLimit').value = cfg.monthly_message_limit || 50000;
  document.getElementById('editMonthlyAdLimit').value = cfg.monthly_ad_spend_limit || 100000;

  document.getElementById('editConfigModal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('editConfigModal').classList.remove('active');
}

async function submitSaveTenantConfig() {
  const companyId = document.getElementById('editCompanyId').value;
  const marketingMasterEnabled = document.getElementById('editMasterSwitch').value === 'true';

  const payload = {
    marketingMasterEnabled,
    whatsapp: document.getElementById('subWhatsApp').checked,
    bulk_whatsapp: document.getElementById('subBulkWa').checked,
    social: document.getElementById('subSocial').checked,
    reels: document.getElementById('subReels').checked,
    meta_ads: document.getElementById('subMetaAds').checked,
    content_studio: document.getElementById('subContent').checked,
    calendar: document.getElementById('subCalendar').checked,
    ai_marketing: document.getElementById('subAi').checked,
    approval_workflow: document.getElementById('subApprovals').checked,
    monthly_message_limit: Number(document.getElementById('editMonthlyMsgLimit').value),
    monthly_ad_spend_limit: Number(document.getElementById('editMonthlyAdLimit').value)
  };

  try {
    const res = await fetch(`/api/super-admin/marketing/tenants/${companyId}/config`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Commercial configuration saved!');
      closeEditModal();
      loadOverview();
    } else {
      alert(data.error || 'Failed to update configuration');
    }
  } catch (err) {
    alert(err.message);
  }
}
