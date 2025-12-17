/**
 * BjornsFactionHUB - UI Module
 * Contains: Shadow DOM UI, Central Hub, API Modal, Page Integrations
 * @author BjornOdinsson89
 * @version 1.1.0
 */

(function() {
    'use strict';

    // Module references
    let Core = null;
    let API = null;
    let Managers = null;

    // UI State
    let shadowRoot = null;
    let hubEl = null;
    let apiModalEl = null;

    /**
     * Initialize UI with dependencies
     */
    function init(coreModule, apiModule, managersModule) {
        Core = coreModule;
        API = apiModule;
        Managers = managersModule;
        console.log('[BFH_UI] Initialized with dependencies');
        
        // Check for API key immediately after UI init
        setTimeout(() => checkForApiKey(), 1000);
    }

    function checkForApiKey() {
        if (!Core.state.apiKey || Core.state.apiKey === '###PDA-APIKEY###') {
            UI.openApiModal();
        }
    }

    // ============================================
    // STYLES
    // ============================================
    const STYLES = `
        :host {
            --bfh-bg: #222;
            --bfh-bg-header: #333;
            --bfh-accent: #88c000; /* Torn Green */
            --bfh-text: #fff;
            --bfh-text-muted: #aaa;
            --bfh-border: #444;
            --bfh-red: #ff4d4d;
            font-family: Arial, sans-serif;
            z-index: 99999;
        }

        /* TOGGLE BUTTON (Small, Square, Bottom Left) */
        .bfh-toggle-btn {
            position: fixed;
            bottom: 10px;
            left: 10px;
            width: 35px;
            height: 35px;
            background: var(--bfh-bg-header);
            border: 1px solid var(--bfh-accent);
            border-radius: 4px; /* Square with slight round */
            color: var(--bfh-text);
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
            z-index: 99990;
            user-select: none;
            transition: all 0.2s;
        }

        .bfh-toggle-btn:hover {
            background: #444;
            box-shadow: 0 0 8px var(--bfh-accent);
        }

        /* MAIN HUB (Centered Modal) */
        .bfh-hub {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            height: 500px;
            background: var(--bfh-bg);
            border: 1px solid var(--bfh-accent);
            box-shadow: 0 0 20px rgba(0,0,0,0.8);
            display: none; /* Hidden by default */
            flex-direction: column;
            z-index: 99999;
            border-radius: 6px;
        }

        .bfh-hub.open {
            display: flex;
        }

        /* API MODAL OVERLAY */
        .bfh-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
        }

        .bfh-api-box {
            background: var(--bfh-bg);
            border: 1px solid var(--bfh-accent);
            padding: 20px;
            width: 350px;
            border-radius: 6px;
            text-align: center;
            box-shadow: 0 0 15px var(--bfh-accent);
        }

        /* HEADER */
        .bfh-header {
            padding: 10px 15px;
            background: var(--bfh-bg-header);
            border-bottom: 1px solid var(--bfh-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 5px 5px 0 0;
        }

        .bfh-title {
            font-weight: bold;
            color: var(--bfh-accent);
            font-size: 14px;
        }

        .bfh-close {
            cursor: pointer;
            font-size: 16px;
            color: var(--bfh-text-muted);
        }

        .bfh-close:hover { color: var(--bfh-text); }

        /* TABS */
        .bfh-tabs {
            display: flex;
            background: var(--bfh-bg-header);
            border-bottom: 1px solid var(--bfh-border);
        }

        .bfh-tab {
            flex: 1;
            padding: 8px;
            text-align: center;
            cursor: pointer;
            color: var(--bfh-text-muted);
            font-size: 12px;
            border-bottom: 2px solid transparent;
        }

        .bfh-tab:hover { background: #3a3a3a; color: var(--bfh-text); }
        
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

        /* FORMS & INPUTS */
        .bfh-input {
            width: 90%;
            padding: 8px;
            margin: 10px 0;
            background: #111;
            border: 1px solid var(--bfh-border);
            color: var(--bfh-text);
            border-radius: 4px;
        }
        
        .bfh-input:focus {
            border-color: var(--bfh-accent);
            outline: none;
        }

        .bfh-disclaimer {
            font-size: 11px;
            color: var(--bfh-text-muted);
            margin-bottom: 15px;
            line-height: 1.4;
            text-align: left;
            background: #1a1a1a;
            padding: 10px;
            border-radius: 4px;
            border-left: 2px solid var(--bfh-accent);
        }

        /* ITEMS */
        .bfh-item {
            background: #2a2a2a;
            padding: 8px;
            margin-bottom: 6px;
            border-radius: 3px;
            border: 1px solid var(--bfh-border);
        }

        .bfh-item-header {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 4px;
        }

        .bfh-item-details {
            font-size: 11px;
            color: var(--bfh-text-muted);
            display: flex;
            justify-content: space-between;
        }

        /* BUTTONS */
        .bfh-btn {
            background: #444;
            border: none;
            color: var(--bfh-text);
            padding: 4px 8px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 11px;
            margin-left: 5px;
        }

        .bfh-btn:hover { background: #555; }
        .bfh-btn-primary { background: #3a5a00; border: 1px solid #4a6a00; }
        .bfh-btn-primary:hover { background: var(--bfh-accent); color: #000; }
        .bfh-btn-danger { background: #5a0000; }
        .bfh-btn-danger:hover { background: var(--bfh-red); }
        .bfh-btn-full { width: 100%; padding: 8px; margin: 0; font-size: 13px; }

        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: var(--bfh-bg); }
        ::-webkit-scrollbar-thumb { background: var(--bfh-border); border-radius: 2px; }
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

            // Create Components
            this.renderHub();
            this.renderToggleButton();
            
            // Create Toast Container
            const toastContainer = document.createElement('div');
            toastContainer.className = 'bfh-toast-container';
            shadowRoot.appendChild(toastContainer);

            console.log('[BFH_UI] UI initialized');
        },

        /**
         * Render the Floating Toggle Button (Square, Bottom Left)
         */
        renderToggleButton() {
            const btn = document.createElement('div');
            btn.className = 'bfh-toggle-btn';
            btn.innerHTML = '🛡️';
            btn.title = 'Open Hub';
            
            btn.onclick = () => {
                if (Core.state.isDrawerOpen) {
                    this.closeHub();
                } else {
                    this.openHub();
                }
            };

            shadowRoot.appendChild(btn);
        },

        /**
         * Render the Main Hub (Centered Box)
         */
        renderHub() {
            hubEl = document.createElement('div');
            hubEl.className = 'bfh-hub';
            
            hubEl.innerHTML = `
                <div class="bfh-header">
                    <span class="bfh-title">BjornsFactionHUB</span>
                    <span class="bfh-close">✕</span>
                </div>
                <div class="bfh-tabs">
                    <div class="bfh-tab active" data-tab="targets">Targets</div>
                    <div class="bfh-tab" data-tab="war">War</div>
                    <div class="bfh-tab" data-tab="settings">Config</div>
                </div>
                <div class="bfh-content" id="bfh-tab-content">
                    </div>
            `;

            // Event Listeners
            hubEl.querySelector('.bfh-close').onclick = () => this.closeHub();
            
            const tabs = hubEl.querySelectorAll('.bfh-tab');
            tabs.forEach(tab => {
                tab.onclick = (e) => this.switchTab(e.target.dataset.tab);
            });

            shadowRoot.appendChild(hubEl);
            this.switchTab('targets'); // Default tab
        },

        openHub() {
            if (hubEl) {
                hubEl.classList.add('open');
                Core.state.isDrawerOpen = true;
            }
        },

        closeHub() {
            if (hubEl) {
                hubEl.classList.remove('open');
                Core.state.isDrawerOpen = false;
            }
        },

        /**
         * Render API Key Modal Popup
         */
        openApiModal() {
            if (apiModalEl) return; // Already open

            apiModalEl = document.createElement('div');
            apiModalEl.className = 'bfh-modal-overlay';
            
            apiModalEl.innerHTML = `
                <div class="bfh-api-box">
                    <h3 style="color:var(--bfh-accent); margin-top:0;">API Key Required</h3>
                    <div class="bfh-disclaimer">
                        <strong>Security Disclaimer:</strong><br>
                        BjornsFactionHUB requires a <strong>Public</strong> or <strong>Limited</strong> Torn API Key to function. 
                        Your key is stored locally in your browser and is only sent to api.torn.com.
                        We do not store your key on external servers.
                    </div>
                    <input type="text" class="bfh-input" id="bfh-api-input" placeholder="Enter 16-character API Key">
                    <button class="bfh-btn bfh-btn-primary bfh-btn-full" id="bfh-save-api">Save Key & Start</button>
                    <div style="margin-top:10px; font-size:10px; color:#666;">
                        <a href="https://www.torn.com/preferences.php#tab=api" target="_blank" style="color:#888;">Get API Key Here</a>
                    </div>
                </div>
            `;

            // Bind Save Button
            const saveBtn = apiModalEl.querySelector('#bfh-save-api');
            const input = apiModalEl.querySelector('#bfh-api-input');

            saveBtn.onclick = () => {
                const key = input.value.trim();
                if (key.length === 16) {
                    Core.state.apiKey = key;
                    Core.Storage.set('apiKey', key);
                    this.showToast('API Key Saved!', 'success');
                    apiModalEl.remove();
                    apiModalEl = null;
                } else {
                    alert('Invalid Key. Please enter a 16-character Torn API key.');
                }
            };

            shadowRoot.appendChild(apiModalEl);
        },

        /**
         * Switch active tab
         */
        switchTab(tabName) {
            if (!hubEl) return;

            const tabs = hubEl.querySelectorAll('.bfh-tab');
            tabs.forEach(t => {
                if (t.dataset.tab === tabName) t.classList.add('active');
                else t.classList.remove('active');
            });

            Core.state.activeTab = tabName;
            this.renderTabContent(tabName);
        },

        /**
         * Render content for specific tab
         */
        renderTabContent(tabName) {
            const contentEl = shadowRoot.getElementById('bfh-tab-content');
            if (!contentEl) return;
            contentEl.innerHTML = ''; 

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
                container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#666; font-size:12px;">No targets added yet.<br><br>Go to a player profile to add them!</div>';
                return;
            }

            targets.forEach(t => {
                const el = document.createElement('div');
                el.className = 'bfh-item';
                
                let statusClass = '';
                if (t.status?.state === 'Okay') statusClass = 'bfh-status-okay';
                else if (t.status?.state === 'Hospital') statusClass = 'bfh-status-hospital';
                else statusClass = 'bfh-status-traveling';

                el.innerHTML = `
                    <div class="bfh-item-header">
                        <a href="https://www.torn.com/profiles.php?XID=${t.id}" target="_blank" style="color:var(--bfh-accent); text-decoration:none;">
                            ${t.name}
                        </a>
                        <span class="${statusClass}" style="font-size:11px;">${t.status?.state || 'Unknown'}</span>
                    </div>
                    <div class="bfh-item-details">
                        <span>Lvl ${t.level}</span>
                        <span>${t.life?.current || '?'}/${t.life?.maximum || '?'} HP</span>
                    </div>
                    <div style="margin-top:6px; display:flex; justify-content:flex-end;">
                        <button class="bfh-btn" id="btn-attack-${t.id}">Attack</button>
                        <button class="bfh-btn bfh-btn-danger" id="btn-del-${t.id}">×</button>
                    </div>
                `;

                el.querySelector(`#btn-attack-${t.id}`).onclick = () => {
                    window.location.href = `https://www.torn.com/loader.php?sid=attack&user2ID=${t.id}`;
                };
                el.querySelector(`#btn-del-${t.id}`).onclick = () => {
                    if(confirm(`Remove ${t.name}?`)) {
                        Managers.TargetManager.remove(t.id);
                        this.renderTabContent('targets'); // Re-render immediately
                    }
                };

                container.appendChild(el);
            });
            
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'bfh-btn bfh-btn-primary bfh-btn-full';
            refreshBtn.style.marginTop = '10px';
            refreshBtn.textContent = 'Refresh Statuses';
            refreshBtn.onclick = () => {
                refreshBtn.textContent = 'Refreshing...';
                Managers.TargetManager.refreshAll();
            };
            container.appendChild(refreshBtn);
        },

        refreshTargetsTab() {
            if (Core.state.activeTab === 'targets') this.renderTabContent('targets');
        },

        /**
         * Render War Tab
         */
        renderWarTab(container) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">War Monitor<br><span style="font-size:11px">Visit faction war page to activate</span></div>';
        },

        refreshWarTab() {
             if (Core.state.activeTab === 'war') this.renderTabContent('war');
        },

        /**
         * Render Settings Tab
         */
        renderSettingsTab(container) {
            container.innerHTML = `
                <div class="bfh-item">
                    <div class="bfh-item-header">Torn API Key</div>
                    <div style="font-size:11px; color:#aaa; word-break:break-all;">
                        ${Core.state.apiKey ? '••••••••••••' + Core.state.apiKey.slice(-4) : 'Not Set'}
                    </div>
                    <div style="margin-top:5px; text-align:right;">
                        <button class="bfh-btn" id="bfh-reset-key">Change Key</button>
                    </div>
                </div>
                
                <div class="bfh-item">
                    <div class="bfh-item-header">TornStats Key</div>
                    <input type="text" class="bfh-input" id="bfh-ts-input" value="${Core.state.tornStatsKey || ''}" placeholder="Optional" style="width:95%; margin:5px 0;">
                    <button class="bfh-btn bfh-btn-primary bfh-btn-full" id="bfh-save-ts">Save TornStats</button>
                </div>

                <div style="margin-top:20px; text-align:center;">
                     <button class="bfh-btn bfh-btn-danger" id="bfh-clear-data" style="width:80%;">Reset All Data</button>
                </div>
            `;

            // Bind Events
            container.querySelector('#bfh-reset-key').onclick = () => {
                Core.state.apiKey = null;
                Core.Storage.remove('apiKey');
                this.openApiModal();
            };

            container.querySelector('#bfh-save-ts').onclick = () => {
                const tsKey = container.querySelector('#bfh-ts-input').value.trim();
                Core.state.tornStatsKey = tsKey;
                Core.Storage.set('tornStatsKey', tsKey);
                this.showToast('TornStats Key Saved');
            };
            
            container.querySelector('#bfh-clear-data').onclick = () => {
                if(confirm('Clear ALL local data? This cannot be undone.')) {
                    Core.Storage.clearAll();
                    location.reload();
                }
            };
        },

        /**
         * Show Toast
         */
        showToast(message, type = 'info') {
            if (!shadowRoot) return;
            const container = shadowRoot.querySelector('.bfh-toast-container');
            const toast = document.createElement('div');
            
            toast.style.cssText = `
                background: #333;
                border-left: 3px solid ${type === 'error' ? 'var(--bfh-red)' : 'var(--bfh-accent)'};
                color: #fff;
                padding: 10px 15px;
                border-radius: 4px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                margin-top: 10px;
                font-size: 13px;
                animation: fadeIn 0.3s;
            `;
            toast.textContent = message;
            
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    };

    // ============================================
    // PROFILE PAGE INTEGRATION
    // ============================================
    const ProfileIntegration = {
        init() {
            if (Core.Utils.getCurrentPage() !== 'profile') return;
            
            const observer = new MutationObserver((mutations, obs) => {
                const profileWrapper = document.querySelector('.profile-wrapper'); 
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

            const container = document.querySelector('.basic-information') || document.querySelector('.profile-wrapper');
            
            if (container) {
                const btn = document.createElement('button');
                btn.innerHTML = '🛡️ Add Target';
                btn.style.cssText = 'margin: 5px; padding: 5px 10px; background: #88c000; color: black; border: 1px solid #444; cursor: pointer; border-radius: 4px; font-weight: bold; font-size:12px;';
                
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
                        UI.showToast(`Added ${userData.name}!`);
                        UI.openHub();
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
            console.log('[BFH_UI] War page detected');
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
