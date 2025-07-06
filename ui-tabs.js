var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/ui/core/state-manager.js
var require_state_manager = __commonJS({
  "src/ui/core/state-manager.js"(exports, module) {
    "use strict";
    var StateManager2 = class {
      constructor() {
        this.state = {
          // Tab management
          currentTab: "design-system",
          // Design system data
          scanResults: [],
          currentFilter: "all",
          searchQuery: "",
          // AI Generator data
          lastGeneratedJSON: null,
          selectedImage: null,
          currentPlatform: "mobile",
          // Design iteration state
          designState: {
            original: null,
            current: null,
            history: [],
            frameId: null,
            isIterating: false
          },
          // Session management
          currentSessionData: null,
          pendingSessionRestore: null,
          // API settings
          apiKeyLoaded: false,
          // UI state
          generatorTabEnabled: false
        };
        this.subscribers = /* @__PURE__ */ new Map();
        this.eventListeners = /* @__PURE__ */ new Map();
      }
      /**
       * Get current state value
       */
      getState(key) {
        if (key) {
          return this.state[key];
        }
        return __spreadValues({}, this.state);
      }
      /**
       * Set state value and notify subscribers
       */
      setState(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        this.notifySubscribers(key, value, oldValue);
        this.notifyStateChange(key, value, oldValue);
        console.log(`\u{1F504} State updated: ${key}`, value);
      }
      /**
       * Update nested state (like designState properties)
       */
      updateNestedState(parentKey, childKey, value) {
        if (this.state[parentKey] && typeof this.state[parentKey] === "object") {
          const oldParentValue = __spreadValues({}, this.state[parentKey]);
          this.state[parentKey][childKey] = value;
          this.notifySubscribers(parentKey, this.state[parentKey], oldParentValue);
          this.notifySubscribers(`${parentKey}.${childKey}`, value);
          console.log(`\u{1F504} Nested state updated: ${parentKey}.${childKey}`, value);
        }
      }
      /**
       * Subscribe to state changes for a specific key
       */
      subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
          this.subscribers.set(key, /* @__PURE__ */ new Set());
        }
        this.subscribers.get(key).add(callback);
        return () => {
          const keySubscribers = this.subscribers.get(key);
          if (keySubscribers) {
            keySubscribers.delete(callback);
            if (keySubscribers.size === 0) {
              this.subscribers.delete(key);
            }
          }
        };
      }
      /**
       * Subscribe to any state change
       */
      subscribeToAll(callback) {
        return this.subscribe("*", callback);
      }
      /**
       * Notify subscribers of state changes
       */
      notifySubscribers(key, newValue, oldValue) {
        const keySubscribers = this.subscribers.get(key);
        if (keySubscribers) {
          keySubscribers.forEach((callback) => {
            try {
              callback(newValue, oldValue, key);
            } catch (error) {
              console.error(`Error in state subscriber for ${key}:`, error);
            }
          });
        }
        const allSubscribers = this.subscribers.get("*");
        if (allSubscribers) {
          allSubscribers.forEach((callback) => {
            try {
              callback(newValue, oldValue, key);
            } catch (error) {
              console.error(`Error in wildcard state subscriber:`, error);
            }
          });
        }
      }
      /**
       * Notify general state change listeners
       */
      notifyStateChange(key, newValue, oldValue) {
        const changeEvent = {
          key,
          newValue,
          oldValue,
          timestamp: Date.now()
        };
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aidesigner-state-change", {
            detail: changeEvent
          }));
        }
      }
      /**
       * Reset specific state section
       */
      resetState(key) {
        const initialValues = {
          designState: {
            original: null,
            current: null,
            history: [],
            frameId: null,
            isIterating: false
          },
          selectedImage: null,
          lastGeneratedJSON: null,
          currentSessionData: null,
          pendingSessionRestore: null
        };
        if (initialValues[key]) {
          this.setState(key, initialValues[key]);
        }
      }
      /**
       * Bulk state update (for initialization or restoration)
       */
      batchUpdate(updates) {
        const changes = [];
        Object.entries(updates).forEach(([key, value]) => {
          const oldValue = this.state[key];
          this.state[key] = value;
          changes.push({ key, value, oldValue });
        });
        changes.forEach(({ key, value, oldValue }) => {
          this.notifySubscribers(key, value, oldValue);
        });
        console.log(`\u{1F504} Batch state update:`, changes.map((c) => c.key));
      }
      /**
       * Design state specific helpers
       */
      startIteration(generatedJSON, frameId) {
        this.setState("designState", {
          original: JSON.parse(JSON.stringify(generatedJSON)),
          current: generatedJSON,
          frameId,
          isIterating: true,
          history: ["Original design generated."]
        });
      }
      addToHistory(action) {
        const currentDesignState = __spreadValues({}, this.state.designState);
        currentDesignState.history.push(action);
        this.setState("designState", currentDesignState);
      }
      updateCurrentDesign(modifiedJSON) {
        const currentDesignState = __spreadValues({}, this.state.designState);
        currentDesignState.current = modifiedJSON;
        this.setState("designState", currentDesignState);
      }
      resetToOriginal() {
        const currentDesignState = __spreadValues({}, this.state.designState);
        currentDesignState.current = JSON.parse(JSON.stringify(currentDesignState.original));
        currentDesignState.history = ["Original design generated."];
        this.setState("designState", currentDesignState);
      }
      /**
       * Image state helpers
       */
      setSelectedImage(imageData) {
        this.setState("selectedImage", imageData);
      }
      clearSelectedImage() {
        this.setState("selectedImage", null);
      }
      isValidImageSelected() {
        const image = this.state.selectedImage;
        return image && image.base64 && image.type && image.base64.length > 0;
      }
      /**
       * Component scanning helpers
       */
      updateScanResults(components) {
        this.setState("scanResults", components || []);
      }
      getFilteredComponents() {
        const { scanResults, currentFilter, searchQuery } = this.state;
        let filtered = scanResults;
        if (searchQuery) {
          filtered = filtered.filter(
            (comp) => comp.name.toLowerCase().includes(searchQuery.toLowerCase()) || comp.suggestedType.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        switch (currentFilter) {
          case "unknown":
            return filtered.filter((comp) => comp.suggestedType === "unknown");
          case "low":
            return filtered.filter((comp) => comp.confidence < 0.6 && !comp.isVerified);
          case "verified":
            return filtered.filter((comp) => comp.isVerified);
          default:
            return filtered;
        }
      }
      /**
       * Platform helpers
       */
      switchPlatform(platform) {
        this.setState("currentPlatform", platform);
      }
      /**
       * Debug helpers
       */
      dumpState() {
        console.log("\u{1F4CA} Current State:", this.state);
        console.log(
          "\u{1F4CA} Active Subscribers:",
          Array.from(this.subscribers.keys()).map((key) => ({
            key,
            count: this.subscribers.get(key).size
          }))
        );
      }
      /**
       * Persistence helpers (save to sessionStorage for tab refresh)
       */
      saveToSession() {
        try {
          const persistentState = {
            currentTab: this.state.currentTab,
            currentPlatform: this.state.currentPlatform,
            currentFilter: this.state.currentFilter,
            searchQuery: this.state.searchQuery
          };
          sessionStorage.setItem("aidesigner-ui-state", JSON.stringify(persistentState));
        } catch (error) {
          console.warn("Could not save state to session:", error);
        }
      }
      loadFromSession() {
        try {
          const saved = sessionStorage.getItem("aidesigner-ui-state");
          if (saved) {
            const persistentState = JSON.parse(saved);
            this.batchUpdate(persistentState);
          }
        } catch (error) {
          console.warn("Could not load state from session:", error);
        }
      }
    };
    var stateManager = new StateManager2();
    stateManager.subscribe("currentTab", () => stateManager.saveToSession());
    stateManager.subscribe("currentPlatform", () => stateManager.saveToSession());
    stateManager.subscribe("currentFilter", () => stateManager.saveToSession());
    stateManager.subscribe("searchQuery", () => stateManager.saveToSession());
    if (typeof window !== "undefined") {
      window.StateManager = stateManager;
    }
    if (typeof module !== "undefined" && module.exports) {
      module.exports = stateManager;
    }
  }
});

