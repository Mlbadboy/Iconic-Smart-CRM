// Charlie's Marketing Command Center Controller

const TOKEN_KEY = 'token';
let currentTenantConfig = null;
let currentPreflightResult = null;
let currentPreflightPayload = null;

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar .nav-item').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  const targetNav = document.getElementById(`nav-${tabId}`);

  if (targetTab) targetTab.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  // Trigger tab-specific loaders
  if (tabId === 'whatsapp') loadWhatsAppHub();
  if (tabId === 'crm-segments') loadCrmSegments();
  if (tabId === 'social') loadSocialPosts();
  if (tabId === 'meta-ads') loadMetaAds();
  if (tabId === 'content-studio') loadContentAssets();
  if (tabId === 'calendar') loadMarketingCalendar();
  if (tabId === 'approvals') loadApprovals();
  if (tabId === 'meta-settings') loadMetaSettings();
}

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  await loadCompanyProfileAndEntitlements();
  loadCommandCenterOverview();
});

async function loadCompanyProfileAndEntitlements() {
  try {
    const res = await fetch('/api/tenant/me', { headers: getAuthHeaders() });
    if (!res.ok) {
      if (res.status === 401) window.location.href = '/login.html';
      return;
    }

    const data = await res.json();
    const company = data.company || {};
    const features = company.features || {};
    const marketingConfig = features.marketing_config || {};

    const badge = document.getElementById('companyBadge');
    if (badge) badge.innerHTML = `<i class="fa-solid fa-building"></i> ${company.name || "Charlie's Primary"}`;

    if (features.marketing === false) {
      alert('Marketing Platform is currently disabled by Super Admin for this company.');
      window.location.href = '/dashboard.html';
      return;
    }

    if (marketingConfig.whatsapp === false) hideNav('nav-whatsapp');
    if (marketingConfig.social === false) hideNav('nav-social');
    if (marketingConfig.meta_ads === false) hideNav('nav-meta-ads');
    if (marketingConfig.content_studio === false) hideNav('nav-content-studio');
    if (marketingConfig.calendar === false) hideNav('nav-calendar');
    if (marketingConfig.ai_marketing === false) hideNav('nav-ai');
    if (marketingConfig.approval_workflow === false) hideNav('nav-approvals');

    currentTenantConfig = marketingConfig;
  } catch (err) {
    console.error('Error loading company entitlements:', err);
  }
}

function hideNav(navId) {
  const el = document.getElementById(navId);
  if (el) el.style.display = 'none';
}

// -------------------------------------------------------------
// 1. COMMAND CENTER OVERVIEW
// -------------------------------------------------------------
async function loadCommandCenterOverview() {
  try {
    const [eventsRes, metaRes] = await Promise.all([
      fetch('/api/social-marketing/calendar/events', { headers: getAuthHeaders() }),
      fetch('/api/social-marketing/meta/assets', { headers: getAuthHeaders() })
    ]);

    if (eventsRes.ok) {
      const data = await eventsRes.json();
      const listEl = document.getElementById('activeCampaignsList');
      if (listEl) {
        if (data.campaignPlans && data.campaignPlans.length > 0) {
          listEl.innerHTML = data.campaignPlans.map(p => `
            <div style="background: #0f172a; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.6rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 0.95rem; color: #fff;">${p.title}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
                  <span><i class="fa-solid fa-flag-checkered"></i> ${p.milestones.length} Milestones</span> • 
                  <span><i class="fa-solid fa-indian-rupee-sign"></i> Budget: ₹${p.totalBudget || 0}</span>
                </div>
              </div>
              <span class="status-pill status-active">${p.status}</span>
            </div>
          `).join('');
        } else {
          listEl.innerHTML = `
            <div style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
              <i class="fa-regular fa-calendar-plus" style="font-size: 2rem; margin-bottom: 0.5rem; color: #60a5fa;"></i>
              <p>No active campaign roadmaps planned.</p>
              <button class="btn btn-ai btn-sm" style="margin-top: 0.75rem;" onclick="switchTab('calendar')">Generate Festival Plan</button>
            </div>
          `;
        }
      }
    }

    if (metaRes.ok) {
      const metaData = await metaRes.json();
      const overviewEl = document.getElementById('metaAssetStatusOverview');
      if (overviewEl) {
        if (metaData.connected) {
          const acc = metaData.account;
          overviewEl.innerHTML = `
            <div style="display: flex; justify-content: space-between;"><span>Status:</span> <span class="status-pill status-published">CONNECTED</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Business:</span> <strong>${acc.businessName || 'Meta Portfolio'}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>Pages:</span> <span>${acc.pages?.length || 0} Active</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Instagram:</span> <span>${acc.instagramAccounts?.length || 0} Accounts</span></div>
          `;
        } else {
          overviewEl.innerHTML = `
            <p style="color: var(--text-muted);">No Meta Business Account connected.</p>
            <button class="btn btn-meta btn-sm" onclick="switchTab('meta-settings')"><i class="fa-brands fa-meta"></i> Connect Meta</button>
          `;
        }
      }
    }
  } catch (err) {
    console.error('Error loading command center:', err);
  }
}

