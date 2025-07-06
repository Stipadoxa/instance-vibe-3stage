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

// src/ui/core/message-handler.js
var require_message_handler = __commonJS({
  "src/ui/core/message-handler.js"(exports, module) {
    "use strict";
    var MessageHandler2 = class {
      constructor(stateManager) {
        this.stateManager = stateManager;
        this.handlers = /* @__PURE__ */ new Map();
        this.middleware = [];
        this.isInitialized = false;
        this.handleMessage = this.handleMessage.bind(this);
      }
      /**
       * Initialize message handling
       */
      initialize() {
        if (this.isInitialized) return;
        window.addEventListener("message", this.handleMessage);
        this.isInitialized = true;
        console.log("\u{1F4E8} Message handler initialized");
      }
      /**
       * Register a handler for a specific message type
       */
      register(messageType, handler) {
        if (!this.handlers.has(messageType)) {
          this.handlers.set(messageType, []);
        }
        this.handlers.get(messageType).push(handler);
        console.log(`\u{1F4DD} Handler registered for: ${messageType}`);
      }
      /**
       * Unregister a handler
       */
      unregister(messageType, handler) {
        const handlers = this.handlers.get(messageType);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index > -1) {
            handlers.splice(index, 1);
            if (handlers.length === 0) {
              this.handlers.delete(messageType);
            }
          }
        }
      }
      /**
       * Add middleware that runs before all handlers
       */
      addMiddleware(middleware) {
        this.middleware.push(middleware);
      }
      /**
       * Main message handler - routes messages to registered handlers
       */
      async handleMessage(event) {
        const msg = event.data.pluginMessage;
        if (!msg) return;
        console.log("\u{1F4E8} Message from plugin:", msg.type);
        try {
          let shouldContinue = true;
          for (const middleware of this.middleware) {
            const result = await middleware(msg, this.stateManager);
            if (result === false) {
              shouldContinue = false;
              break;
            }
          }
          if (!shouldContinue) return;
          const handlers = this.handlers.get(msg.type);
          if (handlers && handlers.length > 0) {
            for (const handler of handlers) {
              try {
                await handler(msg, this.stateManager);
              } catch (error) {
                console.error(`\u274C Handler error for ${msg.type}:`, error);
              }
            }
          } else {
            this.handleUnknownMessage(msg);
          }
        } catch (error) {
          console.error("\u274C Message handling error:", error);
        }
      }
      /**
       * Handle unknown message types
       */
      handleUnknownMessage(msg) {
        console.warn(`\u26A0\uFE0F No handler registered for message type: ${msg.type}`);
      }
      /**
       * Send message to plugin backend
       */
      sendToPlugin(message) {
        try {
          parent.postMessage({
            pluginMessage: message
          }, "*");
          console.log("\u{1F4E4} Message sent to plugin:", message.type);
        } catch (error) {
          console.error("\u274C Failed to send message:", error);
        }
      }
      /**
       * Send message and wait for response
       */
      async sendAndWait(message, responseType, timeout = 5e3) {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            this.unregister(responseType, responseHandler);
            reject(new Error(`Timeout waiting for ${responseType}`));
          }, timeout);
          const responseHandler = (responseMsg) => {
            clearTimeout(timeoutId);
            this.unregister(responseType, responseHandler);
            resolve(responseMsg);
          };
          this.register(responseType, responseHandler);
          this.sendToPlugin(message);
        });
      }
      /**
       * Cleanup
       */
      destroy() {
        if (this.isInitialized) {
          window.removeEventListener("message", this.handleMessage);
          this.handlers.clear();
          this.middleware = [];
          this.isInitialized = false;
          console.log("\u{1F4E8} Message handler destroyed");
        }
      }
    };
    var CoreMessageHandlers = class _CoreMessageHandlers {
      static registerAll(messageHandler, stateManager) {
        messageHandler.register("api-key-loaded", (msg, state) => {
          console.log("\u2705 API key loaded from storage");
          state.setState("apiKeyLoaded", true);
          const apiKeyInput = document.getElementById("apiKey");
          if (apiKeyInput) {
            apiKeyInput.value = "\u25CF".repeat(40);
            apiKeyInput.setAttribute("data-has-key", "true");
          }
          state.setState("generatorTabEnabled", true);
          _CoreMessageHandlers.showStatus("connectionStatus", "\u2705 API key loaded from previous session", "success");
        });
        messageHandler.register("api-key-saved", (msg, state) => {
          const saveBtn = document.getElementById("saveBtn");
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "\u{1F4BE} Save API Key";
          }
          _CoreMessageHandlers.showStatus("connectionStatus", "\u2705 API key saved successfully!", "success");
          const keyInput = document.getElementById("apiKey");
          if (keyInput) {
            keyInput.value = "\u25CF".repeat(40);
            keyInput.setAttribute("data-has-key", "true");
          }
          state.setState("generatorTabEnabled", true);
          state.setState("apiKeyLoaded", true);
        });
        messageHandler.register("api-key-found", (msg, state) => {
          state.setState("apiKeyLoaded", true);
        });
        messageHandler.register("api-key-not-found", (msg, state) => {
          state.setState("apiKeyLoaded", false);
        });
        messageHandler.register("api-key-error", (msg, state) => {
          state.setState("apiKeyLoaded", false);
          _CoreMessageHandlers.showStatus("connectionStatus", `\u274C API key error: ${msg.payload}`, "error");
        });
        messageHandler.register("ui-generation-error", (msg, state) => {
          _CoreMessageHandlers.showStatus("generationStatus", `\u274C Generation error: ${msg.error}`, "error");
        });
        messageHandler.register("component-navigation-success", (msg, state) => {
          console.log("\u2705 Navigated to component successfully");
        });
        console.log("\u2705 Core message handlers registered");
      }
      /**
       * Utility function for showing status messages
       */
      static showStatus(containerId, message, type) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = `<div class="status ${type}">${message}</div>`;
      }
      /**
       * Utility function for clearing status messages
       */
      static clearStatus(containerId) {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = "";
      }
    };
    function createMessageHandler(stateManager) {
      const messageHandler = new MessageHandler2(stateManager);
      CoreMessageHandlers.registerAll(messageHandler, stateManager);
      return messageHandler;
    }
    if (typeof window !== "undefined") {
      window.MessageHandler = MessageHandler2;
      window.createMessageHandler = createMessageHandler;
      window.CoreMessageHandlers = CoreMessageHandlers;
    }
    if (typeof module !== "undefined" && module.exports) {
      module.exports = {
        MessageHandler: MessageHandler2,
        createMessageHandler,
        CoreMessageHandlers
      };
    }
  }
});

