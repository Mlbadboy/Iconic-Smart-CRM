// Charlie's Marketing Command Center Controller

const TOKEN_KEY = 'token';
let currentTenantConfig = null;

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
// INITIALIZATION & COMMERCIAL FEATURE GATE ENFORCEMENT
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

    // Dynamically enforce commercial feature visibility on sidebar navigation
    if (features.marketing === false) {
      alert('Marketing Platform is currently disabled by Super Admin for this company.');
      window.location.href = '/dashboard.html';
      return;
    }

    // Hide tabs if commercially disabled by Super Admin
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
            <div style="display: flex; justify-content: space-between;"><span>Ad Accounts:</span> <span>${acc.adAccounts?.length || 0} Connected</span></div>
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
// 2. WHATSAPP HUB
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
      if (tbody) {
        if (campData.campaigns && campData.campaigns.length > 0) {
          tbody.innerHTML = campData.campaigns.map(c => `
            <tr>
              <td><strong>${c.name}</strong></td>
              <td>${c.templateName || 'Template'}</td>
              <td>${c.stats?.totalRecipients || 0}</td>
              <td>${c.stats?.sentCount || 0} / ${c.stats?.deliveredCount || 0} / ${c.stats?.readCount || 0}</td>
              <td>₹${(c.estimatedCost || 0).toFixed(2)}</td>
              <td><span class="status-pill status-${c.status.toLowerCase()}">${c.status}</span></td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="location.href='/whatsapp-campaigns.html'">View</button>
              </td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.error('Error loading WhatsApp hub:', err);
  }
}

// -------------------------------------------------------------
// 3. SOCIAL POSTS & REELS
// -------------------------------------------------------------
async function loadSocialPosts() {
  try {
    const res = await fetch('/api/social-marketing/posts', { headers: getAuthHeaders() });
    if (!res.ok) return;

    const data = await res.json();
    const tbody = document.getElementById('socialPostsTableBody');
    if (!tbody) return;

    if (!data.posts || data.posts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No posts or reels created yet. Click "Create Post / Reel" to begin.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.posts.map(p => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${p.mediaUrls?.[0]?.url ? `<img src="${p.mediaUrls[0].url}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">` : `<div style="width: 44px; height: 44px; background: #334155; border-radius: 6px; display: flex; align-items: center; justify-content: center;"><i class="fa-regular fa-image"></i></div>`}
            <div>
              <strong>${p.title}</strong>
              <p style="font-size: 0.75rem; color: var(--text-muted); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.caption}</p>
            </div>
          </div>
        </td>
        <td><span class="status-pill status-draft">${p.postType}</span></td>
        <td>${p.platforms.map(plat => plat === 'INSTAGRAM' ? '<i class="fa-brands fa-instagram" style="color: #ec4899;"></i>' : '<i class="fa-brands fa-facebook" style="color: #3b82f6;"></i>').join(' ')}</td>
        <td>${p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : (p.scheduledAt ? `Scheduled: ${new Date(p.scheduledAt).toLocaleDateString()}` : 'Draft')}</td>
        <td>❤️ ${p.metrics?.likes || 0} • 💬 ${p.metrics?.comments || 0}</td>
        <td><span class="status-pill status-${p.status.toLowerCase()}">${p.status}</span></td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            ${p.status === 'DRAFT' || p.status === 'APPROVED' ? `<button class="btn btn-primary btn-sm" onclick="publishSocialPost('${p._id}')">Publish</button>` : ''}
            ${p.status === 'PUBLISHED' ? `<button class="btn btn-meta btn-sm" onclick="boostSocialPost('${p._id}')"><i class="fa-solid fa-rocket"></i> Boost</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading social posts:', err);
  }
}

function openNewPostModal() {
  openModal('createPostModal');
}

async function submitCreatePost() {
  const postType = document.getElementById('postTypeSelect').value;
  const caption = document.getElementById('postCaptionInput').value;
  const mediaUrl = document.getElementById('postMediaUrlInput').value;
  const scheduledAt = document.getElementById('postScheduleInput').value;

  const platforms = [];
  if (document.getElementById('postPlatformInstagram').checked) platforms.push('INSTAGRAM');
  if (document.getElementById('postPlatformFacebook').checked) platforms.push('FACEBOOK');

  if (!caption) {
    alert('Please enter a caption');
    return;
  }

  try {
    const res = await fetch('/api/social-marketing/posts', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: `${postType} - ${new Date().toLocaleDateString()}`,
        postType,
        platforms,
        caption,
        mediaUrls: mediaUrl ? [{ url: mediaUrl, mediaType: postType === 'REEL' ? 'VIDEO' : 'IMAGE' }] : [],
        scheduledAt: scheduledAt || null
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Post saved successfully!');
      closeModal('createPostModal');
      loadSocialPosts();
    } else {
      alert(data.error || 'Failed to create post');
    }
  } catch (err) {
    alert(err.message);
  }
}

async function publishSocialPost(postId) {
  if (!confirm('Are you sure you want to publish this post to connected social channels now?')) return;
  try {
    const res = await fetch(`/api/social-marketing/posts/${postId}/publish`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (res.ok) {
      alert('Post published successfully!');
      loadSocialPosts();
    } else {
      alert(data.error || 'Failed to publish post');
    }
  } catch (err) {
    alert(err.message);
  }
}

async function boostSocialPost(postId) {
  const budget = prompt('Enter daily budget in INR for boosting this post:', '500');
  if (!budget) return;

  try {
    const res = await fetch(`/api/social-marketing/posts/${postId}/boost`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dailyBudget: Number(budget), durationDays: 7 })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Boost campaign created!');
      loadSocialPosts();
    } else {
      alert(data.error || 'Failed to boost post');
    }
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// 4. META ADS MANAGER
// -------------------------------------------------------------
async function loadMetaAds() {
  try {
    const res = await fetch('/api/social-marketing/ads/campaigns', { headers: getAuthHeaders() });
    if (!res.ok) return;

    const data = await res.json();
    const tbody = document.getElementById('metaAdsTableBody');
    if (!tbody) return;

    if (!data.campaigns || data.campaigns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No paid Meta campaigns active.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.campaigns.map(ad => `
      <tr>
        <td><strong>${ad.name}</strong></td>
        <td>${ad.objective.replace('OUTCOME_', '')}</td>
        <td>₹${ad.budgetAmount}/day</td>
        <td>₹${ad.insights?.spend || 0} / ${ad.insights?.impressions || 0} / ${ad.insights?.clicks || 0}</td>
        <td><strong>${ad.insights?.leads || 0}</strong></td>
        <td><span class="status-pill status-${ad.status.toLowerCase()}">${ad.status}</span></td>
        <td><button class="btn btn-secondary btn-sm">View</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading Meta ads:', err);
  }
}

// -------------------------------------------------------------
// 5. CONTENT STUDIO
// -------------------------------------------------------------
async function loadContentAssets() {
  try {
    const search = document.getElementById('assetSearchInput')?.value || '';
    const res = await fetch(`/api/social-marketing/content/assets?search=${encodeURIComponent(search)}`, { headers: getAuthHeaders() });
    if (!res.ok) return;

    const data = await res.json();
    const grid = document.getElementById('contentAssetsGrid');
    if (!grid) return;

    if (!data.assets || data.assets.length === 0) {
      grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 2rem;">No assets uploaded yet.</p>`;
      return;
    }

    grid.innerHTML = data.assets.map(a => `
      <div class="asset-card">
        <img src="${a.thumbnailUrl || a.url}" class="asset-thumb" onerror="this.src='https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300'">
        <div class="asset-info">
          <div class="asset-title">${a.title}</div>
          <span style="font-size: 0.7rem; color: var(--text-muted);">${a.category || 'General'}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading content assets:', err);
  }
}

// -------------------------------------------------------------
// 6. MARKETING CALENDAR & FESTIVAL PLANNER
// -------------------------------------------------------------
async function loadMarketingCalendar() {
  try {
    const [eventsRes, holidaysRes] = await Promise.all([
      fetch('/api/social-marketing/calendar/events', { headers: getAuthHeaders() }),
      fetch('/api/social-marketing/calendar/holidays', { headers: getAuthHeaders() })
    ]);

    if (eventsRes.ok) {
      const data = await eventsRes.json();
      renderCalendarDays(data.events || []);
    }

    if (holidaysRes.ok) {
      const hData = await holidaysRes.json();
      const select = document.getElementById('holidaySelectDropdown');
      if (select) {
        select.innerHTML = hData.holidays.map(h => `
          <option value="${h._id}">🪔 ${h.name} (${h.category})</option>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Error loading calendar:', err);
  }
}

function renderCalendarDays(events) {
  const container = document.getElementById('calendarGridContainer');
  if (!container) return;

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let html = daysOfWeek.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

  // Render 35 day slots for month
  const now = new Date();
  for (let i = 1; i <= 31; i++) {
    const dayEvents = events.filter(e => {
      const d = new Date(e.date);
      return d.getDate() === i;
    });

    html += `
      <div class="calendar-day ${i === now.getDate() ? 'today' : ''}">
        <div class="day-number">${i}</div>
        ${dayEvents.map(e => `
          <span class="calendar-badge ${e.type === 'HOLIDAY' ? 'badge-holiday' : (e.type === 'REEL' || e.type === 'POST' ? 'badge-post' : (e.type === 'META_AD' ? 'badge-ad' : 'badge-wa'))}" title="${e.title}">
            ${e.title}
          </span>
        `).join('')}
      </div>
    `;
  }
  container.innerHTML = html;
}

function openHolidayCampaignModal() {
  openModal('holidayCampaignModal');
}

async function submitGenerateHolidayCampaign() {
  const holidayId = document.getElementById('holidaySelectDropdown').value;
  const totalBudget = document.getElementById('holidayCampaignBudget').value;

  if (!holidayId) {
    alert('Please select a holiday');
    return;
  }

  try {
    const res = await fetch('/api/social-marketing/calendar/generate-campaign', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ holidayId, totalBudget: Number(totalBudget) })
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Omnichannel campaign generated successfully!');
      closeModal('holidayCampaignModal');
      loadMarketingCalendar();
    } else {
      alert(data.error || 'Failed to generate plan');
    }
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// 7. CHARLIE AI MARKETING ASSISTANT
// -------------------------------------------------------------
async function generateAiMarketingCopy() {
  const topic = document.getElementById('aiTopic').value;
  const offerDetails = document.getElementById('aiOffer').value;
  const tone = document.getElementById('aiTone').value;
  const outputEl = document.getElementById('aiGeneratedOutput');

  if (!topic) {
    alert('Please enter a campaign topic');
    return;
  }

  outputEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating tailored copy with Charlie AI...';

  try {
    const res = await fetch('/api/social-marketing/ai/multi-channel', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ topic, offerDetails, tone })
    });

    const data = await res.json();
    if (res.ok) {
      const v = data.variations;
      outputEl.innerHTML = `
        <div style="margin-bottom: 1.25rem;">
          <strong style="color: #ec4899;"><i class="fa-brands fa-instagram"></i> Instagram Post / Reel:</strong>
          <p style="margin-top: 0.35rem;">${v.instagramPost.caption}</p>
        </div>
        <div style="margin-bottom: 1.25rem;">
          <strong style="color: #3b82f6;"><i class="fa-brands fa-facebook"></i> Facebook Page Post:</strong>
          <p style="margin-top: 0.35rem;">${v.facebookPost.caption}</p>
        </div>
        <div style="margin-bottom: 1.25rem;">
          <strong style="color: #25d366;"><i class="fa-brands fa-whatsapp"></i> WhatsApp VIP Broadcast:</strong>
          <p style="margin-top: 0.35rem;">${v.whatsAppBroadcast.caption}</p>
        </div>
        <div>
          <strong style="color: #f59e0b;"><i class="fa-solid fa-bullseye"></i> Meta Performance Ad Copy:</strong>
          <p style="margin-top: 0.35rem;">${v.metaAdCopy.caption}</p>
        </div>
      `;
    } else {
      outputEl.innerText = data.error || 'Failed to generate AI copy';
    }
  } catch (err) {
    outputEl.innerText = err.message;
  }
}

// -------------------------------------------------------------
// 8. APPROVALS QUEUE
// -------------------------------------------------------------
async function loadApprovals() {
  try {
    const res = await fetch('/api/social-marketing/approvals/pending', { headers: getAuthHeaders() });
    if (!res.ok) return;

    const data = await res.json();
    const tbody = document.getElementById('approvalsTableBody');
    const badge = document.getElementById('pendingApprovalsBadge');

    if (badge) {
      if (data.count > 0) {
        badge.innerText = data.count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    if (!tbody) return;

    if (!data.approvals || data.approvals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No pending approvals in queue.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.approvals.map(a => `
      <tr>
        <td><strong>${a.itemTitle}</strong></td>
        <td><span class="status-pill status-pending">${a.itemType}</span></td>
        <td>${a.requestedBy?.name || 'Executive'} (${a.requestedBy?.role || 'User'})</td>
        <td>${a.estimatedBudget ? `₹${a.estimatedBudget}` : 'N/A'}</td>
        <td>${new Date(a.requestedAt).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="approveSubmission('${a._id}')">Approve</button>
          <button class="btn btn-danger btn-sm" onclick="rejectSubmission('${a._id}')">Reject</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading approvals:', err);
  }
}

async function approveSubmission(id) {
  try {
    const res = await fetch(`/api/social-marketing/approvals/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes: 'Approved by Manager' })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Approved successfully!');
      loadApprovals();
    } else {
      alert(data.error || 'Failed to approve');
    }
  } catch (err) {
    alert(err.message);
  }
}

async function rejectSubmission(id) {
  const reason = prompt('Enter reason for rejection:');
  if (!reason) return;

  try {
    const res = await fetch(`/api/social-marketing/approvals/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Rejected');
      loadApprovals();
    } else {
      alert(data.error || 'Failed to reject');
    }
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// 9. META CONNECTION
// -------------------------------------------------------------
async function loadMetaSettings() {
  try {
    const res = await fetch('/api/social-marketing/meta/assets', { headers: getAuthHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    // Pre-populate connection UI if already connected
  } catch (err) {
    console.error('Error loading meta settings:', err);
  }
}

async function connectMetaDirectToken() {
  const token = document.getElementById('metaDirectTokenInput').value;
  if (!token) {
    alert('Please enter a Meta Access Token');
    return;
  }

  try {
    const res = await fetch('/api/social-marketing/meta/connect', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ accessToken: token })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Meta Business Account connected successfully!');
      switchTab('command-center');
    } else {
      alert(data.error || 'Failed to connect Meta account');
    }
  } catch (err) {
    alert(err.message);
  }
}

async function startMetaOAuth() {
  try {
    const res = await fetch('/api/social-marketing/meta/auth-url', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.authUrl) {
      window.location.href = data.authUrl;
    }
  } catch (err) {
    alert(err.message);
  }
}
