// ==UserScript==
// @name         Odin Faction Tools
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Comprehensive Torn faction tools with war monitor, target tracking, and real-time updates
// @author       BjornOdinsson89
// @match        https://www.torn.com/*
// @icon         https://i.postimg.cc/BQ6bSYKM/file-000000004bb071f5a96fc52564bf26ad-1.png
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      api.torn.com
// @connect      www.tornstats.com
// @connect      yata.yt
// @connect      ffscouter.com
// @connect      raw.githubusercontent.com
// @require      https://raw.githubusercontent.com/bjornodinsson89/BjornsFactionTools/main/modules/core.js
// @require      https://raw.githubusercontent.com/bjornodinsson89/BjornsFactionTools/main/modules/api.js
// @require      https://raw.githubusercontent.com/bjornodinsson89/BjornsFactionTools/main/modules/managers.js
// @require      https://raw.githubusercontent.com/bjornodinsson89/BjornsFactionTools/main/modules/ui.js
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/bjornodinsson89/BjornsFactionTools/main/Odin-Faction-Tools.user.js
// @downloadURL  https://raw.githubusercontent.com/bjornodinsson89/BjornsFactionTools/main/Odin-Faction-Tools.user.js
// ==/UserScript==

(function() {
    'use strict';

    console.log('[BjornsFactionHUB] Starting initialization...');

    // ============================================
    // VERIFY MODULES LOADED
    // ============================================
    function waitForModules() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;

            const checkModules = setInterval(() => {
                attempts++;

                if (window.BFH_Core && window.BFH_API && window.BFH_Managers && window.BFH_UI) {
                    clearInterval(checkModules);
                    console.log('[BjornsFactionHUB] All modules loaded successfully');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkModules);
                    const missing = [];
                    if (!window.BFH_Core) missing.push('Core');
                    if (!window.BFH_API) missing.push('API');
                    if (!window.BFH_Managers) missing.push('Managers');
                    if (!window.BFH_UI) missing.push('UI');
                    reject(new Error(`Failed to load modules: ${missing.join(', ')}`));
                }
            }, 100);
        });
    }

    // ============================================
    // INITIALIZE APPLICATION
    // ============================================
    async function initialize() {
        try {
            // Wait for all modules to load
            await waitForModules();

            const { state, Storage, CONFIG } = window.BFH_Core;
            const { TornAPI } = window.BFH_API;
            const { TargetManager, WarMonitor, DibsManager, NotesManager } = window.BFH_Managers;
            const { init: initUI, UI } = window.BFH_UI;

            console.log('[BjornsFactionHUB] Modules verified, starting initialization');

            // ============================================
            // LOAD SAVED DATA
            // ============================================

            // Load API keys
            state.apiKey = Storage.get('apiKey', null);
            state.tornStatsKey = Storage.get('tornStatsKey', null);

            console.log('[BjornsFactionHUB] API Key loaded:', state.apiKey ? 'Yes (••••' + state.apiKey.slice(-4) + ')' : 'No');

            // Load managers data
            TargetManager.load();
            DibsManager.load();
            NotesManager.load();

            console.log('[BjornsFactionHUB] Loaded targets:', TargetManager.targets.length);
            console.log('[BjornsFactionHUB] Loaded dibs:', DibsManager.dibs.length);

            // ============================================
            // INITIALIZE MODULES WITH CROSS-REFERENCES
            // ============================================

            // Initialize managers with module references
            window.BFH_Managers.init(window.BFH_Core, window.BFH_API, window.BFH_UI);

            // Initialize UI with module references
            initUI(window.BFH_Core, window.BFH_API, window.BFH_Managers);

            // ============================================
            // FETCH INITIAL USER DATA
            // ============================================

            if (state.apiKey && state.apiKey !== '###PDA-APIKEY###') {
                try {
                    console.log('[BjornsFactionHUB] Fetching initial user data...');
                    const userData = await TornAPI.getUser();

                    if (userData && userData.player_id) {
                        state.userData = userData;
                        console.log('[BjornsFactionHUB] User data loaded:', userData.name, `[${userData.player_id}]`, `Level ${userData.level}`);

                        // Check for active war and auto-start war monitor
                        if (userData.faction && userData.faction.faction_id) {
                            try {
                                const warData = await TornAPI.getFactionWar(userData.faction.faction_id);

                                if (warData && warData.wars && Object.keys(warData.wars).length > 0) {
                                    const warId = Object.keys(warData.wars)[0];
                                    const war = warData.wars[warId];

                                    // Validate war data structure
                                    if (!war || !war.factions) {
                                        console.warn('[BjornsFactionHUB] Invalid war data structure');
                                    } else if (!warData.ID) {
                                        console.warn('[BjornsFactionHUB] Missing faction ID in war data');
                                    } else {
                                        const myFactionId = String(warData.ID);
                                        const enemyFactionId = Object.keys(war.factions).find(id => String(id) !== myFactionId);

                                        if (enemyFactionId) {
                                            console.log('[BjornsFactionHUB] Active war detected:', myFactionId, 'vs', enemyFactionId);

                                            // Start war monitor
                                            await WarMonitor.start(myFactionId, enemyFactionId);

                                            // Set scores
                                            const myScore = war.factions[myFactionId]?.score || 0;
                                            const enemyScore = war.factions[enemyFactionId]?.score || 0;
                                            WarMonitor.setScores(myScore, enemyScore);

                                            console.log('[BjornsFactionHUB] War monitor started. Score:', myScore, 'vs', enemyScore);
                                        }
                                    }
                                } else {
                                    console.log('[BjornsFactionHUB] No active war detected');
                                }
                            } catch (warError) {
                                console.warn('[BjornsFactionHUB] Could not fetch war data:', warError.message);
                            }
                        }
                    }
                } catch (apiError) {
                    console.error('[BjornsFactionHUB] Failed to fetch user data:', apiError);
                }
            }

            // ============================================
            // INJECT UI
            // ============================================

            UI.init();
            console.log('[BjornsFactionHUB] UI initialized');

            // ============================================
            // PAGE-SPECIFIC INTEGRATIONS
            // ============================================

            setupProfilePageIntegration();
            setupWarPageIntegration();

            console.log('[BjornsFactionHUB] Initialization complete!');

        } catch (error) {
            console.error('[BjornsFactionHUB] Initialization failed:', error);
            alert('BjornsFactionHUB failed to initialize. Check console for details.');
        }
    }

    // ============================================
    // PROFILE PAGE INTEGRATION
    // ============================================
    function setupProfilePageIntegration() {
        const currentPage = window.BFH_Core.Utils.getCurrentPage();

        if (currentPage !== 'profile') return;

        console.log('[BjornsFactionHUB] Profile page detected, adding quick-add button');

        // Wait for profile to load
        const observer = new MutationObserver(() => {
            const profileWrapper = document.querySelector('.profile-wrapper, .basic-information, [class*="profile"]');

            if (profileWrapper && !document.getElementById('bfh-profile-add-btn')) {
                const playerId = getProfilePlayerId();

                if (playerId) {
                    injectProfileButton(playerId, profileWrapper);
                    observer.disconnect();
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Also try immediate injection
        setTimeout(() => {
            const playerId = getProfilePlayerId();
            const profileWrapper = document.querySelector('.profile-wrapper, .basic-information, [class*="profile"]');

            if (playerId && profileWrapper && !document.getElementById('bfh-profile-add-btn')) {
                injectProfileButton(playerId, profileWrapper);
            }
        }, 1000);
    }

    function getProfilePlayerId() {
        // Try URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const xid = urlParams.get('XID');
        if (xid) return xid;

        // Try hash
        const hash = window.location.hash;
        const match = hash.match(/XID=(\d+)/);
        if (match) return match[1];

        return null;
    }

    function injectProfileButton(playerId, container) {
        const btn = document.createElement('button');
        btn.id = 'bfh-profile-add-btn';
        btn.textContent = '+ Add to BFH Targets';
        btn.style.cssText = `
            padding: 8px 16px;
            background: #88c000;
            border: none;
            border-radius: 4px;
            color: #000;
            font-weight: bold;
            cursor: pointer;
            margin: 10px 0;
            font-size: 12px;
        `;

        btn.onclick = async () => {
            try {
                btn.textContent = 'Adding...';
                btn.disabled = true;

                const { TornAPI } = window.BFH_API;
                const { TargetManager } = window.BFH_Managers;

                // Fetch user data
                const userData = await TornAPI.getUser(playerId);

                // Add to targets
                TargetManager.add({
                    id: playerId,
                    name: userData.name,
                    level: userData.level,
                    status: userData.status,
                    last_action: userData.last_action
                });

                btn.textContent = '✓ Added to Targets';
                btn.style.background = '#4da6ff';

                setTimeout(() => {
                    btn.textContent = '+ Add to BFH Targets';
                    btn.style.background = '#88c000';
                    btn.disabled = false;
                }, 2000);

            } catch (error) {
                console.error('[BjornsFactionHUB] Failed to add target:', error);
                btn.textContent = '✗ Error';
                btn.style.background = '#ff4d4d';

                setTimeout(() => {
                    btn.textContent = '+ Add to BFH Targets';
                    btn.style.background = '#88c000';
                    btn.disabled = false;
                }, 2000);
            }
        };

        // Try to insert near profile header
        const insertPoint = container.querySelector('.content-title, .profile-buttons, h4') || container;
        if (insertPoint.parentElement) {
            insertPoint.parentElement.insertBefore(btn, insertPoint.nextSibling);
        } else {
            container.appendChild(btn);
        }

        console.log('[BjornsFactionHUB] Profile quick-add button injected for player', playerId);
    }

    // ============================================
    // WAR PAGE INTEGRATION
    // ============================================
    function setupWarPageIntegration() {
        const currentPage = window.BFH_Core.Utils.getCurrentPage();

        if (currentPage !== 'faction-war') return;

        console.log('[BjornsFactionHUB] War page detected');

        // Add quick-access to open HUB on war tab
        const observer = new MutationObserver(() => {
            const warWrapper = document.querySelector('[class*="war"], .faction-war');

            if (warWrapper && !document.getElementById('bfh-war-quick-btn')) {
                injectWarQuickButton(warWrapper);
                observer.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Try immediate injection
        setTimeout(() => {
            const warWrapper = document.querySelector('[class*="war"], .faction-war');
            if (warWrapper && !document.getElementById('bfh-war-quick-btn')) {
                injectWarQuickButton(warWrapper);
            }
        }, 1000);
    }

    function injectWarQuickButton(container) {
        const btn = document.createElement('button');
        btn.id = 'bfh-war-quick-btn';
        btn.textContent = '🛡️ Open BFH War HUD';
        btn.style.cssText = `
            padding: 10px 20px;
            background: #88c000;
            border: 1px solid #666;
            border-radius: 4px;
            color: #000;
            font-weight: bold;
            cursor: pointer;
            margin: 10px;
            font-size: 13px;
            position: relative;
            z-index: 9999;
        `;

        btn.onclick = () => {
            const { UI } = window.BFH_UI;
            const { state } = window.BFH_Core;

            if (!state.isDrawerOpen) {
                UI.openHub();
                UI.switchTab('war');
            }
        };

        container.insertBefore(btn, container.firstChild);
        console.log('[BjornsFactionHUB] War page quick-access button injected');
    }

    // ============================================
    // START INITIALIZATION
    // ============================================

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
