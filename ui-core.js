var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/ui/core/ui-framework.js
var require_ui_framework = __commonJS({
  "src/ui/core/ui-framework.js"(exports, module) {
    var UIFramework = class _UIFramework {
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
      window.UIFramework = UIFramework;
      window.$ = UIFramework.$;
      window.$$ = UIFramework.$$;
      window.byId = UIFramework.byId;
      window.showStatus = UIFramework.showStatus;
      window.clearStatus = UIFramework.clearStatus;
      window.copyToClipboard = UIFramework.copyToClipboard;
      window.switchTab = UIFramework.switchTab;
    }
    if (typeof module !== "undefined" && module.exports) {
      module.exports = UIFramework;
    }
  }
});
export default require_ui_framework();
