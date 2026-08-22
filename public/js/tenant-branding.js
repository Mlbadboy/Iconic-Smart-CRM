/**
 * Charlie's CRM — Dynamic Tenant & White-Label Branding Engine
 * Automatically queries /api/tenant/branding and applies tenant brand assets.
 */
(function() {
    if (window.__CHARLIE_TENANT_BRANDING_INITIALIZED) return;
    window.__CHARLIE_TENANT_BRANDING_INITIALIZED = true;

    let activeBrandingPromise = null;

    async function applyTenantBranding() {
        if (activeBrandingPromise) return activeBrandingPromise;

        // If already loaded in session, apply without network hit
        if (window.TENANT_BRANDING) {
            renderBranding(window.TENANT_BRANDING);
            return window.TENANT_BRANDING;
        }

        activeBrandingPromise = (async () => {
            try {
                const token = localStorage.getItem('authToken');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const res = await fetch('/api/tenant/branding', { headers });
                if (!res.ok) return null;

                const branding = await res.json();
                window.TENANT_BRANDING = branding;
                renderBranding(branding);
                return branding;
            } catch (err) {
                console.warn('Could not load tenant branding:', err);
                return null;
            } finally {
                activeBrandingPromise = null;
            }
        })();

        return activeBrandingPromise;
    }

    function renderBranding(branding) {
        if (!branding) return;

        // 1. Update CSS Custom Properties (Theme Colors)
        if (branding.primaryColor) {
            document.documentElement.style.setProperty('--primary', branding.primaryColor);
        }
        if (branding.secondaryColor) {
            document.documentElement.style.setProperty('--primary-dark', branding.secondaryColor);
        }
        if (branding.accentColor) {
            document.documentElement.style.setProperty('--accent', branding.accentColor);
        }

        // 2. Update Browser Title & Favicon
        if (branding.displayName) {
            const currentTitle = document.title;
            if (currentTitle.includes('Login')) {
                document.title = `Login — ${branding.displayName}`;
            } else if (currentTitle.includes('Dashboard')) {
                document.title = `${branding.displayName} — Easy Dashboard`;
            } else if (currentTitle.includes('Platform')) {
                document.title = "Charlie's CRM — Platform Console";
            } else {
                document.title = `${branding.displayName} — CRM`;
            }
        }

        if (branding.favicon) {
            let faviconLink = document.querySelector("link[rel~='icon']");
            if (!faviconLink) {
                faviconLink = document.createElement('link');
                faviconLink.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(faviconLink);
            }
            faviconLink.href = branding.favicon;
        }

        // 3. Update Visual Elements with dynamic branding attributes
        document.querySelectorAll('[data-branding="name"]').forEach(el => {
            el.textContent = branding.displayName || "Charlie's CRM";
        });

        document.querySelectorAll('[data-branding="heading"]').forEach(el => {
            el.textContent = branding.loginHeading || branding.displayName || "Charlie's CRM";
        });

        document.querySelectorAll('[data-branding="subtitle"]').forEach(el => {
            el.textContent = branding.loginSubtitle || 'Simple, Powerful, Accessible';
        });

        document.querySelectorAll('[data-branding="logo"]').forEach(el => {
            if (branding.logo) {
                el.innerHTML = `<img src="${branding.logo}" alt="${branding.displayName || 'Logo'}" style="max-height: 48px; object-fit: contain; vertical-align: middle;">`;
            } else {
                el.textContent = '🚀';
            }
        });

        // Update top navigation header logos across dashboard/admin pages
        const headerLogos = document.querySelectorAll('.header .logo, .navbar .logo');
        headerLogos.forEach(el => {
            if (!el.hasAttribute('data-branding-managed')) {
                el.setAttribute('data-branding-managed', 'true');
                if (branding.logo) {
                    el.innerHTML = `<img src="${branding.logo}" alt="${branding.displayName || 'Logo'}" style="max-height: 36px; object-fit: contain; vertical-align: middle; margin-right: 8px;"> <span>${branding.displayName || "Charlie's CRM"}</span>`;
                } else if (branding.displayName) {
                    el.innerHTML = `🚀 ${branding.displayName}`;
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyTenantBranding);
    } else {
        applyTenantBranding();
    }
})();
