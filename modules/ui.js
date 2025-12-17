/**
 * BjornsFactionHUB - UI Module
 * * Contains: Shadow DOM UI, Drawer logic, Page Integrations, Toast Notifications
 * * @author BjornOdinsson89
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Module references
    let Core = null;
    let API = null;
    let Managers = null;

    // UI State
    let shadowRoot = null;
    let drawerEl = null;

    /**
     * Initialize UI with dependencies
     */
    function init(coreModule, apiModule, managersModule) {
        Core = coreModule;
        API = apiModule;
        Managers = managersModule;
        console.log('[BFH_UI] Initialized with dependencies');
    }

    // ============================================
    // STYLES
    // ============================================
    const STYLES = `
        :host {
            --bfh-bg: #333;
            --bfh-bg-dark: #222;
            --bfh-accent: #88c000; /* Torn Green */
            --bfh-text: #fff;
            --bfh-text-muted: #aaa;
            --bfh-border: #444;
            --bfh-red: #ff4d4d;
            font-family: Arial, sans-serif;
            z-index: 99999;
        }

        /* DRAWER */
        .bfh-drawer {
            position: fixed;
            top: 0;
            right: -350px;
            width: 350px;
            height: 100vh;
            background: var(--bfh-bg-dark);
            border-left: 1px solid var(--bfh-accent);
            box-shadow: -5px 0 15px rgba(0,0,0,0.5);
            transition: right 0.3s ease;
            display: flex;
            flex-direction: column;
            z-index: 99999;
        }

        .bfh-drawer.open {
            right: 0;
        }

        /* HEADER */
        .bfh-header {
            padding: 15px;
            background: var(--bfh-bg);
            border-bottom: 1px solid var(--bfh-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .bfh-title {
            font-weight: bold;
            color: var(--bfh-accent);
            font-size: 16px;
        }

        .bfh-close {
            cursor: pointer;
            font-size: 20px;
            color: var(--bfh-text-muted);
        }

        .bfh-close:hover {
            color: var(--bfh-text);
        }

        /* TABS */
        .bfh-tabs {
            display: flex;
            background: var(--bfh-bg);
        }

        .bfh-tab {
            flex: 1;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            color: var(--bfh-text-muted);
            font-size: 13px;
        }

        .bfh-tab:hover {
            background: #3a3a3a;
            color: var(--bfh-text);
        }

        .bfh-tab.active {
            border-bottom-color: var(--bfh-accent);
            color: var(--bfh-text);
            background: #3a3a3a;
        }

        /* CONTENT */
        .bfh-content {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }

        .bfh-item {
            background: var(--bfh-bg);
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 4px;
            border: 1px solid var(--bfh-border);
        }

        .bfh-item-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .bfh-item-details {
            font-size: 12px;
            color: var(--bfh-text-muted);
            display: flex;
            justify-content: space-between;
        }

        .bfh-status-okay { color: #88c000; }
        .bfh-status-hospital { color: #ff4d4d; }
        .bfh-status-traveling { color: #66b3ff; }

        /* BUTTONS */
        .bfh-btn {
            background: var(--bfh-border);
            border: none;
            color: var(--bfh-text);
            padding: 5px 10px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
            margin-right: 5px;
        }

        .bfh-btn:hover { background: #555; }
        .bfh-btn-primary { background: #3a5a00; }
        .bfh-btn-primary:hover { background: var(--bfh-accent); color: #000; }
        .bfh-btn-danger { background: #5a0000; }
        .bfh-btn-danger:hover { background: var(--bfh-red); }

        /* TOAST */
        .bfh-toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 100000;
        }

        .bfh-toast {
            background: var(--bfh-bg-dark);
            border-left: 4px solid var(--bfh-accent);
            color: var(--bfh-text);
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            animation: slideIn 0.3s ease-out;
            min-width: 200px;
        }

        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--bfh-bg); }
        ::-webkit-scrollbar-thumb { background: var(--bfh-border); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--bfh-accent); }
    `;

    // ============================================
    // MAIN UI MANAGER
    // ============================================
    const UI = {
        /**
         * Initialize UI components
         */
        init() {
            if (document.getElementById('bfh-root')) return;

            // Create Shadow DOM Host
            const host = document.createElement('div');
            host.id = 'bfh-root';
            document.body.appendChild(host);

            shadowRoot = host.attachShadow({ mode: 'open' });

            // Inject Styles
            const styleEl = document.createElement('style');
            styleEl.textContent = STYLES;
            shadowRoot.appendChild(styleEl);

            // Create Drawer
            this.renderDrawer();
            
            // Create Toast Container
            const toastContainer = document.createElement('div');
            toastContainer.className = 'bfh-toast-container';
            shadowRoot.appendChild(toastContainer);

            console.log('[BFH_UI] UI initialized');
        },

        /**
         * Render the main drawer structure
         */
        renderDrawer() {
            drawerEl = document.createElement('div');
            drawerEl.className = 'bfh-drawer';
            
            drawerEl.innerHTML = `
                <div class="bfh-header">
                    <span class="bfh-title">BjornsFactionHUB v${Core?.CONFIG.VERSION || '1.0'}</span>
                    <span class="bfh-close">✕</span>
                </div>
                <div class="bfh-tabs">
                    <div class="bfh-tab active" data-tab="targets">Targets</div>
                    <div class="bfh-tab" data-tab="war">War</div>
                    <div class="bfh-tab" data-tab="settings">Settings</div>
                </div>
                <div class="bfh-content" id="bfh-tab-content">
                    </div>
            `;

            // Event Listeners
            drawerEl.querySelector('.bfh-close').onclick = () => this.closeDrawer();
            
            const tabs = drawerEl.querySelectorAll('.bfh-tab');
            tabs.forEach(tab => {
                tab.onclick = (e) => this.switchTab(e.target.dataset.tab);
            });

            shadowRoot.appendChild(drawerEl);
            this.switchTab('targets'); // Default tab
        },

        /**
         * Open the drawer
         */
        openDrawer() {
            if (drawerEl) {
                drawerEl.classList.add('open');
                Core.state.isDrawerOpen = true;
            }
        },

        /**
         * Close the drawer
         */
        closeDrawer() {
            if (drawerEl) {
                drawerEl.classList.remove('open');
                Core.state.isDrawerOpen = false;
            }
        },

        /**
         * Switch active tab
         * @param {string} tabName 
         */
        switchTab(tabName) {
            if (!drawerEl) return;

            // Update tab UI
            const tabs = drawerEl.querySelectorAll('.bfh-tab');
            tabs.forEach(t => {
                if (t.dataset.tab === tabName) t.classList.add('active');
                else t.classList.remove('active');
            });

            Core.state.activeTab = tabName;
            this.renderTabContent(tabName);
        },

        /**
         * Render content for specific tab
         * @param {string} tabName 
         */
        renderTabContent(tabName) {
            const contentEl = shadowRoot.getElementById('bfh-tab-content');
            if (!contentEl) return;

            contentEl.innerHTML = ''; // Clear current content

            switch (tabName) {
                case 'targets':
                    this.renderTargetsTab(contentEl);
                    break;
                case 'war':
                    this.renderWarTab(contentEl);
                    break;
                case 'settings':
                    this.renderSettingsTab(contentEl);
                    break;
            }
        },

        /**
         * Render Targets Tab
         */
        renderTargetsTab(container) {
            const targets = Managers.TargetManager.getAll();

            if (targets.length === 0) {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">No targets added.<br>Visit a profile to add one!</div>';
                return;
            }

            targets.forEach(t => {
                const el = document.createElement('div');
                el.className = 'bfh-item';
                
                // Status Color
                let statusClass = '';
                if (t.status?.state === 'Okay') statusClass = 'bfh-status-okay';
                else if (t.status?.state === 'Hospital') statusClass = 'bfh-status-hospital';
                else statusClass = 'bfh-status-traveling';

                el.innerHTML = `
                    <div class="bfh-item-header">
                        <a href="https://www.torn.com/profiles.php?XID=${t.id}" target="_blank" style="color:var(--bfh-accent); text-decoration:none;">
                            ${t.name} [${t.id}]
                        </a>
                        <span class="${statusClass}">${t.status?.state || 'Unknown'}</span>
                    </div>
                    <div class="bfh-item-details">
                        <span>Lvl: ${t.level}</span>
                        <span>Life: ${t.life?.current || '?'}/${t.life?.maximum || '?'}</span>
                    </div>
                    <div style="margin-top:8px; display:flex; justify-content:flex-end;">
                        <button class="bfh-btn" id="btn-attack-${t.id}">Attack</button>
                        <button class="bfh-btn bfh-btn-danger" id="btn-del-${t.id}">X</button>
                    </div>
                `;

                // Bind buttons
                el.querySelector(`#btn-attack-${t.id}`).onclick = () => {
                    window.location.href = `https://www.torn.com/loader.php?sid=attack&user2ID=${t.id}`;
                };
                el.querySelector(`#btn-del-${t.id}`).onclick = () => {
                    if(confirm(`Remove ${t.name}?`)) Managers.TargetManager.remove(t.id);
                };

                container.appendChild(el);
            });
            
            // Add Refresh Button at bottom
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'bfh-btn bfh-btn-primary';
            refreshBtn.style.width = '100%';
            refreshBtn.textContent = 'Refresh Targets';
            refreshBtn.onclick = () => {
                refreshBtn.textContent = 'Refreshing...';
                Managers.TargetManager.refreshAll();
            };
            container.appendChild(refreshBtn);
        },

        /**
         * Refresh only the targets tab (external call)
         */
        refreshTargetsTab() {
            if (Core.state.activeTab === 'targets') {
                this.renderTabContent('targets');
            }
        },

        /**
         * Render War Tab (Stub)
         */
        renderWarTab(container) {
            container.innerHTML = '<div style="padding:20px; text-align:center;">War Monitor Active.<br>Visit Faction War page to populate data.</div>';
            // Implementation depends on WarMonitor data structure
        },

        refreshWarTab() {
             if (Core.state.activeTab === 'war') {
                this.renderTabContent('war');
            }
        },

        /**
         * Render Settings Tab
         */
        renderSettingsTab(container) {
            container.innerHTML = `
                <div class="bfh-item">
                    <div class="bfh-item-header">API Key</div>
                    <div class="bfh-item-details">${Core.state.apiKey ? 'Set (Ends in ...' + Core.state.apiKey.slice(-4) + ')' : 'Not Set'}</div>
                </div>
                <div class="bfh-item">
                    <div class="bfh-item-header">TornStats Key</div>
                    <div class="bfh-item-details">${Core.state.tornStatsKey ? 'Set' : 'Not Set'}</div>
                </div>
                <div style="margin-top:20px; font-size:11px; text-align:center; color:#666;">
                    BjornsFactionHUB v${Core.CONFIG.VERSION}<br>
                    Created by BjornOdinsson89
                </div>
            `;
        },

        /**
         * Show a Toast Notification
         * @param {string} message 
         * @param {string} type - 'info', 'error', 'success'
         */
        showToast(message, type = 'info') {
            if (!shadowRoot) return;
            
            const container = shadowRoot.querySelector('.bfh-toast-container');
            const toast = document.createElement('div');
            toast.className = 'bfh-toast';
            toast.textContent = message;
            
            if (type === 'error') toast.style.borderLeftColor = 'var(--bfh-red)';
            
            container.appendChild(toast);

            // Auto remove
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    };

    // ============================================
    // PROFILE PAGE INTEGRATION
    // ============================================
    const ProfileIntegration = {
        init() {
            if (Core.Utils.getCurrentPage() !== 'profile') return;
            
            // Observer to wait for profile load
            const observer = new MutationObserver((mutations, obs) => {
                const profileWrapper = document.querySelector('.profile-wrapper'); // Standard Torn selector
                if (profileWrapper) {
                    this.injectButtons();
                    obs.disconnect();
                }
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
        },

        injectButtons() {
            const userId = Core.Utils.parsePlayerId(window.location.href);
            if (!userId) return;

            // Find a place to inject (e.g., User Information box)
            // Note: This selector is fragile and depends on Torn's current layout
            const container = document.querySelector('.basic-information') || document.querySelector('.profile-wrapper');
            
            if (container) {
                const btn = document.createElement('button');
                btn.textContent = '🎯 Add to BFH';
                btn.style.cssText = 'margin: 10px; padding: 5px 10px; background: #88c000; color: black; border: none; cursor: pointer; border-radius: 4px; font-weight: bold;';
                
                btn.onclick = async () => {
                    const userData = await API.TornAPI.getUser(userId);
                    if (userData) {
                        Managers.TargetManager.add({
                            id: userId,
                            name: userData.name,
                            level: userData.level,
                            life: userData.life,
                            status: userData.status,
                            faction: userData.faction
                        });
                        UI.showToast(`Added ${userData.name} to Targets!`);
                        UI.openDrawer();
                    }
                };

                container.insertBefore(btn, container.firstChild);
            }
        }
    };

    // ============================================
    // WAR PAGE INTEGRATION
    // ============================================
    const WarPageIntegration = {
        init() {
            if (Core.Utils.getCurrentPage() !== 'faction-war') return;
            console.log('[BFH_UI] War page detected - initializing monitor...');
            // Logic to scrape war page would go here
        }
    };

    // ============================================
    // EXPORT MODULE
    // ============================================
    window.BFH_UI = {
        init,
        UI,
        ProfileIntegration,
        WarPageIntegration
    };

    console.log('[BFH_UI] Module loaded');

})();
