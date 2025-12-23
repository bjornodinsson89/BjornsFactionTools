/**
 * BjornsFactionHUB - Core Module
 * 
 * Contains: Configuration, State Management, Storage, Utilities
 * 
 * @author BjornOdinsson89
 * @version 1.0.0
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = Object.freeze({
        SCRIPT_NAME: 'BjornsFactionHUB',
        VERSION: '1.0.0',
        AUTHOR: 'BjornOdinsson89',
        LOGO_URL: 'https://i.postimg.cc/BQ6bSYKM/file-000000004bb071f5a96fc52564bf26ad-1.png',
        STORAGE_PREFIX: 'bfh.',
        API_RATE_LIMIT: 100,
        CACHE_DURATION: 30000,
        POLL_INTERVAL: 10000,
        DEBUG: false
    });

    const ENDPOINTS = Object.freeze({
        TORN_API: 'https://api.torn.com',
        TORNSTATS: 'https://www.tornstats.com/api/v2',
        FFSCOUTER: 'https://ffscouter.com/api',
        YATA: 'https://yata.yt/api/v1'
    });

    // ============================================
    // STATE MANAGEMENT
    // ============================================
    const state = {
        // API Keys
        apiKey: null,
        tornStatsKey: null,
        
        // User Data
        userData: null,
        factionData: {},
        
        // Collections
        targetData: new Map(),
        warMembers: new Map(),
        notes: {},
        dibs: [],
        
        // UI State
        isDrawerOpen: false,
        activeTab: 'targets',
        
        // API Management
        apiCallLog: [],
        cache: new Map(),
        
        // Flags
        isPolling: false,
        debug: CONFIG.DEBUG
    };

    // Reference to API module (set during init)
    let apiModule = null;

    function setAPIModule(module) {
        apiModule = module;
    }

    // ============================================
    // STORAGE UTILITIES
    // ============================================
    const Storage = {
        /**
         * Get value from localStorage
         * @param {string} key - Storage key
         * @param {*} defaultValue - Default value if not found
         * @returns {*} Stored value or default
         */
        get(key, defaultValue = null) {
            try {
                const raw = localStorage.getItem(CONFIG.STORAGE_PREFIX + key);
                if (raw === null) return defaultValue;
                return JSON.parse(raw);
            } catch (e) {
                console.warn(`[BFH_Core] Storage.get error for key "${key}":`, e);
                return defaultValue;
            }
        },

        /**
         * Set value in localStorage
         * @param {string} key - Storage key
         * @param {*} value - Value to store
         */
        set(key, value) {
            try {
                localStorage.setItem(CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
            } catch (e) {
                console.error(`[BFH_Core] Storage.set error for key "${key}":`, e);
            }
        },

        /**
         * Remove value from localStorage
         * @param {string} key - Storage key
         */
        remove(key) {
            try {
                localStorage.removeItem(CONFIG.STORAGE_PREFIX + key);
            } catch (e) {
                console.warn(`[BFH_Core] Storage.remove error for key "${key}":`, e);
            }
        },

        /**
         * Clear all BFH storage
         */
        clearAll() {
            try {
                const keys = Object.keys(localStorage).filter(k => k.startsWith(CONFIG.STORAGE_PREFIX));
                keys.forEach(k => localStorage.removeItem(k));
            } catch (e) {
                console.error('[BFH_Core] Storage.clearAll error:', e);
            }
        }
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    const Utils = {
        /**
         * Sleep for specified milliseconds
         * @param {number} ms - Milliseconds to sleep
         * @returns {Promise}
         */
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

        /**
         * Format seconds to HH:MM:SS
         * @param {number} seconds - Seconds to format
         * @returns {string} Formatted time string
         */
        formatTime(seconds) {
            if (seconds <= 0) return '00:00:00';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        },

        /**
         * Format timestamp to relative time string
         * @param {number} timestamp - Unix timestamp in seconds
         * @returns {string} Relative time string
         */
        formatRelativeTime(timestamp) {
            if (!timestamp || isNaN(timestamp)) return 'Unknown';
            const diff = Math.floor((Date.now() / 1000) - timestamp);
            if (diff < 0) return 'just now';
            if (diff < 60) return `${diff}s ago`;
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
            return `${Math.floor(diff / 86400)}d ago`;
        },

        /**
         * Format large numbers with suffix
         * @param {number} num - Number to format
         * @returns {string} Formatted number string
         */
        formatNumber(num) {
            if (num == null || isNaN(num)) return '0';
            if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
            if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
            if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
            return num.toLocaleString();
        },

        /**
         * Parse player ID from URL or string
         * @param {string} input - URL or player ID string
         * @returns {string|null} Player ID or null
         */
        parsePlayerId(input) {
            if (!input) return null;
            // Check if it's already just a number
            if (/^\d+$/.test(input.trim())) return input.trim();
            // Try to parse from URL
            const match = input.match(/XID=(\d+)|user2ID=(\d+)|ID=(\d+)/);
            return match ? (match[1] || match[2] || match[3]) : null;
        },

        /**
         * Get current Torn page type
         * @returns {string} Page type identifier
         */
        getCurrentPage() {
            const path = window.location.pathname;
            const hash = window.location.hash;
            const search = window.location.search;

            if (path.includes('profiles.php')) return 'profile';
            if (path.includes('factions.php')) {
                if (hash.includes('war') || search.includes('step=your#war')) return 'faction-war';
                return 'faction';
            }
            if (path.includes('loader.php') && search.includes('attack')) return 'attack';
            if (path.includes('index.php') || path === '/') return 'home';
            return 'other';
        },

        /**
         * Create debounced function
         * @param {Function} fn - Function to debounce
         * @param {number} delay - Delay in milliseconds
         * @returns {Function} Debounced function
         */
        debounce(fn, delay) {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => fn(...args), delay);
            };
        },

        /**
         * Create throttled function
         * @param {Function} fn - Function to throttle
         * @param {number} limit - Limit in milliseconds
         * @returns {Function} Throttled function
         */
        throttle(fn, limit) {
            let inThrottle;
            return (...args) => {
                if (!inThrottle) {
                    fn(...args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Create DOM element with attributes and children
         * @param {string} tag - HTML tag name
         * @param {Object} attributes - Element attributes
         * @param {Array} children - Child elements or text
         * @returns {HTMLElement} Created element
         */
        createElement(tag, attributes = {}, children = []) {
            const el = document.createElement(tag);
            
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'style' && typeof value === 'object') {
                    Object.assign(el.style, value);
                } else if (key === 'className') {
                    el.className = value;
                } else if (key === 'dataset') {
                    Object.entries(value).forEach(([k, v]) => el.dataset[k] = v);
                } else if (key.startsWith('on') && typeof value === 'function') {
                    el.addEventListener(key.slice(2).toLowerCase(), value);
                } else if (key === 'innerHTML') {
                    el.innerHTML = value;
                } else if (value !== null && value !== undefined) {
                    el.setAttribute(key, value);
                }
            });

            children.forEach(child => {
                if (typeof child === 'string') {
                    el.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    el.appendChild(child);
                }
            });

            return el;
        },

        /**
         * Escape HTML special characters
         * @param {string} str - String to escape
         * @returns {string} Escaped string
         */
        escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        /**
         * Deep clone an object
         * @param {*} obj - Object to clone
         * @returns {*} Cloned object
         */
        deepClone(obj) {
            try {
                return JSON.parse(JSON.stringify(obj));
            } catch (e) {
                return obj;
            }
        },

        /**
         * Log debug message if debug mode enabled
         * @param  {...any} args - Arguments to log
         */
        debug(...args) {
            if (state.debug) {
                console.log('[BFH_Core]', ...args);
            }
        }
    };

    // ============================================
    // EXPORT MODULE
    // ============================================
    window.BFH_Core = {
        CONFIG,
        ENDPOINTS,
        state,
        Storage,
        Utils,
        setAPIModule
    };

    console.log('[BFH_Core] Module loaded');

})();
