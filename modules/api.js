/**
 * BjornsFactionHUB - API Module
 * 
 * Contains: Torn API, TornStats, FFScouter integrations
 * 
 * @author BjornOdinsson89
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Wait for core module
    function getCore() {
        return window.BFH_Core || null;
    }

    // ============================================
    // TORN API
    // ============================================
    const TornAPI = {
        /**
         * Fetch data from Torn API
         * @param {string} endpoint - API endpoint (user, faction, torn, etc.)
         * @param {string} selections - Comma-separated selections
         * @param {string} id - Optional ID for the endpoint
         * @param {Object} options - Additional options
         * @returns {Promise<Object>} API response data
         */
        async fetch(endpoint, selections, id = '', options = {}) {
            const Core = getCore();
            if (!Core) throw new Error('Core module not loaded');

            const { state, CONFIG, ENDPOINTS, Utils } = Core;

            if (!state.apiKey) {
                throw new Error('API key not configured. Please set your Torn API key in settings.');
            }

            // Check cache first
            const cacheKey = `${endpoint}/${id}/${selections}`;
            const cached = state.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION && !options.bypassCache) {
                Utils.debug('Cache hit for:', cacheKey);
                return cached.data;
            }

            // Rate limiting
            const now = Date.now();
            state.apiCallLog = state.apiCallLog.filter(t => t > now - 60000);
            
            if (state.apiCallLog.length >= CONFIG.API_RATE_LIMIT) {
                Utils.debug('Rate limit reached, waiting...');
                await Utils.sleep(2000);
                state.apiCallLog = state.apiCallLog.filter(t => t > now - 60000);
            }

            // Build URL
            const idPart = id ? `/${id}` : '';
            const url = `${ENDPOINTS.TORN_API}/${endpoint}${idPart}?selections=${selections}&key=${state.apiKey}&comment=BjornsFactionHUB`;

            try {
                state.apiCallLog.push(Date.now());
                Utils.debug('API Request:', endpoint, id, selections);

                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.error) {
                    const errorCode = data.error.code;
                    const errorMsg = data.error.error;
                    
                    // Handle specific error codes
                    switch (errorCode) {
                        case 2: // Incorrect key
                        case 10: // Key owner in federal jail
                        case 13: // Key disabled
                            throw new Error(`API Key Error: ${errorMsg}`);
                        case 5: // Too many requests
                            await Utils.sleep(5000);
                            return this.fetch(endpoint, selections, id, options);
                        case 8: // IP block
                        case 9: // API disabled
                            throw new Error(`API Unavailable: ${errorMsg}`);
                        default:
                            throw new Error(`Torn API Error (${errorCode}): ${errorMsg}`);
                    }
                }

                // Cache successful response
                state.cache.set(cacheKey, { data, timestamp: Date.now() });
                Utils.debug('API Response cached:', cacheKey);

                return data;

            } catch (e) {
                console.error('[BFH_API] TornAPI.fetch error:', e);
                throw e;
            }
        },

        /**
         * Get user data
         * @param {string} userId - User ID (empty for current user)
         * @returns {Promise<Object>} User data
         */
        async getUser(userId = '') {
            return this.fetch('user', 'basic,profile,personalstats', userId);
        },

        /**
         * Get user with battle stats (requires special access)
         * @param {string} userId - User ID
         * @returns {Promise<Object>} User data with battle stats
         */
        async getUserWithStats(userId = '') {
            return this.fetch('user', 'basic,profile,personalstats,battlestats', userId);
        },

        /**
         * Get faction data
         * @param {string} factionId - Faction ID (empty for current faction)
         * @returns {Promise<Object>} Faction data
         */
        async getFaction(factionId = '') {
            return this.fetch('faction', 'basic,members', factionId);
        },

        /**
         * Get faction war data
         * @param {string} factionId - Faction ID
         * @returns {Promise<Object>} Faction war data
         */
        async getFactionWar(factionId = '') {
            return this.fetch('faction', 'basic,members,wars', factionId);
        },

        /**
         * Get user attacks
         * @param {string} userId - User ID
         * @returns {Promise<Object>} Attack data
         */
        async getAttacks(userId = '') {
            return this.fetch('user', 'attacks', userId);
        },

        /**
         * Get user attack log (detailed)
         * @param {string} userId - User ID
         * @returns {Promise<Object>} Attack log data
         */
        async getAttacksFull(userId = '') {
            return this.fetch('user', 'attacksfull', userId);
        },

        /**
         * Clear API cache
         */
        clearCache() {
            const Core = getCore();
            if (Core) {
                Core.state.cache.clear();
                console.log('[BFH_API] Cache cleared');
            }
        }
    };

    // ============================================
    // TORNSTATS INTEGRATION
    // ============================================
    const TornStats = {
        /**
         * Get spy data from TornStats
         * @param {string} playerId - Player ID
         * @returns {Promise<Object|null>} Spy data or null
         */
        async getSpyData(playerId) {
            const Core = getCore();
            if (!Core) return null;

            const { state, ENDPOINTS, Utils } = Core;

            if (!state.tornStatsKey) {
                Utils.debug('TornStats key not configured');
                return null;
            }

            try {
                const url = `${ENDPOINTS.TORNSTATS}/${state.tornStatsKey}/spy/user/${playerId}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`TornStats HTTP ${response.status}`);
                }

                const data = await response.json();
                
                if (data.status === false) {
                    Utils.debug('TornStats error:', data.message);
                    return null;
                }

                return data.spy || null;

            } catch (e) {
                console.warn('[BFH_API] TornStats error:', e);
                return null;
            }
        },

        /**
         * Get battle stats from TornStats
         * @param {string} playerId - Player ID
         * @returns {Promise<Object|null>} Battle stats or null
         */
        async getBattleStats(playerId) {
            const spyData = await this.getSpyData(playerId);
            
            if (!spyData) return null;

            return {
                strength: spyData.strength || 0,
                speed: spyData.speed || 0,
                dexterity: spyData.dexterity || 0,
                defense: spyData.defense || 0,
                total: spyData.total || 0,
                timestamp: spyData.timestamp || 0,
                source: 'TornStats'
            };
        },

        /**
         * Check if TornStats is configured
         * @returns {boolean}
         */
        isConfigured() {
            const Core = getCore();
            return Core && !!Core.state.tornStatsKey;
        }
    };

    // ============================================
    // FFSCOUTER / YATA INTEGRATION
    // ============================================
    const FFScouter = {
        /**
         * Get fair fight estimate from YATA
         * @param {string} playerId - Player ID
         * @returns {Promise<Object|null>} Fair fight data or null
         */
        async getFairFight(playerId) {
            const Core = getCore();
            if (!Core) return null;

            const { ENDPOINTS, Utils } = Core;

            try {
                // YATA public BS endpoint
                const url = `${ENDPOINTS.YATA}/bs/?id=${playerId}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`YATA HTTP ${response.status}`);
                }

                const data = await response.json();
                
                if (data.error) {
                    Utils.debug('YATA error:', data.error);
                    return null;
                }

                return {
                    estimate: data.battleScore || data.bs || null,
                    fairFight: data.ff || null,
                    respect: data.respect || null,
                    source: 'YATA'
                };

            } catch (e) {
                console.warn('[BFH_API] FFScouter/YATA error:', e);
                return null;
            }
        },

        /**
         * Get combined stats from multiple sources
         * @param {string} playerId - Player ID
         * @returns {Promise<Object>} Combined stats data
         */
        async getCombinedStats(playerId) {
            const [tornStats, ffData] = await Promise.all([
                TornStats.getBattleStats(playerId),
                this.getFairFight(playerId)
            ]);

            return {
                tornStats: tornStats,
                fairFight: ffData,
                hasTornStats: !!tornStats,
                hasFairFight: !!ffData,
                fetchedAt: Date.now()
            };
        }
    };

    // ============================================
    // API UTILITIES
    // ============================================
    const APIUtils = {
        /**
         * Test API key validity
         * @param {string} apiKey - API key to test
         * @returns {Promise<Object>} Test result
         */
        async testApiKey(apiKey) {
            try {
                const Core = getCore();
                const url = `${Core.ENDPOINTS.TORN_API}/user/?selections=basic&key=${apiKey}&comment=BjornsFactionHUB-Test`;
                
                const response = await fetch(url);
                const data = await response.json();

                if (data.error) {
                    return {
                        valid: false,
                        error: data.error.error,
                        code: data.error.code
                    };
                }

                return {
                    valid: true,
                    userId: data.player_id,
                    userName: data.name,
                    level: data.level
                };

            } catch (e) {
                return {
                    valid: false,
                    error: e.message,
                    code: -1
                };
            }
        },

        /**
         * Get API rate limit status
         * @returns {Object} Rate limit info
         */
        getRateLimitStatus() {
            const Core = getCore();
            if (!Core) return { used: 0, limit: 100, remaining: 100 };

            const now = Date.now();
            const recentCalls = Core.state.apiCallLog.filter(t => t > now - 60000);

            return {
                used: recentCalls.length,
                limit: Core.CONFIG.API_RATE_LIMIT,
                remaining: Core.CONFIG.API_RATE_LIMIT - recentCalls.length,
                resetIn: recentCalls.length > 0 ? Math.ceil((recentCalls[0] + 60000 - now) / 1000) : 0
            };
        }
    };

    // ============================================
    // EXPORT MODULE
    // ============================================
    window.BFH_API = {
        TornAPI,
        TornStats,
        FFScouter,
        APIUtils
    };

    console.log('[BFH_API] Module loaded');

})();