// src/ui/core/tab-manager.js
var import_state_manager = __toESM(require_state_manager());
var TabManager = class {
  constructor() {
    this.currentTab = "design-system";
    this.tabs = {
      "design-system": {
        button: null,
        content: null,
        title: "\u{1F50D} Design System",
        enabled: true
      },
      "api-settings": {
        button: null,
        content: null,
        title: "\u2699\uFE0F API Settings",
        enabled: true
      },
      "ai-generator": {
        button: null,
        content: null,
        title: "\u{1F4AC} AI Generator",
        enabled: false
        // Initially disabled until scan completes
      }
    };
    this.initializeEventListeners();
  }
  /**
   * Initialize tab navigation event listeners
   */
  initializeEventListeners() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.setupTabButtons();
      });
    } else {
      this.setupTabButtons();
    }
  }
  /**
   * Setup tab button click handlers
   */
  setupTabButtons() {
    Object.keys(this.tabs).forEach((tabId) => {
      const button = document.querySelector(`[onclick="switchTab('${tabId}')"]`) || document.querySelector(`[data-tab="${tabId}"]`);
      const content = document.getElementById(tabId);
      if (button && content) {
        this.tabs[tabId].button = button;
        this.tabs[tabId].content = content;
        button.removeAttribute("onclick");
        button.addEventListener("click", (e) => {
          e.preventDefault();
          this.switchTab(tabId);
        });
        console.log(`\u2705 Tab "${tabId}" initialized`);
      } else {
        console.warn(`\u26A0\uFE0F Tab elements not found for "${tabId}"`);
      }
    });
    this.switchTab(this.currentTab);
  }
  /**
   * Switch to specified tab
   * @param {string} tabId - ID of tab to switch to
   */
  switchTab(tabId) {
    if (!this.tabs[tabId]) {
      console.error(`\u274C Unknown tab: ${tabId}`);
      return;
    }
    if (!this.tabs[tabId].enabled) {
      console.log(`\u26A0\uFE0F Tab "${tabId}" is disabled`);
      return;
    }
    console.log(`\u{1F504} Switching to tab: ${tabId}`);
    this.currentTab = tabId;
    import_state_manager.StateManager.updateState({ currentTab: tabId });
    Object.keys(this.tabs).forEach((id) => {
      const tab = this.tabs[id];
      if (tab.button) {
        tab.button.classList.remove("active");
        if (id === tabId) {
          tab.button.classList.add("active");
        }
      }
    });
    Object.keys(this.tabs).forEach((id) => {
      const tab = this.tabs[id];
      if (tab.content) {
        tab.content.classList.remove("active");
        if (id === tabId) {
          tab.content.classList.add("active");
        }
      }
    });
    this.emitTabChangeEvent(tabId);
  }
  /**
   * Enable a specific tab
   * @param {string} tabId - ID of tab to enable
   */
  enableTab(tabId) {
    if (!this.tabs[tabId]) {
      console.error(`\u274C Unknown tab: ${tabId}`);
      return;
    }
    this.tabs[tabId].enabled = true;
    if (this.tabs[tabId].button) {
      this.tabs[tabId].button.disabled = false;
      this.tabs[tabId].button.classList.remove("disabled");
    }
    console.log(`\u2705 Tab "${tabId}" enabled`);
  }
  /**
   * Disable a specific tab
   * @param {string} tabId - ID of tab to disable
   */
  disableTab(tabId) {
    if (!this.tabs[tabId]) {
      console.error(`\u274C Unknown tab: ${tabId}`);
      return;
    }
    this.tabs[tabId].enabled = false;
    if (this.tabs[tabId].button) {
      this.tabs[tabId].button.disabled = true;
      this.tabs[tabId].button.classList.add("disabled");
    }
    if (this.currentTab === tabId) {
      const firstEnabledTab = Object.keys(this.tabs).find((id) => this.tabs[id].enabled);
      if (firstEnabledTab) {
        this.switchTab(firstEnabledTab);
      }
    }
    console.log(`\u274C Tab "${tabId}" disabled`);
  }
  /**
   * Get current active tab
   * @returns {string} Current tab ID
   */
  getCurrentTab() {
    return this.currentTab;
  }
  /**
   * Check if a tab is enabled
   * @param {string} tabId - ID of tab to check
   * @returns {boolean} True if tab is enabled
   */
  isTabEnabled(tabId) {
    var _a;
    return ((_a = this.tabs[tabId]) == null ? void 0 : _a.enabled) || false;
  }
  /**
   * Get all tab information
   * @returns {Object} Tab configuration object
   */
  getAllTabs() {
    return __spreadValues({}, this.tabs);
  }
  /**
   * Update tab title
   * @param {string} tabId - ID of tab to update
   * @param {string} newTitle - New title for the tab
   */
  updateTabTitle(tabId, newTitle) {
    if (!this.tabs[tabId]) {
      console.error(`\u274C Unknown tab: ${tabId}`);
      return;
    }
    this.tabs[tabId].title = newTitle;
    if (this.tabs[tabId].button) {
      const button = this.tabs[tabId].button;
      const iconMatch = button.textContent.match(/^[🔍⚙️💬]\s*/);
      const icon = iconMatch ? iconMatch[0] : "";
      button.textContent = icon + newTitle.replace(/^[🔍⚙️💬]\s*/, "");
    }
    console.log(`\u{1F4DD} Tab "${tabId}" title updated to: ${newTitle}`);
  }
  /**
   * Emit custom tab change event
   * @param {string} tabId - ID of newly active tab
   */
  emitTabChangeEvent(tabId) {
    const event = new CustomEvent("tabChanged", {
      detail: {
        tabId,
        previousTab: this.currentTab,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(event);
  }
  /**
   * Add listener for tab change events
   * @param {Function} callback - Function to call when tab changes
   */
  onTabChange(callback) {
    document.addEventListener("tabChanged", (event) => {
      callback(event.detail);
    });
  }
  /**
   * Enable the AI Generator tab (called after successful scan)
   */
  enableGeneratorTab() {
    this.enableTab("ai-generator");
    const currentTitle = this.tabs["ai-generator"].title;
    if (!currentTitle.includes("\u2713")) {
      this.updateTabTitle("ai-generator", currentTitle.replace("\u{1F4AC}", "\u{1F4AC}\u2713"));
    }
  }
  /**
   * Reset AI Generator tab state
   */
  resetGeneratorTab() {
    this.disableTab("ai-generator");
    this.updateTabTitle("ai-generator", "\u{1F4AC} AI Generator");
  }
  /**
   * Show tab loading state
   * @param {string} tabId - ID of tab to show loading for
   * @param {boolean} isLoading - Whether tab is loading
   */
  setTabLoading(tabId, isLoading) {
    if (!this.tabs[tabId]) return;
    const button = this.tabs[tabId].button;
    if (!button) return;
    if (isLoading) {
      button.classList.add("loading");
      button.style.opacity = "0.7";
      button.style.pointerEvents = "none";
    } else {
      button.classList.remove("loading");
      button.style.opacity = "";
      button.style.pointerEvents = "";
    }
  }
  /**
   * Add badge to tab (e.g., notification count)
   * @param {string} tabId - ID of tab to add badge to
   * @param {string|number} content - Badge content
   */
  addTabBadge(tabId, content) {
    if (!this.tabs[tabId]) return;
    const button = this.tabs[tabId].button;
    if (!button) return;
    const existingBadge = button.querySelector(".tab-badge");
    if (existingBadge) {
      existingBadge.remove();
    }
    const badge = document.createElement("span");
    badge.className = "tab-badge";
    badge.textContent = content;
    badge.style.cssText = `
            position: absolute;
            top: 4px;
            right: 4px;
            background: var(--color-error);
            color: white;
            border-radius: 8px;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: 600;
            min-width: 16px;
            text-align: center;
        `;
    button.style.position = "relative";
    button.appendChild(badge);
  }
  /**
   * Remove badge from tab
   * @param {string} tabId - ID of tab to remove badge from
   */
  removeTabBadge(tabId) {
    if (!this.tabs[tabId]) return;
    const button = this.tabs[tabId].button;
    if (!button) return;
    const badge = button.querySelector(".tab-badge");
    if (badge) {
      badge.remove();
    }
  }
  /**
   * Destroy tab manager and clean up event listeners
   */
  destroy() {
    Object.keys(this.tabs).forEach((tabId) => {
      const tab = this.tabs[tabId];
      if (tab.button) {
        const newButton = tab.button.cloneNode(true);
        tab.button.parentNode.replaceChild(newButton, tab.button);
      }
    });
    console.log("\u{1F5D1}\uFE0F TabManager destroyed");
  }
};
window.switchTab = function(tabId) {
  if (window.tabManager) {
    window.tabManager.switchTab(tabId);
  } else {
    console.warn("\u26A0\uFE0F TabManager not initialized, using fallback");
    document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
    const targetBtn = document.querySelector(`[onclick*="${tabId}"]`);
    const targetContent = document.getElementById(tabId);
    if (targetBtn && targetContent) {
      targetBtn.classList.add("active");
      targetContent.classList.add("active");
    }
  }
};
export {
  TabManager
};
