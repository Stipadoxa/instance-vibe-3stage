var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/ui/core/features/api-settings-ui.js
var import_message_handler = __toESM(require_message_handler());
var import_ui_framework = __toESM(require_ui_framework());
var APISettingsUI = class {
  constructor() {
    this.elements = {
      apiKeyInput: null,
      saveBtn: null,
      testBtn: null,
      statusContainer: null
    };
    this.initialize();
  }
  /**
   * Initialize API settings UI
   */
  initialize() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setupElements());
    } else {
      this.setupElements();
    }
  }
  /**
   * Setup DOM elements and event listeners
   */
  setupElements() {
    this.elements = {
      apiKeyInput: document.getElementById("apiKey"),
      saveBtn: document.getElementById("saveBtn"),
      testBtn: document.getElementById("testBtn"),
      statusContainer: document.getElementById("connectionStatus")
    };
    if (this.elements.apiKeyInput && this.elements.saveBtn && this.elements.testBtn) {
      this.setupEventListeners();
      this.setupApiKeyHandling();
      console.log("\u2705 API Settings UI initialized");
    } else {
      console.warn("\u26A0\uFE0F API Settings elements not found");
    }
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    var _a, _b;
    (_a = this.elements.saveBtn) == null ? void 0 : _a.addEventListener("click", () => this.saveApiKey());
    (_b = this.elements.testBtn) == null ? void 0 : _b.addEventListener("click", () => this.testConnection());
    this.setupApiKeyHandling();
  }
  /**
   * Setup API key input behavior
   */
  setupApiKeyHandling() {
    const input = this.elements.apiKeyInput;
    if (!input) return;
    input.addEventListener("focus", function() {
      if (this.getAttribute("data-has-key") === "true") {
        this.value = "";
        this.setAttribute("data-has-key", "false");
      }
    });
    input.addEventListener("input", function() {
      if (this.value.length > 0) {
        this.setAttribute("data-has-key", "false");
      }
    });
  }
  /**
   * Save API key
   */
  async saveApiKey() {
    const input = this.elements.apiKeyInput;
    const saveBtn = this.elements.saveBtn;
    if (!input || !saveBtn) return;
    const apiKey = input.value.trim();
    if (input.getAttribute("data-has-key") === "true" && apiKey.includes("\u25CF")) {
      this.showStatus("\u2139\uFE0F API key already saved", "info");
      return;
    }
    if (!apiKey) {
      this.showStatus("\u274C Please enter an API key", "error");
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = "\u{1F4BE} Saving...";
    import_message_handler.MessageHandler.sendMessage({
      type: "save-api-key",
      payload: apiKey
    });
  }
  /**
   * Test API connection
   */
  async testConnection() {
    var _a;
    const testBtn = this.elements.testBtn;
    if (!testBtn) return;
    testBtn.disabled = true;
    testBtn.textContent = "\u{1F50C} Testing...";
    this.showStatus("\u{1F504} Requesting API key...", "info");
    try {
      const apiKey = await this.getApiKeyFromBackend();
      if (!apiKey) {
        throw new Error("API key not found. Please save it.");
      }
      this.showStatus("\u{1F504} Testing connection with Gemini API...", "info");
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello" }] }]
        })
      });
      if (response.ok) {
        this.showStatus("\u2705 Connection successful!", "success");
      } else {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${((_a = errorData.error) == null ? void 0 : _a.message) || "Unknown error"}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.showStatus(`\u274C Error: ${errorMessage}`, "error");
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = "\u{1F50C} Test Connection";
    }
  }
  /**
   * Get API key from backend
   */
  async getApiKeyFromBackend() {
    this.showStatus("\u{1F504} Getting API key...", "info");
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error("Timeout getting API key."));
      }, 3e3);
      const handler = (event) => {
        const msg = event.data.pluginMessage;
        if (msg && (msg.type === "api-key-found" || msg.type === "api-key-not-found")) {
          clearTimeout(timeout);
          window.removeEventListener("message", handler);
          resolve(msg.payload || null);
        }
      };
      window.addEventListener("message", handler);
      import_message_handler.MessageHandler.sendMessage({ type: "get-api-key" });
    });
  }
  /**
   * Handle API key loaded from storage
   */
  handleApiKeyLoaded(apiKey) {
    const input = this.elements.apiKeyInput;
    if (!input) return;
    input.value = "\u25CF".repeat(40);
    input.setAttribute("data-has-key", "true");
    this.showStatus("\u2705 API key loaded from previous session", "success");
  }
  /**
   * Handle API key saved successfully
   */
  handleApiKeySaved() {
    const saveBtn = this.elements.saveBtn;
    const input = this.elements.apiKeyInput;
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "\u{1F4BE} Save API Key";
    }
    if (input) {
      input.value = "\u25CF".repeat(40);
      input.setAttribute("data-has-key", "true");
    }
    this.showStatus("\u2705 API key saved successfully!", "success");
  }
  /**
   * Clear all data
   */
  clearAllData() {
    if (confirm("Clear all saved data? This will remove API key and design system cache.")) {
      import_message_handler.MessageHandler.sendMessage({ type: "clear-storage" });
      location.reload();
    }
  }
  /**
   * Show status message
   */
  showStatus(message, type) {
    if (this.elements.statusContainer) {
      import_ui_framework.UIFramework.showStatus(this.elements.statusContainer.id, message, type);
    }
  }
  /**
   * Clear status message
   */
  clearStatus() {
    if (this.elements.statusContainer) {
      import_ui_framework.UIFramework.clearStatus(this.elements.statusContainer.id);
    }
  }
};
window.saveApiKey = function() {
  var _a;
  (_a = window.apiSettingsUI) == null ? void 0 : _a.saveApiKey();
};
window.testGeminiConnection = function() {
  var _a;
  (_a = window.apiSettingsUI) == null ? void 0 : _a.testConnection();
};
window.clearAllData = function() {
  var _a;
  (_a = window.apiSettingsUI) == null ? void 0 : _a.clearAllData();
};
export {
  APISettingsUI
};
