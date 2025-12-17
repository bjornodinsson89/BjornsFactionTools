/**
 * BjornsFactionHUB - Managers Module
 * 
 * Contains: TargetManager, WarMonitor, NotesManager, DibsManager
 * 
 * @author BjornOdinsson89
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Module references (set during init)
    let Core = null;
    let API = null;
    let UI = null;

    /**
     * Initialize managers with dependencies
     */
    function init(coreModule, apiModule, uiModule) {
        Core = coreModule;
        API = apiModule;
        UI = uiModule;
        console.log('[BFH_Managers] Initialized with dependencies');
    }

    // ============================================
    // TARGET MANAGER
    // ============================================
    const TargetManager = {
        targets: [],

        /**
         * Load targets from storage
         */
        load() {
            if (!Core) return;
            this.targets = Core.Storage.get('targets', []);
            Core.Utils.debug('Loaded', this.targets.length, 'targets');
        },

        /**
         * Save targets to storage
         */
        save() {
            if (!Core) return;
            Core.Storage.set('targets', this.targets);
        },

        /**
         * Add or update a target
         * @param {Object} target - Target data
         */
        add(target) {
            const existing = this.targets.findIndex(t => String(t.id) === String(target.id));
            
            if (existing >= 0) {
                // Update existing
                this.targets[existing] = {
                    ...this.targets[existing],
                    ...target,
                    updatedAt: Date.now()
                };
            } else {
                // Add new
                this.targets.push({
                    ...target,
                    id: String(target.id),
                    addedAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
            
            this.save();
            
            if (UI && UI.UI) {
                UI.UI.refreshTargetsTab();
            }
        },

        /**
         * Remove a target
         * @param {string} targetId - Target ID to remove
         */
        remove(targetId) {
            this.targets = this.targets.filter(t => String(t.id) !== String(targetId));
            this.save();
            
            if (UI && UI.UI) {
                UI.UI.refreshTargetsTab();
            }
        },

        /**
         * Get all targets
         * @returns {Array} All targets
         */
        getAll() {
            return [...this.targets];
        },

        /**
         * Get target by ID
         * @param {string} targetId - Target ID
         * @returns {Object|null} Target or null
         */
        get(targetId) {
            return this.targets.find(t => String(t.id) === String(targetId)) || null;
        },

        /**
         * Refresh target data from API
         * @param {string} targetId - Target ID
         * @returns {Promise<Object|null>} Updated target data
         */
        async refresh(targetId) {
            if (!API) return null;

            try {
                const userData = await API.TornAPI.getUser(targetId);
                const target = this.get(targetId);
                
                if (target) {
                    target.name = userData.name;
                    target.level = userData.level;
                    target.status = userData.status;
                    target.life = userData.life;
                    target.lastAction = userData.last_action;
                    target.faction = userData.faction;
                    target.updatedAt = Date.now();
                    this.save();
                }
                
                return userData;
            } catch (e) {
                console.error('[BFH_Managers] Target refresh error:', e);
                return null;
            }
        },

        /**
         * Refresh all targets
         */
        async refreshAll() {
            if (!Core) return;

            for (const target of this.targets) {
                await this.refresh(target.id);
                await Core.Utils.sleep(600); // Rate limit buffer
            }
            
            if (UI && UI.UI) {
                UI.UI.refreshTargetsTab();
            }
        },

        /**
         * Export targets as JSON
         * @returns {string} JSON string
         */
        export() {
            return JSON.stringify(this.targets, null, 2);
        },

        /**
         * Import targets from JSON
         * @param {string} jsonString - JSON string
         * @returns {number} Number of imported targets
         */
        import(jsonString) {
            try {
                const imported = JSON.parse(jsonString);
                if (!Array.isArray(imported)) throw new Error('Invalid format');
                
                let count = 0;
                imported.forEach(t => {
                    if (t.id) {
                        this.add(t);
                        count++;
                    }
                });
                
                return count;
            } catch (e) {
                console.error('[BFH_Managers] Import error:', e);
                return 0;
            }
        }
    };

    // ============================================
    // WAR MONITOR
    // ============================================
    const WarMonitor = {
        isActive: false,
        factionMembers: new Map(),
        monitoredFactions: [],
        intervalId: null,

        /**
         * Start monitoring factions
         * @param {Array<string>} factionIds - Faction IDs to monitor
         */
        async start(factionIds) {
            if (this.isActive) {
                console.log('[BFH_Managers] War monitor already active');
                return;
            }

            this.isActive = true;
            this.monitoredFactions = factionIds;

            // Initial fetch
            for (const factionId of factionIds) {
                await this.fetchFactionData(factionId);
            }

            // Set up polling
            this.intervalId = setInterval(() => {
                this.monitoredFactions.forEach(id => this.fetchFactionData(id));
            }, Core ? Core.CONFIG.POLL_INTERVAL : 10000);

            console.log('[BFH_Managers] War monitor started for factions:', factionIds);
        },

        /**
         * Stop monitoring
         */
        stop() {
            this.isActive = false;
            
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            
            console.log('[BFH_Managers] War monitor stopped');
        },

        /**
         * Fetch faction data
         * @param {string} factionId - Faction ID
         */
        async fetchFactionData(factionId) {
            if (!API) return;

            try {
                const data = await API.TornAPI.getFaction(factionId);
                
                if (!data || !data.members) return;

                Object.entries(data.members).forEach(([memberId, member]) => {
                    const existing = this.factionMembers.get(memberId) || {};
                    
                    this.factionMembers.set(memberId, {
                        ...existing,
                        id: memberId,
                        name: member.name,
                        level: member.level,
                        status: member.status,
                        lastAction: member.last_action,
                        factionId: factionId,
                        factionName: data.name,
                        factionTag: data.tag,
                        position: member.position,
                        daysInFaction: member.days_in_faction,
                        updatedAt: Date.now()
                    });
                });

                if (UI && UI.UI) {
                    UI.UI.refreshWarTab();
                }

            } catch (e) {
                console.error('[BFH_Managers] War monitor fetch error:', e);
            }
        },

        /**
         * Get members grouped by status
         * @returns {Object} Members by status
         */
        getMembersByStatus() {
            const members = Array.from(this.factionMembers.values());
            
            return {
                okay: members.filter(m => m.status?.state === 'Okay'),
                hospital: members.filter(m => m.status?.state === 'Hospital'),
                jail: members.filter(m => m.status?.state === 'Jail'),
                traveling: members.filter(m => ['Traveling', 'Abroad'].includes(m.status?.state)),
                federal: members.filter(m => m.status?.state === 'Federal'),
                all: members
            };
        },

        /**
         * Get hospital timers sorted by time remaining
         * @returns {Array} Hospital timers
         */
        getHospitalTimers() {
            const now = Math.floor(Date.now() / 1000);
            
            return Array.from(this.factionMembers.values())
                .filter(m => m.status?.state === 'Hospital' && m.status?.until > now)
                .map(m => ({
                    ...m,
                    timeRemaining: m.status.until - now
                }))
                .sort((a, b) => a.timeRemaining - b.timeRemaining);
        },

        /**
         * Get member by ID
         * @param {string} memberId - Member ID
         * @returns {Object|undefined} Member data
         */
        getMember(memberId) {
            return this.factionMembers.get(memberId);
        },

        /**
         * Clear all monitored data
         */
        clear() {
            this.factionMembers.clear();
            this.monitoredFactions = [];
        }
    };

    // ============================================
    // NOTES MANAGER
    // ============================================
    const NotesManager = {
        notes: {},

        /**
         * Load notes from storage
         */
        load() {
            if (!Core) return;
            this.notes = Core.Storage.get('notes', {});
            Core.Utils.debug('Loaded', Object.keys(this.notes).length, 'notes');
        },

        /**
         * Save notes to storage
         */
        save() {
            if (!Core) return;
            Core.Storage.set('notes', this.notes);
        },

        /**
         * Get note for player
         * @param {string} playerId - Player ID
         * @returns {Object} Note data
         */
        get(playerId) {
            return this.notes[playerId] || { text: '', color: '', updatedAt: null };
        },

        /**
         * Set note for player
         * @param {string} playerId - Player ID
         * @param {string} text - Note text
         * @param {string} color - Note color
         */
        set(playerId, text, color = '') {
            this.notes[playerId] = {
                text: text,
                color: color,
                updatedAt: Date.now()
            };
            this.save();
        },

        /**
         * Remove note for player
         * @param {string} playerId - Player ID
         */
        remove(playerId) {
            delete this.notes[playerId];
            this.save();
        },

        /**
         * Get all notes
         * @returns {Object} All notes
         */
        getAll() {
            return { ...this.notes };
        },

        /**
         * Check if player has note
         * @param {string} playerId - Player ID
         * @returns {boolean}
         */
        has(playerId) {
            return !!this.notes[playerId]?.text;
        },

        /**
         * Search notes by text
         * @param {string} query - Search query
         * @returns {Array} Matching notes
         */
        search(query) {
            const q = query.toLowerCase();
            return Object.entries(this.notes)
                .filter(([_, note]) => note.text.toLowerCase().includes(q))
                .map(([id, note]) => ({ id, ...note }));
        },

        /**
         * Clear all notes
         */
        clearAll() {
            this.notes = {};
            this.save();
        }
    };

    // ============================================
    // DIBS MANAGER
    // ============================================
    const DibsManager = {
        dibs: [],

        /**
         * Load dibs from storage
         */
        load() {
            if (!Core) return;
            this.dibs = Core.Storage.get('dibs', []);
            Core.Utils.debug('Loaded', this.dibs.length, 'dibs');
        },

        /**
         * Save dibs to storage
         */
        save() {
            if (!Core) return;
            Core.Storage.set('dibs', this.dibs);
        },

        /**
         * Claim dibs on opponent
         * @param {string} opponentId - Opponent ID
         * @param {string} opponentName - Opponent name
         * @param {string} claimerId - Claimer ID
         * @param {string} claimerName - Claimer name
         * @returns {Object} Result
         */
        claim(opponentId, opponentName, claimerId, claimerName) {
            const existing = this.dibs.find(d => String(d.opponentId) === String(opponentId));
            
            if (existing) {
                return {
                    success: false,
                    message: `Already claimed by ${existing.claimerName}`,
                    existingClaim: existing
                };
            }

            const newClaim = {
                opponentId: String(opponentId),
                opponentName: opponentName || `Player ${opponentId}`,
                claimerId: String(claimerId),
                claimerName: claimerName || `Player ${claimerId}`,
                claimedAt: Date.now()
            };

            this.dibs.push(newClaim);
            this.save();

            return {
                success: true,
                message: 'Dibs claimed!',
                claim: newClaim
            };
        },

        /**
         * Release dibs on opponent
         * @param {string} opponentId - Opponent ID
         */
        release(opponentId) {
            this.dibs = this.dibs.filter(d => String(d.opponentId) !== String(opponentId));
            this.save();
        },

        /**
         * Get dibs by opponent ID
         * @param {string} opponentId - Opponent ID
         * @returns {Object|undefined} Dibs data
         */
        getByOpponent(opponentId) {
            return this.dibs.find(d => String(d.opponentId) === String(opponentId));
        },

        /**
         * Get all dibs by claimer
         * @param {string} claimerId - Claimer ID
         * @returns {Array} Dibs by claimer
         */
        getByClaimer(claimerId) {
            return this.dibs.filter(d => String(d.claimerId) === String(claimerId));
        },

        /**
         * Get all dibs
         * @returns {Array} All dibs
         */
        getAll() {
            return [...this.dibs];
        },

        /**
         * Check if opponent has dibs
         * @param {string} opponentId - Opponent ID
         * @returns {boolean}
         */
        hasDibs(opponentId) {
            return this.dibs.some(d => String(d.opponentId) === String(opponentId));
        },

        /**
         * Clear all dibs
         */
        clearAll() {
            this.dibs = [];
            this.save();
        },

        /**
         * Clear expired dibs (older than specified hours)
         * @param {number} hours - Hours to keep
         */
        clearExpired(hours = 24) {
            const cutoff = Date.now() - (hours * 60 * 60 * 1000);
            this.dibs = this.dibs.filter(d => d.claimedAt > cutoff);
            this.save();
        }
    };

    // ============================================
    // EXPORT MODULE
    // ============================================
    window.BFH_Managers = {
        init,
        TargetManager,
        WarMonitor,
        NotesManager,
        DibsManager
    };

    console.log('[BFH_Managers] Module loaded');

})();
