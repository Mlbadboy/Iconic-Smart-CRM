/**
 * Charlie's CRM — Super Admin Notifications JavaScript Logic
 */
let notificationsList = [];

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    loadNotifications();
});

async function loadNotifications() {
    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch('/api/notifications/platform', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load notifications');

        notificationsList = await res.json();
        renderTable();
    } catch (err) {
        console.error('Error loading notifications:', err);
    }
}

function renderTable() {
    const tbody = document.getElementById('notificationsTableBody');
    if (!notificationsList.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No announcements published yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = notificationsList.map(n => {
        const startStr = n.startTime ? new Date(n.startTime).toLocaleString() : 'Immediate';
        const endStr = n.endTime ? new Date(n.endTime).toLocaleString() : 'Ongoing';

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(n.title)}</strong><br>
                    <small style="color: var(--text-muted);">${escapeHtml(n.message)}</small>
                </td>
                <td><code style="background: #334155; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${n.type}</code></td>
                <td><span style="font-size: 0.85rem; font-weight: 600;">${n.priority}</span></td>
                <td><span style="font-size: 0.85rem; color: #818cf8;">${n.audience}</span></td>
                <td><span style="font-size: 0.8rem; color: var(--text-muted);">${startStr} → ${endStr}</span></td>
                <td><span style="font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: ${n.status === 'PUBLISHED' ? '#065f46' : '#334155'}; color: #ffffff;">${n.status}</span></td>
                <td style="text-align: right;">
                    <button class="btn btn-sm" onclick="archiveNotification('${n._id}')">
                        📦 Archive
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openCreateModal() {
    document.getElementById('notifForm').reset();
    document.getElementById('createModal').classList.add('show');
}

function closeModal() {
    document.getElementById('createModal').classList.remove('show');
}

async function createNotification(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');

    const title = document.getElementById('notifTitle').value;
    const message = document.getElementById('notifMessage').value;
    const type = document.getElementById('notifType').value;
    const priority = document.getElementById('notifPriority').value;
    const audience = document.getElementById('notifAudience').value;
    const startTimeVal = document.getElementById('notifStartTime').value;

    try {
        const res = await fetch('/api/notifications/platform', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                message,
                type,
                priority,
                audience,
                startTime: startTimeVal || new Date().toISOString(),
                status: 'PUBLISHED'
            })
        });
        if (!res.ok) throw new Error('Failed to create notification');

        closeModal();
        loadNotifications();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function archiveNotification(id) {
    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch(`/api/notifications/platform/${id}/archive`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to archive notification');
        loadNotifications();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