// -------------------------------------------------------------
// 2. WHATSAPP CAMPAIGN PREFLIGHT AUDIT & LAUNCH
// -------------------------------------------------------------
async function openWhatsAppPreflightWizard() {
  resetPreflightModal();
  openModal('whatsappPreflightModal');

  // Load templates & segments
  const [tmplRes, segRes] = await Promise.all([
    fetch('/api/whatsapp/templates', { headers: getAuthHeaders() }),
    fetch('/api/social-marketing/segments', { headers: getAuthHeaders() })
  ]);

  if (tmplRes.ok) {
    const tData = await tmplRes.json();
    const select = document.getElementById('wfTemplateSelect');
    if (select) {
      select.innerHTML = (tData.templates || []).map(t => `<option value="${t.name}">Template: ${t.name} (${t.category})</option>`).join('');
    }
  }

  if (segRes.ok) {
    const sData = await segRes.json();
    const segSelect = document.getElementById('wfSegmentSelect');
    if (segSelect) {
      segSelect.innerHTML = (sData.segments || []).map(s => `<option value="${s._id}">${s.name} (${s.calculatedCount} contacts)</option>`).join('');
    }
  }
}

function togglePreflightAudienceSource() {
  const source = document.getElementById('wfAudienceSource').value;
  document.getElementById('wfCsvUploadGroup').style.display = source === 'CSV' ? 'block' : 'none';
  document.getElementById('wfSegmentSelectGroup').style.display = source === 'CRM_SEGMENT' ? 'block' : 'none';
}

function resetPreflightModal() {
  document.getElementById('preflightStep1').style.display = 'block';
  document.getElementById('preflightStep2').style.display = 'none';
  currentPreflightResult = null;
  currentPreflightPayload = null;
}

