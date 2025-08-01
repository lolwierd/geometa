// ==UserScript==
// @name         GeoMeta Collector Fresh
// @namespace    geometa-collector-fresh
// @version      2.0.1
// @description  Automatically collect GeoGuessr meta information for personal study
// @author       GeoMeta Gallery
// @match        *://*.geoguessr.com/*
// @require      https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/5e449d6b64c828fce5d2915772d61c7f95263e34/geoguessr-event-framework.js
// @connect      localhost
// @connect      127.0.0.1
// @connect      192.168.29.221
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('🚀 GeoMeta Collector Fresh v2.0.1 loading...');

    // Configuration with defaults
    const CONFIG = {
        get apiUrl() {
            return GM_getValue('geometa_api_url_fresh', 'http://127.0.0.1:3000');
        },
        set apiUrl(value) {
            GM_setValue('geometa_api_url_fresh', value);
        },

        get enabled() {
            return GM_getValue('geometa_enabled_fresh', true);
        },
        set enabled(value) {
            GM_setValue('geometa_enabled_fresh', value);
        },

        get showNotifications() {
            return GM_getValue('geometa_notifications_fresh', true);
        },
        set showNotifications(value) {
            GM_setValue('geometa_notifications_fresh', value);
        },

        get debugMode() {
            return GM_getValue('geometa_debug_fresh', true);
        },
        set debugMode(value) {
            GM_setValue('geometa_debug_fresh', value);
        }
    };

    // State management
    let isProcessing = false;
    let framework = null;

    // Logging utility
    function log(...args) {
        if (CONFIG.debugMode) {
            console.log('[GeoMeta Fresh]', ...args);
        }
    }

    // Initialize the collector
    function init() {
        log('🚀 GeoMeta Collector Fresh initializing...');

        if (typeof GeoGuessrEventFramework !== 'undefined') {
            setupFramework();
        } else {
            // Wait for framework to load
            let attempts = 0;
            const checkFramework = setInterval(() => {
                attempts++;
                if (typeof GeoGuessrEventFramework !== 'undefined') {
                    clearInterval(checkFramework);
                    setupFramework();
                } else if (attempts > 50) { // 5 seconds timeout
                    clearInterval(checkFramework);
                    log('❌ GeoGuessr Event Framework failed to load');
                    showNotification('❌ Framework not found', 'error');
                }
            }, 100);
        }

        setupMenuCommands();
        log('✅ GeoMeta Collector Fresh initialized');
        showNotification('✅ GeoMeta Collector Fresh ready!', 'success');
    }

    // Setup GeoGuessr Event Framework
    async function setupFramework() {
        try {
            framework = GeoGuessrEventFramework;
            await framework.init();

            // Register event listeners
            framework.events.addEventListener('round_end', handleRoundEnd);

            log('✅ GeoGuessr Event Framework connected');

        } catch (error) {
            log('❌ Failed to initialize framework:', error);
            showNotification('❌ Failed to connect to GeoGuessr', 'error');
        }
    }

    // Handle round end events
    async function handleRoundEnd(event) {
        if (!CONFIG.enabled || isProcessing) {
            log('⏭️ Skipping collection (disabled or processing)');
            return;
        }

        isProcessing = true;
        log('🎯 Round ended, processing...', event.detail);

        try {
            const { rounds, map } = event.detail;
            if (!rounds || !map) {
                log('⚠️ Missing rounds or map data');
                return;
            }

            const currentRound = rounds[rounds.length - 1];
            if (!currentRound?.location?.panoId) {
                log('⚠️ Missing panoId in current round');
                return;
            }

            const data = {
                panoId: currentRound.location.panoId,
                mapId: map.id,
                roundNumber: rounds.length,
                source: getGameSource()
            };

            log('📤 Collecting location:', data);
            await collectLocation(data);

        } catch (error) {
            log('❌ Error in handleRoundEnd:', error);
            showNotification('❌ Error processing round', 'error');
        } finally {
            isProcessing = false;
        }
    }

    // Determine game source
    function getGameSource() {
        const url = window.location.href;
        if (url.includes('/live-challenge/')) return 'liveChallenge';
        if (url.includes('/challenge/')) return 'challenge';
        if (url.includes('/map-maker/')) return 'mapMaker';
        return 'map';
    }

    // Main collection function
    async function collectLocation(data) {
        return new Promise((resolve, reject) => {
            const url = `${CONFIG.apiUrl}/api/collect`;

            log(`📤 Making request to: ${url}`);
            log('📋 Request data:', data);

            // Test GM_xmlhttpRequest availability
            if (typeof GM_xmlhttpRequest === 'undefined') {
                const error = 'GM_xmlhttpRequest not available';
                log('❌', error);
                showNotification('❌ Missing permissions', 'error');
                reject(new Error(error));
                return;
            }

            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'GeoMetaCollectorFresh/2.0.1',
                    'Accept': 'application/json'
                },
                data: JSON.stringify(data),
                timeout: 15000,

                onload: function(response) {
                    log(`📥 Response [${response.status}]:`, response.responseText);
                    handleApiResponse(response, resolve, reject);
                },

                onerror: function(error) {
                    const msg = `Network error: ${error.error || 'Unknown error'}`;
                    log('❌', msg, error);
                    showNotification('❌ Connection failed - check API URL', 'error');
                    reject(new Error(msg));
                },

                ontimeout: function() {
                    const msg = 'Request timeout';
                    log('⏱️', msg);
                    showNotification('⏱️ Request timeout', 'warning');
                    reject(new Error(msg));
                }
            });
        });
    }

    // Handle API response
    function handleApiResponse(response, resolve, reject) {
        try {
            let data;
            try {
                data = JSON.parse(response.responseText);
            } catch (parseError) {
                log('❌ JSON parse error:', parseError, response.responseText);
                showNotification('❌ Invalid API response', 'error');
                reject(parseError);
                return;
            }

            if (response.status === 200) {
                const location = data.location;
                const isExisting = data.message === 'Location already exists';
                const message = isExisting
                    ? `ℹ️ Already have: ${location.country}`
                    : `✅ Collected: ${location.country}${location.meta_name ? ` (${location.meta_name})` : ''}`;

                showNotification(message, isExisting ? 'info' : 'success');
                resolve(data);

            } else if (response.status === 404) {
                log('ℹ️ No meta found for this location');
                showNotification('ℹ️ No meta available', 'info', 2000);
                resolve(data);

            } else {
                log(`❌ API error [${response.status}]:`, data);
                const errorMsg = data.error || `API error: ${response.status}`;
                showNotification(`❌ Failed: ${errorMsg}`, 'error');
                reject(new Error(errorMsg));
            }

        } catch (error) {
            log('❌ Response handling error:', error);
            showNotification('❌ Response handling failed', 'error');
            reject(error);
        }
    }

    // Notification system
    function showNotification(message, type = 'info', duration = 3000) {
        if (!CONFIG.showNotifications && type !== 'error') {
            return;
        }

        const notification = createNotificationElement(message, type);
        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });

        // Auto-remove
        setTimeout(() => {
            removeNotification(notification);
        }, duration);

        log(`🔔 Notification: ${message} (${type})`);
    }

    function createNotificationElement(message, type) {
        const notification = document.createElement('div');
        notification.textContent = message;

        const colors = {
            success: { bg: '#10b981', border: '#059669' },
            error: { bg: '#ef4444', border: '#dc2626' },
            warning: { bg: '#f59e0b', border: '#d97706' },
            info: { bg: '#3b82f6', border: '#2563eb' }
        };

        const color = colors[type] || colors.info;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            border-left: 4px solid ${color.border};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            font-size: 14px;
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            max-width: 300px;
            word-wrap: break-word;
            cursor: pointer;
        `;

        notification.addEventListener('click', () => {
            removeNotification(notification);
        });

        return notification;
    }

    function removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // Menu commands
    function setupMenuCommands() {
        if (typeof GM_registerMenuCommand === 'undefined') {
            log('⚠️ GM_registerMenuCommand not available');
            return;
        }

        GM_registerMenuCommand('⚙️ Configure API URL', () => {
            const currentUrl = CONFIG.apiUrl;
            const newUrl = prompt(`Current API URL: ${currentUrl}\n\nEnter new URL (try 127.0.0.1:3000 if localhost fails):`, currentUrl);
            if (newUrl !== null && newUrl.trim() !== '') {
                CONFIG.apiUrl = newUrl.replace(/\/$/, '');
                showNotification('✅ API URL updated!', 'success');
                log('⚙️ API URL updated to:', CONFIG.apiUrl);
            }
        });

        GM_registerMenuCommand('🔄 Toggle Collection', () => {
            CONFIG.enabled = !CONFIG.enabled;
            const status = CONFIG.enabled ? 'enabled' : 'disabled';
            showNotification(`Collection ${status}!`, CONFIG.enabled ? 'success' : 'warning');
            log('🔄 Collection toggled:', CONFIG.enabled);
        });

        GM_registerMenuCommand('🔔 Toggle Notifications', () => {
            CONFIG.showNotifications = !CONFIG.showNotifications;
            const status = CONFIG.showNotifications ? 'enabled' : 'disabled';
            showNotification(`Notifications ${status}!`, 'info');
            log('🔔 Notifications toggled:', CONFIG.showNotifications);
        });

        GM_registerMenuCommand('🐛 Toggle Debug Mode', () => {
            CONFIG.debugMode = !CONFIG.debugMode;
            const status = CONFIG.debugMode ? 'enabled' : 'disabled';
            showNotification(`Debug mode ${status}!`, 'info');
            log('🐛 Debug mode toggled:', CONFIG.debugMode);
        });

        GM_registerMenuCommand('🧪 Test Collection', async () => {
            showNotification('🧪 Testing collection...', 'info');
            log('🧪 Starting test collection...');

            try {
                const testData = {
                    panoId: 'test-pano-id-' + Date.now(),
                    mapId: 'test-map-id',
                    roundNumber: 1,
                    source: 'test'
                };

                log('🧪 Test data:', testData);
                await collectLocation(testData);
                log('🧪 Test completed successfully');

            } catch (error) {
                log('🧪 Test failed:', error);
                showNotification(`🧪 Test failed: ${error.message}`, 'error');
            }
        });

        GM_registerMenuCommand('📊 Show Status', () => {
            const status = `
GeoMeta Collector Fresh Status:
• Version: 2.0.1
• API URL: ${CONFIG.apiUrl}
• Collection: ${CONFIG.enabled ? 'Enabled' : 'Disabled'}
• Notifications: ${CONFIG.showNotifications ? 'Enabled' : 'Disabled'}
• Debug Mode: ${CONFIG.debugMode ? 'Enabled' : 'Disabled'}
• Framework: ${framework ? 'Connected' : 'Not Connected'}
• Processing: ${isProcessing ? 'Yes' : 'No'}
• GM Functions: ${typeof GM_xmlhttpRequest !== 'undefined' ? 'Available' : 'Missing'}
            `.trim();

            alert(status);
            log('📊 Status:', {
                apiUrl: CONFIG.apiUrl,
                enabled: CONFIG.enabled,
                framework: !!framework,
                isProcessing,
                hasGM: typeof GM_xmlhttpRequest !== 'undefined'
            });
        });
    }

    // Initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Backup initialization
    setTimeout(init, 100);

    log('📄 GeoMeta Collector Fresh userscript loaded');
})();
