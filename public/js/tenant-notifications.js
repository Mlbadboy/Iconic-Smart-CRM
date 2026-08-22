/**
 * Charlie's CRM — Tenant Notification & Announcement Client Widget
 */
(function() {
    if (window.__CHARLIE_NOTIFICATIONS_INITIALIZED) return;
    window.__CHARLIE_NOTIFICATIONS_INITIALIZED = true;

    let tenantNotifications = [];
    let activeNotifPromise = null;
    let pollInterval = null;

    async function loadTenantNotifications() {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        if (activeNotifPromise) return activeNotifPromise;

        activeNotifPromise = (async () => {
            try {
                const res = await fetch('/api/notifications/tenant', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) return;

                const data = await res.json();
                tenantNotifications = data.notifications || [];

                // 1. Render Top Maintenance Banner if active
                if (data.activeMaintenance && !sessionStorage.getItem(`dismiss_maint_${data.activeMaintenance.id}`)) {
                    renderMaintenanceBanner(data.activeMaintenance);
                }

                // 2. Update Bell Badge
                updateBellBadge(data.unreadCount || 0);
            } catch (err) {
                console.warn('Notice loading notifications:', err.message);
            } finally {
                activeNotifPromise = null;
            }
        })();

        return activeNotifPromise;
    }

    function renderMaintenanceBanner(maint) {
        let banner = document.getElementById('platformMaintenanceBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'platformMaintenanceBanner';
            banner.style.cssText = `
                background: #78350f;
                color: #fef3c7;
                padding: 0.75rem 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.9rem;
                border-bottom: 1px solid #92400e;
                position: sticky;
                top: 0;
                z-index: 9999;
            `;
            document.body.prepend(banner);
        }

        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.2rem;">⚠️</span>
                <div>
                    <strong>${escapeHtml(maint.title)}:</strong> ${escapeHtml(maint.message)}
                </div>
            </div>
            <button onclick="dismissMaintenanceBanner('${maint.id}')" style="background: none; border: none; color: #fde68a; cursor: pointer; font-size: 1.1rem;">✕</button>
        `;
    }

    window.dismissMaintenanceBanner = function(id) {
        sessionStorage.setItem(`dismiss_maint_${id}`, 'true');
        const banner = document.getElementById('platformMaintenanceBanner');
        if (banner) banner.remove();
    };

    function updateBellBadge(unreadCount) {
        const badge = document.getElementById('notifUnreadBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    window.markNotificationRead = async function(id) {
        const token = localStorage.getItem('authToken');
        try {
            await fetch(`/api/notifications/tenant/${id}/read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadTenantNotifications();
        } catch (e) {}
    };

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Initialize on DOM ready and establish gentle 5-minute polling interval
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadTenantNotifications();
            if (!pollInterval) pollInterval = setInterval(loadTenantNotifications, 5 * 60 * 1000);
        });
    } else {
        loadTenantNotifications();
        if (!pollInterval) pollInterval = setInterval(loadTenantNotifications, 5 * 60 * 1000);
    }

    window.addEventListener('beforeunload', () => {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    });
})();