async function runWhatsAppPreflightAudit() {
  const campaignName = document.getElementById('wfCampaignName').value;
  const templateName = document.getElementById('wfTemplateSelect').value;
  const source = document.getElementById('wfAudienceSource').value;

  if (!campaignName || !templateName) {
    alert('Please enter campaign name and select template');
    return;
  }

  let contacts = [];
  if (source === 'CSV') {
    const text = document.getElementById('wfCsvTextInput').value;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert('Please paste CSV rows');
      return;
    }
    // Parse CSV lines
    const startIdx = lines[0].toLowerCase().includes('mobile') || lines[0].toLowerCase().includes('phone') ? 1 : 0;
    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts[0]) {
        contacts.push({ phone: parts[0], name: parts[1] || '', email: parts[2] || '' });
      }
    }
  } else {
    const segId = document.getElementById('wfSegmentSelect').value;
    if (!segId) {
      alert('Please select a CRM segment');
      return;
    }
    const segRes = await fetch(`/api/social-marketing/segments/${segId}/contacts`, { headers: getAuthHeaders() });
    if (segRes.ok) {
      const sData = await segRes.json();
      contacts = sData.contacts || [];
    }
  }

  try {
    const res = await fetch('/api/whatsapp/campaigns/preflight', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ contacts, templateName })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Preflight analysis failed');
      return;
    }

    const pf = data.preflight;
    currentPreflightResult = pf;
    currentPreflightPayload = { name: campaignName, templateName, contacts: pf.validRecipients };

    document.getElementById('pfTotalRecords').innerText = pf.summary.totalRecords.toLocaleString();
    document.getElementById('pfValidNumbers').innerText = pf.summary.validNumbers.toLocaleString();
    document.getElementById('pfInvalidNumbers').innerText = pf.summary.invalidNumbers.toLocaleString();
    document.getElementById('pfDuplicates').innerText = pf.summary.duplicateCount.toLocaleString();
    document.getElementById('pfMissingNames').innerText = pf.summary.missingNameCount.toLocaleString();
    document.getElementById('pfOptedOut').innerText = pf.summary.optedOutCount.toLocaleString();
    document.getElementById('pfEstimatedMessages').innerText = pf.summary.estimatedMessages.toLocaleString();
    document.getElementById('pfEstimatedCost').innerText = `₹${pf.financials.estimatedCost.toFixed(2)}`;
    document.getElementById('pfWalletBalance').innerText = `₹${pf.financials.walletBalance.toFixed(2)}`;

    const alertEl = document.getElementById('pfWalletAlert');
    const launchBtn = document.getElementById('pfLaunchButton');

    if (pf.financials.isWalletSufficient) {
      alertEl.innerHTML = `<div style="color: #10b981; font-size: 0.85rem; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Wallet balance is sufficient for this broadcast.</div>`;
      launchBtn.disabled = false;
      launchBtn.style.opacity = '1';
    } else {
      alertEl.innerHTML = `<div style="color: #ef4444; font-size: 0.85rem; font-weight: 600;"><i class="fa-solid fa-circle-exclamation"></i> Insufficient Wallet Balance. Deficit: ₹${pf.financials.balanceDeficit.toFixed(2)}. Please recharge wallet before launching.</div>`;
      launchBtn.disabled = true;
      launchBtn.style.opacity = '0.5';
    }

    document.getElementById('preflightStep1').style.display = 'none';
    document.getElementById('preflightStep2').style.display = 'block';
  } catch (err) {
    alert(err.message);
  }
}

