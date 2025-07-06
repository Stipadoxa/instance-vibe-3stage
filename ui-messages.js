var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/ui/core/message-handler.js
var require_message_handler = __commonJS({
  "src/ui/core/message-handler.js"(exports, module) {
    var MessageHandler = class {
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
      const messageHandler = new MessageHandler(stateManager);
      CoreMessageHandlers.registerAll(messageHandler, stateManager);
      return messageHandler;
    }
    if (typeof window !== "undefined") {
      window.MessageHandler = MessageHandler;
      window.createMessageHandler = createMessageHandler;
      window.CoreMessageHandlers = CoreMessageHandlers;
    }
    if (typeof module !== "undefined" && module.exports) {
      module.exports = {
        MessageHandler,
        createMessageHandler,
        CoreMessageHandlers
      };
    }
  }
});
export default require_message_handler();
