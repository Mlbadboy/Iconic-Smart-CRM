/**
 * Charlie's CRM — Authoritative Frontend Feature Entitlement & RBAC Guard
 * 
 * Synchronizes real-time company feature entitlements with Super Admin configuration.
 * Authoritative source: Database -> GET /api/tenant/entitlements
 */

// Single central in-memory feature state object
window.CURRENT_TENANT_STATE = window.CURRENT_TENANT_STATE || {
    companyId: null,
    companyName: null,
    subdomain: null,
    status: 'ACTIVE',
    plan: 'STARTER',
    features: {
        dashboard: true,
        sales: true,
        customers: true,
        orders: true,
        products: true,
        inventory: true,
        distribution: true,
        serial_validation: true,
        qr_verification: true,
        service: true,
        warranty: true,
        marketing: true,
        finance: true,
        field_force: true,
        logistics: true,
        reports: true,
        api_access: true,
        analytics: true,
        bulk_import: true
    },
    entitlementUpdatedAt: null,
    isLoaded: false
};

// All 19 Features Definition & Route/UI Mapping
const FEATURE_URL_MAP = {
    'dashboard': ['/dashboard.html', 'dashboard.html'],
    'sales': ['/leads.html', 'leads.html'],
    'customers': ['/retailers.html', '/contacts.html', 'retailers.html', 'contacts.html'],
    'orders': ['/orders.html', '/view-orders.html', 'orders.html', 'view-orders.html'],
    'products': ['/manage-products.html', 'manage-products.html'],
    'inventory': ['/manage-products.html#inventory', 'manage-products.html#inventory'],
    'distribution': ['/deliveries.html#transfers', 'deliveries.html#transfers'],
    'serial_validation': ['/serial-validation.html', 'serial-validation.html'],
    'qr_verification': ['/serial-validation.html#qr', 'serial-validation.html#qr'],
    'service': ['/services.html', '/create-service-request.html', '/service-centers.html', 'services.html', 'create-service-request.html', 'service-centers.html'],
    'warranty': ['/services.html#warranty', 'services.html#warranty'],
    'marketing': ['/marketing.html', 'marketing.html'],
    'finance': ['/orders.html#invoices', 'invoices'],
    'field_force': ['/beat-tracker.html', 'beat-tracker.html'],
    'logistics': ['/deliveries.html', 'deliveries.html'],
    'reports': ['/reports.html', 'reports.html'],
    'api_access': ['/api-access.html', '/api-access-usage.html', 'api-access.html', 'api-access-usage.html'],
    'analytics': ['/platform-analytics.html', 'platform-analytics.html'],
    'bulk_import': ['/bulk-import.html', 'bulk-import.html']
};

// Single-flight in-flight request deduplication
let activeEntitlementsPromise = null;

function handleSessionExpiration() {
    if (window.__CHARLIE_SESSION_REDIRECTING) return;
    window.__CHARLIE_SESSION_REDIRECTING = true;
    localStorage.removeItem('authToken');
    if (!window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html';
    }
}

/**
 * Fetch Fresh Entitlements from Authoritative Database API (Deduplicated Single-Flight)
 */