function downloadInvalidCsvRows() {
  if (!currentPreflightResult || !currentPreflightResult.invalidRows || currentPreflightResult.invalidRows.length === 0) {
    alert('No invalid rows detected in preflight!');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,Row,Phone,Name,RejectionReason\n";
  currentPreflightResult.invalidRows.forEach(r => {
    csvContent += `${r.rowIndex},"${r.rawPhone}","${r.name}","${r.reason}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "whatsapp_campaign_preflight_errors.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function submitPreflightLaunch() {
  if (!currentPreflightPayload) return;

  try {
    const res = await fetch('/api/whatsapp/campaigns', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: currentPreflightPayload.name,
        templateName: currentPreflightPayload.templateName,
        audienceType: 'CSV_UPLOAD',
        csvContacts: currentPreflightPayload.contacts
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Campaign created and queued for broadcast!');
      closeModal('whatsappPreflightModal');
      switchTab('whatsapp');
    } else {
      alert(data.message || data.error || 'Failed to launch campaign');
    }
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// 3. CLOSED-LOOP CRM AUDIENCE SEGMENTATION
// -------------------------------------------------------------
async function loadCrmSegments() {
  try {
    const res = await fetch('/api/social-marketing/segments', { headers: getAuthHeaders() });
    if (!res.ok) return;

    const data = await res.json();
    const tbody = document.getElementById('segmentsTableBody');
    if (!tbody) return;

    if (!data.segments || data.segments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No dynamic customer cohorts created yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.segments.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td><span class="status-pill status-draft">${s.targetEntity}</span></td>
        <td>${s.filterCriteria?.city?.join(', ') || 'All Locations'}</td>
        <td><strong style="color: #10b981;">${s.calculatedCount} Contacts</strong></td>
        <td>${new Date(s.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-whatsapp btn-sm" onclick="openWhatsAppPreflightWizard()"><i class="fa-brands fa-whatsapp"></i> Broadcast</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading CRM segments:', err);
  }
}

function openCreateSegmentModal() {
  openModal('createSegmentModal');
}

async function submitCreateSegment() {
  const name = document.getElementById('segName').value;
  const targetEntity = document.getElementById('segEntity').value;
  const citiesText = document.getElementById('segCities').value;
  const cities = citiesText.split(',').map(c => c.trim()).filter(Boolean);

  if (!name) {
    alert('Please enter cohort name');
    return;
  }

  try {
    const res = await fetch('/api/social-marketing/segments', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        targetEntity,
        filterCriteria: { city: cities }
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert(`Cohort created with ${data.totalCount} eligible CRM contacts!`);
      closeModal('createSegmentModal');
      loadCrmSegments();
    } else {
      alert(data.error || 'Failed to create segment');
    }
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// 4. META ADS PREFLIGHT WIZARD
// -------------------------------------------------------------
function openMetaAdsWizard() {
  openModal('metaAdsWizardModal');
}

async function runMetaAdsPreflight() {
  const name = document.getElementById('metaAdName').value;
  const objective = document.getElementById('metaAdObjective').value;
  const dailyBudget = Number(document.getElementById('metaAdDailyBudget').value);
  const durationDays = Number(document.getElementById('metaAdDurationDays').value);

  if (!name) {
    alert('Please enter campaign name');
    return;
  }

  try {
    const res = await fetch('/api/social-marketing/ads/preflight', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, objective, budgetAmount: dailyBudget, durationDays })
    });

    const data = await res.json();
    if (res.ok) {
      const pf = data.preflight;
      document.getElementById('metaPfTotalSpend').innerText = `₹${pf.budget.totalBudget.toLocaleString()}`;
      document.getElementById('metaPfDailyReach').innerText = pf.estimates.dailyReachRange;
      document.getElementById('metaPfLeads').innerText = pf.estimates.estimatedLeadsRange;
      document.getElementById('metaAdsPreflightResult').style.display = 'block';
    } else {
      alert(data.error || 'Meta Ads preflight failed');
    }
  } catch (err) {
    alert(err.message);
  }
}

async function submitLaunchMetaAd() {
  const name = document.getElementById('metaAdName').value;
  const objective = document.getElementById('metaAdObjective').value;
  const budgetAmount = Number(document.getElementById('metaAdDailyBudget').value);

  if (!name) {
    alert('Please enter campaign name');
    return;
  }

  try {
    const res = await fetch('/api/social-marketing/ads/campaigns', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, objective, budgetAmount, budgetType: 'DAILY' })
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Meta Ad Campaign submitted successfully!');
      closeModal('metaAdsWizardModal');
      switchTab('meta-ads');
    } else {
      alert(data.error || 'Failed to launch Meta Ad');
    }
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// 5. INTEGRATION DIAGNOSTICS
// -------------------------------------------------------------
async function openDiagnosticsModal() {
  openModal('integrationDiagnosticsModal');
  const outEl = document.getElementById('diagnosticsOutput');
  outEl.innerHTML = '<p><i class="fa-solid fa-spinner fa-spin"></i> Running diagnostic health checks against Meta Graph API...</p>';

  try {
    const res = await fetch('/api/social-marketing/diagnostics/health', { headers: getAuthHeaders() });
    const data = await res.json();

    if (res.ok) {
      const d = data.diagnostics;
      outEl.innerHTML = `
        <div style="margin-bottom: 1.25rem; background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <h4 style="color: #60a5fa; margin-bottom: 0.5rem;"><i class="fa-brands fa-meta"></i> Meta Business Graph API</h4>
          <div><strong>Token Health:</strong> <span class="status-pill status-published">${d.meta.tokenHealth}</span></div>
          <div style="margin-top: 0.35rem;"><strong>Verified Permissions:</strong> ${d.meta.permissionsVerified.join(', ') || 'None'}</div>
        </div>

        <div style="background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <h4 style="color: #25d366; margin-bottom: 0.5rem;"><i class="fa-brands fa-whatsapp"></i> WhatsApp Cloud API</h4>
          <div><strong>Phone Status:</strong> <span class="status-pill status-published">${d.whatsApp.phoneStatus}</span></div>
          <div style="margin-top: 0.35rem;"><strong>WABA Quality Rating:</strong> ${d.whatsApp.wabaStatus}</div>
          <div style="margin-top: 0.35rem;"><strong>Webhook SHA-256 Signature Verification:</strong> <span style="color: #10b981;">ACTIVE</span></div>
        </div>
      `;
    } else {
      outEl.innerText = data.error || 'Diagnostics check failed';
    }
  } catch (err) {
    outEl.innerText = err.message;
  }
}

// -------------------------------------------------------------
// HELPER TAB LOADERS
// -------------------------------------------------------------
async function loadWhatsAppHub() {
  try {
    const [accRes, contactsRes, tmplRes, campRes] = await Promise.all([
      fetch('/api/whatsapp/account', { headers: getAuthHeaders() }),
      fetch('/api/whatsapp/contacts', { headers: getAuthHeaders() }),
      fetch('/api/whatsapp/templates', { headers: getAuthHeaders() }),
      fetch('/api/whatsapp/campaigns', { headers: getAuthHeaders() })
    ]);

    if (accRes.ok) {
      const accData = await accRes.json();
      const balEl = document.getElementById('waWalletBalance');
      if (balEl) balEl.innerText = `₹${(accData.walletBalance || 0).toFixed(2)}`;
    }
    if (contactsRes.ok) {
      const cData = await contactsRes.json();
      const cEl = document.getElementById('waContactsCount');
      if (cEl) cEl.innerText = (cData.total || cData.contacts?.length || 0).toLocaleString();
    }
    if (tmplRes.ok) {
      const tData = await tmplRes.json();
      const tEl = document.getElementById('waTemplatesCount');
      if (tEl) tEl.innerText = (tData.templates?.length || 0).toLocaleString();
    }
    if (campRes.ok) {
      const campData = await campRes.json();
      const tbody = document.getElementById('waCampaignsTableBody');
      if (tbody && campData.campaigns) {
        tbody.innerHTML = campData.campaigns.map(c => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.templateName || 'Template'}</td>
            <td>${c.stats?.totalRecipients || 0}</td>
            <td>${c.stats?.sentCount || 0} / ${c.stats?.deliveredCount || 0} / ${c.stats?.readCount || 0}</td>
            <td>₹${(c.estimatedCost || 0).toFixed(2)}</td>
            <td><span class="status-pill status-${c.status.toLowerCase()}">${c.status}</span></td>
            <td><button class="btn btn-secondary btn-sm" onclick="location.href='/whatsapp-campaigns.html'">View</button></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Error in loadWhatsAppHub:', err);
  }
}

async function loadSocialPosts() {
  try {
    const res = await fetch('/api/social-marketing/posts', { headers: getAuthHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('socialPostsTableBody');
    if (tbody && data.posts) {
      tbody.innerHTML = data.posts.map(p => `
        <tr>
          <td><strong>${p.title}</strong><br><small style="color: var(--text-muted);">${p.caption?.substring(0, 40)}...</small></td>
          <td><span class="status-pill status-draft">${p.postType}</span></td>
          <td>${p.platforms.join(', ')}</td>
          <td>${p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : 'Draft'}</td>
          <td>❤️ ${p.metrics?.likes || 0}</td>
          <td><span class="status-pill status-${p.status.toLowerCase()}">${p.status}</span></td>
          <td><button class="btn btn-primary btn-sm" onclick="publishSocialPost('${p._id}')">Publish</button></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadMetaAds() {
  try {
    const res = await fetch('/api/social-marketing/ads/campaigns', { headers: getAuthHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('metaAdsTableBody');
    if (tbody && data.campaigns) {
      tbody.innerHTML = data.campaigns.map(ad => `
        <tr>
          <td><strong>${ad.name}</strong></td>
          <td>${ad.objective.replace('OUTCOME_', '')}</td>
          <td>₹${ad.budgetAmount}/day</td>
          <td>₹${ad.insights?.spend || 0} / ${ad.insights?.impressions || 0}</td>
          <td><strong>${ad.insights?.leads || 0}</strong></td>
          <td><span class="status-pill status-${ad.status.toLowerCase()}">${ad.status}</span></td>
          <td><button class="btn btn-secondary btn-sm">View</button></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadContentAssets() {
  try {
    const res = await fetch('/api/social-marketing/content/assets', { headers: getAuthHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const grid = document.getElementById('contentAssetsGrid');
    if (grid && data.assets) {
      grid.innerHTML = data.assets.map(a => `
        <div style="background: #0f172a; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
          <img src="${a.thumbnailUrl || a.url}" style="width: 100%; height: 120px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300'">
          <div style="padding: 0.5rem; font-size: 0.8rem; font-weight: 600;">${a.title}</div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadMarketingCalendar() {
  try {
    const [eventsRes, holidaysRes] = await Promise.all([
      fetch('/api/social-marketing/calendar/events', { headers: getAuthHeaders() }),
      fetch('/api/social-marketing/calendar/holidays', { headers: getAuthHeaders() })
    ]);
    if (eventsRes.ok) {
      const data = await eventsRes.json();
      const container = document.getElementById('calendarGridContainer');
      if (container) {
        container.innerHTML = (data.events || []).slice(0, 14).map(e => `
          <div style="background: #0f172a; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem; font-size: 0.75rem;">
            <strong>${e.title}</strong>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function generateAiMarketingCopy() {
  const topic = document.getElementById('aiTopic').value;
  const offerDetails = document.getElementById('aiOffer').value;
  const outEl = document.getElementById('aiGeneratedOutput');
  if (!topic) return;

  outEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating copy with Charlie AI...';
  try {
    const res = await fetch('/api/social-marketing/ai/multi-channel', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ topic, offerDetails })
    });
    const data = await res.json();
    if (res.ok) {
      outEl.innerText = data.variations?.instagramPost?.caption || 'Done!';
    }
  } catch (err) {
    outEl.innerText = err.message;
  }
}

async function loadApprovals() {
  try {
    const res = await fetch('/api/social-marketing/approvals/pending', { headers: getAuthHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('approvalsTableBody');
    if (tbody && data.approvals) {
      tbody.innerHTML = data.approvals.map(a => `
        <tr>
          <td><strong>${a.itemTitle}</strong></td>
          <td>${a.itemType}</td>
          <td>${a.requestedBy?.name || 'User'}</td>
          <td>${a.estimatedBudget ? `₹${a.estimatedBudget}` : '-'}</td>
          <td>${new Date(a.requestedAt).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="approveSubmission('${a._id}')">Approve</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadMetaSettings() {}
async function connectMetaDirectToken() {
  const token = document.getElementById('metaDirectTokenInput').value;
  if (!token) return;
  const res = await fetch('/api/social-marketing/meta/connect', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ accessToken: token })
  });
  if (res.ok) alert('Meta connected!');
}