// src/ui/core/ui-framework.js
var require_ui_framework = __commonJS({
  "src/ui/core/ui-framework.js"(exports, module) {
    "use strict";
    var UIFramework2 = class _UIFramework {
      constructor() {
        this.components = /* @__PURE__ */ new Map();
        this.eventListeners = /* @__PURE__ */ new Map();
      }
      /**
       * DOM Query utilities
       */
      static $(selector) {
        return document.querySelector(selector);
      }
      static $$(selector) {
        return document.querySelectorAll(selector);
      }
      static byId(id) {
        return document.getElementById(id);
      }
      /**
       * Element creation utilities
       */
      static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
          if (key === "className") {
            element.className = value;
          } else if (key === "innerHTML") {
            element.innerHTML = value;
          } else if (key === "textContent") {
            element.textContent = value;
          } else if (key.startsWith("data-")) {
            element.setAttribute(key, value);
          } else if (key.startsWith("on") && typeof value === "function") {
            element.addEventListener(key.slice(2).toLowerCase(), value);
          } else {
            element.setAttribute(key, value);
          }
        });
        children.forEach((child) => {
          if (typeof child === "string") {
            element.appendChild(document.createTextNode(child));
          } else if (child instanceof Node) {
            element.appendChild(child);
          }
        });
        return element;
      }
      /**
       * Status message utilities
       */
      static showStatus(containerId, message, type = "info") {
        const container = _UIFramework.byId(containerId);
        if (!container) {
          console.warn(`Status container '${containerId}' not found`);
          return;
        }
        container.innerHTML = `<div class="status ${type}">${message}</div>`;
        if (type === "success") {
          setTimeout(() => {
            _UIFramework.clearStatus(containerId);
          }, 5e3);
        }
      }
      static clearStatus(containerId) {
        const container = _UIFramework.byId(containerId);
        if (container) {
          container.innerHTML = "";
        }
      }
      static updateStatus(containerId, message, type = "info") {
        const container = _UIFramework.byId(containerId);
        if (!container) return;
        const existingStatus = container.querySelector(".status");
        if (existingStatus) {
          existingStatus.textContent = message;
          existingStatus.className = `status ${type}`;
        } else {
          _UIFramework.showStatus(containerId, message, type);
        }
      }
      /**
       * Clipboard utilities
       */
      static async copyToClipboard(text) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (err) {
          console.error("Failed to copy to clipboard:", err);
          try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand("copy");
            textArea.remove();
            return successful;
          } catch (fallbackErr) {
            console.error("Clipboard fallback failed:", fallbackErr);
            return false;
          }
        }
      }
      /**
       * Tab management utilities
       */
      static switchTab(tabId) {
        _UIFramework.$$(".tab-btn").forEach((btn) => btn.classList.remove("active"));
        const targetBtn = _UIFramework.$(`[onclick*="${tabId}"]`) || _UIFramework.$(`[data-tab="${tabId}"]`);
        if (targetBtn) {
          targetBtn.classList.add("active");
        }
        _UIFramework.$$(".tab-content").forEach((content) => content.classList.remove("active"));
        const targetContent = _UIFramework.byId(tabId);
        if (targetContent) {
          targetContent.classList.add("active");
        }
        if (window.StateManager) {
          window.StateManager.setState("currentTab", tabId);
        }
        console.log(`\u{1F4D1} Switched to tab: ${tabId}`);
      }
      /**
       * Form utilities
       */
      static getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        for (const [key, value] of formData.entries()) {
          data[key] = value;
        }
        return data;
      }
      static setFormData(formElement, data) {
        Object.entries(data).forEach(([key, value]) => {
          const element = formElement.querySelector(`[name="${key}"]`);
          if (element) {
            element.value = value;
          }
        });
      }
      static clearForm(formElement) {
        const inputs = formElement.querySelectorAll("input, textarea, select");
        inputs.forEach((input) => {
          if (input.type === "checkbox" || input.type === "radio") {
            input.checked = false;
          } else {
            input.value = "";
          }
        });
      }
      /**
       * Loading state utilities
       */
      static setLoading(buttonElement, loading = true, originalText = null) {
        if (loading) {
          buttonElement.dataset.originalText = originalText || buttonElement.textContent;
          buttonElement.disabled = true;
          buttonElement.textContent = "\u23F3 Loading...";
        } else {
          buttonElement.disabled = false;
          buttonElement.textContent = buttonElement.dataset.originalText || originalText || "Submit";
          delete buttonElement.dataset.originalText;
        }
      }
      /**
       * Modal utilities
       */
      static showModal(modalId) {
        const modal = _UIFramework.byId(modalId);
        if (modal) {
          modal.style.display = "flex";
          document.body.style.overflow = "hidden";
        }
      }
      static hideModal(modalId) {
        const modal = _UIFramework.byId(modalId);
        if (modal) {
          modal.style.display = "none";
          document.body.style.overflow = "";
        }
      }
      /**
       * Animation utilities
       */
      static fadeIn(element, duration = 300) {
        element.style.opacity = "0";
        element.style.display = "block";
        let start = performance.now();
        function animate(currentTime) {
          const elapsed = currentTime - start;
          const progress = Math.min(elapsed / duration, 1);
          element.style.opacity = progress;
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        }
        requestAnimationFrame(animate);
      }
      static fadeOut(element, duration = 300) {
        let start = performance.now();
        const initialOpacity = parseFloat(getComputedStyle(element).opacity);
        function animate(currentTime) {
          const elapsed = currentTime - start;
          const progress = Math.min(elapsed / duration, 1);
          element.style.opacity = initialOpacity * (1 - progress);
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            element.style.display = "none";
          }
        }
        requestAnimationFrame(animate);
      }
      /**
       * Event handling utilities
       */
      static on(selector, event, handler, useCapture = false) {
        const elements = typeof selector === "string" ? _UIFramework.$$(selector) : [selector];
        elements.forEach((element) => {
          element.addEventListener(event, handler, useCapture);
          if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, []);
          }
          this.eventListeners.get(element).push({ event, handler, useCapture });
        });
      }
      static off(selector, event, handler) {
        const elements = typeof selector === "string" ? _UIFramework.$$(selector) : [selector];
        elements.forEach((element) => {
          element.removeEventListener(event, handler);
          const listeners = this.eventListeners.get(element);
          if (listeners) {
            const index = listeners.findIndex((l) => l.event === event && l.handler === handler);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        });
      }
      /**
       * Validation utilities
       */
      static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
      }
      static validateRequired(value) {
        return value && value.trim().length > 0;
      }
      static validateMinLength(value, minLength) {
        return value && value.length >= minLength;
      }
      /**
       * Debounce utility
       */
      static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      }
      /**
       * Throttle utility
       */
      static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
          if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
          }
        };
      }
      /**
       * Component registration system
       */
      static registerComponent(name, componentClass) {
        this.components.set(name, componentClass);
      }
      static createComponent(name, ...args) {
        const ComponentClass = this.components.get(name);
        if (ComponentClass) {
          return new ComponentClass(...args);
        }
        throw new Error(`Component '${name}' not found`);
      }
      /**
       * Cleanup utilities
       */
      static cleanup() {
        this.eventListeners.forEach((listeners, element) => {
          listeners.forEach(({ event, handler, useCapture }) => {
            element.removeEventListener(event, handler, useCapture);
          });
        });
        this.eventListeners.clear();
        this.components.clear();
      }
      /**
       * Utility for safe DOM operations
       */
      static safeOperation(operation, fallback = null) {
        try {
          return operation();
        } catch (error) {
          console.error("DOM operation failed:", error);
          return fallback;
        }
      }
      /**
       * Format time utility
       */
      static formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1e3 * 60));
        const hours = Math.floor(diff / (1e3 * 60 * 60));
        const days = Math.floor(diff / (1e3 * 60 * 60 * 24));
        if (minutes < 1) return "just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
      }
    };
    if (typeof window !== "undefined") {
      window.UIFramework = UIFramework2;
      window.$ = UIFramework2.$;
      window.$$ = UIFramework2.$$;
      window.byId = UIFramework2.byId;
      window.showStatus = UIFramework2.showStatus;
      window.clearStatus = UIFramework2.clearStatus;
      window.copyToClipboard = UIFramework2.copyToClipboard;
      window.switchTab = UIFramework2.switchTab;
    }
    if (typeof module !== "undefined" && module.exports) {
      module.exports = UIFramework2;
    }
  }
});

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

