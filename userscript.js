// ==UserScript==
// @name         GeoMeta Collector
// @namespace    geometa-collector
// @version      2.0.1
// @description  Automatically collect GeoGuessr meta information for personal study
// @author       GeoMeta Gallery
// @match        *://*.geoguessr.com/*
// @require      https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/5e449d6b64c828fce5d2915772d61c7f95263e34/geoguessr-event-framework.js
// @connect      localhost
// @connect      127.0.0.1
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  // Configuration with defaults
  const CONFIG = {
    get apiUrl() {
      return GM_getValue("geometa_api_url", "http://localhost:3000");
    },
    set apiUrl(value) {
      GM_setValue("geometa_api_url", value);
    },

    get enabled() {
      return GM_getValue("geometa_enabled", true);
    },
    set enabled(value) {
      GM_setValue("geometa_enabled", value);
    },

    get showNotifications() {
      return GM_getValue("geometa_notifications", true);
    },
    set showNotifications(value) {
      GM_setValue("geometa_notifications", value);
    },

    get debugMode() {
      return GM_getValue("geometa_debug", false);
    },
    set debugMode(value) {
      GM_setValue("geometa_debug", value);
    },
  };

  // State management
  let isProcessing = false;
  let framework = null;
  let notificationQueue = [];

  // Initialize the collector
  function init() {
    log("🚀 GeoMeta Collector v2.0.1 initializing...");

    if (typeof GeoGuessrEventFramework !== "undefined") {
      setupFramework();
    } else {
      // Wait for framework to load
      let attempts = 0;
      const checkFramework = setInterval(() => {
        attempts++;
        if (typeof GeoGuessrEventFramework !== "undefined") {
          clearInterval(checkFramework);
          setupFramework();
        } else if (attempts > 50) {
          // 5 seconds timeout
          clearInterval(checkFramework);
          log("❌ GeoGuessr Event Framework failed to load after 5 seconds");
          showNotification(
            "❌ Failed to initialize - GeoGuessr Event Framework not found",
            "error",
          );
        }
      }, 100);
    }

    setupMenuCommands();
    log("✅ GeoMeta Collector initialized");
  }

  // Setup GeoGuessr Event Framework
  async function setupFramework() {
    try {
      framework = GeoGuessrEventFramework;
      await framework.init();

      // Register event listeners
      framework.events.addEventListener("game_start", handleGameStart);
      framework.events.addEventListener("round_end", handleRoundEnd);
      framework.events.addEventListener("game_end", handleGameEnd);

      log("✅ GeoGuessr Event Framework connected");
      if (CONFIG.showNotifications) {
        showNotification("✅ GeoMeta Collector ready!", "success");
      }
    } catch (error) {
      log("❌ Failed to initialize GeoGuessr Event Framework:", error);
      showNotification("❌ Failed to connect to GeoGuessr events", "error");
    }
  }

  // Event handlers
  function handleGameStart(event) {
    log("🎮 Game started:", event.detail);
    isProcessing = false;
  }

  async function handleRoundEnd(event) {
    if (!CONFIG.enabled || isProcessing) {
      log("⏭️ Skipping collection (disabled or processing)");
      return;
    }

    isProcessing = true;

    try {
      const { rounds, map } = event.detail;
      if (!rounds || !map) {
        log("⚠️ Missing rounds or map data in event");
        return;
      }

      const currentRound = rounds[rounds.length - 1];
      if (!currentRound?.location?.panoId) {
        log("⚠️ Missing location data in current round");
        return;
      }

      const data = {
        panoId: currentRound.location.panoId,
        mapId: map.id,
        roundNumber: rounds.length,
        source: getGameSource(),
      };

      log("🎯 Round ended, collecting location:", data);
      await collectLocation(data);
    } catch (error) {
      log("❌ Error in handleRoundEnd:", error);
      showNotification("❌ Error processing round", "error");
    } finally {
      isProcessing = false;
    }
  }

  function handleGameEnd(event) {
    log("🏁 Game ended:", event.detail);
    isProcessing = false;
  }

  // Determine game source/mode
  function getGameSource() {
    const url = window.location.href;
    if (url.includes("/live-challenge/")) return "liveChallenge";
    if (url.includes("/challenge/")) return "challenge";
    if (url.includes("/map-maker/")) return "mapMaker";
    return "map";
  }

  // Main collection function
  async function collectLocation(data) {
    return new Promise((resolve, reject) => {
      const url = `${CONFIG.apiUrl}/api/collect`;

      log(`📤 Sending collection request to: ${url}`, data);

      GM_xmlhttpRequest({
        method: "POST",
        url: url,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "GeoMetaCollector/2.0.1",
        },
        data: JSON.stringify(data),
        timeout: 15000, // 15 second timeout

        onload: function (response) {
          handleApiResponse(response, resolve, reject);
        },

        onerror: function (error) {
          log("❌ Network error:", error);
          showNotification(
            "❌ Network error - check if your gallery is running",
            "error",
          );
          reject(error);
        },

        ontimeout: function () {
          log("⏱️ Request timeout");
          showNotification(
            "⏱️ Request timeout - your gallery may be slow",
            "warning",
          );
          reject(new Error("Request timeout"));
        },
      });
    });
  }

  // Handle API response
  function handleApiResponse(response, resolve, reject) {
    try {
      const data = JSON.parse(response.responseText);

      log(`📥 API Response [${response.status}]:`, data);

      if (response.status === 200) {
        const location = data.location;
        const message =
          data.message === "Location already exists"
            ? `ℹ️ Already collected: ${location.country}`
            : `✅ Collected: ${location.country}${location.meta_name ? ` (${location.meta_name})` : ""}`;

        showNotification(message, "success");
        resolve(data);
      } else if (response.status === 404) {
        log("ℹ️ No meta found for this location");
        showNotification(
          "ℹ️ No meta available for this location",
          "info",
          2000,
        );
        resolve(data);
      } else {
        log(`❌ API error [${response.status}]:`, data);
        showNotification(
          `❌ Collection failed: ${data.error || "Unknown error"}`,
          "error",
        );
        reject(new Error(data.error || `API error: ${response.status}`));
      }
    } catch (parseError) {
      log(
        "❌ Failed to parse API response:",
        parseError,
        response.responseText,
      );
      showNotification("❌ Invalid response from gallery", "error");
      reject(parseError);
    }
  }

  // Notification system
  function showNotification(message, type = "info", duration = 3000) {
    if (!CONFIG.showNotifications && type !== "error") {
      return; // Always show errors
    }

    const notification = createNotificationElement(message, type);
    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = "translateX(0)";
      notification.style.opacity = "1";
    });

    // Auto-remove
    setTimeout(() => {
      removeNotification(notification);
    }, duration);
  }

  function createNotificationElement(message, type) {
    const notification = document.createElement("div");
    notification.textContent = message;

    const colors = {
      success: { bg: "#10b981", border: "#059669" },
      error: { bg: "#ef4444", border: "#dc2626" },
      warning: { bg: "#f59e0b", border: "#d97706" },
      info: { bg: "#3b82f6", border: "#2563eb" },
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

    // Click to dismiss
    notification.addEventListener("click", () => {
      removeNotification(notification);
    });

    return notification;
  }

  function removeNotification(notification) {
    notification.style.transform = "translateX(100%)";
    notification.style.opacity = "0";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  // Menu commands
  function setupMenuCommands() {
    if (typeof GM_registerMenuCommand === "undefined") {
      log("⚠️ GM_registerMenuCommand not available");
      return;
    }

    GM_registerMenuCommand("⚙️ Configure API URL", () => {
      const currentUrl = CONFIG.apiUrl;
      const newUrl = prompt("Enter your GeoMeta Gallery URL:", currentUrl);
      if (newUrl !== null && newUrl.trim() !== "") {
        CONFIG.apiUrl = newUrl.replace(/\/$/, ""); // Remove trailing slash
        showNotification("✅ API URL updated!", "success");
        log("⚙️ API URL updated to:", CONFIG.apiUrl);
      }
    });

    GM_registerMenuCommand("🔄 Toggle Collection", () => {
      CONFIG.enabled = !CONFIG.enabled;
      showNotification(
        `Collection ${CONFIG.enabled ? "enabled" : "disabled"}!`,
        CONFIG.enabled ? "success" : "warning",
      );
      log("🔄 Collection toggled:", CONFIG.enabled);
    });

    GM_registerMenuCommand("🔔 Toggle Notifications", () => {
      CONFIG.showNotifications = !CONFIG.showNotifications;
      showNotification(
        `Notifications ${CONFIG.showNotifications ? "enabled" : "disabled"}!`,
        "info",
      );
      log("🔔 Notifications toggled:", CONFIG.showNotifications);
    });

    GM_registerMenuCommand("🐛 Toggle Debug Mode", () => {
      CONFIG.debugMode = !CONFIG.debugMode;
      showNotification(
        `Debug mode ${CONFIG.debugMode ? "enabled" : "disabled"}!`,
        "info",
      );
      log("🐛 Debug mode toggled:", CONFIG.debugMode);
    });

    GM_registerMenuCommand("🧪 Test Collection", async () => {
      showNotification("🧪 Testing collection...", "info");
      try {
        await collectLocation({
          panoId: "test-pano-id-" + Date.now(),
          mapId: "test-map-id",
          roundNumber: 1,
          source: "test",
        });
      } catch (error) {
        log("🧪 Test failed:", error);
      }
    });

    GM_registerMenuCommand("📊 Show Status", () => {
      const status = `
GeoMeta Collector Status:
• Version: 2.0.1
• API URL: ${CONFIG.apiUrl}
• Collection: ${CONFIG.enabled ? "Enabled" : "Disabled"}
• Notifications: ${CONFIG.showNotifications ? "Enabled" : "Disabled"}
• Debug Mode: ${CONFIG.debugMode ? "Enabled" : "Disabled"}
• Framework: ${framework ? "Connected" : "Not Connected"}
• Processing: ${isProcessing ? "Yes" : "No"}
• GM Functions: ${typeof GM_xmlhttpRequest !== "undefined" ? "Available" : "Missing"}
            `.trim();

      alert(status);
      log("📊 Status requested:", {
        CONFIG,
        framework: !!framework,
        isProcessing,
        hasGM: typeof GM_xmlhttpRequest !== "undefined",
      });
    });
  }

  // Logging utility
  function log(...args) {
    if (CONFIG.debugMode) {
      console.log("[GeoMeta Collector]", ...args);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Also try to initialize immediately in case DOMContentLoaded already fired
  setTimeout(init, 100);

  log("📄 GeoMeta Collector userscript loaded");
})();
