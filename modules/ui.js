/**
 * BjornsFactionHUB - UI Module
 * @version 1.3.0
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
        
        // Auto-refresh war data if we have an API key
        setInterval(() => {
            if(Core.state.isDrawerOpen && Core.state.activeTab === 'war') {
                Managers.WarMonitor.refreshAll();
            }
        }, 10000);
    }

    function checkForApiKey() {
        if (!Core.state.apiKey || Core.state.apiKey === '###PDA-APIKEY###') UI.openApiModal();
        else if (Managers && Managers.WarMonitor) {
             // Try to auto-start war monitor if we have user data
             if (Core.state.userData && Core.state.userData.faction) {
                 // Trigger background war check
                 API.TornAPI.getFactionWar(Core.state.userData.faction.faction_id).then(data => {
                    if (data && data.wars && data.wars.length > 0) {
                        const war = data.wars[0];
                        const myId = data.ID;
                        const enemyId = Object.keys(war.factions).find(id => id !== String(myId));
                        Managers.WarMonitor.start(myId, enemyId);
                        Managers.WarMonitor.setScores(war.factions[myId].score, war.factions[enemyId].score);
                    }
                 });
             }
        }
    }

    // ============================================
    // STYLES
    // ============================================
    const STYLES = `
        :host { --bg: #222; --header: #333; --accent: #88c000; --text: #fff; --muted: #aaa; --border: #444; --red: #ff4d4d; --yellow: #ffd700; --blue: #4da6ff; font-family: Arial, sans-serif; }
        
        .bfh-toggle-btn { position: fixed; bottom: 10px; left: 10px; width: 35px; height: 35px; background: var(--header); border: 1px solid var(--accent); border-radius: 4px; color: var(--text); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 99990; transition: 0.2s; }
        .bfh-toggle-btn:hover { box-shadow: 0 0 8px var(--accent); }

        /* COMPACT HUB */
        .bfh-hub { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 360px; height: 480px; background: var(--bg); border: 1px solid var(--accent); display: none; flex-direction: column; z-index: 99999; border-radius: 6px; box-shadow: 0 0 20px rgba(0,0,0,0.8); }
        .bfh-hub.open { display: flex; }
        
        .bfh-header { padding: 8px 12px; background: var(--header); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: bold; }
        .bfh-tabs { display: flex; background: var(--header); border-bottom: 1px solid var(--border); }
        .bfh-tab { flex: 1; padding: 8px; text-align: center; cursor: pointer; color: var(--muted); border-bottom: 2px solid transparent; font-size: 12px; }
        .bfh-tab.active { border-bottom-color: var(--accent); color: var(--text); background: #3a3a3a; }
        .bfh-content { flex: 1; overflow-y: auto; padding: 0; }
        
        /* WAR BOARD */
        .bfh-score-board { display: flex; justify-content: space-between; background: #151515; padding: 8px; border-bottom: 1px solid var(--border); }
        .bfh-score-box { text-align: center; flex: 1; }
        .bfh-score-val { font-size: 16px; font-weight: bold; }
        .bfh-score-label { font-size: 9px; color: var(--muted); text-transform: uppercase; }
        .bfh-vs { align-self: center; font-weight: bold; color: #444; font-size: 10px; }
        
        /* TABLES */
        .bfh-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .bfh-table th { text-align: left; color: var(--muted); padding: 4px 6px; background: #2a2a2a; position: sticky; top: 0; }
        .bfh-table td { padding: 4px 6px; border-bottom: 1px solid #333; }
        .bfh-table tr:hover { background: #2a2a2a; }
        
        /* STATUS LIGHTS */
        .status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; background: #555; vertical-align: middle; }
        .status-online { background: var(--accent); box-shadow: 0 0 3px var(--accent); }
        .status-idle { background: var(--yellow); }
        .status-offline { background: #555; }
        
        .watcher-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; background: #333; border: 1px solid #555; cursor: pointer; }
        .watcher-active { background: var(--accent); border-color: var(--accent); }
        
        /* MODE SWITCH */
        .mode-switch { display: flex; background: #333; border-bottom: 1px solid var(--border); }
        .mode-opt { flex: 1; text-align: center; padding: 4px; cursor: pointer; font-size: 10px; color: var(--muted); }
        .mode-opt.active { background: var(--accent); color: #000; font-weight: bold; }

        /* BUTTONS */
        .btn-act { padding: 2px 5px; border-radius: 3px; border: none; cursor: pointer; font-size: 9px; color: #fff; min-width: 40px; }
        .btn-claim { background: #444; }
        .btn-claim.claimed { background: var(--accent); color: #000; }
        .btn-med { background: var(--red); }
        
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
                <div class="bfh-header"><span style="color:var(--accent);">BjornsFactionHUB</span><span class="bfh-close" style="cursor:pointer;">✕</span></div>
                <div class="bfh-tabs">
                    <div class="bfh-tab active" data-tab="targets">Targets</div>
                    <div class="bfh-tab" data-tab="war">War</div>
                    <div class="bfh-tab" data-tab="settings">Config</div>
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
                <div class="bfh-score-box"><div class="bfh-score-val" style="color:var(--accent)">${WarMon.warScores.myScore || 0}</div><div class="bfh-score-label">US</div></div>
                <div class="bfh-vs">VS</div>
                <div class="bfh-score-box"><div class="bfh-score-val" style="color:var(--red)">${WarMon.warScores.enemyScore || 0}</div><div class="bfh-score-label">THEM</div></div>
            `;
            container.appendChild(scoreDiv);

            if (!WarMon.myFactionId || !WarMon.enemyFactionId) {
                container.innerHTML += `<div style="text-align:center; padding:40px; color:#666; font-size:11px;">
                    <div>No Active War Detected</div>
                    <div style="margin-top:5px; color:#444;">Monitoring for updates...</div>
                </div>`;
                return;
            }

            // 2. ENEMY ROSTER HEADER & SWITCH
            const switchEl = document.createElement('div');
            switchEl.className = 'mode-switch';
            switchEl.innerHTML = `
                <div class="mode-opt ${warTabMode === 'claim' ? 'active' : ''}" data-mode="claim">CLAIM MODE</div>
                <div class="mode-opt ${warTabMode === 'med' ? 'active' : ''}" data-mode="med">MED MODE</div>
            `;
            switchEl.querySelectorAll('.mode-opt').forEach(opt => {
                opt.onclick = () => { warTabMode = opt.dataset.mode; this.renderWar(container); };
            });
            container.appendChild(switchEl);

            // 3. ENEMY ROSTER TABLE
            const enemies = WarMon.getEnemyMembers();
            if (enemies.length > 0) {
                container.appendChild(this.createRosterTable(enemies, 'enemy'));
            } else {
                container.innerHTML += `<div style="padding:20px; text-align:center; font-size:11px; color:#666;">Loading Enemy Roster...</div>`;
            }
            
            // 4. FRIENDLY ROSTER (Collapsed/Bottom)
            const friendlyHeader = document.createElement('div');
            friendlyHeader.style.cssText = 'padding:8px; background:#111; color:#666; font-size:10px; font-weight:bold; border-top:1px solid #333; margin-top:10px;';
            friendlyHeader.textContent = `FRIENDLY ROSTER (${WarMon.getFriendlyMembers().length})`;
            container.appendChild(friendlyHeader);
            
            const friendlies = WarMon.getFriendlyMembers();
            if (friendlies.length > 0) {
                 container.appendChild(this.createRosterTable(friendlies, 'friendly'));
            }
        },

        createRosterTable(members, type) {
            const table = document.createElement('table');
            table.className = 'bfh-table';
            table.innerHTML = `<thead><tr><th width="10"></th><th>Name</th><th>Lvl</th><th>Status</th><th>${type === 'friendly' ? 'Watch' : 'Action'}</th></tr></thead><tbody></tbody>`;
            
            const tbody = table.querySelector('tbody');
            
            members.forEach(m => {
                const tr = document.createElement('tr');
                
                // Online Status
                const onlineState = Managers.WarMonitor.getOnlineStatus(m.lastAction);
                const dotClass = `status-${onlineState}`;
                
                // Status Text
                let statusTxt = m.status.state;
                let statusClass = 'txt-okay';
                if (statusTxt === 'Hospital') {
                    statusClass = 'txt-hosp';
                    const now = Math.floor(Date.now()/1000);
                    if (m.status.until > now) {
                        const rem = m.status.until - now;
                        const min = Math.floor(rem/60);
                        const sec = rem%60;
                        statusTxt = `${min}:${sec < 10 ? '0'+sec : sec}`;
                    }
                } else if (['Traveling','Abroad'].includes(statusTxt)) {
                    statusClass = 'txt-travel';
                    statusTxt = 'Travel';
                }

                // Actions
                let actionHtml = '';
                if (type === 'friendly') {
                    actionHtml = `<div class="watcher-dot" onclick="this.classList.toggle('watcher-active')"></div>`;
                } else {
                    if (warTabMode === 'claim') {
                        const isClaimed = Managers.DibsManager.isClaimed(m.id);
                        actionHtml = `<button class="btn-act btn-claim ${isClaimed ? 'claimed' : ''}">${isClaimed ? 'MINE' : 'DIBS'}</button>`;
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

                // Button Events
                if (type === 'enemy') {
                    const btn = tr.querySelector('button');
                    if (btn && warTabMode === 'claim') {
                        btn.onclick = () => {
                            if (Managers.DibsManager.isClaimed(m.id)) Managers.DibsManager.release(m.id);
                            else Managers.DibsManager.claim(m.id, m.name);
                            this.switchTab('war');
                        };
                    }
                }

                tbody.appendChild(tr);
            });
            return table;
        },

        // ========================
        // TARGETS TAB
        // ========================
        renderTargets(container) {
            const targets = Managers.TargetManager.getAll();
            if (targets.length === 0) {
                 container.innerHTML = `<div style="padding:40px; text-align:center; font-size:11px; color:#666;">No targets yet.<br>Go to a profile to add one.</div>`;
                 return;
            }
            targets.forEach(t => {
                const el = document.createElement('div');
                el.style.cssText = 'padding:8px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;';
                
                let statusClass = 'txt-okay';
                if (t.status?.state === 'Hospital') statusClass = 'txt-hosp';
                else if (t.status?.state === 'Traveling') statusClass = 'txt-travel';

                el.innerHTML = `
                    <div>
                        <div style="font-weight:bold; font-size:12px; color:var(--accent)">
                            <a href="https://www.torn.com/profiles.php?XID=${t.id}" target="_blank" style="color:inherit;text-decoration:none;">${t.name}</a>
                        </div>
                        <div style="font-size:10px; color:#888;">Lvl ${t.level} • <span class="${statusClass}">${t.status?.state || '?'}</span></div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-act btn-claim" id="att-${t.id}">Attack</button>
                        <button class="btn-act btn-med" id="del-${t.id}">×</button>
                    </div>`;
                
                el.querySelector(`#att-${t.id}`).onclick = () => window.location.href = `https://www.torn.com/loader.php?sid=attack&user2ID=${t.id}`;
                el.querySelector(`#del-${t.id}`).onclick = () => { Managers.TargetManager.remove(t.id); this.renderTargets(container); };
                container.appendChild(el);
            });
        },

        renderSettings(container) {
            container.innerHTML = `
                <div style="padding:15px; font-size:11px;">
                    <div style="margin-bottom:15px;">
                        <div style="color:var(--muted); margin-bottom:5px;">API Key</div>
                        <div style="color:var(--text); font-family:monospace; background:#111; padding:5px; border:1px solid #333;">
                            ${Core.state.apiKey ? '••••••••••••' + Core.state.apiKey.slice(-4) : 'Not Set'}
                        </div>
                        <button class="btn-act btn-claim" style="margin-top:5px; width:100%;" id="reset-key">Change Key</button>
                    </div>
                    <button class="btn-act btn-med" style="width:100%; padding:8px;" id="wipe-data">Factory Reset</button>
                </div>`;
            container.querySelector('#reset-key').onclick = () => { Core.Storage.remove('apiKey'); Core.state.apiKey=null; this.openApiModal(); };
            container.querySelector('#wipe-data').onclick = () => { if(confirm('Reset all data?')) { Core.Storage.clearAll(); location.reload(); }};
        },

        openApiModal() {
            if (apiModalEl) return;
            apiModalEl = document.createElement('div');
            apiModalEl.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:100000; display:flex; align-items:center; justify-content:center;';
            apiModalEl.innerHTML = `
                <div style="background:#222; padding:20px; border:1px solid var(--accent); width:300px; text-align:center; border-radius:5px;">
                    <h3 style="color:var(--accent); margin-top:0;">API Key Required</h3>
                    <input type="text" id="api-input" style="width:90%; padding:8px; background:#111; border:1px solid #444; color:#fff; margin:10px 0;" placeholder="16-character key">
                    <button id="save-api" style="width:100%; padding:10px; background:var(--accent); border:none; font-weight:bold; cursor:pointer;">SAVE</button>
                    <div style="margin-top:10px; font-size:10px;"><a href="https://www.torn.com/preferences.php#tab=api" target="_blank" style="color:#888;">Get Key</a></div>
                </div>`;
            apiModalEl.querySelector('#save-api').onclick = () => {
                const k = apiModalEl.querySelector('#api-input').value.trim();
                if(k.length===16) { Core.state.apiKey=k; Core.Storage.set('apiKey',k); apiModalEl.remove(); apiModalEl=null; setTimeout(()=>location.reload(), 500); }
                else alert('Invalid Key');
            };
            shadowRoot.appendChild(apiModalEl);
        },

        refreshTargetsTab() { if (Core.state.activeTab === 'targets') this.switchTab('targets'); }
    };

    const WarPageIntegration = { init(){} }; // Legacy placeholder

    window.BFH_UI = { init, UI, WarPageIntegration };
})();
