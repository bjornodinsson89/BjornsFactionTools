/**
 * BjornsFactionHUB - Managers Module
 * Contains: TargetManager, WarMonitor, NotesManager, DibsManager
 * @author BjornOdinsson89
 * @version 1.1.0
 */

(function() {
    'use strict';

    let Core = null;
    let API = null;
    let UI = null;

    function init(coreModule, apiModule, uiModule) {
        Core = coreModule;
        API = apiModule;
        UI = uiModule;
        console.log('[BFH_Managers] Initialized');
    }

    // ============================================
    // TARGET MANAGER (Unchanged)
    // ============================================
    const TargetManager = {
        targets: [],
        load() { if (Core) this.targets = Core.Storage.get('targets', []); },
        save() { if (Core) Core.Storage.set('targets', this.targets); },
        add(target) {
            const existing = this.targets.findIndex(t => String(t.id) === String(target.id));
            const tData = { ...target, id: String(target.id), updatedAt: Date.now() };
            if (existing >= 0) this.targets[existing] = { ...this.targets[existing], ...tData };
            else this.targets.push({ ...tData, addedAt: Date.now() });
            this.save();
            if (UI && UI.UI) UI.UI.refreshTargetsTab();
        },
        remove(targetId) {
            this.targets = this.targets.filter(t => String(t.id) !== String(targetId));
            this.save();
            if (UI && UI.UI) UI.UI.refreshTargetsTab();
        },
        getAll() { return [...this.targets]; },
        get(targetId) { return this.targets.find(t => String(t.id) === String(targetId)) || null; },
        async refreshAll() {
            if (!API) return;
            for (const target of this.targets) {
                try {
                    const userData = await API.TornAPI.getUser(target.id);
                    this.add({ ...target, ...userData }); // Updates existing
                    await Core.Utils.sleep(500);
                } catch(e) { console.error(e); }
            }
        }
    };

    // ============================================
    // WAR MONITOR (Updated)
    // ============================================
    const WarMonitor = {
        isActive: false,
        myFactionId: null,
        enemyFactionId: null,
        factionMembers: new Map(), // Stores ALL members (friendly + enemy)
        warScores: { myScore: 0, enemyScore: 0, startTime: 0 },
        intervalId: null,

        async start(myId, enemyId) {
            this.myFactionId = String(myId);
            this.enemyFactionId = String(enemyId);
            this.isActive = true;

            // Initial fetch
            await this.refreshAll();

            // Poll every 30s
            if (this.intervalId) clearInterval(this.intervalId);
            this.intervalId = setInterval(() => this.refreshAll(), 30000);
            
            console.log(`[BFH_Managers] War Monitor Started: ${myId} vs ${enemyId}`);
        },

        stop() {
            this.isActive = false;
            if (this.intervalId) clearInterval(this.intervalId);
        },

        setScores(myScore, enemyScore) {
            this.warScores.myScore = myScore;
            this.warScores.enemyScore = enemyScore;
            if (UI && UI.UI) UI.UI.refreshWarTab();
        },

        async refreshAll() {
            if(this.myFactionId) await this.fetchFaction(this.myFactionId);
            if(this.enemyFactionId) await this.fetchFaction(this.enemyFactionId);
            if (UI && UI.UI) UI.UI.refreshWarTab();
        },

        async fetchFaction(factionId) {
            if (!API) return;
            try {
                const data = await API.TornAPI.getFaction(factionId);
                if (!data || !data.members) return;

                Object.entries(data.members).forEach(([id, m]) => {
                    this.factionMembers.set(id, {
                        id: id,
                        name: m.name,
                        level: m.level,
                        status: m.status, // { state: "Hospital", until: 12345... }
                        lastAction: m.last_action, // User's last action relative string or stats
                        factionId: String(factionId)
                    });
                });
            } catch (e) { console.error('War fetch error:', e); }
        },

        getFriendlyMembers() {
            if (!this.myFactionId) return [];
            return Array.from(this.factionMembers.values())
                .filter(m => String(m.factionId) === String(this.myFactionId))
                .sort((a, b) => b.level - a.level);
        },

        getEnemyMembers() {
            if (!this.enemyFactionId) return [];
            return Array.from(this.factionMembers.values())
                .filter(m => String(m.factionId) === String(this.enemyFactionId))
                .sort((a, b) => b.level - a.level);
        },

        /**
         * Helper to calculate Online/Idle/Offline status
         * Returns: 'online' (green), 'idle' (yellow), 'offline' (grey)
         */
        getOnlineStatus(lastActionStr) {
            if (!lastActionStr || !lastActionStr.includes) return 'offline';
            if (lastActionStr.includes('Online')) return 'online';
            
            // Parse "X minutes ago"
            const match = lastActionStr.match(/(\d+)\s+(minute|hour|day)/);
            if (!match) return 'offline';
            
            const num = parseInt(match[1]);
            const unit = match[2];

            if (unit.startsWith('minute')) {
                if (num <= 10) return 'online';
                if (num < 60) return 'idle';
            }
            return 'offline';
        }
    };

    // ============================================
    // DIBS MANAGER (Unchanged)
    // ============================================
    const DibsManager = {
        dibs: [],
        load() { if(Core) this.dibs = Core.Storage.get('dibs', []); },
        save() { if(Core) Core.Storage.set('dibs', this.dibs); },
        
        claim(opponentId, opponentName) {
            // Check if already claimed
            const existing = this.dibs.find(d => String(d.id) === String(opponentId));
            if (existing) return false;

            this.dibs.push({
                id: opponentId,
                name: opponentName,
                timestamp: Date.now()
            });
            this.save();
            return true;
        },
        
        release(opponentId) {
            this.dibs = this.dibs.filter(d => String(d.id) !== String(opponentId));
            this.save();
        },

        isClaimed(opponentId) {
            return this.dibs.some(d => String(d.id) === String(opponentId));
        }
    };

    // ============================================
    // NOTES MANAGER (Stubbed for brevity)
    // ============================================
    const NotesManager = { load(){}, save(){} }; 

    window.BFH_Managers = { init, TargetManager, WarMonitor, DibsManager, NotesManager };
})();