// src/ui/core/features/design-system-ui.js
var import_message_handler = __toESM(require_message_handler());
var import_ui_framework = __toESM(require_ui_framework());
var import_state_manager = __toESM(require_state_manager());
var DesignSystemUI = class {
  constructor() {
    console.log("\u{1F680} NEW DesignSystemUI constructor called - Export button version!");
    this.componentTypes = {
      "Navigation": ["appbar", "navbar", "tab", "tabs", "breadcrumb", "pagination", "navigation", "sidebar", "bottom-navigation", "menu"],
      "Input": ["button", "input", "textarea", "select", "checkbox", "radio", "switch", "slider", "searchbar", "chip"],
      "Display": ["card", "list", "list-item", "avatar", "image", "icon", "text", "header", "badge", "tooltip"],
      "Feedback": ["snackbar", "alert", "dialog", "modal", "progress", "skeleton", "loading", "toast"],
      "Layout": ["container", "frame", "grid", "divider", "spacer"],
      "Specialized": ["fab", "actionsheet", "bottomsheet", "chart", "table", "calendar", "timeline", "upload", "gallery", "map", "rating", "cart", "price"]
    };
    this.scanResults = [];
    this.currentFilter = "all";
    this.searchQuery = "";
    this.elements = {
      scanBtn: null,
      rescanBtn: null,
      exportRawBtn: null,
      scanStatusContainer: null,
      scanStatusText: null,
      componentsSection: null,
      promptSection: null,
      componentsList: null,
      searchInput: null,
      filterButtons: null,
      statsBar: null,
      totalCount: null,
      highConfCount: null,
      lowConfCount: null,
      verifiedCount: null
    };
    this.initialize();
  }
  /**
   * Initialize Design System UI
   */
  initialize() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setupElements());
    } else {
      this.setupElements();
    }
    this.registerMessageHandlers();
    this.addRawExportButton();
  }
  /**
   * Setup DOM elements and event listeners
   */
  setupElements() {
    this.elements = {
      scanBtn: document.getElementById("scanBtn"),
      rescanBtn: document.getElementById("rescanBtn"),
      exportRawBtn: document.getElementById("exportRawBtn"),
      scanStatusContainer: document.getElementById("scanStatusContainer"),
      scanStatusText: document.getElementById("scanStatusText"),
      componentsSection: document.getElementById("componentsSection"),
      promptSection: document.getElementById("promptSection"),
      componentsList: document.getElementById("componentsList"),
      searchInput: document.getElementById("searchInput"),
      statsBar: document.getElementById("statsBar"),
      totalCount: document.getElementById("totalCount"),
      highConfCount: document.getElementById("highConfCount"),
      lowConfCount: document.getElementById("lowConfCount"),
      verifiedCount: document.getElementById("verifiedCount")
    };
    this.setupEventListeners();
    console.log("\u2705 Design System UI initialized");
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (this.elements.scanBtn) {
      this.elements.scanBtn.addEventListener("click", () => this.scanDesignSystem());
    }
    if (this.elements.rescanBtn) {
      this.elements.rescanBtn.addEventListener("click", () => this.rescanDesignSystem());
    }
    if (this.elements.exportRawBtn) {
      this.elements.exportRawBtn.addEventListener("click", () => this.exportRawScanData());
    }
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.renderComponentList();
      });
    }
    this.setupFilterButtons();
    const promptBtn = document.querySelector('[onclick="generateLLMPrompt()"]');
    if (promptBtn) {
      promptBtn.removeAttribute("onclick");
      promptBtn.addEventListener("click", () => this.generateLLMPrompt());
    }
  }
  /**
   * Setup filter button event listeners
   */
  setupFilterButtons() {
    const filterButtons = document.querySelectorAll(".filter-btn");
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.currentFilter = e.target.dataset.filter;
        this.renderComponentList();
      });
    });
  }
  /**
   * Register message handlers for design system events
   */
  registerMessageHandlers() {
    if (window.messageHandler) {
      window.messageHandler.register("scan-results", (msg) => {
        this.handleScanResults(msg.components);
      });
      window.messageHandler.register("saved-scan-loaded", (msg) => {
        this.displaySavedScan(msg.components, msg.scanTime);
      });
      window.messageHandler.register("component-type-updated", (msg) => {
        this.handleComponentTypeUpdated(msg.componentId, msg.newType, msg.componentName);
      });
      window.messageHandler.register("llm-prompt-generated", (msg) => {
        this.handleLLMPromptGenerated(msg.prompt);
      });
    }
  }
  /**
   * Start design system scan
   */
  scanDesignSystem() {
    if (this.elements.scanBtn) {
      this.elements.scanBtn.disabled = true;
      this.elements.scanBtn.textContent = "\u{1F50D} Scanning...";
    }
    import_message_handler.MessageHandler.sendMessage({ type: "scan-design-system" });
    console.log("\u{1F50D} Starting design system scan");
  }
  /**
   * Re-scan design system
   */
  rescanDesignSystem() {
    this.scanDesignSystem();
  }
  /**
   * Handle scan results from backend
   */
  handleScanResults(components) {
    if (this.elements.scanBtn) {
      this.elements.scanBtn.disabled = false;
      this.elements.scanBtn.textContent = "\u{1F50D} Scan Design System";
    }
    this.displaySavedScan(components, Date.now());
    console.log(`\u2705 Scan completed: ${(components == null ? void 0 : components.length) || 0} components found`);
  }
  /**
   * Display saved scan results
   */
  displaySavedScan(components, scanTime) {
    this.scanResults = components || [];
    const statusContainer = this.elements.scanStatusContainer;
    const statusText = this.elements.scanStatusText;
    const rescanBtn = this.elements.rescanBtn;
    if (this.scanResults.length > 0) {
      if (statusContainer) statusContainer.classList.add("loaded");
      if (statusText) {
        const timeAgo = scanTime ? this.getTimeAgo(scanTime) : "recently";
        statusText.textContent = `\u2705 ${this.scanResults.length} components loaded (scanned ${timeAgo})`;
      }
      if (rescanBtn) rescanBtn.style.display = "inline-block";
      if (this.elements.exportRawBtn) {
        this.elements.exportRawBtn.style.display = "inline-block";
      }
      this.displayComponents();
      this.enableGeneratorTab();
    } else {
      if (statusText) statusText.textContent = "No design system scanned yet";
      if (rescanBtn) rescanBtn.style.display = "none";
      if (this.elements.exportRawBtn) this.elements.exportRawBtn.style.display = "none";
    }
  }
  /**
   * Display components section and render list
   */
  displayComponents() {
    if (this.scanResults.length === 0) {
      if (this.elements.componentsSection) this.elements.componentsSection.style.display = "none";
      if (this.elements.promptSection) this.elements.promptSection.style.display = "none";
      return;
    }
    this.scanResults.forEach((comp) => {
      if (comp.isVerified === void 0) {
        comp.isVerified = false;
      }
    });
    this.renderComponentList();
    this.updateComponentStats();
    if (this.elements.componentsSection) this.elements.componentsSection.style.display = "block";
    if (this.elements.promptSection) this.elements.promptSection.style.display = "block";
  }
  /**
   * Render the component list based on current filters
   */
  renderComponentList() {
    const container = this.elements.componentsList;
    if (!container) return;
    const filteredComponents = this.getFilteredComponents();
    container.innerHTML = "";
    filteredComponents.forEach((comp) => {
      const item = this.createComponentItem(comp);
      container.appendChild(item);
    });
    this.setupComponentItemListeners();
  }
  /**
   * Setup event listeners for component items
   */
  setupComponentItemListeners() {
    const container = this.elements.componentsList;
    if (!container) return;
    container.querySelectorAll(".type-select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const componentId = e.target.getAttribute("data-component-id");
        const newType = e.target.value;
        this.handleTypeChange(componentId, newType);
      });
    });
    container.querySelectorAll(".navigate-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const componentId = e.target.getAttribute("data-component-id");
        const pageName = e.target.getAttribute("data-page-name");
        this.handleNavigation(componentId, pageName);
      });
    });
  }
  /**
   * Create a component item DOM element
   */
  createComponentItem(comp) {
    var _a, _b;
    const item = document.createElement("div");
    item.className = "component-item";
    item.dataset.componentId = comp.id;
    const confidence = Math.round(comp.confidence * 100);
    let confidenceClass = "confidence-low";
    if (comp.isVerified) confidenceClass = "confidence-verified";
    else if (confidence >= 80) confidenceClass = "confidence-high";
    else if (confidence >= 60) confidenceClass = "confidence-medium";
    const statusIcon = comp.isVerified ? "\u2713" : comp.suggestedType === "unknown" ? "\u2753" : "\u{1F916}";
    const statusClass = comp.isVerified ? "icon-verified" : comp.suggestedType === "unknown" ? "icon-unknown" : "icon-auto";
    const selectOptions = this.createSelectOptions(comp.suggestedType);
    item.innerHTML = `
            <div class="component-info">
                <div class="component-name">${comp.name}</div>
                <div class="component-meta">
                    <div class="type-selector">
                        <span class="status-icon ${statusClass}">${statusIcon}</span>
                        <select class="type-select" data-component-id="${comp.id}">${selectOptions}</select>
                    </div>
                    <span class="confidence-badge ${confidenceClass}">${comp.isVerified ? "Manual" : confidence + "%"}</span>
                    <span class="page-info">\u{1F4C4} ${((_a = comp.pageInfo) == null ? void 0 : _a.pageName) || "Unknown"}</span>
                </div>
            </div>
            <div class="component-actions">
                <button class="btn-action navigate-btn" data-component-id="${comp.id}" data-page-name="${((_b = comp.pageInfo) == null ? void 0 : _b.pageName) || ""}" title="View in Figma">\u{1F441}\uFE0F</button>
            </div>
        `;
    return item;
  }
  /**
   * Create select options for component type dropdown
   */
  createSelectOptions(selectedType) {
    let options = "";
    Object.keys(this.componentTypes).forEach((category) => {
      options += `<optgroup label="${category}">`;
      this.componentTypes[category].forEach((type) => {
        const isSelected = type === selectedType ? "selected" : "";
        options += `<option value="${type}" ${isSelected}>${type}</option>`;
      });
      options += "</optgroup>";
    });
    const unknownSelected = selectedType === "unknown" ? "selected" : "";
    options += `<optgroup label="Other"><option value="unknown" ${unknownSelected}>unknown</option></optgroup>`;
    return options;
  }
  /**
   * Get filtered components based on search and filter
   */
  getFilteredComponents() {
    let filtered = this.scanResults;
    if (this.searchQuery) {
      filtered = filtered.filter(
        (comp) => comp.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || comp.suggestedType.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    switch (this.currentFilter) {
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
   * Update component statistics in the stats bar
   */
  updateComponentStats() {
    const total = this.scanResults.length;
    const highConf = this.scanResults.filter((comp) => comp.confidence >= 0.8 && !comp.isVerified).length;
    const lowConf = this.scanResults.filter((comp) => (comp.confidence < 0.6 || comp.suggestedType === "unknown") && !comp.isVerified).length;
    const verified = this.scanResults.filter((comp) => comp.isVerified).length;
    if (this.elements.totalCount) this.elements.totalCount.textContent = total;
    if (this.elements.highConfCount) this.elements.highConfCount.textContent = highConf;
    if (this.elements.lowConfCount) this.elements.lowConfCount.textContent = lowConf;
    if (this.elements.verifiedCount) this.elements.verifiedCount.textContent = verified;
  }
  /**
   * Handle component type change
   */
  handleTypeChange(componentId, newType) {
    const component = this.scanResults.find((comp) => comp.id === componentId);
    if (component) {
      component.suggestedType = newType;
      component.confidence = 1;
      component.isVerified = true;
      this.renderComponentList();
      this.updateComponentStats();
      import_message_handler.MessageHandler.sendMessage({
        type: "update-component-type",
        payload: { componentId, newType }
      });
      console.log(`\u2705 Updated component ${componentId} to type: ${newType}`);
    }
  }
  /**
   * Handle navigation to component in Figma
   */
  handleNavigation(componentId, pageName) {
    import_message_handler.MessageHandler.sendMessage({
      type: "navigate-to-component",
      componentId,
      pageName
    });
    console.log(`\u{1F9ED} Navigating to component: ${componentId} on page: ${pageName}`);
  }
  /**
   * Handle component type updated from backend
   */
  handleComponentTypeUpdated(componentId, newType, componentName) {
    console.log(`\u2705 Component type updated: ${componentName} \u2192 ${newType}`);
  }
  /**
   * Generate LLM prompt for the design system
   */
  generateLLMPrompt() {
    import_message_handler.MessageHandler.sendMessage({ type: "generate-llm-prompt" });
    console.log("\u{1F4CB} Generating LLM prompt for design system");
  }
  /**
   * Handle generated LLM prompt
   */
  handleLLMPromptGenerated(prompt) {
    import_ui_framework.UIFramework.copyToClipboard(prompt).then(() => {
      if (this.elements.scanStatusText) {
        this.showScanStatus("\u{1F4CB} Prompt copied to clipboard!", "success");
      }
    });
  }
  /**
   * Enable the generator tab after successful scan
   */
  enableGeneratorTab() {
    import_state_manager.StateManager.setState("generatorTabEnabled", true);
    if (window.tabManager) {
      window.tabManager.enableGeneratorTab();
    } else {
      const generatorTab = document.getElementById("generatorTab");
      if (generatorTab) {
        generatorTab.disabled = false;
      }
    }
    console.log("\u2705 Generator tab enabled");
  }
  /**
   * Show scan status message
   */
  showScanStatus(message, type) {
    if (this.elements.scanStatusContainer) {
      const statusDiv = document.createElement("div");
      statusDiv.className = `status ${type}`;
      statusDiv.textContent = message;
      this.elements.scanStatusContainer.appendChild(statusDiv);
      setTimeout(() => {
        if (statusDiv.parentNode) {
          statusDiv.parentNode.removeChild(statusDiv);
        }
      }, 3e3);
    }
  }
  /**
   * Get time ago string for display
   */
  getTimeAgo(timestamp) {
    if (!timestamp) return "some time ago";
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1e3 * 60));
    const hours = Math.floor(diff / (1e3 * 60 * 60));
    const days = Math.floor(diff / (1e3 * 60 * 60 * 24));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  }
  /**
   * Get current scan results
   */
  getScanResults() {
    return this.scanResults;
  }
  /**
   * Get current filter state
   */
  getCurrentFilter() {
    return this.currentFilter;
  }
  /**
   * Get current search query
   */
  getSearchQuery() {
    return this.searchQuery;
  }
  /**
   * Reset all filters and search
   */
  resetFilters() {
    this.currentFilter = "all";
    this.searchQuery = "";
    if (this.elements.searchInput) {
      this.elements.searchInput.value = "";
    }
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.filter === "all") {
        btn.classList.add("active");
      }
    });
    this.renderComponentList();
  }
  /**
   * Add raw export button to the UI
   */
  addRawExportButton() {
    const scanBtn = this.elements.scanBtn;
    if (!scanBtn) return;
    if (!this.elements.exportRawBtn) {
      const exportBtn = document.createElement("button");
      exportBtn.id = "exportRawBtn";
      exportBtn.className = "btn btn-secondary";
      exportBtn.innerHTML = "\u{1F4E5} Export Raw Data";
      exportBtn.style.display = "none";
      exportBtn.style.marginLeft = "8px";
      exportBtn.title = "Export raw scan results as JSON";
      exportBtn.setAttribute("aria-label", "Export raw scan data as JSON file");
      scanBtn.parentNode.insertBefore(exportBtn, scanBtn.nextSibling);
      this.elements.exportRawBtn = exportBtn;
      exportBtn.addEventListener("click", () => this.exportRawScanData());
    }
  }
  /**
   * Export raw scan data as JSON file
   */
  exportRawScanData() {
    if (!this.scanResults || this.scanResults.length === 0) {
      this.showScanStatus("\u274C No scan data available to export", "error");
      return;
    }
    try {
      const exportData = {
        metadata: {
          exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
          componentCount: this.scanResults.length,
          exportVersion: "1.0",
          source: "Figma Design System Scanner"
        },
        components: this.scanResults
      };
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `design-system-raw-data-${timestamp}.json`;
      this.downloadJsonFile(exportData, filename);
      this.showScanStatus("\u2705 Raw data exported successfully", "success");
      console.log(`\u{1F4E5} Exported ${this.scanResults.length} components to ${filename}`);
    } catch (error) {
      console.error("Export failed:", error);
      this.showScanStatus("\u274C Export failed. Please try again.", "error");
    }
  }
  /**
   * Download data as JSON file
   */
  downloadJsonFile(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
  /**
   * Refresh the component display
   */
  refresh() {
    this.renderComponentList();
    this.updateComponentStats();
  }
};
window.scanDesignSystem = function() {
  var _a;
  (_a = window.designSystemUI) == null ? void 0 : _a.scanDesignSystem();
};
window.rescanDesignSystem = function() {
  var _a;
  (_a = window.designSystemUI) == null ? void 0 : _a.rescanDesignSystem();
};
window.generateLLMPrompt = function() {
  var _a;
  (_a = window.designSystemUI) == null ? void 0 : _a.generateLLMPrompt();
};
window.enableGeneratorTab = function() {
  var _a;
  (_a = window.designSystemUI) == null ? void 0 : _a.enableGeneratorTab();
};
export {
  DesignSystemUI
};