async function fetchTenantEntitlements(forceFresh = false) {
    const token = localStorage.getItem('authToken');
    if (!token) return window.CURRENT_TENANT_STATE;

    // If an entitlement fetch is currently in flight, return the existing promise
    if (activeEntitlementsPromise) {
        return activeEntitlementsPromise;
    }

    // If already loaded and not explicitly forcing fresh network sync, return in-memory state
    if (window.CURRENT_TENANT_STATE && window.CURRENT_TENANT_STATE.isLoaded && !forceFresh) {
        applyFeatureVisibility();
        return window.CURRENT_TENANT_STATE;
    }

    activeEntitlementsPromise = (async () => {
        try {
            const cacheBuster = forceFresh ? `?_t=${Date.now()}` : '';
            const res = await fetch(`/api/tenant/entitlements${cacheBuster}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });

            if (res.status === 401) {
                handleSessionExpiration();
                return window.CURRENT_TENANT_STATE;
            }

            if (res.status === 403) {
                const err = await res.json().catch(() => ({}));
                if (err.code === 'TENANT_SUSPENDED') {
                    sessionStorage.setItem('suspensionReason', err.reason || 'Subscription inactive');
                    if (!window.location.pathname.includes('tenant-suspended.html') && !window.location.pathname.includes('super-admin')) {
                        window.location.href = '/tenant-suspended.html';
                        return window.CURRENT_TENANT_STATE;
                    }
                }
            }

            if (res.ok) {
                const data = await res.json();
                window.CURRENT_TENANT_STATE = {
                    companyId: data.companyId || null,
                    companyName: data.name || null,
                    subdomain: data.subdomain || null,
                    status: data.status || 'ACTIVE',
                    plan: data.plan || 'STARTER',
                    features: Object.assign({}, window.CURRENT_TENANT_STATE.features, data.features || {}),
                    entitlementUpdatedAt: data.entitlementUpdatedAt || new Date().toISOString(),
                    isLoaded: true
                };

                // Check if suspended
                if (data.status === 'SUSPENDED' && !window.location.pathname.includes('tenant-suspended.html') && !window.location.pathname.includes('super-admin')) {
                    sessionStorage.setItem('suspensionReason', data.suspensionReason || 'Subscription inactive');
                    window.location.href = '/tenant-suspended.html';
                    return window.CURRENT_TENANT_STATE;
                }

                // Apply to DOM
                applyFeatureVisibility();

                // Dispatch global event for other components
                window.dispatchEvent(new CustomEvent('tenant-entitlements-loaded', { detail: window.CURRENT_TENANT_STATE }));
            }
        } catch (err) {
            console.warn('Feature guard entitlement fetch notice:', err.message);
        } finally {
            activeEntitlementsPromise = null;
        }

        return window.CURRENT_TENANT_STATE;
    })();

    return activeEntitlementsPromise;
}

/**
 * Check if a specific feature is enabled for the current company
 */
function featureEnabled(featureKey) {
    if (!window.CURRENT_TENANT_STATE || !window.CURRENT_TENANT_STATE.features) return true;
    return window.CURRENT_TENANT_STATE.features[featureKey] !== false;
}

/**
 * Apply feature visibility rules to navigation, action cards, and UI elements
 */
function applyFeatureVisibility() {
    if (!window.CURRENT_TENANT_STATE || !window.CURRENT_TENANT_STATE.features) return;
    const features = window.CURRENT_TENANT_STATE.features;

    // 1. Scan and apply to all explicit [data-feature] elements
    document.querySelectorAll('[data-feature]').forEach(el => {
        const feat = el.getAttribute('data-feature');
        if (feat) {
            if (features[feat] === false) {
                el.style.display = 'none';
                el.setAttribute('aria-hidden', 'true');
                el.setAttribute('data-hidden-by-guard', 'true');
            } else {
                el.style.display = '';
                el.removeAttribute('aria-hidden');
                el.removeAttribute('data-hidden-by-guard');
            }
        }
    });

    // 2. Scan and apply to action cards and links mapping to each feature
    for (const [feat, urlPatterns] of Object.entries(FEATURE_URL_MAP)) {
        const isEnabled = features[feat] !== false;
        urlPatterns.forEach(pattern => {
            document.querySelectorAll(`a[href*="${pattern}"], a[onclick*="${pattern}"]`).forEach(link => {
                const card = link.closest('.action-card, .nav-item, .stat-card, li');
                if (card) {
                    card.style.display = isEnabled ? '' : 'none';
                    if (!isEnabled) {
                        card.setAttribute('aria-hidden', 'true');
                        card.setAttribute('data-hidden-by-guard', 'true');
                    } else {
                        card.removeAttribute('aria-hidden');
                        card.removeAttribute('data-hidden-by-guard');
                    }
                } else {
                    link.style.display = isEnabled ? '' : 'none';
                }
            });
        });
    }
}

/**
 * Direct Page Guard: Redirects and alerts if direct URL access is attempted for a disabled feature
 */
async function requirePageFeature(featureKey) {
    await fetchTenantEntitlements(false);
    if (!featureEnabled(featureKey)) {
        alert(`The '${featureKey}' module is not enabled for your company subscription. Contact your administrator.`);
        window.location.href = '/dashboard.html';
    }
}

// Auto-initialize with deduplication guard
if (!window.__CHARLIE_FEATURE_GUARD_INITIALIZED) {
    window.__CHARLIE_FEATURE_GUARD_INITIALIZED = true;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => fetchTenantEntitlements(false));
    } else {
        fetchTenantEntitlements(false);
    }
}
