/**
 * BjornsFactionHUB - UI Module
 * @version 1.2.0
 */

(function() {
    'use strict';

    let Core = null, API = null, Managers = null;
    let shadowRoot = null, hubEl = null, apiModalEl = null;
    
    // UI State for War Tab
    let warTabMode = 'claim'; // 'claim' or 'med'

    function init(core, api, managers) {
        Core = core; API = api; Managers = managers;
        setTimeout(() => checkForApiKey(), 1000);
    }

    function checkForApiKey() {
        if (!Core.state.apiKey || Core.state.apiKey === '###PDA-APIKEY###') UI.openApiModal();
    }

    // ============================================
    // STYLES
    // ============================================
    const STYLES = `
        :host { --bg: #222; --header: #333; --accent: #88c000; --text: #fff; --muted: #aaa; --border: #444; --red: #ff4d4d; --yellow: #ffd700; --blue: #4da6ff; font-family: Arial, sans-serif; }
        .bfh-toggle-btn { position: fixed; bottom: 10px; left: 10px; width: 35px; height: 35px; background: var(--header); border: 1px solid var(--accent); border-radius: 4px; color: var(--text); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 99990; }
        .bfh-hub { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 450px; height: 600px; background: var(--bg); border: 1px solid var(--accent); display: none; flex-direction: column; z-index: 99999; border-radius: 6px; box-shadow: 0 0 20px rgba(0,0,0,0.8); }
        .bfh-hub.open { display: flex; }
        .bfh-header { padding: 10px; background: var(--header); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .bfh-tabs { display: flex; background: var(--header); border-bottom: 1px solid var(--border); }
        .bfh-tab { flex: 1; padding: 10px; text-align: center; cursor: pointer; color: var(--muted); border-bottom: 2px solid transparent; }
        .bfh-tab.active { border-bottom-color: var(--accent); color: var(--text); background: #3a3a3a; }
        .bfh-content { flex: 1; overflow-y: auto; padding: 10px; }
        
        /* WAR SPECIFIC STYLES */
        .bfh-score-board { display: flex; justify-content: space-between; background: #111; padding: 10px; border-radius: 4px; margin-bottom: 10px; border: 1px solid var(--border); }
        .bfh-score-box { text-align: center; flex: 1; }
        .bfh-score-val { font-size: 18px; font-weight: bold; }
        .bfh-score-label { font-size: 10px; color: var(--muted); }
        .bfh-vs { align-self: center; font-weight: bold; color: var(--muted); }
        
        .bfh-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
        .bfh-table th { text-align: left; color: var(--muted); padding: 5px; border-bottom: 1px solid var(--border); }
        .bfh-table td { padding: 6px 5px; border-bottom: 1px solid #333; }
        
        /* STATUS LIGHTS */
        .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; background: #555; }
        .status-online { background: var(--accent); box-shadow: 0 0 4px var(--accent); }
        .status-idle { background: var(--yellow); }
        .status-offline { background: #555; }
        
        /* WATCHER LIGHT */
        .watcher-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; background: #333; border: 1px solid #555; cursor: pointer; }
        .watcher-active { background: var(--accent); border-color: var(--accent); }
        
        /* MODE SWITCH */
        .mode-switch { display: flex; background: #333; border-radius: 3px; margin-bottom: 5px; }
        .mode-opt { flex: 1; text-align: center; padding: 4px; cursor: pointer; font-size: 10px; color: var(--muted); }
        .mode-opt.active { background: var(--accent); color: #000; font-weight: bold; }

        /* BUTTONS */
        .btn-act { padding: 2px 6px; border-radius: 3px; border: none; cursor: pointer; font-size: 10px; color: #fff; }
        .btn-claim { background: #444; }
        .btn-claim.claimed { background: var(--accent); color: #000; }
        .btn-med { background: var(--red); }
        
        /* TEXT COLORS */
        .txt-okay { color: var(--accent); }
        .txt-hosp { color: var(--red); }
        .txt-travel { color: var(--blue); }
    `;

    const UI = {
        init() {
            if (document.getElementById('bfh-root')) return;
            const host = document.createElement('div'); host.id = 'bfh-root'; document.body.appendChild(host);
            shadowRoot = host.attachShadow({ mode: 'open' });
            const style = document.createElement('style'); style.textContent = STYLES; shadowRoot.appendChild(style);
            
            this.renderHub();
            this.renderToggle();
        },

        renderToggle() {
            const btn = document.createElement('div'); btn.className = 'bfh-toggle-btn'; btn.innerHTML = '🛡️';
            btn.onclick = () => Core.state.isDrawerOpen ? this.closeHub() : this.openHub();
            shadowRoot.appendChild(btn);
        },

        renderHub() {
            hubEl = document.createElement('div'); hubEl.className = 'bfh-hub';
            hubEl.innerHTML = `
                <div class="bfh-header"><span style="color:var(--accent); font-weight:bold;">BjornsFactionHUB</span><span class="bfh-close" style="cursor:pointer;">✕</span></div>
                <div class="bfh-tabs">
                    <div class="bfh-tab active" data-tab="targets">Targets</div>
                    <div class="bfh-tab" data-tab="war">War</div>
                    <div class="bfh-tab" data-tab="settings">Settings</div>
                </div>
                <div class="bfh-content" id="bfh-content"></div>
            `;
            hubEl.querySelector('.bfh-close').onclick = () => this.closeHub();
            hubEl.querySelectorAll('.bfh-tab').forEach(t => t.onclick = (e) => this.switchTab(e.target.dataset.tab));
            shadowRoot.appendChild(hubEl);
            this.switchTab('targets');
        },

        openHub() { hubEl.classList.add('open'); Core.state.isDrawerOpen = true; },
        closeHub() { hubEl.classList.remove('open'); Core.state.isDrawerOpen = false; },

        switchTab(tab) {
            hubEl.querySelectorAll('.bfh-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
            Core.state.activeTab = tab;
            const content = shadowRoot.getElementById('bfh-content');
            content.innerHTML = '';
            if (tab === 'targets') this.renderTargets(content);
            else if (tab === 'war') this.renderWar(content);
            else if (tab === 'settings') this.renderSettings(content);
        },

        // ========================
        // WAR TAB RENDERER
        // ========================
        renderWar(container) {
            const WarMon = Managers.WarMonitor;
            
            // 1. SCOREBOARD
            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'bfh-score-board';
            scoreDiv.innerHTML = `
                <div class="bfh-score-box"><div class="bfh-score-val" style="color:var(--accent)">${WarMon.warScores.myScore}</div><div class="bfh-score-label">US</div></div>
                <div class="bfh-vs">VS</div>
                <div class="bfh-score-box"><div class="bfh-score-val" style="color:var(--red)">${WarMon.warScores.enemyScore}</div><div class="bfh-score-label">THEM</div></div>
            `;
            container.appendChild(scoreDiv);

            if (!WarMon.myFactionId || !WarMon.enemyFactionId) {
                container.innerHTML += `<div style="text-align:center; padding:20px; color:#666;">
                    No active war detected.<br>
                    <button class="btn-act btn-claim" style="font-size:12px; padding:8px; margin-top:10px;" id="btn-scan-war">Scan Page for War</button>
                </div>`;
                const scanBtn = container.querySelector('#btn-scan-war');
                if(scanBtn) scanBtn.onclick = () => WarPageIntegration.scan();
                return;
            }

            // 2. FRIENDLY ROSTER
            const friendlies = WarMon.getFriendlyMembers();
            const friendlyTable = this.createRosterTable(friendlies, 'friendly');
            container.innerHTML += `<div style="font-weight:bold; margin-bottom:5px; color:#fff;">Friendly Roster (${friendlies.length})</div>`;
            container.appendChild(friendlyTable);

            // 3. ENEMY ROSTER CONTROLS
            const modeDiv = document.createElement('div');
            modeDiv.innerHTML = `<div style="font-weight:bold; margin:15px 0 5px 0; color:#fff;">Enemy Roster</div>`;
            const switchEl = document.createElement('div');
            switchEl.className = 'mode-switch';
            switchEl.innerHTML = `
                <div class="mode-opt ${warTabMode === 'claim' ? 'active' : ''}" data-mode="claim">CLAIM MODE</div>
                <div class="mode-opt ${warTabMode === 'med' ? 'active' : ''}" data-mode="med">MED MODE</div>
            `;
            switchEl.querySelectorAll('.mode-opt').forEach(opt => {
                opt.onclick = () => { warTabMode = opt.dataset.mode; this.renderWar(container); }; // Re-render on toggle
            });
            container.appendChild(modeDiv);
            container.appendChild(switchEl);

            // 4. ENEMY ROSTER
            const enemies = WarMon.getEnemyMembers();
            const enemyTable = this.createRosterTable(enemies, 'enemy');
            container.appendChild(enemyTable);
        },

        createRosterTable(members, type) {
            const table = document.createElement('table');
            table.className = 'bfh-table';
            table.innerHTML = `<thead><tr><th width="10"></th><th>Name</th><th>Lvl</th><th>Status</th><th>${type === 'friendly' ? 'Watch' : 'Action'}</th></tr></thead><tbody></tbody>`;
            
            const tbody = table.querySelector('tbody');
            
            members.forEach(m => {
                const tr = document.createElement('tr');
                
                // Online Status Dot
                const onlineState = Managers.WarMonitor.getOnlineStatus(m.lastAction);
                const dotClass = `status-${onlineState}`; // online, idle, offline
                
                // Status Text & Color
                let statusTxt = m.status.state;
                let statusClass = 'txt-okay';
                if (statusTxt === 'Hospital') {
                    statusClass = 'txt-hosp';
                    // Calc timer
                    const now = Math.floor(Date.now()/1000);
                    if (m.status.until > now) {
                        const rem = m.status.until - now;
                        const min = Math.floor(rem/60);
                        const sec = rem%60;
                        statusTxt = `Hosp (${min}:${sec < 10 ? '0'+sec : sec})`;
                    }
                } else if (statusTxt === 'Traveling' || statusTxt === 'Abroad') {
                    statusClass = 'txt-travel';
                }

                // Action Column (Watcher or Dibs)
                let actionHtml = '';
                if (type === 'friendly') {
                    // Watcher toggle (Visual only for now)
                    actionHtml = `<div class="watcher-dot" onclick="this.classList.toggle('watcher-active')"></div>`;
                } else {
                    // Enemy Actions
                    if (warTabMode === 'claim') {
                        const isClaimed = Managers.DibsManager.isClaimed(m.id);
                        actionHtml = `<button class="btn-act btn-claim ${isClaimed ? 'claimed' : ''}" data-id="${m.id}">${isClaimed ? 'MINE' : 'DIBS'}</button>`;
                    } else {
                        actionHtml = `<button class="btn-act btn-med">MED</button>`;
                    }
                }

                tr.innerHTML = `
                    <td><div class="status-dot ${dotClass}" title="${m.lastAction}"></div></td>
                    <td><a href="https://www.torn.com/profiles.php?XID=${m.id}" target="_blank" style="color:#ddd;text-decoration:none">${m.name}</a></td>
                    <td>${m.level}</td>
                    <td class="${statusClass}">${statusTxt}</td>
                    <td align="center">${actionHtml}</td>
                `;

                // Bind Enemy Button Events
                if (type === 'enemy') {
                    const btn = tr.querySelector('button');
                    if (btn && warTabMode === 'claim') {
                        btn.onclick = () => {
                            if (Managers.DibsManager.isClaimed(m.id)) {
                                Managers.DibsManager.release(m.id);
                            } else {
                                Managers.DibsManager.claim(m.id, m.name);
                            }
                            this.switchTab('war'); // Refresh to update button state
                        };
                    }
                }

                tbody.appendChild(tr);
            });
            return table;
        },

        // ========================
        // TARGETS TAB (Simplified)
        // ========================
        renderTargets(container) {
            /* (Same logic as previous version, abbreviated here to save space) */
            Managers.TargetManager.getAll().forEach(t => {
                const el = document.createElement('div');
                el.style.cssText = 'padding:10px; border-bottom:1px solid #333; display:flex; justify-content:space-between;';
                el.innerHTML = `<div><div style="font-weight:bold; color:var(--accent)">${t.name}</div><div style="font-size:11px; color:#888;">${t.status.state}</div></div>
                                <button onclick="window.location.href='https://www.torn.com/loader.php?sid=attack&user2ID=${t.id}'" class="btn-act btn-claim">Attack</button>`;
                container.appendChild(el);
            });
        },

        renderSettings(container) {
            container.innerHTML = `<div style="padding:20px; text-align:center;">API Key: ${Core.state.apiKey ? 'Saved' : 'Missing'}</div>`;
        },

        openApiModal() { /* (Same as previous version) */ },
        refreshWarTab() { if (Core.state.activeTab === 'war') this.switchTab('war'); },
        refreshTargetsTab() { if (Core.state.activeTab === 'targets') this.switchTab('targets'); }
    };

    // ============================================
    // WAR PAGE INTEGRATION (Scraper)
    // ============================================
    const WarPageIntegration = {
        init() {
            if (window.location.href.includes('faction')) this.scan();
        },
        
        scan() {
            console.log('[BFH] Scanning for war data...');
            // 1. Try to find War Score Header on Faction Page
            const scoreNode = document.querySelector('.war-score-wrap'); // Example class, Torn changes these often
            if (scoreNode) {
                // Logic to extract numbers would go here
                // For now, we simulate finding IDs if we are on a war page
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('step') === 'your') {
                    // We are on our faction page. 
                    // This is a placeholder. In a real scenario, we parse the "War" tab DOM elements.
                    // For V1.2, we will assume we trigger the API instead.
                }
            }
            
            // Auto-detect IDs from API if not scraped
            if (Core.state.userData && Core.state.userData.faction && !Managers.WarMonitor.myFactionId) {
                // If we know our own faction ID from user data
                // We need to fetch faction wars to find enemy
                API.TornAPI.getFactionWar(Core.state.userData.faction.faction_id).then(data => {
                    if (data && data.wars && data.wars.length > 0) {
                        const war = data.wars[0]; // Grab first active war
                        const myId = data.ID;
                        const enemyId = Object.keys(war.factions).find(id => id !== String(myId));
                        
                        Managers.WarMonitor.start(myId, enemyId);
                        Managers.WarMonitor.setScores(war.factions[myId].score, war.factions[enemyId].score);
                    }
                });
            }
        }
    };

    window.BFH_UI = { init, UI, WarPageIntegration };
})();
