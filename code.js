"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __objRest = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };

  // src/core/session-service.ts
  var SessionService = class {
    /**
     * Get current file information
     */
    static getCurrentFileInfo() {
      const fileKey = figma.fileKey || "unknown";
      const fileName = figma.root.name || "Untitled";
      return { fileId: fileKey, fileName };
    }
    /**
     * Save session data for current file
     */
    static async saveSession(sessionData) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
      try {
        const { fileId, fileName } = this.getCurrentFileInfo();
        const existingSession = await this.getSession(fileId);
        const updatedSession = {
          fileId,
          fileName,
          designState: {
            original: ((_a = sessionData.designState) == null ? void 0 : _a.original) || ((_b = existingSession == null ? void 0 : existingSession.designState) == null ? void 0 : _b.original) || null,
            current: ((_c = sessionData.designState) == null ? void 0 : _c.current) || ((_d = existingSession == null ? void 0 : existingSession.designState) == null ? void 0 : _d.current) || null,
            history: ((_e = sessionData.designState) == null ? void 0 : _e.history) || ((_f = existingSession == null ? void 0 : existingSession.designState) == null ? void 0 : _f.history) || [],
            frameId: ((_g = sessionData.designState) == null ? void 0 : _g.frameId) || ((_h = existingSession == null ? void 0 : existingSession.designState) == null ? void 0 : _h.frameId) || null,
            frameName: ((_i = sessionData.designState) == null ? void 0 : _i.frameName) || ((_j = existingSession == null ? void 0 : existingSession.designState) == null ? void 0 : _j.frameName) || "Unknown Frame",
            isIterating: ((_k = sessionData.designState) == null ? void 0 : _k.isIterating) || ((_l = existingSession == null ? void 0 : existingSession.designState) == null ? void 0 : _l.isIterating) || false
          },
          scanResults: sessionData.scanResults || (existingSession == null ? void 0 : existingSession.scanResults) || [],
          lastModified: Date.now(),
          currentTab: sessionData.currentTab || (existingSession == null ? void 0 : existingSession.currentTab) || "design-system",
          currentPlatform: sessionData.currentPlatform || (existingSession == null ? void 0 : existingSession.currentPlatform) || "mobile"
        };
        const storageKey = this.STORAGE_PREFIX + fileId;
        await figma.clientStorage.setAsync(storageKey, updatedSession);
        await this.updateAllSessionsIndex(fileId, updatedSession);
        console.log("\u2705 Session saved for file:", fileName);
      } catch (error) {
        console.error("\u274C Failed to save session:", error);
        throw error;
      }
    }
    /**
     * Get session data for specific file
     */
    static async getSession(fileId) {
      try {
        const targetFileId = fileId || this.getCurrentFileInfo().fileId;
        const storageKey = this.STORAGE_PREFIX + targetFileId;
        const sessionData = await figma.clientStorage.getAsync(storageKey);
        return sessionData || null;
      } catch (error) {
        console.error("\u274C Failed to get session:", error);
        return null;
      }
    }
    /**
     * Get current file session data
     */
    static async getCurrentSession() {
      const { fileId } = this.getCurrentFileInfo();
      return await this.getSession(fileId);
    }
    /**
     * Check if current file has a session
     */
    static async hasCurrentSession() {
      const session = await this.getCurrentSession();
      return session !== null && (session.scanResults.length > 0 || session.designState.history.length > 0 || session.designState.current !== null);
    }
    /**
     * Clear session for current file
     */
    static async clearCurrentSession() {
      try {
        const { fileId } = this.getCurrentFileInfo();
        const storageKey = this.STORAGE_PREFIX + fileId;
        await figma.clientStorage.deleteAsync(storageKey);
        await this.removeFromAllSessionsIndex(fileId);
        console.log("\u2705 Session cleared for current file");
      } catch (error) {
        console.error("\u274C Failed to clear session:", error);
        throw error;
      }
    }
    /**
     * Get all sessions across all files
     */
    static async getAllSessions() {
      try {
        const allSessionsIndex = await figma.clientStorage.getAsync(this.ALL_SESSIONS_KEY) || {};
        const sessions = [];
        for (const fileId of Object.keys(allSessionsIndex)) {
          const session = await this.getSession(fileId);
          if (session) {
            sessions.push(session);
          }
        }
        return sessions.sort((a, b) => b.lastModified - a.lastModified);
      } catch (error) {
        console.error("\u274C Failed to get all sessions:", error);
        return [];
      }
    }
    /**
     * Delete specific session
     */
    static async deleteSession(fileId) {
      try {
        const storageKey = this.STORAGE_PREFIX + fileId;
        await figma.clientStorage.deleteAsync(storageKey);
        await this.removeFromAllSessionsIndex(fileId);
        console.log("\u2705 Session deleted for file:", fileId);
      } catch (error) {
        console.error("\u274C Failed to delete session:", error);
        throw error;
      }
    }
    /**
     * Clear all sessions (used by "Clear All Data" function)
     */
    static async clearAllSessions() {
      try {
        const allSessions = await this.getAllSessions();
        for (const session of allSessions) {
          const storageKey = this.STORAGE_PREFIX + session.fileId;
          await figma.clientStorage.deleteAsync(storageKey);
        }
        await figma.clientStorage.deleteAsync(this.ALL_SESSIONS_KEY);
        console.log("\u2705 All sessions cleared");
      } catch (error) {
        console.error("\u274C Failed to clear all sessions:", error);
        throw error;
      }
    }
    /**
     * Update the index of all sessions
     */
    static async updateAllSessionsIndex(fileId, sessionData) {
      try {
        const allSessionsIndex = await figma.clientStorage.getAsync(this.ALL_SESSIONS_KEY) || {};
        allSessionsIndex[fileId] = {
          fileName: sessionData.fileName,
          lastModified: sessionData.lastModified
        };
        await figma.clientStorage.setAsync(this.ALL_SESSIONS_KEY, allSessionsIndex);
      } catch (error) {
        console.error("\u274C Failed to update sessions index:", error);
      }
    }
    /**
     * Remove file from all sessions index
     */
    static async removeFromAllSessionsIndex(fileId) {
      try {
        const allSessionsIndex = await figma.clientStorage.getAsync(this.ALL_SESSIONS_KEY) || {};
        delete allSessionsIndex[fileId];
        await figma.clientStorage.setAsync(this.ALL_SESSIONS_KEY, allSessionsIndex);
      } catch (error) {
        console.error("\u274C Failed to remove from sessions index:", error);
      }
    }
    /**
     * Format session data for UI display
     */
    static formatSessionForUI(session) {
      return {
        fileId: session.fileId,
        fileName: session.fileName,
        designState: session.designState,
        lastModified: session.lastModified,
        frameName: session.designState.frameName,
        historyCount: session.designState.history.length,
        componentCount: session.scanResults.length
      };
    }
  };
  SessionService.STORAGE_PREFIX = "aidesigner_session_";
  SessionService.ALL_SESSIONS_KEY = "aidesigner_all_sessions";

  // src/core/gemini-service.ts
  var GeminiService = class {
    /**
     * Get API key from storage
     */
    static async getApiKey() {
      try {
        const apiKey = await figma.clientStorage.getAsync("geminiApiKey");
        return apiKey || null;
      } catch (error) {
        console.error("\u274C Failed to get API key:", error);
        return null;
      }
    }
    /**
     * Save API key to storage
     */
    static async saveApiKey(apiKey) {
      try {
        if (!apiKey || apiKey.trim().length === 0) {
          throw new Error("API key cannot be empty");
        }
        await figma.clientStorage.setAsync("geminiApiKey", apiKey.trim());
        console.log("\u2705 API key saved successfully");
        return true;
      } catch (error) {
        console.error("\u274C Failed to save API key:", error);
        return false;
      }
    }
    /**
     * Test connection to Gemini API
     */
    static async testConnection() {
      try {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
          return {
            success: false,
            error: "No API key found. Please configure your API key first."
          };
        }
        console.log("\u{1F9EA} Testing Gemini API connection...");
        const testPrompt = 'Respond with a simple JSON object containing a "status" field with value "ok"';
        const response = await this.callGeminiAPI(apiKey, testPrompt);
        if (response.success) {
          console.log("\u2705 Gemini API connection test successful");
          return {
            success: true,
            data: "Connection successful"
          };
        } else {
          return {
            success: false,
            error: response.error || "Connection test failed"
          };
        }
      } catch (error) {
        console.error("\u274C Connection test failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }
    /**
     * Generate UI with Gemini API
     */
    static async generateUI(request) {
      try {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
          return {
            success: false,
            error: "No API key found. Please configure your API key first."
          };
        }
        console.log("\u{1F916} Starting UI generation with Gemini...");
        const response = await this.callGeminiAPI(
          apiKey,
          request.prompt,
          request.image,
          request.config
        );
        if (response.success) {
          console.log("\u2705 UI generation successful");
          return {
            success: true,
            data: response.data
          };
        } else {
          console.error("\u274C UI generation failed:", response.error);
          return {
            success: false,
            error: response.error || "Generation failed"
          };
        }
      } catch (error) {
        console.error("\u274C UI generation error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }
    /**
     * Core Gemini API calling function
     */
    static async callGeminiAPI(apiKey, prompt, image, config) {
      var _a;
      try {
        const generationConfig = __spreadValues(__spreadValues({}, this.DEFAULT_CONFIG), config);
        const apiParts = [{ text: prompt }];
        if (image) {
          apiParts.push({
            inlineData: {
              mimeType: image.type,
              data: image.base64
            }
          });
        }
        const response = await fetch(`${this.API_BASE_URL}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: apiParts }],
            generationConfig
          })
        });
        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = ((_a = errorData.error) == null ? void 0 : _a.message) || `HTTP ${response.status}: ${response.statusText}`;
          return {
            success: false,
            error: errorMessage
          };
        }
        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0] || !data.candidates[0].content.parts[0].text) {
          return {
            success: false,
            error: "Invalid response structure from Gemini API"
          };
        }
        const responseText = data.candidates[0].content.parts[0].text;
        return {
          success: true,
          data: responseText
        };
      } catch (error) {
        console.error("\u274C Gemini API call failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Network error"
        };
      }
    }
    /**
     * Clear API key from storage
     */
    static async clearApiKey() {
      try {
        await figma.clientStorage.setAsync("geminiApiKey", null);
        console.log("\u2705 API key cleared");
        return true;
      } catch (error) {
        console.error("\u274C Failed to clear API key:", error);
        return false;
      }
    }
    /**
     * Check if API key exists
     */
    static async hasApiKey() {
      const apiKey = await this.getApiKey();
      return apiKey !== null && apiKey.length > 0;
    }
    /**
     * Get masked API key for display (shows only last 4 characters)
     */
    static async getMaskedApiKey() {
      const apiKey = await this.getApiKey();
      if (!apiKey) return null;
      if (apiKey.length <= 4) {
        return "\u25CF".repeat(apiKey.length);
      }
      return "\u25CF".repeat(apiKey.length - 4) + apiKey.slice(-4);
    }
    /**
     * Format error message for user display
     */
    static formatErrorMessage(error) {
      if (error.includes("API_KEY_INVALID")) {
        return "Invalid API key. Please check your Gemini API key.";
      }
      if (error.includes("QUOTA_EXCEEDED")) {
        return "API quota exceeded. Please check your billing or try again later.";
      }
      if (error.includes("RATE_LIMIT_EXCEEDED")) {
        return "Rate limit exceeded. Please wait a moment and try again.";
      }
      if (error.includes("Network error")) {
        return "Network connection failed. Please check your internet connection.";
      }
      return error;
    }
  };
  GeminiService.API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
  GeminiService.DEFAULT_CONFIG = {
    temperature: 0.2,
    maxOutputTokens: 8192,
    responseMimeType: "application/json"
  };

  // src/core/component-scanner.ts
  var ComponentScanner = class {
    /**
     * Main scanning function - scans all pages for components
     */
    static async scanDesignSystem() {
      console.log("\u{1F50D} Starting scan...");
      const components = [];
      try {
        await figma.loadAllPagesAsync();
        console.log("\u2705 All pages loaded");
        for (const page of figma.root.children) {
          console.log(`\u{1F4CB} Scanning page: "${page.name}"`);
          try {
            const allNodes = page.findAll((node) => {
              if (node.type === "COMPONENT_SET") {
                return true;
              }
              if (node.type === "COMPONENT") {
                return !!(node.parent && node.parent.type !== "COMPONENT_SET");
              }
              return false;
            });
            console.log(`\u2705 Found ${allNodes.length} main components on page "${page.name}"`);
            for (const node of allNodes) {
              try {
                if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
                  const componentInfo = await this.analyzeComponent(node);
                  if (componentInfo) {
                    componentInfo.pageInfo = {
                      pageName: page.name,
                      pageId: page.id,
                      isCurrentPage: page.id === figma.currentPage.id
                    };
                    components.push(componentInfo);
                  }
                }
              } catch (e) {
                console.error(`\u274C Error analyzing component "${node.name}":`, e);
              }
            }
          } catch (e) {
            console.error(`\u274C Error scanning page "${page.name}":`, e);
          }
        }
        console.log(`\u{1F389} Scan complete! Found ${components.length} unique components.`);
        return components;
      } catch (e) {
        console.error("\u274C Critical error in scanDesignSystem:", e);
        throw e;
      }
    }
    /**
     * Analyzes a single component to extract metadata
     */
    static async analyzeComponent(comp) {
      const name = comp.name;
      const suggestedType = this.guessComponentType(name.toLowerCase());
      const confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
      const textLayers = this.findTextLayers(comp);
      const textHierarchy = this.analyzeTextHierarchy(comp);
      const componentInstances = await this.findComponentInstances(comp);
      const vectorNodes = this.findVectorNodes(comp);
      const imageNodes = this.findImageNodes(comp);
      let variants = [];
      const variantDetails = {};
      if (comp.type === "COMPONENT_SET") {
        const variantProps = comp.variantGroupProperties;
        if (variantProps) {
          variants = Object.keys(variantProps);
          Object.entries(variantProps).forEach(([propName, propInfo]) => {
            if (propInfo.values && propInfo.values.length > 0) {
              variantDetails[propName] = [...propInfo.values].sort();
              console.log(`\u2705 Found variant property: ${propName} with values: [${propInfo.values.join(", ")}]`);
            }
          });
          console.log(`\u{1F3AF} Variant details for "${comp.name}":`, variantDetails);
        }
      }
      return {
        id: comp.id,
        name,
        suggestedType,
        confidence,
        variants: variants.length > 0 ? variants : void 0,
        variantDetails: Object.keys(variantDetails).length > 0 ? variantDetails : void 0,
        textLayers: textLayers.length > 0 ? textLayers : void 0,
        textHierarchy: textHierarchy.length > 0 ? textHierarchy : void 0,
        componentInstances: componentInstances.length > 0 ? componentInstances : void 0,
        vectorNodes: vectorNodes.length > 0 ? vectorNodes : void 0,
        imageNodes: imageNodes.length > 0 ? imageNodes : void 0,
        isFromLibrary: false
      };
    }
    /**
     * Intelligent component type detection based on naming patterns
     */
    static guessComponentType(name) {
      var _a;
      const patterns = {
        "icon-button": /icon.*button|button.*icon/i,
        "upload": /upload|file.*drop|drop.*zone|attach/i,
        "form": /form|captcha|verification/i,
        "context-menu": /context-menu|context menu|contextual menu|options menu/i,
        "modal-header": /modal-header|modal header|modalstack|modal_stack/i,
        "list-item": /list-item|list item|list_item|list[\s\-_]*row|list[\s\-_]*cell/i,
        "appbar": /appbar|app-bar|navbar|nav-bar|header|top bar|page header/i,
        "dialog": /dialog|dialogue|popup|modal(?!-header)/i,
        "list": /list(?!-item)/i,
        "navigation": /nav|navigation(?!-bar)/i,
        "header": /h[1-6]|title|heading(?! bar)/i,
        "button": /button|btn|cta|action/i,
        "input": /input|field|textfield|text-field|entry/i,
        "textarea": /textarea|text-area|multiline/i,
        "select": /select|dropdown|drop-down|picker/i,
        "checkbox": /checkbox|check-box/i,
        "radio": /radio|radiobutton|radio-button/i,
        "switch": /switch|toggle/i,
        "slider": /slider|range/i,
        "searchbar": /search|searchbar|search-bar/i,
        "tab": /tab|tabs|tabbar|tab-bar/i,
        "breadcrumb": /breadcrumb|bread-crumb/i,
        "pagination": /pagination|pager/i,
        "bottomsheet": /bottomsheet|bottom-sheet|drawer/i,
        "sidebar": /sidebar|side-bar/i,
        "snackbar": /snack|snackbar|toast|notification/i,
        "alert": /alert/i,
        "tooltip": /tooltip|tip|hint/i,
        "badge": /badge|indicator|count/i,
        "progress": /progress|loader|loading|spinner/i,
        "skeleton": /skeleton|placeholder/i,
        "card": /card|tile|block|panel/i,
        "avatar": /avatar|profile|user|photo/i,
        "image": /image|img|picture/i,
        "video": /video|player/i,
        "icon": /icon|pictogram|symbol/i,
        "text": /text|label|paragraph|caption|copy/i,
        "link": /link|anchor/i,
        "container": /container|wrapper|box|frame/i,
        "grid": /grid/i,
        "divider": /divider|separator|delimiter/i,
        "spacer": /spacer|space|gap/i,
        "fab": /fab|floating|float/i,
        "chip": /chip|tag/i,
        "actionsheet": /actionsheet|action-sheet/i,
        "chart": /chart|graph/i,
        "table": /table/i,
        "calendar": /calendar|date/i,
        "timeline": /timeline/i,
        "gallery": /gallery|carousel/i,
        "price": /price|cost/i,
        "rating": /rating|star/i,
        "cart": /cart|basket/i,
        "map": /map|location/i,
        "code": /code|syntax/i,
        "terminal": /terminal|console/i
      };
      const priorityPatterns = [
        "icon-button",
        "upload",
        "form",
        "context-menu",
        "modal-header",
        "list-item",
        "appbar",
        "dialog",
        "snackbar",
        "bottomsheet",
        "actionsheet",
        "searchbar",
        "fab",
        "breadcrumb",
        "pagination",
        "skeleton",
        "textarea",
        "checkbox",
        "radio",
        "switch",
        "slider",
        "tab",
        "navigation",
        "tooltip",
        "badge",
        "progress",
        "avatar",
        "chip",
        "stepper",
        "chart",
        "table",
        "calendar",
        "timeline",
        "gallery",
        "rating"
      ];
      for (const type of priorityPatterns) {
        if ((_a = patterns[type]) == null ? void 0 : _a.test(name)) return type;
      }
      for (const type in patterns) {
        if (Object.prototype.hasOwnProperty.call(patterns, type) && !priorityPatterns.includes(type)) {
          if (patterns[type].test(name)) return type;
        }
      }
      return "unknown";
    }
    /**
     * Calculates confidence score for component type detection
     */
    static calculateConfidence(name, suggestedType) {
      if (suggestedType === "unknown") return 0.1;
      if (name.toLowerCase() === suggestedType.toLowerCase()) return 0.95;
      if (name.includes(suggestedType)) return 0.9;
      if (name.toLowerCase().includes(suggestedType + "-") || name.toLowerCase().includes(suggestedType + "_")) return 0.85;
      return 0.7;
    }
    /**
     * Finds and catalogs text layers within a component
     */
    static findTextLayers(comp) {
      const textLayers = [];
      try {
        const nodeToAnalyze = comp.type === "COMPONENT_SET" ? comp.defaultVariant : comp;
        if (nodeToAnalyze && "findAll" in nodeToAnalyze) {
          const allNodes = nodeToAnalyze.findAll((node) => node.type === "TEXT");
          allNodes.forEach((node) => {
            if (node.type === "TEXT" && node.name) {
              const textNode = node;
              textLayers.push(textNode.name);
              try {
                const chars = textNode.characters || "[empty]";
                console.log(`\u{1F4DD} Found text layer: "${textNode.name}" with content: "${chars}"`);
              } catch (charError) {
                console.log(`\u{1F4DD} Found text layer: "${textNode.name}" (could not read characters)`);
              }
            }
          });
        }
      } catch (e) {
        console.error(`Error finding text layers in "${comp.name}":`, e);
      }
      return textLayers;
    }
    /**
     * Analyzes text nodes by fontSize/fontWeight and classifies by visual prominence
     */
    static analyzeTextHierarchy(comp) {
      const textHierarchy = [];
      try {
        const nodeToAnalyze = comp.type === "COMPONENT_SET" ? comp.defaultVariant : comp;
        if (nodeToAnalyze && "findAll" in nodeToAnalyze) {
          const textNodes = nodeToAnalyze.findAll((node) => node.type === "TEXT");
          const fontSizes = [];
          const textNodeData = [];
          textNodes.forEach((node) => {
            if (node.type === "TEXT") {
              const textNode = node;
              try {
                const fontSize = typeof textNode.fontSize === "number" ? textNode.fontSize : 14;
                const fontWeight = textNode.fontWeight || "normal";
                fontSizes.push(fontSize);
                textNodeData.push({ node: textNode, fontSize, fontWeight });
              } catch (e) {
                console.warn(`Could not read font properties for text node "${textNode.name}"`);
              }
            }
          });
          const uniqueSizes = [...new Set(fontSizes)].sort((a, b) => b - a);
          textNodeData.forEach(({ node, fontSize, fontWeight }) => {
            let classification = "tertiary";
            if (uniqueSizes.length >= 3) {
              if (fontSize >= uniqueSizes[0]) classification = "primary";
              else if (fontSize >= uniqueSizes[1]) classification = "secondary";
              else classification = "tertiary";
            } else if (uniqueSizes.length === 2) {
              classification = fontSize >= uniqueSizes[0] ? "primary" : "secondary";
            } else {
              const weight = String(fontWeight).toLowerCase();
              if (weight.includes("bold") || weight.includes("700") || weight.includes("800") || weight.includes("900")) {
                classification = "primary";
              } else if (weight.includes("medium") || weight.includes("500") || weight.includes("600")) {
                classification = "secondary";
              } else {
                classification = "tertiary";
              }
            }
            let characters;
            try {
              characters = node.characters || "[empty]";
            } catch (e) {
              characters = void 0;
            }
            textHierarchy.push({
              nodeName: node.name,
              nodeId: node.id,
              fontSize,
              fontWeight,
              classification,
              visible: node.visible,
              characters
            });
          });
        }
      } catch (e) {
        console.error(`Error analyzing text hierarchy in "${comp.name}":`, e);
      }
      return textHierarchy;
    }
    /**
     * Finds all nested COMPONENT/INSTANCE nodes (often icons)
     */
    static async findComponentInstances(comp) {
      const componentInstances = [];
      try {
        const nodeToAnalyze = comp.type === "COMPONENT_SET" ? comp.defaultVariant : comp;
        if (nodeToAnalyze && "findAll" in nodeToAnalyze) {
          const instanceNodes = nodeToAnalyze.findAll(
            (node) => node.type === "COMPONENT" || node.type === "INSTANCE"
          );
          for (const node of instanceNodes) {
            if (node.type === "COMPONENT" || node.type === "INSTANCE") {
              const instance = {
                nodeName: node.name,
                nodeId: node.id,
                visible: node.visible
              };
              if (node.type === "INSTANCE") {
                try {
                  const mainComponent = await node.getMainComponentAsync();
                  instance.componentId = mainComponent == null ? void 0 : mainComponent.id;
                } catch (e) {
                  console.warn(`Could not get main component ID for instance "${node.name}"`);
                }
              }
              componentInstances.push(instance);
            }
          }
        }
      } catch (e) {
        console.error(`Error finding component instances in "${comp.name}":`, e);
      }
      return componentInstances;
    }
    /**
     * Finds all VECTOR nodes (direct SVG icons)
     */
    static findVectorNodes(comp) {
      const vectorNodes = [];
      try {
        const nodeToAnalyze = comp.type === "COMPONENT_SET" ? comp.defaultVariant : comp;
        if (nodeToAnalyze && "findAll" in nodeToAnalyze) {
          const vectors = nodeToAnalyze.findAll((node) => node.type === "VECTOR");
          vectors.forEach((node) => {
            if (node.type === "VECTOR") {
              vectorNodes.push({
                nodeName: node.name,
                nodeId: node.id,
                visible: node.visible
              });
            }
          });
        }
      } catch (e) {
        console.error(`Error finding vector nodes in "${comp.name}":`, e);
      }
      return vectorNodes;
    }
    /**
     * Finds all nodes that can accept image fills (RECTANGLE, ELLIPSE with image fills)
     */
    static findImageNodes(comp) {
      const imageNodes = [];
      try {
        const nodeToAnalyze = comp.type === "COMPONENT_SET" ? comp.defaultVariant : comp;
        if (nodeToAnalyze && "findAll" in nodeToAnalyze) {
          const shapeNodes = nodeToAnalyze.findAll(
            (node) => node.type === "RECTANGLE" || node.type === "ELLIPSE"
          );
          shapeNodes.forEach((node) => {
            if (node.type === "RECTANGLE" || node.type === "ELLIPSE") {
              let hasImageFill = false;
              try {
                const fills = node.fills;
                if (Array.isArray(fills)) {
                  hasImageFill = fills.some(
                    (fill) => typeof fill === "object" && fill !== null && fill.type === "IMAGE"
                  );
                }
              } catch (e) {
                console.warn(`Could not check fills for node "${node.name}"`);
              }
              imageNodes.push({
                nodeName: node.name,
                nodeId: node.id,
                nodeType: node.type,
                visible: node.visible,
                hasImageFill
              });
            }
          });
        }
      } catch (e) {
        console.error(`Error finding image nodes in "${comp.name}":`, e);
      }
      return imageNodes;
    }
    /**
     * Generate LLM prompt based on scanned components
     */
    static generateLLMPrompt(components) {
      const componentsByType = {};
      components.forEach((comp) => {
        if (comp.confidence >= 0.7) {
          if (!componentsByType[comp.suggestedType]) componentsByType[comp.suggestedType] = [];
          componentsByType[comp.suggestedType].push(comp);
        }
      });
      let prompt = `# AIDesigner JSON Generation Instructions

## Available Components in Design System:

`;
      Object.keys(componentsByType).sort().forEach((type) => {
        var _a, _b, _c, _d, _e, _f;
        const comps = componentsByType[type];
        const bestComponent = comps.sort((a, b) => b.confidence - a.confidence)[0];
        prompt += `### ${type.toUpperCase()}
`;
        prompt += `- Component ID: "${bestComponent.id}"
`;
        prompt += `- Component Name: "${bestComponent.name}"
`;
        if ((_a = bestComponent.textLayers) == null ? void 0 : _a.length) prompt += `- Text Layers: ${bestComponent.textLayers.map((l) => `"${l}"`).join(", ")}
`;
        if ((_b = bestComponent.textHierarchy) == null ? void 0 : _b.length) {
          prompt += `- Text Hierarchy:
`;
          bestComponent.textHierarchy.forEach((text) => {
            prompt += `  - ${text.classification.toUpperCase()}: "${text.nodeName}" (${text.fontSize}px, ${text.fontWeight}${text.visible ? "" : ", hidden"})
`;
          });
        }
        if ((_c = bestComponent.componentInstances) == null ? void 0 : _c.length) {
          prompt += `- Component Instances: ${bestComponent.componentInstances.map((c) => `"${c.nodeName}"${c.visible ? "" : " (hidden)"}`).join(", ")}
`;
        }
        if ((_d = bestComponent.vectorNodes) == null ? void 0 : _d.length) {
          prompt += `- Vector Icons: ${bestComponent.vectorNodes.map((v) => `"${v.nodeName}"${v.visible ? "" : " (hidden)"}`).join(", ")}
`;
        }
        if ((_e = bestComponent.imageNodes) == null ? void 0 : _e.length) {
          prompt += `- Image Containers: ${bestComponent.imageNodes.map((i) => `"${i.nodeName}" (${i.nodeType}${i.hasImageFill ? ", has image" : ""}${i.visible ? "" : ", hidden"})`).join(", ")}
`;
        }
        if (bestComponent.variantDetails && Object.keys(bestComponent.variantDetails).length > 0) {
          prompt += `
  - \u{1F3AF} VARIANTS AVAILABLE:
`;
          Object.entries(bestComponent.variantDetails).forEach(([propName, values]) => {
            prompt += `    - **${propName}**: [${values.map((v) => `"${v}"`).join(", ")}]
`;
            const propLower = propName.toLowerCase();
            if (propLower.includes("condition") || propLower.includes("layout")) {
              prompt += `      \u{1F4A1} Layout control: ${values.includes("1-line") ? '"1-line" = single line, ' : ""}${values.includes("2-line") ? '"2-line" = detailed view' : ""}
`;
            }
            if (propLower.includes("leading") || propLower.includes("start")) {
              prompt += `      \u{1F4A1} Leading element: "Icon" = shows leading icon, "None" = text only
`;
            }
            if (propLower.includes("trailing") || propLower.includes("end")) {
              prompt += `      \u{1F4A1} Trailing element: "Icon" = shows trailing icon/chevron, "None" = no trailing element
`;
            }
            if (propLower.includes("state") || propLower.includes("status")) {
              prompt += `      \u{1F4A1} Component state: controls enabled/disabled/selected appearance
`;
            }
            if (propLower.includes("size")) {
              prompt += `      \u{1F4A1} Size control: affects padding, text size, and touch targets
`;
            }
            if (propLower.includes("type") || propLower.includes("style") || propLower.includes("emphasis")) {
              prompt += `      \u{1F4A1} Visual emphasis: controls hierarchy and visual weight
`;
            }
          });
          prompt += `
  - \u26A1 QUICK VARIANT GUIDE:
`;
          prompt += `    - "single line" request \u2192 use "Condition": "1-line"
`;
          prompt += `    - "with icon" request \u2192 use "Leading": "Icon"
`;
          prompt += `    - "arrow" or "chevron" \u2192 use "Trailing": "Icon"
`;
          prompt += `    - "simple" or "minimal" \u2192 omit variants to use defaults
`;
          prompt += `    - Only specify variants you want to change from defaults
`;
        }
        prompt += `- Page: ${((_f = bestComponent.pageInfo) == null ? void 0 : _f.pageName) || "Unknown"}

`;
      });
      prompt += `## JSON Structure & Rules:

### Variant Usage Rules:
- **Variants must be in a separate "variants" object inside properties**
- **NEVER mix variants with regular properties at the same level**
- Variant properties are case-sensitive: "Condition" not "condition"
- Variant values are case-sensitive: "1-line" not "1-Line"

### \u2705 CORRECT Variant Structure:
\`\`\`json
{
  "type": "list-item",
  "componentNodeId": "10:123",
  "properties": {
    "text": "Personal details",
    "horizontalSizing": "FILL",
    "variants": {
      "Condition": "1-line",
      "Leading": "Icon", 
      "Trailing": "Icon"
    }
  }
}
\`\`\`

### \u274C WRONG - Never do this:
\`\`\`json
{
  "properties": {
    "text": "Personal details",
    "Condition": "1-line",    // WRONG: variants mixed with properties
    "Leading": "Icon"         // WRONG: should be in variants object
  }
}
\`\`\`

### Settings Screen with Proper Variants:
\`\`\`json
{
  "layoutContainer": {
    "name": "Settings Screen",
    "layoutMode": "VERTICAL",
    "width": 360,
    "itemSpacing": 8
  },
  "items": [
    {
      "type": "list-item",
      "componentNodeId": "10:123",
      "properties": {
        "text": "Personal details",
        "horizontalSizing": "FILL",
        "variants": {
          "Condition": "1-line",
          "Leading": "Icon",
          "Trailing": "None"
        }
      }
    },
    {
      "type": "list-item",
      "componentNodeId": "10:123",
      "properties": {
        "text": "Change language",
        "trailing-text": "English",
        "horizontalSizing": "FILL",
        "variants": {
          "Condition": "1-line",
          "Leading": "Icon",
          "Trailing": "Icon"
        }
      }
    },
    {
      "type": "list-item",
      "componentNodeId": "10:123",
      "properties": {
        "text": "Notifications",
        "supporting-text": "Push notifications and email alerts",
        "trailing-text": "On",
        "horizontalSizing": "FILL",
        "variants": {
          "Condition": "2-line",
          "Leading": "Icon",
          "Trailing": "Icon"
        }
      }
    }
  ]
}
\`\`\`

### \u2705 VARIANT BEST PRACTICES:
- **Always use exact property names**: "Condition" not "condition"
- **Use exact values**: "1-line" not "1-Line" or "single-line"
- **Specify complete variant sets**: Include all required properties for that variant
- **Common patterns**:
  - Simple navigation: \`"Condition": "1-line", "Leading": "Icon", "Trailing": "None"\`
  - With current value: \`"Condition": "1-line", "Leading": "Icon", "Trailing": "Icon"\`
  - Detailed info: \`"Condition": "2-line", "Leading": "Icon", "Trailing": "Icon"\`

*\u{1F3AF} Pro tip: Study your design system's variant combinations in Figma to understand which variants work together.*
`;
      return prompt;
    }
    /**
     * Save scan results to Figma storage
     */
    static async saveLastScanResults(components) {
      try {
        const scanSession = {
          components,
          scanTime: Date.now(),
          version: "1.0",
          fileKey: figma.root.id
        };
        await figma.clientStorage.setAsync("design-system-scan", scanSession);
        await figma.clientStorage.setAsync("last-scan-results", components);
        console.log(`\u{1F4BE} Saved ${components.length} components with session data`);
      } catch (error) {
        console.error("\u274C Error saving scan results:", error);
        try {
          await figma.clientStorage.setAsync("last-scan-results", components);
          console.log("\u{1F4BE} Fallback save successful");
        } catch (fallbackError) {
          console.warn("\u26A0\uFE0F Could not save scan results:", fallbackError);
        }
      }
    }
    /**
     * Get component ID by type for UI generation
     */
    static async getComponentIdByType(type) {
      const searchType = type.toLowerCase();
      const scanResults = await figma.clientStorage.getAsync("last-scan-results");
      if (scanResults && Array.isArray(scanResults)) {
        const matchingComponent = scanResults.find((comp) => comp.suggestedType.toLowerCase() === searchType && comp.confidence >= 0.7);
        if (matchingComponent) return matchingComponent.id;
        const nameMatchingComponent = scanResults.find((comp) => comp.name.toLowerCase().includes(searchType));
        if (nameMatchingComponent) return nameMatchingComponent.id;
      }
      console.log(`\u274C ID for type ${type} not found`);
      return null;
    }
  };

  // src/core/design-system-scanner-service.ts
  var DesignSystemScannerService = class {
    /**
     * Main scanning function - scans all pages for components
     */
    static async scanDesignSystem(progressCallback) {
      console.log("\u{1F50D} Starting design system scan...");
      const components = [];
      try {
        await figma.loadAllPagesAsync();
        console.log("\u2705 All pages loaded");
        const totalPages = figma.root.children.length;
        let currentPage = 0;
        progressCallback == null ? void 0 : progressCallback({ current: 0, total: totalPages, status: "Initializing scan..." });
        for (const page of figma.root.children) {
          currentPage++;
          const pageStatus = `Scanning page: "${page.name}" (${currentPage}/${totalPages})`;
          console.log(`\u{1F4CB} ${pageStatus}`);
          progressCallback == null ? void 0 : progressCallback({
            current: currentPage,
            total: totalPages,
            status: pageStatus
          });
          try {
            const allNodes = page.findAll((node) => {
              if (node.type === "COMPONENT_SET") {
                return true;
              }
              if (node.type === "COMPONENT") {
                return !!(node.parent && node.parent.type !== "COMPONENT_SET");
              }
              return false;
            });
            console.log(`\u2705 Found ${allNodes.length} main components on page "${page.name}"`);
            for (const node of allNodes) {
              try {
                if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
                  const componentInfo = await ComponentScanner.analyzeComponent(node);
                  if (componentInfo) {
                    componentInfo.pageInfo = {
                      pageName: page.name,
                      pageId: page.id,
                      isCurrentPage: page.id === figma.currentPage.id
                    };
                    components.push(componentInfo);
                  }
                }
              } catch (e) {
                console.error(`\u274C Error analyzing component "${node.name}":`, e);
              }
            }
          } catch (e) {
            console.error(`\u274C Error scanning page "${page.name}":`, e);
          }
        }
        progressCallback == null ? void 0 : progressCallback({
          current: totalPages,
          total: totalPages,
          status: `Scan complete! Found ${components.length} components`
        });
        console.log(`\u{1F389} Design system scan complete! Found ${components.length} unique components.`);
        return components;
      } catch (e) {
        console.error("\u274C Critical error in design system scan:", e);
        throw e;
      }
    }
    /**
     * Generate LLM prompt - delegated to ComponentScanner
     */
    static generateLLMPrompt(components) {
      return ComponentScanner.generateLLMPrompt(components);
    }
    /**
     * Analyzes a single component to extract metadata and variants
     * @deprecated Use ComponentScanner.analyzeComponent instead
     */
    static analyzeComponent(comp) {
      const name = comp.name;
      const suggestedType = this.guessComponentType(name.toLowerCase());
      const confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
      const textLayers = this.findTextLayers(comp);
      let variants = [];
      let variantDetails = {};
      if (comp.type === "COMPONENT_SET") {
        const variantProps = comp.variantGroupProperties;
        if (variantProps) {
          variants = Object.keys(variantProps);
          Object.entries(variantProps).forEach(([propName, propInfo]) => {
            if (propInfo.values && propInfo.values.length > 0) {
              variantDetails[propName] = [...propInfo.values].sort();
              console.log(`\u2705 Found variant property: ${propName} with values: [${propInfo.values.join(", ")}]`);
            }
          });
          console.log(`\u{1F3AF} Variant details for "${comp.name}":`, variantDetails);
        }
      }
      return {
        id: comp.id,
        name,
        suggestedType,
        confidence,
        variants: variants.length > 0 ? variants : void 0,
        variantDetails: Object.keys(variantDetails).length > 0 ? variantDetails : void 0,
        textLayers: textLayers.length > 0 ? textLayers : void 0,
        isFromLibrary: false
      };
    }
    /**
     * Intelligent component type detection based on naming patterns
     */
    static guessComponentType(name) {
      var _a;
      const patterns = {
        "icon-button": /icon.*button|button.*icon/i,
        "upload": /upload|file.*drop|drop.*zone|attach/i,
        "form": /form|captcha|verification/i,
        "context-menu": /context-menu|context menu|contextual menu|options menu/i,
        "modal-header": /modal-header|modal header|modalstack|modal_stack/i,
        "list-item": /list-item|list item|list_item|list[\s\-_]*row|list[\s\-_]*cell/i,
        "appbar": /appbar|app-bar|navbar|nav-bar|header|top bar|page header/i,
        "dialog": /dialog|dialogue|popup|modal(?!-header)/i,
        "list": /list(?!-item)/i,
        "navigation": /nav|navigation(?!-bar)/i,
        "header": /h[1-6]|title|heading(?! bar)/i,
        "button": /button|btn|cta|action/i,
        "input": /input|field|textfield|text-field|entry/i,
        "textarea": /textarea|text-area|multiline/i,
        "select": /select|dropdown|drop-down|picker/i,
        "checkbox": /checkbox|check-box/i,
        "radio": /radio|radiobutton|radio-button/i,
        "switch": /switch|toggle/i,
        "slider": /slider|range/i,
        "searchbar": /search|searchbar|search-bar/i,
        "tab": /tab|tabs|tabbar|tab-bar/i,
        "breadcrumb": /breadcrumb|bread-crumb/i,
        "pagination": /pagination|pager/i,
        "bottomsheet": /bottomsheet|bottom-sheet|drawer/i,
        "sidebar": /sidebar|side-bar/i,
        "snackbar": /snack|snackbar|toast|notification/i,
        "alert": /alert/i,
        "tooltip": /tooltip|tip|hint/i,
        "badge": /badge|indicator|count/i,
        "progress": /progress|loader|loading|spinner/i,
        "skeleton": /skeleton|placeholder/i,
        "card": /card|tile|block|panel/i,
        "avatar": /avatar|profile|user|photo/i,
        "image": /image|img|picture/i,
        "video": /video|player/i,
        "icon": /icon|pictogram|symbol/i,
        "text": /text|label|paragraph|caption|copy/i,
        "link": /link|anchor/i,
        "container": /container|wrapper|box|frame/i,
        "grid": /grid/i,
        "divider": /divider|separator|delimiter/i,
        "spacer": /spacer|space|gap/i,
        "fab": /fab|floating|float/i,
        "chip": /chip|tag/i,
        "actionsheet": /actionsheet|action-sheet/i,
        "chart": /chart|graph/i,
        "table": /table/i,
        "calendar": /calendar|date/i,
        "timeline": /timeline/i,
        "gallery": /gallery|carousel/i,
        "price": /price|cost/i,
        "rating": /rating|star/i,
        "cart": /cart|basket/i,
        "map": /map|location/i,
        "code": /code|syntax/i,
        "terminal": /terminal|console/i
      };
      const priorityPatterns = [
        "icon-button",
        "upload",
        "form",
        "context-menu",
        "modal-header",
        "list-item",
        "appbar",
        "dialog",
        "snackbar",
        "bottomsheet",
        "actionsheet",
        "searchbar",
        "fab",
        "breadcrumb",
        "pagination",
        "skeleton",
        "textarea",
        "checkbox",
        "radio",
        "switch",
        "slider",
        "tab",
        "navigation",
        "tooltip",
        "badge",
        "progress",
        "avatar",
        "chip",
        "stepper",
        "chart",
        "table",
        "calendar",
        "timeline",
        "gallery",
        "rating"
      ];
      for (const type of priorityPatterns) {
        if ((_a = patterns[type]) == null ? void 0 : _a.test(name)) return type;
      }
      for (const type in patterns) {
        if (patterns.hasOwnProperty(type) && !priorityPatterns.includes(type)) {
          if (patterns[type].test(name)) return type;
        }
      }
      return "unknown";
    }
    /**
     * Calculates confidence score for component type detection
     */
    static calculateConfidence(name, suggestedType) {
      if (suggestedType === "unknown") return 0.1;
      if (name.toLowerCase() === suggestedType.toLowerCase()) return 0.95;
      if (name.includes(suggestedType)) return 0.9;
      if (name.toLowerCase().includes(suggestedType + "-") || name.toLowerCase().includes(suggestedType + "_")) return 0.85;
      return 0.7;
    }
    /**
     * Finds and catalogs text layers within a component
     */
    static findTextLayers(comp) {
      const textLayers = [];
      try {
        const nodeToAnalyze = comp.type === "COMPONENT_SET" ? comp.defaultVariant : comp;
        if (nodeToAnalyze && "findAll" in nodeToAnalyze) {
          const allNodes = nodeToAnalyze.findAll((node) => node.type === "TEXT");
          allNodes.forEach((node) => {
            if (node.type === "TEXT" && node.name) {
              const textNode = node;
              textLayers.push(textNode.name);
              try {
                const chars = textNode.characters || "[empty]";
                console.log(`\u{1F4DD} Found text layer: "${textNode.name}" with content: "${chars}"`);
              } catch (charError) {
                console.log(`\u{1F4DD} Found text layer: "${textNode.name}" (could not read characters)`);
              }
            }
          });
        }
      } catch (e) {
        console.error(`Error finding text layers in "${comp.name}":`, e);
      }
      return textLayers;
    }
    /**
     * Save scan results to Figma storage
     */
    static async saveScanResults(components) {
      try {
        const scanSession = {
          components,
          scanTime: Date.now(),
          version: "1.0",
          fileKey: figma.root.id
        };
        await figma.clientStorage.setAsync("design-system-scan", scanSession);
        await figma.clientStorage.setAsync("last-scan-results", components);
        console.log(`\u{1F4BE} Saved ${components.length} components with session data`);
      } catch (error) {
        console.error("\u274C Error saving scan results:", error);
        try {
          await figma.clientStorage.setAsync("last-scan-results", components);
          console.log("\u{1F4BE} Fallback save successful");
        } catch (fallbackError) {
          console.warn("\u26A0\uFE0F Could not save scan results:", fallbackError);
        }
      }
    }
    /**
     * Get component ID by type for UI generation
     */
    static async getComponentIdByType(type) {
      const searchType = type.toLowerCase();
      const scanResults = await figma.clientStorage.getAsync("last-scan-results");
      if (scanResults && Array.isArray(scanResults)) {
        const matchingComponent = scanResults.find(
          (comp) => comp.suggestedType.toLowerCase() === searchType && comp.confidence >= 0.7
        );
        if (matchingComponent) return matchingComponent.id;
        const nameMatchingComponent = scanResults.find(
          (comp) => comp.name.toLowerCase().includes(searchType)
        );
        if (nameMatchingComponent) return nameMatchingComponent.id;
      }
      console.log(`\u274C Component ID for type "${type}" not found`);
      return null;
    }
    /**
     * Get saved scan results from storage
     */
    static async getSavedScanResults() {
      try {
        const scanResults = await figma.clientStorage.getAsync("last-scan-results");
        return scanResults || null;
      } catch (error) {
        console.error("\u274C Error getting saved scan results:", error);
        return null;
      }
    }
    /**
     * Get scan session data
     */
    static async getScanSession() {
      try {
        const scanSession = await figma.clientStorage.getAsync("design-system-scan");
        return scanSession || null;
      } catch (error) {
        console.error("\u274C Error getting scan session:", error);
        return null;
      }
    }
    /**
     * Update component type manually
     */
    static async updateComponentType(componentId, newType) {
      try {
        const scanResults = await figma.clientStorage.getAsync("last-scan-results");
        if (scanResults && Array.isArray(scanResults)) {
          let componentName = "";
          const updatedResults = scanResults.map((comp) => {
            if (comp.id === componentId) {
              componentName = comp.name;
              return __spreadProps(__spreadValues({}, comp), { suggestedType: newType, confidence: 1 });
            }
            return comp;
          });
          await this.saveScanResults(updatedResults);
          return { success: true, componentName };
        }
        return { success: false };
      } catch (error) {
        console.error("\u274C Error updating component type:", error);
        return { success: false };
      }
    }
    /**
     * Clear all scan data
     */
    static async clearScanData() {
      try {
        await figma.clientStorage.setAsync("design-system-scan", null);
        await figma.clientStorage.setAsync("last-scan-results", null);
        console.log("\u2705 Scan data cleared");
      } catch (error) {
        console.error("\u274C Error clearing scan data:", error);
      }
    }
  };

  // src/core/component-property-engine.ts
  var TabComponentHandler = class {
    preprocessProperties(properties) {
      if (properties.Label && !Array.isArray(properties.Label)) {
        properties.Label = [properties.Label];
      }
      return properties;
    }
    postProcessInstance(instance, properties) {
    }
    getVariantPurpose(variantName) {
      const purposes = {
        "Type": "layout behavior (Fixed vs Scrollable)",
        "Style": "visual emphasis (Primary vs Secondary)",
        "Configuration": "content structure (Label-only vs Label & Icon)"
      };
      return purposes[variantName] || "component appearance";
    }
  };
  var ChipComponentHandler = class {
    preprocessProperties(properties) {
      if (properties.label && !Array.isArray(properties.label)) {
        properties.label = [properties.label];
      }
      return properties;
    }
    postProcessInstance(instance, properties) {
    }
    getVariantPurpose(variantName) {
      return "chip appearance and behavior";
    }
  };
  var PerformanceTracker = class {
    static async track(operation, fn) {
      const start = Date.now();
      try {
        return await fn();
      } finally {
        const duration = Date.now() - start;
        if (!this.metrics.has(operation)) {
          this.metrics.set(operation, []);
        }
        this.metrics.get(operation).push(duration);
        console.log(`\u23F1\uFE0F ${operation}: ${duration.toFixed(2)}ms`);
      }
    }
    static getReport() {
      const report = {};
      this.metrics.forEach((durations, operation) => {
        report[operation] = {
          avg: durations.reduce((a, b) => a + b, 0) / durations.length,
          min: Math.min(...durations),
          max: Math.max(...durations)
        };
      });
      return report;
    }
  };
  PerformanceTracker.metrics = /* @__PURE__ */ new Map();
  var ComponentPropertyEngine = class {
    static async initialize() {
      try {
        await PerformanceTracker.track("engine-initialization", async () => {
          figma.skipInvisibleInstanceChildren = true;
          await this.preloadCommonFonts();
          const scanResults = await figma.clientStorage.getAsync("last-scan-results");
          if (!scanResults || !Array.isArray(scanResults)) {
            console.warn("\u26A0\uFE0F No scan results found. Run ComponentScanner.scanDesignSystem() first.");
            return;
          }
          for (const component of scanResults) {
            const schema = await this.buildComponentSchemaFromScanData(component);
            this.componentSchemas.set(component.id, schema);
            console.log(`\u{1F4CB} Loaded schema for ${schema.name} (${schema.id})`);
          }
        });
        console.log(`\u{1F3AF} ComponentPropertyEngine initialized with ${this.componentSchemas.size} component schemas`);
      } catch (error) {
        console.error("\u274C Failed to initialize ComponentPropertyEngine:", error);
      }
    }
    static async preloadCommonFonts() {
      if (this.commonFontsLoaded) return;
      const commonFonts = [
        { family: "Inter", style: "Regular" },
        { family: "Inter", style: "Medium" },
        { family: "Inter", style: "Bold" },
        { family: "Roboto", style: "Regular" },
        { family: "Roboto", style: "Medium" },
        { family: "Roboto", style: "Bold" }
      ];
      await Promise.all(commonFonts.map(
        (font) => figma.loadFontAsync(font).catch(() => {
          console.warn(`\u26A0\uFE0F Could not preload font: ${font.family} ${font.style}`);
        })
      ));
      this.commonFontsLoaded = true;
      console.log("\u2705 Common fonts preloaded");
    }
    static async buildComponentSchemaFromScanData(scanData) {
      let componentProperties = {};
      let availableVariants = {};
      try {
        const componentNode = await figma.getNodeByIdAsync(scanData.id);
        if (componentNode && componentNode.type === "COMPONENT_SET") {
          const propertyDefs = componentNode.componentPropertyDefinitions;
          if (propertyDefs) {
            componentProperties = propertyDefs;
            Object.entries(propertyDefs).forEach(([key, definition]) => {
              if (definition.type === "VARIANT" && definition.variantOptions) {
                availableVariants[key] = definition.variantOptions;
              }
            });
          }
        }
      } catch (error) {
        if (scanData.variantDetails) {
          Object.entries(scanData.variantDetails).forEach(([key, values]) => {
            availableVariants[key] = Array.isArray(values) ? values : [values];
          });
        }
      }
      const textLayers = {};
      if (scanData.textHierarchy && Array.isArray(scanData.textHierarchy)) {
        scanData.textHierarchy.forEach((textInfo) => {
          const dataType = this.inferTextDataType(scanData.suggestedType, textInfo.nodeName);
          textLayers[textInfo.nodeName] = {
            nodeId: textInfo.nodeId,
            nodeName: textInfo.nodeName,
            classification: textInfo.classification || "secondary",
            dataType,
            maxItems: dataType === "array" ? this.inferMaxItems(scanData.suggestedType, textInfo.nodeName) : void 0,
            fontSize: textInfo.fontSize,
            fontWeight: textInfo.fontWeight
          };
        });
      }
      const mediaLayers = {};
      [scanData.componentInstances, scanData.vectorNodes, scanData.imageNodes].forEach((nodeArray) => {
        if (nodeArray) {
          nodeArray.forEach((node) => {
            mediaLayers[node.nodeName] = {
              nodeId: node.nodeId,
              nodeName: node.nodeName,
              mediaType: this.inferMediaType(node.nodeName),
              dataType: "single",
              visible: node.visible
            };
          });
        }
      });
      return {
        id: scanData.id,
        name: scanData.name,
        availableVariants,
        componentProperties,
        textLayers,
        mediaLayers,
        componentType: scanData.suggestedType || "unknown",
        scanTimestamp: Date.now(),
        scanVersion: "1.1",
        componentHash: this.generateComponentHash(scanData)
      };
    }
    static generateComponentHash(scanData) {
      var _a, _b;
      const hashData = JSON.stringify({
        variants: scanData.variants,
        textLayers: (_a = scanData.textLayers) == null ? void 0 : _a.length,
        componentInstances: (_b = scanData.componentInstances) == null ? void 0 : _b.length
      });
      return btoa(hashData).substring(0, 8);
    }
    static inferTextDataType(componentType, layerName) {
      const layerLower = layerName.toLowerCase();
      const arrayPatterns = {
        "tab": ["label"],
        "tabs": ["label"],
        "chip": ["label", "text"],
        "list": ["item", "option", "choice"],
        "navigation": ["label", "text"],
        "menu": ["item", "option", "label"],
        "breadcrumb": ["item", "label"],
        "carousel": ["caption", "title"]
      };
      const componentPatterns = arrayPatterns[componentType];
      if (componentPatterns) {
        const supportsArray = componentPatterns.some((pattern) => layerLower.includes(pattern));
        if (supportsArray) return "array";
      }
      return "single";
    }
    static inferMaxItems(componentType, layerName) {
      const maxItemsMap = {
        "tab": 8,
        "tabs": 8,
        "navigation": 6,
        "chip": 10,
        "list": 50,
        "menu": 20,
        "breadcrumb": 5,
        "carousel": 10
      };
      return maxItemsMap[componentType] || 10;
    }
    static inferMediaType(nodeName) {
      const nameLower = nodeName.toLowerCase();
      if (nameLower.includes("avatar") || nameLower.includes("profile")) return "avatar";
      if (nameLower.includes("badge") || nameLower.includes("indicator")) return "badge";
      if (nameLower.includes("image") || nameLower.includes("photo")) return "image";
      return "icon";
    }
    static validateAndProcessProperties(componentId, rawProperties) {
      const schema = this.componentSchemas.get(componentId);
      if (!schema) {
        return {
          isValid: false,
          processedProperties: { variants: {}, textProperties: {}, mediaProperties: {}, layoutProperties: {} },
          warnings: [],
          errors: [{
            message: `No schema found for component ${componentId}`,
            suggestion: "Ensure design system has been scanned",
            llmHint: "Run ComponentScanner.scanDesignSystem() first"
          }]
        };
      }
      const handler = this.componentHandlers.get(schema.componentType);
      const processedRawProperties = handler ? handler.preprocessProperties(__spreadValues({}, rawProperties)) : rawProperties;
      const result = {
        isValid: true,
        processedProperties: { variants: {}, textProperties: {}, mediaProperties: {}, layoutProperties: {} },
        warnings: [],
        errors: []
      };
      Object.entries(processedRawProperties).forEach(([key, value]) => {
        if (key === "variants" && typeof value === "object") {
          Object.entries(value).forEach(([variantKey, variantValue]) => {
            result.processedProperties.variants[variantKey] = variantValue;
          });
          return;
        }
        if (schema.componentProperties[key] || schema.availableVariants[key]) {
          result.processedProperties.variants[key] = value;
        } else if (schema.textLayers[key]) {
          result.processedProperties.textProperties[key] = value;
        } else if (schema.mediaLayers[key]) {
          result.processedProperties.mediaProperties[key] = value;
        } else if ([
          "horizontalSizing",
          "verticalSizing",
          "layoutAlign",
          "layoutGrow",
          "minWidth",
          "maxWidth",
          "minHeight",
          "maxHeight"
        ].some((prop) => key.toLowerCase().includes(prop.toLowerCase()))) {
          result.processedProperties.layoutProperties[key] = value;
        } else {
          const textMatch = this.findSemanticMatch(key, Object.keys(schema.textLayers));
          const variantMatch = this.findSemanticMatch(key, Object.keys(schema.availableVariants));
          const mediaMatch = this.findSemanticMatch(key, Object.keys(schema.mediaLayers));
          if (textMatch) {
            result.processedProperties.textProperties[textMatch] = value;
            result.warnings.push(`Mapped "${key}" to text layer "${textMatch}"`);
          } else if (variantMatch) {
            result.processedProperties.variants[variantMatch] = value;
            result.warnings.push(`Mapped "${key}" to variant "${variantMatch}"`);
          } else if (mediaMatch) {
            result.processedProperties.mediaProperties[mediaMatch] = value;
            result.warnings.push(`Mapped "${key}" to media layer "${mediaMatch}"`);
          } else {
            result.warnings.push(`Unknown property "${key}" for component ${schema.name}`);
          }
        }
      });
      Object.entries(result.processedProperties.variants).forEach(([variantName, variantValue]) => {
        const modernProp = schema.componentProperties[variantName];
        const legacyValues = schema.availableVariants[variantName];
        if (modernProp && modernProp.type === "VARIANT") {
          if (!modernProp.variantOptions.includes(String(variantValue))) {
            const variantPurpose = handler ? handler.getVariantPurpose(variantName) : "component appearance";
            result.errors.push({
              message: `Invalid value "${variantValue}" for variant "${variantName}"`,
              suggestion: `Use one of: ${modernProp.variantOptions.map((v) => `"${v}"`).join(", ")}`,
              jsonPath: `properties.${variantName}`,
              llmHint: `For ${schema.componentType} components, ${variantName} controls ${variantPurpose}`
            });
          }
        } else if (legacyValues) {
          if (!legacyValues.includes(String(variantValue))) {
            const variantPurpose = handler ? handler.getVariantPurpose(variantName) : "component appearance";
            result.errors.push({
              message: `Invalid value "${variantValue}" for variant "${variantName}"`,
              suggestion: `Use one of: ${legacyValues.map((v) => `"${v}"`).join(", ")}`,
              jsonPath: `properties.${variantName}`,
              llmHint: `For ${schema.componentType} components, ${variantName} controls ${variantPurpose}`
            });
          }
        }
      });
      Object.entries(result.processedProperties.textProperties).forEach(([textProp, value]) => {
        const textLayer = schema.textLayers[textProp];
        if (textLayer && textLayer.dataType === "array" && !Array.isArray(value)) {
          result.warnings.push(`Property "${textProp}" expects array but got ${typeof value}. Converting to array.`);
          result.processedProperties.textProperties[textProp] = [value];
        }
      });
      result.isValid = result.errors.length === 0;
      return result;
    }
    static findSemanticMatch(propertyKey, availableKeys) {
      const keyLower = propertyKey.toLowerCase();
      for (const availableKey of availableKeys) {
        const availableLower = availableKey.toLowerCase();
        if (availableLower === keyLower) return availableKey;
        const normalizedKey = keyLower.replace(/[-_\s]/g, "");
        const normalizedAvailable = availableLower.replace(/[-_\s]/g, "");
        if (normalizedAvailable === normalizedKey) return availableKey;
        if (availableLower.includes(keyLower) || keyLower.includes(availableLower)) {
          return availableKey;
        }
      }
      const semanticMap = {
        "text": ["label", "title", "headline", "content"],
        "label": ["text", "title", "headline"],
        "supporting": ["subtitle", "description", "secondary"],
        "trailing": ["end", "right", "action"],
        "leading": ["start", "left", "icon"]
      };
      for (const [semantic, equivalents] of Object.entries(semanticMap)) {
        if (keyLower.includes(semantic)) {
          for (const equivalent of equivalents) {
            const match = availableKeys.find((k) => k.toLowerCase().includes(equivalent));
            if (match) return match;
          }
        }
      }
      return null;
    }
    static getComponentSchema(componentId) {
      return this.componentSchemas.get(componentId) || null;
    }
    static getAllSchemas() {
      return Array.from(this.componentSchemas.values());
    }
    static isSchemaStale(schema) {
      const staleThreshold = 7 * 24 * 60 * 60 * 1e3;
      return Date.now() - schema.scanTimestamp > staleThreshold;
    }
    static debugSchema(componentId) {
      const schema = this.getComponentSchema(componentId);
      if (schema) {
        console.log(`\u{1F4CB} Schema for ${schema.name}:`);
        console.log("  \u{1F3AF} Variants:", Object.keys(schema.availableVariants));
        console.log("  \u{1F4DD} Text Layers:", Object.keys(schema.textLayers));
        Object.entries(schema.textLayers).forEach(([name, info]) => {
          console.log(`    - ${name}: ${info.dataType}${info.maxItems ? ` (max: ${info.maxItems})` : ""}`);
        });
        console.log("  \u{1F5BC}\uFE0F Media Layers:", Object.keys(schema.mediaLayers));
        console.log("  \u{1F4C5} Scanned:", new Date(schema.scanTimestamp).toLocaleString());
        console.log("  \u{1F522} Version:", schema.scanVersion);
      } else {
        console.log(`\u274C No schema found for component ${componentId}`);
      }
    }
    static async createSchemaDebugFrame(componentId) {
      const schema = this.getComponentSchema(componentId);
      if (!schema) return;
      const debugFrame = figma.createFrame();
      debugFrame.name = `Debug: ${schema.name}`;
      debugFrame.resize(400, 600);
      debugFrame.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.95 } }];
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      let yPos = 20;
      const title = figma.createText();
      title.fontName = { family: "Inter", style: "Bold" };
      title.fontSize = 18;
      title.characters = `${schema.name} (${schema.componentType})`;
      title.x = 20;
      title.y = yPos;
      debugFrame.appendChild(title);
      yPos += 40;
      if (Object.keys(schema.availableVariants).length > 0) {
        const variantsTitle = figma.createText();
        variantsTitle.fontName = { family: "Inter", style: "Bold" };
        variantsTitle.fontSize = 14;
        variantsTitle.characters = "\u{1F3AF} Variants:";
        variantsTitle.x = 20;
        variantsTitle.y = yPos;
        debugFrame.appendChild(variantsTitle);
        yPos += 25;
        Object.entries(schema.availableVariants).forEach(([name, values]) => {
          const variantText = figma.createText();
          variantText.fontName = { family: "Inter", style: "Regular" };
          variantText.fontSize = 12;
          variantText.characters = `${name}: [${values.join(", ")}]`;
          variantText.x = 30;
          variantText.y = yPos;
          debugFrame.appendChild(variantText);
          yPos += 20;
        });
        yPos += 10;
      }
      if (Object.keys(schema.textLayers).length > 0) {
        const textTitle = figma.createText();
        textTitle.fontName = { family: "Inter", style: "Bold" };
        textTitle.fontSize = 14;
        textTitle.characters = "\u{1F4DD} Text Layers:";
        textTitle.x = 20;
        textTitle.y = yPos;
        debugFrame.appendChild(textTitle);
        yPos += 25;
        Object.entries(schema.textLayers).forEach(([name, info]) => {
          const layerText = figma.createText();
          layerText.fontName = { family: "Inter", style: "Regular" };
          layerText.fontSize = 12;
          layerText.characters = `${name}: ${info.dataType}${info.maxItems ? ` (max: ${info.maxItems})` : ""} - ${info.classification}`;
          layerText.x = 30;
          layerText.y = yPos;
          debugFrame.appendChild(layerText);
          yPos += 20;
        });
      }
      figma.currentPage.appendChild(debugFrame);
      figma.viewport.scrollAndZoomIntoView([debugFrame]);
    }
    static getPerformanceReport() {
      return PerformanceTracker.getReport();
    }
  };
  ComponentPropertyEngine.componentSchemas = /* @__PURE__ */ new Map();
  ComponentPropertyEngine.componentHandlers = /* @__PURE__ */ new Map([
    ["tab", new TabComponentHandler()],
    ["tabs", new TabComponentHandler()],
    ["chip", new ChipComponentHandler()]
  ]);
  ComponentPropertyEngine.commonFontsLoaded = false;

  // src/core/json-migrator.ts
  var JSONMigrator = class {
    static migrateToSystematic(originalJSON) {
      if (originalJSON.items) {
        originalJSON.items = this.traverseAndMerge(originalJSON.items);
      }
      if (originalJSON.layoutContainer && originalJSON.layoutContainer.items) {
        originalJSON.layoutContainer.items = this.traverseAndMerge(originalJSON.layoutContainer.items);
      }
      return originalJSON;
    }
    static generateMigrationPreview(originalJSON) {
      return {
        action: "No migration needed",
        details: "JSON is already in the correct format"
      };
    }
    static traverseAndMerge(items) {
      if (!items) {
        return [];
      }
      let newItems = this.mergeConsecutiveTabs(items);
      newItems = newItems.map((item) => {
        if (item.items) {
          item.items = this.traverseAndMerge(item.items);
        }
        if (item.layoutContainer && item.layoutContainer.items) {
          item.layoutContainer.items = this.traverseAndMerge(item.layoutContainer.items);
        }
        return item;
      });
      return newItems;
    }
    static mergeConsecutiveTabs(items) {
      if (!items || items.length === 0) {
        return [];
      }
      const newItems = [];
      let i = 0;
      while (i < items.length) {
        const currentItem = items[i];
        if (currentItem.type === "tab" && i + 1 < items.length && items[i + 1].type === "tab") {
          const tabGroup = [currentItem];
          let j = i + 1;
          while (j < items.length && items[j].type === "tab") {
            tabGroup.push(items[j]);
            j++;
          }
          const newTab = __spreadProps(__spreadValues({}, tabGroup[0]), {
            properties: __spreadProps(__spreadValues({}, tabGroup[0].properties), {
              Label: tabGroup.map((tab) => tab.properties.Label)
            })
          });
          newItems.push(newTab);
          i = j;
        } else {
          newItems.push(currentItem);
          i++;
        }
      }
      return newItems;
    }
  };

  // src/core/figma-renderer.ts
  var FigmaRenderer = class {
    /**
     * Main UI generation function - creates UI from structured JSON data
     */
    static async generateUIFromData(layoutData, parentNode) {
      let currentFrame;
      const containerData = layoutData.layoutContainer || layoutData;
      if (parentNode.type === "PAGE" && containerData) {
        currentFrame = figma.createFrame();
        parentNode.appendChild(currentFrame);
      } else if (parentNode.type === "FRAME") {
        currentFrame = parentNode;
      } else {
        figma.notify("Cannot add items without a parent frame.", { error: true });
        return figma.createFrame();
      }
      if (containerData && containerData !== layoutData) {
        currentFrame.name = containerData.name || "Generated Frame";
        currentFrame.layoutMode = containerData.layoutMode === "HORIZONTAL" || containerData.layoutMode === "VERTICAL" ? containerData.layoutMode : "NONE";
        if (currentFrame.layoutMode !== "NONE") {
          currentFrame.paddingTop = typeof containerData.paddingTop === "number" ? containerData.paddingTop : 0;
          currentFrame.paddingBottom = typeof containerData.paddingBottom === "number" ? containerData.paddingBottom : 0;
          currentFrame.paddingLeft = typeof containerData.paddingLeft === "number" ? containerData.paddingLeft : 0;
          currentFrame.paddingRight = typeof containerData.paddingRight === "number" ? containerData.paddingRight : 0;
          if (containerData.itemSpacing === "AUTO") {
            currentFrame.itemSpacing = "AUTO";
          } else {
            currentFrame.itemSpacing = typeof containerData.itemSpacing === "number" ? containerData.itemSpacing : 0;
          }
          if (containerData.layoutWrap !== void 0) {
            currentFrame.layoutWrap = containerData.layoutWrap;
          }
          if (containerData.primaryAxisAlignItems) {
            currentFrame.primaryAxisAlignItems = containerData.primaryAxisAlignItems;
          }
          if (containerData.counterAxisAlignItems) {
            currentFrame.counterAxisAlignItems = containerData.counterAxisAlignItems;
          }
          if (containerData.primaryAxisSizingMode) {
            currentFrame.primaryAxisSizingMode = containerData.primaryAxisSizingMode;
          } else {
            currentFrame.primaryAxisSizingMode = "AUTO";
          }
          if (containerData.counterAxisSizingMode) {
            currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode;
          }
        }
        if (containerData.minWidth !== void 0) {
          currentFrame.minWidth = containerData.minWidth;
        }
        if (containerData.maxWidth !== void 0) {
          currentFrame.maxWidth = containerData.maxWidth;
        }
        if (containerData.minHeight !== void 0) {
          currentFrame.minHeight = containerData.minHeight;
        }
        if (containerData.maxHeight !== void 0) {
          currentFrame.maxHeight = containerData.maxHeight;
        }
        if (containerData.width) {
          currentFrame.resize(containerData.width, currentFrame.height);
          if (!containerData.counterAxisSizingMode) {
            currentFrame.counterAxisSizingMode = "FIXED";
          }
        } else if (!containerData.counterAxisSizingMode) {
          currentFrame.counterAxisSizingMode = "AUTO";
        }
      }
      const items = layoutData.items || containerData.items;
      if (!items || !Array.isArray(items)) return currentFrame;
      for (const item of items) {
        if (item.type === "layoutContainer") {
          const nestedFrame = figma.createFrame();
          currentFrame.appendChild(nestedFrame);
          this.applyChildLayoutProperties(nestedFrame, item);
          await this.generateUIFromData({ layoutContainer: item, items: item.items }, nestedFrame);
        } else if (item.type === "frame" && item.layoutContainer) {
          const nestedFrame = figma.createFrame();
          currentFrame.appendChild(nestedFrame);
          await this.generateUIFromData(item, nestedFrame);
        } else if (item.type === "native-text" || item.type === "text") {
          await this.createTextNode(item, currentFrame);
          continue;
        } else if (item.type === "native-rectangle") {
          await this.createRectangleNode(item, currentFrame);
          continue;
        } else if (item.type === "native-circle") {
          await this.createEllipseNode(item, currentFrame);
          continue;
        } else {
          if (!item.componentNodeId) continue;
          const componentNode = await figma.getNodeByIdAsync(item.componentNodeId);
          if (!componentNode) {
            console.warn(`\u26A0\uFE0F Component with ID ${item.componentNodeId} not found. Skipping.`);
            continue;
          }
          const masterComponent = componentNode.type === "COMPONENT_SET" ? componentNode.defaultVariant : componentNode;
          if (!masterComponent || masterComponent.type !== "COMPONENT") {
            console.warn(`\u26A0\uFE0F Could not find a valid master component for ID ${item.componentNodeId}. Skipping.`);
            continue;
          }
          const instance = masterComponent.createInstance();
          currentFrame.appendChild(instance);
          console.log(`\u{1F527} Creating instance of component: ${masterComponent.name}`);
          console.log(`\u{1F527} Raw properties:`, item.properties);
          const { cleanProperties, variants } = this.separateVariantsFromProperties(item.properties, item.componentNodeId);
          const sanitizedProps = this.sanitizeProperties(cleanProperties);
          console.log(`\u{1F527} Clean properties:`, sanitizedProps);
          console.log(`\u{1F527} Extracted variants:`, variants);
          if (Object.keys(variants).length > 0) {
            try {
              if (componentNode && componentNode.type === "COMPONENT_SET") {
                const availableVariants = componentNode.variantGroupProperties;
                console.log(`\u{1F50D} Available variants for ${componentNode.name}:`, Object.keys(availableVariants || {}));
                console.log(`\u{1F50D} Requested variants:`, variants);
                if (!availableVariants) {
                  console.warn("\u26A0\uFE0F No variant properties found on component, skipping variant application.");
                } else {
                  const validVariants = {};
                  let hasValidVariants = false;
                  Object.entries(variants).forEach(([propName, propValue]) => {
                    const availableProp = availableVariants[propName];
                    if (availableProp && availableProp.values) {
                      const stringValue = String(propValue);
                      if (availableProp.values.includes(stringValue)) {
                        validVariants[propName] = stringValue;
                        hasValidVariants = true;
                        console.log(`\u2705 Valid variant: ${propName} = "${stringValue}"`);
                      } else {
                        console.warn(`\u26A0\uFE0F Invalid value for "${propName}": "${stringValue}". Available: [${availableProp.values.join(", ")}]`);
                      }
                    } else {
                      console.warn(`\u26A0\uFE0F Unknown variant property: "${propName}". Available: [${Object.keys(availableVariants).join(", ")}]`);
                    }
                  });
                  if (hasValidVariants) {
                    console.log(`\u{1F527} Applying variants:`, validVariants);
                    instance.setProperties(validVariants);
                    console.log("\u2705 Variants applied successfully");
                  } else {
                    console.warn("\u26A0\uFE0F No valid variants to apply, using default variant");
                  }
                }
              } else {
                console.log("\u2139\uFE0F Component is not a variant set, skipping variant application");
              }
            } catch (e) {
              console.error("\u274C Error applying variants:", e);
              console.log("\u2139\uFE0F Continuing with default variant");
            }
          }
          this.applyChildLayoutProperties(instance, sanitizedProps);
          await this.applyTextProperties(instance, sanitizedProps);
          await this.applyMediaProperties(instance, sanitizedProps);
        }
      }
      if (parentNode.type === "PAGE") {
        figma.currentPage.selection = [currentFrame];
        figma.viewport.scrollAndZoomIntoView([currentFrame]);
        figma.notify(`UI "${currentFrame.name}" generated!`, { timeout: 2500 });
      }
      return currentFrame;
    }
    /**
     * Dynamic UI generation with component ID resolution
     */
    static async generateUIFromDataDynamic(layoutData) {
      if (!layoutData || !layoutData.items) {
        figma.notify("Invalid JSON structure", { error: true });
        return null;
      }
      try {
        figma.skipInvisibleInstanceChildren = true;
        console.log("\u{1F527} Checking ComponentPropertyEngine schemas...");
        const existingSchemas = ComponentPropertyEngine.getAllSchemas();
        if (existingSchemas.length === 0) {
          console.log("\u26A0\uFE0F No design system schemas found - running in basic mode");
        } else {
          await ComponentPropertyEngine.initialize();
          console.log("\u2705 ComponentPropertyEngine initialized with", existingSchemas.length, "schemas");
        }
        const migratedData = JSONMigrator.migrateToSystematic(layoutData);
        const isPlaceholderID = (id) => {
          if (!id) return true;
          return id.includes("_id") || id.includes("placeholder") || !id.match(/^[0-9]+:[0-9]+$/);
        };
        async function resolveComponentIds(items) {
          for (const item of items) {
            if (item.type === "layoutContainer") {
              if (item.items && Array.isArray(item.items)) {
                await resolveComponentIds(item.items);
              }
              continue;
            }
            if (item.type === "native-text" || item.type === "text" || item.type === "native-rectangle" || item.type === "native-circle") {
              console.log(`\u2139\uFE0F Skipping native element: ${item.type}`);
              continue;
            }
            if (item.type === "frame" && item.items) {
              await resolveComponentIds(item.items);
            } else if (item.type !== "frame") {
              if (!item.componentNodeId || isPlaceholderID(item.componentNodeId)) {
                console.log(` Resolving component ID for type: ${item.type}`);
                const resolvedId = await ComponentScanner.getComponentIdByType(item.type);
                if (!resolvedId) {
                  throw new Error(`Component for type "${item.type}" not found in design system. Please scan your design system first.`);
                }
                item.componentNodeId = resolvedId;
                console.log(`\u2705 Resolved ${item.type} -> ${resolvedId}`);
              } else {
                console.log(`\u2705 Using existing ID for ${item.type}: ${item.componentNodeId}`);
              }
            }
          }
        }
        await resolveComponentIds(migratedData.items);
        return await this.generateUIFromDataSystematic(migratedData, figma.currentPage);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        figma.notify(errorMessage, { error: true, timeout: 4e3 });
        console.error("\u274C generateUIFromDataDynamic error:", e);
        return null;
      }
    }
    /**
     * Create native text element
     */
    static async createTextNode(textData, container) {
      var _a;
      console.log("Creating native text:", textData);
      const textNode = figma.createText();
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      const textContent = textData.text || textData.content || ((_a = textData.properties) == null ? void 0 : _a.content) || textData.characters || "Text";
      textNode.characters = textContent;
      const props = textData.properties || textData;
      const fontSize = props.fontSize || props.size || props.textSize || 16;
      textNode.fontSize = fontSize;
      if (props.fontWeight === "bold" || props.weight === "bold" || props.style === "bold") {
        await figma.loadFontAsync({ family: "Inter", style: "Bold" });
        textNode.fontName = { family: "Inter", style: "Bold" };
      }
      if (props.alignment === "center" || props.textAlign === "center") {
        textNode.textAlignHorizontal = "CENTER";
      } else if (props.alignment === "right" || props.textAlign === "right") {
        textNode.textAlignHorizontal = "RIGHT";
      } else {
        textNode.textAlignHorizontal = "LEFT";
      }
      if (props.color) {
        const fills = textNode.fills;
        if (fills.length > 0 && fills[0].type === "SOLID") {
          textNode.fills = [{ type: "SOLID", color: props.color }];
          textNode.fills = fills;
        }
      }
      this.applyChildLayoutProperties(textNode, props);
      if (props.horizontalSizing === "FILL") {
        textNode.textAutoResize = "HEIGHT";
      } else {
        textNode.textAutoResize = "WIDTH_AND_HEIGHT";
      }
      container.appendChild(textNode);
      console.log("Native text created successfully");
    }
    /**
     * Create native rectangle element
     */
    static async createRectangleNode(rectData, container) {
      console.log("Creating native rectangle:", rectData);
      const rect = figma.createRectangle();
      if (rectData.width && rectData.height) {
        rect.resize(rectData.width, rectData.height);
      } else {
        rect.resize(100, 100);
      }
      if (rectData.fill) {
        rect.fills = [{ type: "SOLID", color: rectData.fill }];
      }
      if (rectData.cornerRadius) {
        rect.cornerRadius = rectData.cornerRadius;
      }
      if (rectData.horizontalSizing === "FILL") {
        rect.layoutAlign = "STRETCH";
      }
      container.appendChild(rect);
      console.log("Rectangle created successfully");
    }
    /**
     * Create native ellipse element
     */
    static async createEllipseNode(ellipseData, container) {
      console.log("Creating native ellipse:", ellipseData);
      const ellipse = figma.createEllipse();
      if (ellipseData.width && ellipseData.height) {
        ellipse.resize(ellipseData.width, ellipseData.height);
      } else {
        ellipse.resize(50, 50);
      }
      if (ellipseData.fill) {
        ellipse.fills = [{ type: "SOLID", color: ellipseData.fill }];
      }
      container.appendChild(ellipse);
      console.log("Ellipse created successfully");
    }
    /**
     * Apply text properties to component instances using enhanced scan data
     */
    static async applyTextProperties(instance, properties) {
      if (!properties) return;
      console.log("\u{1F50D} Applying text properties:", properties);
      const allTextNodes = instance.findAll((n) => n.type === "TEXT");
      console.log(
        "\u{1F50D} Available text nodes in component:",
        allTextNodes.map((textNode) => ({
          name: textNode.name,
          id: textNode.id,
          visible: textNode.visible,
          chars: textNode.characters || "[empty]"
        }))
      );
      const componentTextHierarchy = await this.getComponentTextHierarchy(instance);
      console.log("\u{1F50D} Text hierarchy from scan data:", componentTextHierarchy);
      const semanticMappings = {
        "primary-text": ["primary"],
        "secondary-text": ["secondary"],
        "tertiary-text": ["tertiary"],
        "headline": ["primary", "secondary"],
        "title": ["primary", "secondary"],
        "content": ["primary", "secondary"],
        "text": ["primary", "secondary"],
        "supporting-text": ["secondary", "tertiary"],
        "supporting": ["secondary", "tertiary"],
        "subtitle": ["secondary", "tertiary"],
        "trailing-text": ["tertiary", "secondary"],
        "trailing": ["tertiary", "secondary"],
        "caption": ["tertiary"],
        "overline": ["tertiary"]
      };
      const legacyMappings = {
        "content": ["headline", "title", "text", "label"],
        "headline": ["headline", "title", "text", "label"],
        "text": ["headline", "title", "text", "label"],
        "supporting-text": ["supporting", "subtitle", "description", "body"],
        "supporting": ["supporting", "subtitle", "description", "body"],
        "trailing-text": ["trailing", "value", "action", "status", "end"],
        "trailing": ["trailing", "value", "action", "status", "end"],
        "title": ["title", "headline", "text"],
        "subtitle": ["subtitle", "supporting", "description"]
      };
      for (const [propKey, propValue] of Object.entries(properties)) {
        if (!propValue || typeof propValue !== "string" || !propValue.trim()) continue;
        if (propKey === "horizontalSizing" || propKey === "variants") continue;
        console.log(`\u{1F527} Trying to set ${propKey} = "${propValue}"`);
        let textNode = null;
        let matchMethod = "none";
        if (componentTextHierarchy) {
          const hierarchyEntry = componentTextHierarchy.find(
            (entry) => entry.nodeName.toLowerCase() === propKey.toLowerCase() || entry.nodeName.toLowerCase().replace(/\s+/g, "-") === propKey.toLowerCase()
          );
          if (hierarchyEntry) {
            textNode = allTextNodes.find((n) => n.id === hierarchyEntry.nodeId) || null;
            if (textNode) {
              matchMethod = "exact-name";
              console.log(`\u2705 Found text node by exact name match: "${textNode.name}" (${hierarchyEntry.classification})`);
            }
          }
        }
        if (!textNode && componentTextHierarchy && semanticMappings[propKey.toLowerCase()]) {
          const targetClassifications = semanticMappings[propKey.toLowerCase()];
          for (const classification of targetClassifications) {
            const hierarchyEntry = componentTextHierarchy.find(
              (entry) => entry.classification === classification
            );
            if (hierarchyEntry) {
              textNode = allTextNodes.find((n) => n.id === hierarchyEntry.nodeId) || null;
              if (textNode) {
                matchMethod = "semantic-classification";
                console.log(`\u2705 Found text node by semantic classification: "${textNode.name}" (${classification})`);
                break;
              }
            }
          }
        }
        if (!textNode && componentTextHierarchy) {
          const hierarchyEntry = componentTextHierarchy.find(
            (entry) => entry.nodeName.toLowerCase().includes(propKey.toLowerCase()) || propKey.toLowerCase().includes(entry.nodeName.toLowerCase())
          );
          if (hierarchyEntry) {
            textNode = allTextNodes.find((n) => n.id === hierarchyEntry.nodeId) || null;
            if (textNode) {
              matchMethod = "partial-name";
              console.log(`\u2705 Found text node by partial name match: "${textNode.name}"`);
            }
          }
        }
        if (!textNode) {
          const possibleNames = legacyMappings[propKey.toLowerCase()] || [propKey.toLowerCase()];
          for (const targetName of possibleNames) {
            textNode = allTextNodes.find(
              (n) => n.name.toLowerCase().includes(targetName.toLowerCase())
            ) || null;
            if (textNode) {
              matchMethod = "legacy-mapping";
              console.log(`\u2705 Found text node by legacy mapping: "${textNode.name}"`);
              break;
            }
          }
        }
        if (!textNode) {
          if (propKey.toLowerCase().includes("headline") || propKey.toLowerCase().includes("title") || propKey.toLowerCase().includes("primary")) {
            textNode = allTextNodes[0] || null;
            matchMethod = "position-first";
            console.log(`\u{1F504} Using first text node as fallback for "${propKey}"`);
          } else if (propKey.toLowerCase().includes("trailing") || propKey.toLowerCase().includes("tertiary")) {
            textNode = allTextNodes[allTextNodes.length - 1] || null;
            matchMethod = "position-last";
            console.log(`\u{1F504} Using last text node as fallback for "${propKey}"`);
          } else if (propKey.toLowerCase().includes("supporting") || propKey.toLowerCase().includes("secondary")) {
            textNode = allTextNodes[1] || allTextNodes[0] || null;
            matchMethod = "position-second";
            console.log(`\u{1F504} Using second text node as fallback for "${propKey}"`);
          }
        }
        if (textNode) {
          try {
            if (!textNode.visible) {
              textNode.visible = true;
              console.log(`\u{1F441}\uFE0F Activated hidden text node: "${textNode.name}"`);
            }
            if (typeof textNode.fontName !== "symbol") {
              await figma.loadFontAsync(textNode.fontName);
              textNode.characters = propValue;
              console.log(`\u2705 Successfully set "${textNode.name}" to "${propValue}" (method: ${matchMethod})`);
            }
          } catch (fontError) {
            console.error(`\u274C Font loading failed for "${textNode.name}":`, fontError);
          }
        } else {
          console.warn(`\u274C No text node found for property "${propKey}" with value "${propValue}"`);
        }
      }
    }
    /**
     * Get text hierarchy data for a component instance from scan results
     */
    static async getComponentTextHierarchy(instance) {
      try {
        const mainComponent = await instance.getMainComponentAsync();
        if (!mainComponent) return null;
        const scanResults = await figma.clientStorage.getAsync("last-scan-results");
        if (!scanResults || !Array.isArray(scanResults)) return null;
        const componentInfo = scanResults.find((comp) => comp.id === mainComponent.id);
        return (componentInfo == null ? void 0 : componentInfo.textHierarchy) || null;
      } catch (error) {
        console.warn("Could not get text hierarchy data:", error);
        return null;
      }
    }
    /**
     * Apply media properties to component instances using enhanced scan data validation
     */
    static async applyMediaProperties(instance, properties) {
      var _a;
      if (!properties) return;
      console.log("\u{1F5BC}\uFE0F Validating media properties:", properties);
      const componentMediaData = await this.getComponentMediaData(instance);
      console.log("\u{1F5BC}\uFE0F Media data from scan results:", componentMediaData);
      const mediaPropertyPatterns = [
        "icon",
        "image",
        "avatar",
        "photo",
        "logo",
        "media",
        "leading-icon",
        "trailing-icon",
        "start-icon",
        "end-icon",
        "profile-image",
        "user-avatar",
        "cover-image",
        "thumbnail"
      ];
      const mediaProperties = {};
      Object.entries(properties).forEach(([key, value]) => {
        const keyLower = key.toLowerCase();
        if (mediaPropertyPatterns.some((pattern) => keyLower.includes(pattern))) {
          mediaProperties[key] = value;
        }
      });
      if (Object.keys(mediaProperties).length === 0) {
        console.log("\u{1F5BC}\uFE0F No media properties found to validate");
        return;
      }
      console.log("\u{1F5BC}\uFE0F Found media properties to validate:", Object.keys(mediaProperties));
      for (const [propKey, propValue] of Object.entries(mediaProperties)) {
        if (!propValue || typeof propValue !== "string" || !propValue.trim()) continue;
        console.log(`\u{1F50D} Validating media property: ${propKey} = "${propValue}"`);
        let validationResult = this.validateMediaProperty(propKey, propValue, componentMediaData);
        if (validationResult.isValid) {
          console.log(`\u2705 ${propKey} \u2192 would set to "${propValue}" (${validationResult.targetType}: "${validationResult.targetName}")`);
        } else {
          console.warn(`\u274C Invalid media property: "${propKey}" = "${propValue}" - ${validationResult.reason}`);
          if ((_a = validationResult.suggestions) == null ? void 0 : _a.length) {
            console.log(`\u{1F4A1} Available media slots: ${validationResult.suggestions.join(", ")}`);
          }
        }
      }
    }
    /**
     * Get media structure data for a component instance from scan results
     */
    static async getComponentMediaData(instance) {
      try {
        const mainComponent = await instance.getMainComponentAsync();
        if (!mainComponent) {
          console.warn("Could not get main component from instance");
          return null;
        }
        console.log("\u{1F50D} Looking for media data for main component ID:", mainComponent.id);
        const scanResults = await figma.clientStorage.getAsync("last-scan-results");
        if (!scanResults || !Array.isArray(scanResults)) {
          console.warn("No scan results found in storage");
          return null;
        }
        console.log("\u{1F50D} Available component IDs in scan data:", scanResults.map((c) => c.id));
        const componentInfo = scanResults.find((comp) => comp.id === mainComponent.id);
        if (!componentInfo) {
          console.warn(`Component ${mainComponent.id} not found in scan results`);
          return null;
        }
        console.log("\u{1F50D} Found component info:", componentInfo.name);
        console.log("\u{1F50D} Component instances:", componentInfo.componentInstances);
        console.log("\u{1F50D} Vector nodes:", componentInfo.vectorNodes);
        console.log("\u{1F50D} Image nodes:", componentInfo.imageNodes);
        return {
          componentInstances: componentInfo.componentInstances || [],
          vectorNodes: componentInfo.vectorNodes || [],
          imageNodes: componentInfo.imageNodes || []
        };
      } catch (error) {
        console.warn("Could not get media data:", error);
        return null;
      }
    }
    /**
     * Validate a media property against available media slots in scan data
     */
    static validateMediaProperty(propKey, propValue, mediaData) {
      if (!mediaData) {
        return {
          isValid: false,
          reason: "No media scan data available"
        };
      }
      const { componentInstances, vectorNodes, imageNodes } = mediaData;
      const allMediaSlots = [
        ...componentInstances.map((c) => ({ name: c.nodeName, type: "component-instance" })),
        ...vectorNodes.map((v) => ({ name: v.nodeName, type: "vector-node" })),
        ...imageNodes.map((i) => ({ name: i.nodeName, type: "image-node" }))
      ];
      if (allMediaSlots.length === 0) {
        return {
          isValid: false,
          reason: "No media slots found in component"
        };
      }
      const exactMatch = allMediaSlots.find(
        (slot) => slot.name.toLowerCase() === propKey.toLowerCase() || slot.name.toLowerCase().replace(/\s+/g, "-") === propKey.toLowerCase()
      );
      if (exactMatch) {
        return {
          isValid: true,
          targetType: exactMatch.type,
          targetName: exactMatch.name
        };
      }
      const partialMatch = allMediaSlots.find(
        (slot) => slot.name.toLowerCase().includes(propKey.toLowerCase()) || propKey.toLowerCase().includes(slot.name.toLowerCase())
      );
      if (partialMatch) {
        return {
          isValid: true,
          targetType: partialMatch.type,
          targetName: partialMatch.name
        };
      }
      const semanticMatch = this.findSemanticMediaMatch(propKey, allMediaSlots);
      if (semanticMatch) {
        return {
          isValid: true,
          targetType: semanticMatch.type,
          targetName: semanticMatch.name
        };
      }
      return {
        isValid: false,
        reason: `No matching media slot found for "${propKey}"`,
        suggestions: allMediaSlots.map((slot) => slot.name)
      };
    }
    /**
     * Find semantic matches for media properties using intelligent classification
     */
    static findSemanticMediaMatch(propKey, mediaSlots) {
      const keyLower = propKey.toLowerCase();
      const classifications = this.classifyMediaSlots(mediaSlots);
      if (keyLower.includes("avatar") || keyLower.includes("profile") || keyLower.includes("user")) {
        return classifications.avatars[0] || classifications.images[0] || classifications.circles[0] || null;
      }
      if (keyLower.includes("icon") && !keyLower.includes("leading") && !keyLower.includes("trailing")) {
        return classifications.icons[0] || classifications.vectors[0] || classifications.smallImages[0] || null;
      }
      if (keyLower.includes("image") || keyLower.includes("photo") || keyLower.includes("picture")) {
        return classifications.images[0] || classifications.rectangularImages[0] || classifications.avatars[0] || null;
      }
      if (keyLower.includes("logo") || keyLower.includes("brand")) {
        return classifications.logos[0] || classifications.vectors[0] || classifications.images[0] || null;
      }
      if (keyLower.includes("badge") || keyLower.includes("indicator") || keyLower.includes("status")) {
        return classifications.badges[0] || classifications.smallImages[0] || classifications.vectors[0] || null;
      }
      if (keyLower.includes("leading") || keyLower.includes("start") || keyLower.includes("left")) {
        const positionMatch = this.findByPosition(mediaSlots, "leading");
        if (positionMatch) return positionMatch;
        return classifications.icons[0] || classifications.vectors[0] || null;
      }
      if (keyLower.includes("trailing") || keyLower.includes("end") || keyLower.includes("right")) {
        const positionMatch = this.findByPosition(mediaSlots, "trailing");
        if (positionMatch) return positionMatch;
        return classifications.icons[0] || classifications.vectors[0] || null;
      }
      if (keyLower.includes("large") || keyLower.includes("big") || keyLower.includes("cover")) {
        return classifications.largeImages[0] || classifications.images[0] || null;
      }
      if (keyLower.includes("small") || keyLower.includes("mini") || keyLower.includes("thumb")) {
        return classifications.smallImages[0] || classifications.icons[0] || classifications.vectors[0] || null;
      }
      if (keyLower.includes("icon")) {
        return classifications.vectors[0] || classifications.icons[0] || null;
      }
      return null;
    }
    /**
     * Classify media slots into semantic categories based on names and types
     */
    static classifyMediaSlots(mediaSlots) {
      const classifications = {
        avatars: [],
        icons: [],
        images: [],
        vectors: [],
        badges: [],
        logos: [],
        smallImages: [],
        largeImages: [],
        circles: [],
        rectangularImages: []
      };
      mediaSlots.forEach((slot) => {
        const nameLower = slot.name.toLowerCase();
        if (nameLower.includes("avatar") || nameLower.includes("profile") || nameLower.includes("user") || nameLower.includes("person") || nameLower.includes("selfie") || nameLower.includes("face") || nameLower.includes("man") || nameLower.includes("woman") || nameLower.includes("people") || slot.type === "image-node" && nameLower.includes("photo")) {
          classifications.avatars.push(slot);
        } else if (nameLower.includes("icon") || nameLower.includes("symbol") || nameLower.includes("pictogram") || slot.type === "vector-node" && nameLower.length < 10) {
          classifications.icons.push(slot);
        } else if (nameLower.includes("badge") || nameLower.includes("indicator") || nameLower.includes("status") || nameLower.includes("notification") || nameLower.includes("dot") || nameLower.includes("alert")) {
          classifications.badges.push(slot);
        } else if (nameLower.includes("logo") || nameLower.includes("brand") || nameLower.includes("company")) {
          classifications.logos.push(slot);
        } else if (slot.type === "vector-node") {
          classifications.vectors.push(slot);
        } else if (slot.type === "image-node" || nameLower.includes("image") || nameLower.includes("picture") || nameLower.includes("photo")) {
          classifications.images.push(slot);
          if (nameLower.includes("small") || nameLower.includes("mini") || nameLower.includes("thumb")) {
            classifications.smallImages.push(slot);
          } else if (nameLower.includes("large") || nameLower.includes("big") || nameLower.includes("cover")) {
            classifications.largeImages.push(slot);
          }
          if (nameLower.includes("circle") || nameLower.includes("round")) {
            classifications.circles.push(slot);
          } else {
            classifications.rectangularImages.push(slot);
          }
        } else if (slot.type === "component-instance") {
          classifications.images.push(slot);
        }
      });
      return classifications;
    }
    /**
     * Find media slots by position keywords
     */
    static findByPosition(mediaSlots, position) {
      const positionKeywords = position === "leading" ? ["leading", "start", "left", "first", "begin"] : ["trailing", "end", "right", "last", "final"];
      return mediaSlots.find(
        (slot) => positionKeywords.some(
          (keyword) => slot.name.toLowerCase().includes(keyword)
        )
      ) || null;
    }
    /**
     * Sanitize and clean property names and values
     */
    static sanitizeProperties(properties) {
      if (!properties) return {};
      return Object.entries(properties).reduce((acc, [key, value]) => {
        const cleanKey = key.replace(/\s+/g, "-");
        if (key.toLowerCase().includes("text") && value !== null && value !== void 0) {
          acc[cleanKey] = String(value);
        } else {
          acc[cleanKey] = value;
        }
        return acc;
      }, {});
    }
    /**
     * Separate variant properties from regular properties
     */
    static separateVariantsFromProperties(properties, componentId) {
      if (!properties) return { cleanProperties: {}, variants: {} };
      const cleanProperties = {};
      const variants = {};
      const knownTextProperties = ["text", "supporting-text", "trailing-text", "headline", "subtitle", "value"];
      const knownLayoutProperties = ["horizontalSizing", "verticalSizing", "layoutAlign", "layoutGrow"];
      const variantPropertyNames = [
        "condition",
        "Condition",
        "leading",
        "Leading",
        "trailing",
        "Trailing",
        "state",
        "State",
        "style",
        "Style",
        "size",
        "Size",
        "type",
        "Type",
        "emphasis",
        "Emphasis",
        "variant",
        "Variant"
      ];
      Object.entries(properties).forEach(([key, value]) => {
        if (key === "variants") {
          Object.assign(variants, value);
          console.log(`\u{1F527} Found existing variants object:`, value);
          return;
        }
        if (knownTextProperties.some((prop) => key.toLowerCase().includes(prop.toLowerCase()))) {
          cleanProperties[key] = value;
          return;
        }
        if (knownLayoutProperties.some((prop) => key.toLowerCase().includes(prop.toLowerCase()))) {
          cleanProperties[key] = value;
          return;
        }
        if (variantPropertyNames.includes(key)) {
          const properKey = key.charAt(0).toUpperCase() + key.slice(1);
          variants[properKey] = value;
          console.log(`\u{1F527} Moved "${key}" -> "${properKey}" from properties to variants`);
          return;
        }
        cleanProperties[key] = value;
      });
      console.log(`\u{1F50D} Final separation for ${componentId}:`);
      console.log(`   Clean properties:`, cleanProperties);
      console.log(`   Variants:`, variants);
      return { cleanProperties, variants };
    }
    /**
     * Apply child layout properties for auto-layout items
     */
    static applyChildLayoutProperties(node, properties) {
      if (!properties) return;
      if (properties.layoutAlign) {
        node.layoutAlign = properties.layoutAlign;
      } else if (properties.horizontalSizing === "FILL") {
        node.layoutAlign = "STRETCH";
      }
      if (properties.layoutGrow !== void 0) {
        node.layoutGrow = properties.layoutGrow;
      } else if (properties.horizontalSizing === "FILL") {
        const parent = node.parent;
        if (parent && "layoutMode" in parent && parent.layoutMode === "HORIZONTAL") {
          node.layoutGrow = 1;
        }
      }
      if (properties.layoutPositioning) {
        node.layoutPositioning = properties.layoutPositioning;
      }
      if (properties.minWidth !== void 0 && "minWidth" in node) {
        node.minWidth = properties.minWidth;
      }
      if (properties.maxWidth !== void 0 && "maxWidth" in node) {
        node.maxWidth = properties.maxWidth;
      }
      if (properties.minHeight !== void 0 && "minHeight" in node) {
        node.minHeight = properties.minHeight;
      }
      if (properties.maxHeight !== void 0 && "maxHeight" in node) {
        node.maxHeight = properties.maxHeight;
      }
    }
    /**
     * Enhanced systematic component creation with modern API
     */
    static async createComponentInstanceSystematic(item, container) {
      if (!item.componentNodeId) return;
      const componentNode = await figma.getNodeByIdAsync(item.componentNodeId);
      if (!componentNode) {
        console.warn(`\u26A0\uFE0F Component with ID ${item.componentNodeId} not found. Skipping.`);
        return;
      }
      const masterComponent = componentNode.type === "COMPONENT_SET" ? componentNode.defaultVariant : componentNode;
      if (!masterComponent || masterComponent.type !== "COMPONENT") {
        console.warn(`\u26A0\uFE0F Could not find a valid master component for ID ${item.componentNodeId}. Skipping.`);
        return;
      }
      console.log(` Creating systematic instance: ${masterComponent.name}`);
      const validationResult = ComponentPropertyEngine.validateAndProcessProperties(
        item.componentNodeId,
        item.properties || {}
      );
      if (validationResult.warnings.length > 0) {
        console.warn(`\u26A0\uFE0F Warnings:`, validationResult.warnings);
      }
      if (validationResult.errors.length > 0) {
        console.error(`\u274C Validation errors:`, validationResult.errors);
        const llmErrors = validationResult.errors.map(
          (err) => `${err.message}${err.suggestion ? ` - ${err.suggestion}` : ""}${err.llmHint ? ` (${err.llmHint})` : ""}`
        ).join("\n");
        console.error(` LLM Error Summary:
${llmErrors}`);
      }
      const { variants, textProperties, mediaProperties, layoutProperties } = validationResult.processedProperties;
      const instance = masterComponent.createInstance();
      container.appendChild(instance);
      if (Object.keys(variants).length > 0) {
        await this.applyVariantsSystematic(instance, variants, componentNode);
      }
      this.applyChildLayoutProperties(instance, layoutProperties);
      if (Object.keys(textProperties).length > 0) {
        await this.applyTextPropertiesSystematic(instance, textProperties, item.componentNodeId);
      }
      if (Object.keys(mediaProperties).length > 0) {
        await this.applyMediaPropertiesSystematic(instance, mediaProperties, item.componentNodeId);
      }
    }
    /**
     * Apply variants with modern Component Properties API
     */
    static async applyVariantsSystematic(instance, variants, componentNode) {
      try {
        await PerformanceTracker.track("apply-variants", async () => {
          if (componentNode && componentNode.type === "COMPONENT_SET") {
            const propertyDefinitions = componentNode.componentPropertyDefinitions;
            if (!propertyDefinitions) {
              console.warn("\u26A0\uFE0F No component property definitions found");
              return;
            }
            const validVariants = {};
            Object.entries(variants).forEach(([propName, propValue]) => {
              var _a;
              const propertyDef = propertyDefinitions[propName];
              if (propertyDef && propertyDef.type === "VARIANT") {
                const stringValue = String(propValue);
                if (propertyDef.variantOptions && propertyDef.variantOptions.includes(stringValue)) {
                  validVariants[propName] = stringValue;
                  console.log(`\u2705 Valid variant: ${propName} = "${stringValue}"`);
                } else {
                  console.warn(`\u26A0\uFE0F Invalid value for "${propName}": "${stringValue}". Available: [${((_a = propertyDef.variantOptions) == null ? void 0 : _a.join(", ")) || ""}]`);
                }
              } else {
                console.warn(`\u26A0\uFE0F Unknown variant property: "${propName}"`);
              }
            });
            if (Object.keys(validVariants).length > 0) {
              instance.setProperties(validVariants);
              console.log("\u2705 Variants applied successfully");
            }
          }
        });
      } catch (e) {
        console.error("\u274C Error applying variants:", e);
      }
    }
    /**
     * Apply text properties with proper font loading and array support
     */
    static async applyTextPropertiesSystematic(instance, textProperties, componentId) {
      console.log(" Applying text properties systematically:", textProperties);
      const schema = ComponentPropertyEngine.getComponentSchema(componentId);
      if (!schema) {
        console.warn(`\u26A0\uFE0F No schema found for component ${componentId}, using fallback text application`);
        await this.applyTextProperties(instance, textProperties);
        return;
      }
      const allTextNodes = await PerformanceTracker.track(
        "find-text-nodes",
        async () => instance.findAllWithCriteria({ types: ["TEXT"] })
      );
      for (const [propKey, propValue] of Object.entries(textProperties)) {
        const textLayerInfo = schema.textLayers[propKey];
        if (!textLayerInfo) {
          console.warn(`\u26A0\uFE0F No text layer info found for property "${propKey}"`);
          const semanticMatch = Object.entries(schema.textLayers).find(([layerName, info]) => {
            const layerLower = layerName.toLowerCase();
            const propLower = propKey.toLowerCase();
            return layerLower.includes(propLower) || propLower.includes(layerLower);
          });
          if (semanticMatch) {
            const [matchedName, matchedInfo] = semanticMatch;
            console.log(` Using semantic match: "${propKey}" \u2192 "${matchedName}"`);
            if (matchedInfo.dataType === "array" && Array.isArray(propValue)) {
              await this.applyArrayTextProperty(propKey, propValue, allTextNodes, matchedInfo);
            } else {
              const valueToUse = Array.isArray(propValue) ? propValue[0] : propValue;
              await this.applySingleTextProperty(propKey, valueToUse, allTextNodes, matchedInfo);
            }
          }
          continue;
        }
        if (textLayerInfo.dataType === "array" && Array.isArray(propValue)) {
          await this.applyArrayTextProperty(propKey, propValue, allTextNodes, textLayerInfo);
        } else {
          const valueToUse = Array.isArray(propValue) ? propValue[0] : propValue;
          await this.applySingleTextProperty(propKey, valueToUse, allTextNodes, textLayerInfo);
        }
      }
    }
    /**
     * Apply array text property (for tabs, chips, etc.)
     */
    static async applyArrayTextProperty(propKey, propValues, allTextNodes, textLayerInfo) {
      console.log(` Applying array text property ${propKey}:`, propValues);
      const matchingNodes = allTextNodes.filter((node) => {
        const nodeLower = node.name.toLowerCase();
        const layerLower = textLayerInfo.nodeName.toLowerCase();
        const propLower = propKey.toLowerCase();
        return nodeLower === layerLower || nodeLower.includes(propLower) || nodeLower === propLower;
      });
      const maxItems = Math.min(propValues.length, textLayerInfo.maxItems || propValues.length);
      for (let i = 0; i < maxItems && i < matchingNodes.length; i++) {
        const textNode = matchingNodes[i];
        const value = propValues[i];
        if (value && typeof value === "string" && value.trim()) {
          await this.setTextNodeValueSafe(textNode, value, `${propKey}[${i}]`);
        }
      }
      for (let i = maxItems; i < matchingNodes.length; i++) {
        matchingNodes[i].visible = false;
        console.log(`\uFE0F Hidden extra text node: "${matchingNodes[i].name}"`);
      }
      console.log(`\u2705 Applied ${maxItems} values to ${propKey} array property`);
    }
    /**
     * Apply single text property
     */
    static async applySingleTextProperty(propKey, propValue, allTextNodes, textLayerInfo) {
      if (!propValue || typeof propValue !== "string" || !propValue.trim()) return;
      let textNode = allTextNodes.find((n) => n.id === textLayerInfo.nodeId);
      if (!textNode) {
        textNode = allTextNodes.find(
          (n) => n.name.toLowerCase() === textLayerInfo.nodeName.toLowerCase()
        );
      }
      if (!textNode) {
        textNode = allTextNodes.find((n) => {
          const nodeLower = n.name.toLowerCase();
          const layerLower = textLayerInfo.nodeName.toLowerCase();
          return nodeLower.includes(layerLower) || layerLower.includes(nodeLower);
        });
      }
      if (textNode) {
        await this.setTextNodeValueSafe(textNode, propValue, propKey);
      } else {
        console.warn(`\u274C No text node found for property "${propKey}" (looking for "${textLayerInfo.nodeName}")`);
      }
    }
    /**
     * Apply media properties systematically
     */
    static async applyMediaPropertiesSystematic(instance, mediaProperties, componentId) {
      console.log("\uFE0F Applying media properties systematically:", mediaProperties);
      const schema = ComponentPropertyEngine.getComponentSchema(componentId);
      if (!schema) {
        console.warn(`\u26A0\uFE0F No schema found for component ${componentId}, skipping media application`);
        return;
      }
      const allMediaNodes = await PerformanceTracker.track("find-media-nodes", async () => {
        const vectors = instance.findAllWithCriteria({ types: ["VECTOR"] });
        const rectangles = instance.findAllWithCriteria({ types: ["RECTANGLE"] });
        const ellipses = instance.findAllWithCriteria({ types: ["ELLIPSE"] });
        const components = instance.findAllWithCriteria({ types: ["INSTANCE", "COMPONENT"] });
        return [...vectors, ...rectangles, ...ellipses, ...components];
      });
      for (const [propKey, propValue] of Object.entries(mediaProperties)) {
        const mediaLayerInfo = schema.mediaLayers[propKey];
        if (!mediaLayerInfo) {
          console.warn(`\u26A0\uFE0F No media layer info found for property "${propKey}"`);
          continue;
        }
        const mediaNode = allMediaNodes.find((n) => n.id === mediaLayerInfo.nodeId) || allMediaNodes.find((n) => n.name.toLowerCase() === mediaLayerInfo.nodeName.toLowerCase());
        if (mediaNode) {
          console.log(`\u2705 Found media node for "${propKey}": "${mediaNode.name}" (${mediaNode.type})`);
        } else {
          console.warn(`\u274C No media node found for property "${propKey}"`);
        }
      }
    }
    /**
     * Safe text setting with proper font loading
     */
    static async setTextNodeValueSafe(textNode, value, context) {
      try {
        await PerformanceTracker.track("set-text-value", async () => {
          if (textNode.hasMissingFont) {
            console.error(`\u274C Cannot set text "${context}": Missing fonts`);
            return;
          }
          if (!textNode.visible) {
            textNode.visible = true;
          }
          await this.loadAllRequiredFonts(textNode);
          textNode.characters = value;
          console.log(`\u2705 Set "${textNode.name}" to "${value}" (${context})`);
        });
      } catch (fontError) {
        console.error(`\u274C Font loading failed for "${textNode.name}":`, fontError);
        try {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          textNode.fontName = { family: "Inter", style: "Regular" };
          textNode.characters = value;
          console.log(`\u26A0\uFE0F Used fallback font for "${textNode.name}"`);
        } catch (fallbackError) {
          console.error(`\u274C Even fallback failed:`, fallbackError);
        }
      }
    }
    /**
     * Load all fonts required for a text node (handles mixed fonts)
     */
    static async loadAllRequiredFonts(textNode) {
      try {
        if (typeof textNode.fontName !== "symbol") {
          await figma.loadFontAsync(textNode.fontName);
          return;
        }
        if (textNode.fontName === figma.mixed && textNode.characters.length > 0) {
          const allFonts = textNode.getRangeAllFontNames(0, textNode.characters.length);
          const uniqueFonts = /* @__PURE__ */ new Map();
          allFonts.forEach((font) => {
            uniqueFonts.set(`${font.family}-${font.style}`, font);
          });
          const fontPromises = Array.from(uniqueFonts.values()).map(
            (font) => figma.loadFontAsync(font)
          );
          await Promise.all(fontPromises);
        }
      } catch (error) {
        throw error;
      }
    }
    /**
     * Enhanced dynamic generation using systematic approach
     */
    static async generateUIFromDataSystematic(layoutData, parentNode) {
      const schemas = ComponentPropertyEngine.getAllSchemas();
      if (schemas.length === 0) {
        console.log("\u26A0\uFE0F No schemas - running systematic generation in basic mode");
      }
      let currentFrame;
      const containerData = layoutData.layoutContainer || layoutData;
      if (parentNode.type === "PAGE" && containerData) {
        currentFrame = figma.createFrame();
        parentNode.appendChild(currentFrame);
      } else if (parentNode.type === "FRAME") {
        currentFrame = parentNode;
      } else {
        figma.notify("Cannot add items without a parent frame.", { error: true });
        return figma.createFrame();
      }
      if (containerData && containerData !== layoutData) {
        currentFrame.name = containerData.name || "Generated Frame";
        console.log("\u{1F527} Applying container properties:", {
          name: containerData.name,
          layoutMode: containerData.layoutMode,
          itemSpacing: containerData.itemSpacing,
          primaryAxisSizingMode: containerData.primaryAxisSizingMode
        });
        currentFrame.layoutMode = containerData.layoutMode === "HORIZONTAL" || containerData.layoutMode === "VERTICAL" ? containerData.layoutMode : "NONE";
        console.log("\u{1F527} Frame layoutMode set to:", currentFrame.layoutMode);
        if (currentFrame.layoutMode !== "NONE") {
          currentFrame.paddingTop = typeof containerData.paddingTop === "number" ? containerData.paddingTop : 0;
          currentFrame.paddingBottom = typeof containerData.paddingBottom === "number" ? containerData.paddingBottom : 0;
          currentFrame.paddingLeft = typeof containerData.paddingLeft === "number" ? containerData.paddingLeft : 0;
          currentFrame.paddingRight = typeof containerData.paddingRight === "number" ? containerData.paddingRight : 0;
          if (containerData.itemSpacing === "AUTO") {
            currentFrame.itemSpacing = "AUTO";
          } else {
            currentFrame.itemSpacing = typeof containerData.itemSpacing === "number" ? containerData.itemSpacing : 0;
          }
          if (containerData.layoutWrap !== void 0) {
            currentFrame.layoutWrap = containerData.layoutWrap;
          }
          if (containerData.primaryAxisAlignItems) {
            currentFrame.primaryAxisAlignItems = containerData.primaryAxisAlignItems;
          }
          if (containerData.counterAxisAlignItems) {
            currentFrame.counterAxisAlignItems = containerData.counterAxisAlignItems;
          }
          if (containerData.primaryAxisSizingMode) {
            currentFrame.primaryAxisSizingMode = containerData.primaryAxisSizingMode;
          }
          if (containerData.counterAxisSizingMode) {
            currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode;
          }
        }
        if (containerData.minWidth !== void 0) {
          currentFrame.minWidth = containerData.minWidth;
        }
        if (containerData.maxWidth !== void 0) {
          currentFrame.maxWidth = containerData.maxWidth;
        }
        if (containerData.minHeight !== void 0) {
          currentFrame.minHeight = containerData.minHeight;
        }
        if (containerData.maxHeight !== void 0) {
          currentFrame.maxHeight = containerData.maxHeight;
        }
        if (containerData.width) {
          currentFrame.resize(containerData.width, currentFrame.height);
          if (!containerData.counterAxisSizingMode) {
            currentFrame.counterAxisSizingMode = "FIXED";
          }
        } else if (!containerData.counterAxisSizingMode) {
          currentFrame.counterAxisSizingMode = "AUTO";
        }
      }
      const items = layoutData.items || containerData.items;
      if (!items || !Array.isArray(items)) return currentFrame;
      for (const item of items) {
        if (item.type === "layoutContainer") {
          console.log("\u{1F527} Creating nested layoutContainer:", item.name, "layoutMode:", item.layoutMode);
          const nestedFrame = figma.createFrame();
          currentFrame.appendChild(nestedFrame);
          this.applyChildLayoutProperties(nestedFrame, item);
          await this.generateUIFromDataSystematic({ layoutContainer: item, items: item.items }, nestedFrame);
        } else if (item.type === "frame" && item.layoutContainer) {
          const nestedFrame = figma.createFrame();
          currentFrame.appendChild(nestedFrame);
          await this.generateUIFromDataSystematic(item, nestedFrame);
        } else if (item.type === "native-text" || item.type === "text") {
          await this.createTextNode(item, currentFrame);
        } else if (item.type === "native-rectangle") {
          await this.createRectangleNode(item, currentFrame);
        } else if (item.type === "native-circle") {
          await this.createEllipseNode(item, currentFrame);
        } else {
          await this.createComponentInstanceSystematic(item, currentFrame);
        }
      }
      if (parentNode.type === "PAGE") {
        figma.currentPage.selection = [currentFrame];
        figma.viewport.scrollAndZoomIntoView([currentFrame]);
        const perfReport = ComponentPropertyEngine.getPerformanceReport();
        console.log("\u26A1 Performance Report:", perfReport);
        figma.notify(`UI generated with systematic validation!`, { timeout: 2500 });
      }
      return currentFrame;
    }
    /**
     * Modify existing UI frame by replacing its content
     */
    static async modifyExistingUI(modifiedJSON, frameId) {
      try {
        const existingFrame = await figma.getNodeByIdAsync(frameId);
        if (existingFrame && existingFrame.type === "FRAME") {
          for (let i = existingFrame.children.length - 1; i >= 0; i--) {
            existingFrame.children[i].remove();
          }
          await this.generateUIFromData(modifiedJSON, existingFrame);
          figma.notify("UI updated successfully!", { timeout: 2e3 });
          return existingFrame;
        } else {
          throw new Error("Target frame for modification not found.");
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        figma.notify("Modification error: " + errorMessage, { error: true });
        console.error("\u274C modifyExistingUI error:", e);
        return null;
      }
    }
  };

  // src/ai/gemini-api.ts
  var _GeminiAPI = class _GeminiAPI {
    constructor(config) {
      this.config = __spreadValues(__spreadValues({}, _GeminiAPI.DEFAULT_CONFIG), config);
      if (!this.config.apiKey) {
        throw new Error("Gemini API key is required");
      }
    }
    /**
     * Main method to generate JSON from prompt
     */
    async generateJSON(request) {
      console.log("\u{1F916} Starting Gemini API call for JSON generation");
      try {
        const response = await this.callAPIWithRetry(request);
        if (response.success && response.content) {
          const validatedJSON = this.validateAndExtractJSON(response.content);
          if (validatedJSON) {
            response.content = validatedJSON;
            console.log("\u2705 Valid JSON generated and validated");
          } else {
            console.warn("\u26A0\uFE0F Generated content is not valid JSON, returning raw response");
          }
        }
        return response;
      } catch (error) {
        console.error("\u274C Gemini API call failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown API error"
        };
      }
    }
    /**
     * Generate UI modification suggestions
     */
    async modifyExistingUI(originalJSON, modificationRequest, systemPrompt) {
      console.log("\u{1F504} Starting UI modification with Gemini");
      const prompt = `You are tasked with modifying an existing UI JSON structure based on user feedback.

ORIGINAL JSON:
${originalJSON}

MODIFICATION REQUEST:
${modificationRequest}

Please provide the complete modified JSON structure. Make sure to:
1. Keep the same overall structure
2. Maintain all existing componentNodeId values
3. Only modify the requested elements
4. Ensure all JSON is valid and complete

Return ONLY the modified JSON, no explanation needed.`;
      const request = {
        prompt,
        systemPrompt,
        temperature: 0.3
        // Lower temperature for more consistent modifications
      };
      return this.generateJSON(request);
    }
    /**
     * Call API with retry logic
     */
    async callAPIWithRetry(request) {
      let lastError = null;
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`\u{1F504} Retry attempt ${attempt}/${this.config.maxRetries}`);
            await this.delay(this.config.retryDelay * attempt);
          }
          const response = await this.makeAPICall(request);
          response.retryCount = attempt;
          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Unknown error");
          const apiError = this.parseAPIError(lastError);
          console.error(`\u274C API call attempt ${attempt + 1} failed:`, apiError.message);
          if (!apiError.retryable || attempt === this.config.maxRetries) {
            return {
              success: false,
              error: apiError.message,
              retryCount: attempt
            };
          }
        }
      }
      return {
        success: false,
        error: (lastError == null ? void 0 : lastError.message) || "Max retries exceeded",
        retryCount: this.config.maxRetries
      };
    }
    /**
     * Make actual API call to Gemini
     */
    async makeAPICall(request) {
      var _a, _b;
      const url = `${_GeminiAPI.API_BASE_URL}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
      const systemInstruction = request.systemPrompt ? {
        role: "system",
        parts: [{ text: request.systemPrompt }]
      } : null;
      const requestBody = {
        contents: [
          ...systemInstruction ? [systemInstruction] : [],
          {
            role: "user",
            parts: [{ text: request.prompt + (request.context ? `

Context: ${request.context}` : "") }]
          }
        ],
        generationConfig: {
          temperature: (_a = request.temperature) != null ? _a : 0.7,
          maxOutputTokens: (_b = request.maxTokens) != null ? _b : 4e3,
          topK: 40,
          topP: 0.95
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      };
      console.log("\u{1F4E1} Making API call to Gemini...");
      const controller = new AbortController();
      const timeoutId2 = setTimeout(() => controller.abort(), this.config.timeout);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeoutId2);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error("No candidates returned from API");
        }
        const candidate = data.candidates[0];
        if (candidate.finishReason === "SAFETY") {
          throw new Error("Content was blocked by safety filters");
        }
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
          throw new Error("No content in API response");
        }
        const content = candidate.content.parts[0].text;
        console.log("\u2705 Gemini API call successful");
        return {
          success: true,
          content: content.trim(),
          usage: data.usageMetadata ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0
          } : void 0
        };
      } catch (error) {
        clearTimeout(timeoutId2);
        throw error;
      }
    }
    /**
     * Parse and categorize API errors
     */
    parseAPIError(error) {
      const message = error.message.toLowerCase();
      if (message.includes("quota") || message.includes("rate limit") || message.includes("429")) {
        return {
          code: "RATE_LIMIT",
          message: "Rate limit exceeded. Please try again later.",
          retryable: true
        };
      }
      if (message.includes("401") || message.includes("unauthorized") || message.includes("api key")) {
        return {
          code: "AUTH_ERROR",
          message: "Invalid API key or authentication failed.",
          retryable: false
        };
      }
      if (message.includes("timeout") || message.includes("network") || message.includes("fetch")) {
        return {
          code: "NETWORK_ERROR",
          message: "Network error or timeout. Please check your connection.",
          retryable: true
        };
      }
      if (message.includes("500") || message.includes("502") || message.includes("503")) {
        return {
          code: "SERVER_ERROR",
          message: "Server error. Please try again later.",
          retryable: true
        };
      }
      if (message.includes("safety") || message.includes("blocked")) {
        return {
          code: "CONTENT_FILTERED",
          message: "Content was blocked by safety filters.",
          retryable: false
        };
      }
      return {
        code: "UNKNOWN_ERROR",
        message: error.message,
        retryable: true
      };
    }
    /**
     * Validate and extract JSON from response
     */
    validateAndExtractJSON(content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        const jsonString = jsonMatch[0];
        JSON.parse(jsonString);
        return jsonString;
      } catch (e) {
        return null;
      }
    }
    /**
     * Simple delay utility
     */
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Update API configuration
     */
    updateConfig(newConfig) {
      this.config = __spreadValues(__spreadValues({}, this.config), newConfig);
    }
    /**
     * Get current configuration (without API key for security)
     */
    getConfig() {
      const _a = this.config, { apiKey } = _a, safeConfig = __objRest(_a, ["apiKey"]);
      return safeConfig;
    }
    /**
     * Test API connection
     */
    async testConnection() {
      var _a;
      try {
        const testRequest = {
          prompt: 'Say "Hello, API connection successful!" and nothing else.',
          temperature: 0
        };
        const response = await this.makeAPICall(testRequest);
        return response.success && (((_a = response.content) == null ? void 0 : _a.includes("Hello, API connection successful!")) || false);
      } catch (e) {
        return false;
      }
    }
    /**
     * Static method to create instance from stored API key
     */
    static async createFromStorage() {
      try {
        const apiKey = await figma.clientStorage.getAsync("geminiApiKey");
        if (!apiKey) return null;
        return new _GeminiAPI({ apiKey });
      } catch (e) {
        return null;
      }
    }
  };
  _GeminiAPI.DEFAULT_CONFIG = {
    model: "gemini-1.5-flash",
    maxRetries: 3,
    retryDelay: 1e3,
    timeout: 3e4
  };
  _GeminiAPI.API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
  var GeminiAPI = _GeminiAPI;

  // src/ai/gemini-client.ts
  var _GeminiClient = class _GeminiClient {
    constructor(config) {
      if (!config.apiKey) {
        throw new Error("Gemini API key is required");
      }
      this.config = __spreadValues(__spreadValues({}, _GeminiClient.DEFAULT_CONFIG), config);
    }
    /**
     * Send a chat message and get response
     */
    async chat(request) {
      console.log("\u{1F916} Starting Gemini chat request");
      try {
        const response = await this.callAPIWithRetry(request);
        console.log(response.success ? "\u2705 Chat request successful" : "\u274C Chat request failed");
        return response;
      } catch (error) {
        console.error("\u274C Gemini chat failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown chat error"
        };
      }
    }
    /**
     * Simple text completion
     */
    async complete(prompt, options) {
      const request = {
        messages: [{ role: "user", content: prompt }],
        temperature: options == null ? void 0 : options.temperature,
        maxTokens: options == null ? void 0 : options.maxTokens
      };
      return this.chat(request);
    }
    /**
     * Generate structured JSON response
     */
    async generateJSON(prompt, systemPrompt) {
      const jsonSystemPrompt = systemPrompt ? `${systemPrompt}

IMPORTANT: Respond with valid JSON only. No explanation or additional text.` : "Respond with valid JSON only. No explanation or additional text.";
      const request = {
        messages: [{ role: "user", content: prompt }],
        systemPrompt: jsonSystemPrompt,
        temperature: 0.3
        // Lower temperature for more consistent JSON
      };
      const response = await this.chat(request);
      if (response.success && response.content) {
        const validatedJSON = this.validateAndExtractJSON(response.content);
        if (validatedJSON) {
          response.content = validatedJSON;
          console.log("\u2705 Valid JSON generated and validated");
        } else {
          console.warn("\u26A0\uFE0F Generated content is not valid JSON, returning raw response");
        }
      }
      return response;
    }
    /**
     * Call API with retry logic
     */
    async callAPIWithRetry(request) {
      let lastError = null;
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`\u{1F504} Retry attempt ${attempt}/${this.config.maxRetries}`);
            await this.delay(this.config.retryDelay * Math.pow(2, attempt - 1));
          }
          const response = await this.makeAPICall(request);
          response.retryCount = attempt;
          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Unknown error");
          const geminiError = this.parseAPIError(lastError);
          console.error(`\u274C API call attempt ${attempt + 1} failed:`, geminiError.message);
          if (!geminiError.retryable || attempt === this.config.maxRetries) {
            return {
              success: false,
              error: geminiError.message,
              retryCount: attempt
            };
          }
        }
      }
      return {
        success: false,
        error: (lastError == null ? void 0 : lastError.message) || "Max retries exceeded",
        retryCount: this.config.maxRetries
      };
    }
    /**
     * Make actual API call to Gemini
     */
    async makeAPICall(request) {
      var _a, _b;
      const url = `${_GeminiClient.API_BASE_URL}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
      const contents = this.buildContentsFromMessages(request.messages, request.systemPrompt);
      const requestBody = {
        contents,
        generationConfig: {
          temperature: (_a = request.temperature) != null ? _a : this.config.temperature,
          maxOutputTokens: (_b = request.maxTokens) != null ? _b : this.config.maxTokens,
          topK: 40,
          topP: 0.95
        },
        safetySettings: this.getSafetySettings()
      };
      console.log("\u{1F4E1} Making API call to Gemini...");
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`HTTP ${response.status}: ${errorText}`);
          error.statusCode = response.status;
          throw error;
        }
        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error("No candidates returned from API");
        }
        const candidate = data.candidates[0];
        if (candidate.finishReason === "SAFETY") {
          throw new Error("Content was blocked by safety filters");
        }
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
          throw new Error("No content in API response");
        }
        const content = candidate.content.parts[0].text;
        return {
          success: true,
          content: content.trim(),
          finishReason: candidate.finishReason,
          usage: data.usageMetadata ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0
          } : void 0
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }
    /**
     * Convert messages to Gemini API format
     */
    buildContentsFromMessages(messages, systemPrompt) {
      const contents = [];
      if (systemPrompt) {
        contents.push({
          role: "user",
          parts: [{ text: systemPrompt }]
        });
        contents.push({
          role: "model",
          parts: [{ text: "I understand the instructions." }]
        });
      }
      for (const message of messages) {
        let role;
        switch (message.role) {
          case "system":
            continue;
          case "user":
            role = "user";
            break;
          case "assistant":
            role = "model";
            break;
          default:
            role = "user";
        }
        contents.push({
          role,
          parts: [{ text: message.content }]
        });
      }
      return contents;
    }
    /**
     * Get safety settings for API calls
     */
    getSafetySettings() {
      return [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
      ];
    }
    /**
     * Parse and categorize API errors
     */
    parseAPIError(error) {
      const message = error.message.toLowerCase();
      const statusCode = error.statusCode;
      if (message.includes("quota") || message.includes("rate limit") || statusCode === 429) {
        return {
          code: "RATE_LIMIT",
          message: "Rate limit exceeded. Please try again later.",
          retryable: true,
          statusCode
        };
      }
      if (statusCode === 401 || message.includes("unauthorized") || message.includes("api key")) {
        return {
          code: "AUTH_ERROR",
          message: "Invalid API key or authentication failed.",
          retryable: false,
          statusCode
        };
      }
      if (statusCode === 400) {
        return {
          code: "BAD_REQUEST",
          message: "Invalid request format or parameters.",
          retryable: false,
          statusCode
        };
      }
      if (message.includes("timeout") || message.includes("network") || message.includes("fetch") || message.includes("aborted")) {
        return {
          code: "NETWORK_ERROR",
          message: "Network error or timeout. Please check your connection.",
          retryable: true,
          statusCode
        };
      }
      if (statusCode >= 500 || message.includes("500") || message.includes("502") || message.includes("503")) {
        return {
          code: "SERVER_ERROR",
          message: "Server error. Please try again later.",
          retryable: true,
          statusCode
        };
      }
      if (message.includes("safety") || message.includes("blocked")) {
        return {
          code: "CONTENT_FILTERED",
          message: "Content was blocked by safety filters.",
          retryable: false,
          statusCode
        };
      }
      if (message.includes("overloaded") || statusCode === 503) {
        return {
          code: "MODEL_OVERLOADED",
          message: "Model is currently overloaded. Please try again later.",
          retryable: true,
          statusCode
        };
      }
      return {
        code: "UNKNOWN_ERROR",
        message: error.message || "An unknown error occurred",
        retryable: true,
        statusCode
      };
    }
    /**
     * Validate and extract JSON from response
     */
    validateAndExtractJSON(content) {
      try {
        JSON.parse(content);
        return content;
      } catch (e) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) return null;
          const jsonString = jsonMatch[0];
          JSON.parse(jsonString);
          return jsonString;
        } catch (e2) {
          return null;
        }
      }
    }
    /**
     * Simple delay utility with exponential backoff
     */
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Test API connection
     */
    async testConnection() {
      var _a;
      try {
        const response = await this.complete('Say "Hello" and nothing else.', { temperature: 0 });
        return response.success && (((_a = response.content) == null ? void 0 : _a.toLowerCase().includes("hello")) || false);
      } catch (e) {
        return false;
      }
    }
    /**
     * Update client configuration
     */
    updateConfig(newConfig) {
      this.config = __spreadValues(__spreadValues({}, this.config), newConfig);
    }
    /**
     * Get current configuration (without API key for security)
     */
    getConfig() {
      const _a = this.config, { apiKey } = _a, safeConfig = __objRest(_a, ["apiKey"]);
      return safeConfig;
    }
    /**
     * Get masked API key for display
     */
    getMaskedApiKey() {
      if (this.config.apiKey.length < 8) return "****";
      return "****" + this.config.apiKey.slice(-4);
    }
    /**
     * Static method to create instance from Figma storage
     */
    static async createFromStorage() {
      try {
        const apiKey = await figma.clientStorage.getAsync("geminiApiKey");
        if (!apiKey) return null;
        return new _GeminiClient({ apiKey });
      } catch (e) {
        return null;
      }
    }
  };
  _GeminiClient.DEFAULT_CONFIG = {
    model: "gemini-1.5-flash",
    maxRetries: 3,
    retryDelay: 1e3,
    timeout: 3e4,
    temperature: 0.7,
    maxTokens: 4e3
  };
  _GeminiClient.API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
  var GeminiClient = _GeminiClient;

  // src/core/validation-engine.ts
  var _ValidationEngine = class _ValidationEngine {
    constructor(config) {
      this.config = __spreadValues(__spreadValues({}, _ValidationEngine.DEFAULT_CONFIG), config);
    }
    /**
     * Main validation method - comprehensive quality check
     */
    async validateJSON(jsonString, originalPrompt) {
      console.log("\u{1F50D} Starting comprehensive JSON validation...");
      const errors = [];
      const warnings = [];
      const suggestions = [];
      try {
        const layoutData = JSON.parse(jsonString);
        if (this.config.enableStructuralValidation) {
          const structuralResult = await this.validateStructure(layoutData);
          errors.push(...structuralResult.errors);
          warnings.push(...structuralResult.warnings);
        }
        if (this.config.enableComponentValidation) {
          const componentResult = await this.validateComponents(layoutData);
          errors.push(...componentResult.errors);
          warnings.push(...componentResult.warnings);
        }
        if (this.config.enableAIValidation && originalPrompt) {
          const aiResult = await this.performAIValidation(layoutData, originalPrompt);
          if (aiResult) {
            errors.push(...aiResult.errors || []);
            warnings.push(...aiResult.warnings || []);
            suggestions.push(...aiResult.suggestions || []);
          }
        }
        const qualityMetrics = this.calculateQualityMetrics(layoutData, errors, warnings);
        const score = qualityMetrics.overallScore;
        const isValid = errors.filter((e) => e.severity === "critical" || e.severity === "high").length === 0 && score >= this.config.qualityThreshold;
        console.log(`\u{1F4CA} Validation complete: ${isValid ? "\u2705 PASSED" : "\u274C FAILED"} (Score: ${(score * 100).toFixed(1)}%)`);
        return {
          isValid,
          score,
          errors,
          warnings,
          suggestions,
          autoFixAvailable: this.hasAutoFixableErrors(errors)
        };
      } catch (parseError) {
        console.error("\u274C JSON parsing failed during validation:", parseError);
        return {
          isValid: false,
          score: 0,
          errors: [{
            code: "JSON_PARSE_ERROR",
            message: "Invalid JSON syntax",
            path: "root",
            severity: "critical",
            fixable: false
          }],
          warnings: [],
          suggestions: ["Check JSON syntax for missing brackets, commas, or quotes"],
          autoFixAvailable: false
        };
      }
    }
    /**
     * Validate with retry logic - attempts to fix and re-validate
     */
    async validateWithRetry(jsonString, originalPrompt, geminiAPI) {
      let currentJSON = jsonString;
      let retryCount = 0;
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        const result = await this.validateJSON(currentJSON, originalPrompt);
        if (result.isValid || !geminiAPI || !this.config.autoFixEnabled) {
          return { result, finalJSON: currentJSON, retryCount: attempt };
        }
        if (result.autoFixAvailable && attempt < this.config.maxRetries) {
          console.log(`\u{1F527} Attempting auto-fix (retry ${attempt + 1}/${this.config.maxRetries})`);
          const fixedJSON = await this.attemptAutoFix(currentJSON, result, originalPrompt != null ? originalPrompt : "", geminiAPI);
          if (fixedJSON && fixedJSON !== currentJSON) {
            currentJSON = fixedJSON;
            retryCount = attempt + 1;
            continue;
          }
        }
        return { result, finalJSON: currentJSON, retryCount: attempt };
      }
      const finalResult = await this.validateJSON(currentJSON, originalPrompt);
      return { result: finalResult, finalJSON: currentJSON, retryCount: this.config.maxRetries };
    }
    /**
     * Structural validation - check JSON schema and required fields
     */
    async validateStructure(layoutData) {
      const errors = [];
      const warnings = [];
      if (!layoutData.layoutContainer && !layoutData.items) {
        errors.push({
          code: "MISSING_ROOT_STRUCTURE",
          message: "JSON must have either layoutContainer or items array",
          path: "root",
          severity: "critical",
          fixable: true
        });
      }
      if (layoutData.layoutContainer) {
        const container = layoutData.layoutContainer;
        if (!container.layoutMode || !["VERTICAL", "HORIZONTAL", "NONE"].includes(container.layoutMode)) {
          errors.push({
            code: "INVALID_LAYOUT_MODE",
            message: "layoutMode must be VERTICAL, HORIZONTAL, or NONE",
            path: "layoutContainer.layoutMode",
            severity: "high",
            fixable: true
          });
        }
        if (container.width && (typeof container.width !== "number" || container.width <= 0)) {
          warnings.push({
            code: "INVALID_WIDTH",
            message: "Width should be a positive number",
            path: "layoutContainer.width",
            suggestion: "Use a positive number like 360 for mobile or 1200 for desktop"
          });
        }
      }
      if (layoutData.items && Array.isArray(layoutData.items)) {
        layoutData.items.forEach((item, index) => {
          this.validateItem(item, `items[${index}]`, errors, warnings);
        });
      }
      return { errors, warnings };
    }
    /**
     * Validate individual items in the layout
     */
    validateItem(item, path, errors, warnings) {
      if (!item.type) {
        errors.push({
          code: "MISSING_TYPE",
          message: "Each item must have a type field",
          path: `${path}.type`,
          severity: "critical",
          fixable: false
        });
        return;
      }
      const nativeTypes = ["native-text", "text", "native-rectangle", "native-circle", "layoutContainer"];
      const isNative = nativeTypes.includes(item.type);
      if (!isNative && !item.componentNodeId) {
        errors.push({
          code: "MISSING_COMPONENT_ID",
          message: "Non-native items must have a componentNodeId",
          path: `${path}.componentNodeId`,
          severity: "high",
          fixable: true
        });
      }
      if (item.componentNodeId && !item.componentNodeId.match(/^[0-9]+:[0-9]+$/)) {
        warnings.push({
          code: "INVALID_COMPONENT_ID_FORMAT",
          message: 'componentNodeId should follow format "number:number"',
          path: `${path}.componentNodeId`,
          suggestion: "Use IDs from your design system scan"
        });
      }
      if (item.properties) {
        this.validateProperties(item.properties, `${path}.properties`, warnings);
      }
      if (item.items && Array.isArray(item.items)) {
        item.items.forEach((nestedItem, index) => {
          this.validateItem(nestedItem, `${path}.items[${index}]`, errors, warnings);
        });
      }
    }
    /**
     * Validate properties object
     */
    validateProperties(properties, path, warnings) {
      if (properties.variants && typeof properties.variants !== "object") {
        warnings.push({
          code: "INVALID_VARIANTS_TYPE",
          message: "variants should be an object",
          path: `${path}.variants`,
          suggestion: 'Use {"Condition": "1-line", "Leading": "Icon"} format'
        });
      }
      const variantProperties = ["Condition", "Leading", "Trailing", "State", "Style", "Size", "Type"];
      const hasVariantProps = variantProperties.some((prop) => properties.hasOwnProperty(prop));
      if (hasVariantProps && !properties.variants) {
        warnings.push({
          code: "VARIANTS_NOT_GROUPED",
          message: "Variant properties should be inside a variants object",
          path,
          suggestion: 'Move variant properties like "Condition", "Leading" into a variants object'
        });
      }
    }
    /**
     * Component validation - check if referenced components exist
     */
    async validateComponents(layoutData) {
      const errors = [];
      const warnings = [];
      try {
        const scanResults = await figma.clientStorage.getAsync("last-scan-results");
        if (!scanResults || !Array.isArray(scanResults)) {
          warnings.push({
            code: "NO_SCAN_RESULTS",
            message: "No design system scan results found",
            path: "validation",
            suggestion: "Run a design system scan to validate component references"
          });
          return { errors, warnings };
        }
        const availableComponentIds = new Set(
          scanResults.map((comp) => comp.id).filter((id) => id && typeof id === "string")
        );
        const usedComponentIds = this.extractComponentIds(layoutData);
        usedComponentIds.forEach((componentRef) => {
          if (componentRef.id && !availableComponentIds.has(componentRef.id)) {
            errors.push({
              code: "COMPONENT_NOT_FOUND",
              message: `Component with ID "${componentRef.id}" not found in design system`,
              path: componentRef.path,
              severity: "high",
              fixable: true
            });
          }
        });
      } catch (error) {
        console.error("\u274C Component validation failed:", error);
        warnings.push({
          code: "COMPONENT_VALIDATION_ERROR",
          message: "Could not validate component references",
          path: "validation",
          suggestion: "Check if design system scan is available"
        });
      }
      return { errors, warnings };
    }
    /**
     * AI-powered validation using LLM to check design quality
     */
    async performAIValidation(layoutData, originalPrompt) {
      try {
        const geminiAPI = await GeminiAPI.createFromStorage();
        if (!geminiAPI) return null;
        const validationPrompt = `You are a UX design expert. Please analyze this JSON layout and provide feedback.

ORIGINAL USER REQUEST:
${originalPrompt}

GENERATED JSON:
${JSON.stringify(layoutData, null, 2)}

Please evaluate:
1. Does the JSON match the user's request?
2. Are there any UX problems or missing elements?
3. Is the layout logical and well-structured?
4. Any suggestions for improvement?

Respond in this format:
EVALUATION: [Pass/Fail]
SCORE: [0-100]
ISSUES: [List any problems]
SUGGESTIONS: [List improvements]`;
        const request = {
          prompt: validationPrompt,
          temperature: 0.3
        };
        const response = await geminiAPI.generateJSON(request);
        if (!response.success || !response.content) return null;
        const feedback = response.content || "";
        const suggestions = [];
        if (feedback.includes("SUGGESTIONS:")) {
          const suggestionsSection = feedback.split("SUGGESTIONS:")[1];
          if (suggestionsSection && suggestionsSection.trim()) {
            suggestions.push(suggestionsSection.trim());
          }
        }
        return { suggestions };
      } catch (error) {
        console.error("\u274C AI validation failed:", error);
        return null;
      }
    }
    /**
     * Calculate quality metrics
     */
    calculateQualityMetrics(layoutData, errors, warnings) {
      const criticalErrors = errors.filter((e) => e.severity === "critical").length;
      const highErrors = errors.filter((e) => e.severity === "high").length;
      const mediumErrors = errors.filter((e) => e.severity === "medium").length;
      const warningCount = warnings.length;
      const structuralIntegrity = Math.max(0, 1 - (criticalErrors * 0.5 + highErrors * 0.3 + mediumErrors * 0.1));
      const componentErrors = errors.filter((e) => e.code.includes("COMPONENT")).length;
      const componentConsistency = Math.max(0, 1 - componentErrors * 0.2);
      const variantErrors = errors.filter((e) => e.code.includes("VARIANT")).length;
      const designSystemCompliance = Math.max(0, 1 - variantErrors * 0.15);
      const usabilityScore = Math.max(0, 1 - warningCount * 0.1);
      const overallScore = structuralIntegrity * 0.4 + componentConsistency * 0.3 + designSystemCompliance * 0.2 + usabilityScore * 0.1;
      return {
        structuralIntegrity,
        componentConsistency,
        designSystemCompliance,
        usabilityScore,
        overallScore: Math.max(0, Math.min(1, overallScore))
      };
    }
    /**
     * Extract all component IDs from layout data - FIXED: Proper type safety
     */
    extractComponentIds(layoutData, basePath = "root") {
      const componentIds = [];
      const traverse = (obj, currentPath) => {
        if (obj && typeof obj === "object") {
          if (obj.componentNodeId && typeof obj.componentNodeId === "string") {
            componentIds.push({
              id: obj.componentNodeId,
              path: currentPath
            });
          }
          if (Array.isArray(obj.items)) {
            obj.items.forEach((item, index) => {
              traverse(item, `${currentPath}.items[${index}]`);
            });
          }
          if (obj.layoutContainer) {
            traverse(obj.layoutContainer, `${currentPath}.layoutContainer`);
          }
        }
      };
      traverse(layoutData, basePath);
      return componentIds;
    }
    /**
     * Check if errors can be auto-fixed
     */
    hasAutoFixableErrors(errors) {
      return errors.some((error) => error.fixable);
    }
    /**
     * Attempt to auto-fix validation errors
     */
    async attemptAutoFix(jsonString, validationResult, originalPrompt, geminiAPI) {
      try {
        const fixableErrors = validationResult.errors.filter((e) => e.fixable);
        if (fixableErrors.length === 0) return null;
        const errorDescriptions = fixableErrors.map((e) => `${e.code}: ${e.message} (at ${e.path})`).join("\n");
        const fixPrompt = `The following JSON has validation errors that need to be fixed:

ORIGINAL JSON:
${jsonString}

ERRORS TO FIX:
${errorDescriptions}

Please provide the corrected JSON that fixes these errors while maintaining the original intent. Return ONLY the corrected JSON, no explanations.`;
        const request = {
          prompt: fixPrompt,
          temperature: 0.1
          // Very low temperature for consistent fixes
        };
        const response = await geminiAPI.generateJSON(request);
        if (response.success && response.content && response.content.trim()) {
          console.log("\u{1F527} Auto-fix attempt completed");
          return response.content;
        }
        return null;
      } catch (error) {
        console.error("\u274C Auto-fix failed:", error);
        return null;
      }
    }
    /**
     * Get validation summary for UI display
     */
    getValidationSummary(result) {
      const { score, errors, warnings } = result;
      const scorePercent = Math.round(score * 100);
      const criticalCount = errors.filter((e) => e.severity === "critical").length;
      const highCount = errors.filter((e) => e.severity === "high").length;
      if (result.isValid) {
        return `\u2705 Quality Score: ${scorePercent}% ${warnings.length > 0 ? `(${warnings.length} suggestions)` : ""}`;
      } else {
        const errorSummary = criticalCount > 0 ? `${criticalCount} critical` : `${highCount} high priority`;
        return `\u274C Quality Score: ${scorePercent}% (${errorSummary} issues)`;
      }
    }
    /**
     * Update validation configuration
     */
    updateConfig(newConfig) {
      this.config = __spreadValues(__spreadValues({}, this.config), newConfig);
    }
  };
  _ValidationEngine.DEFAULT_CONFIG = {
    enableAIValidation: true,
    enableStructuralValidation: true,
    enableComponentValidation: true,
    qualityThreshold: 0.7,
    maxRetries: 2,
    autoFixEnabled: true
  };
  var ValidationEngine = _ValidationEngine;

  // src/prompts/roles/product-manager.js
  var PRODUCT_MANAGER_PROMPT = `You are a Senior Product Manager with 8+ years of cross-industry experience. You excel at domain analysis and translating user requests into detailed, actionable product specifications.

DOMAIN ANALYSIS FRAMEWORK:

Step 1: Domain Identification
Look for keywords and context that indicate business domains. Use these as examples and patterns:
Transportation/Logistics: driver, delivery, rideshare, vehicle, fleet, logistics, shipping, route, dispatch Healthcare: patient, medical, doctor, appointment, clinic, hospital, prescription, insurance Finance: payment, banking, transaction, account, money, credit, loan, investment, tax E-commerce: shopping, product, cart, order, purchase, inventory, customer, checkout Education: student, teacher, course, grade, school, classroom, assignment, enrollment
Business/SaaS: settings, dashboard, profile, team, workspace, analytics, management

Use your domain knowledge to identify related terms beyond these examples. Apply pattern recognition to classify domains based on business context and workflows.

Step 2: Domain-Specific Requirements (Consider These Patterns)
Use these as starting points - adapt and expand based on the specific request:
Transportation: Vehicle management, route optimization, DOT compliance, driver licensing, insurance tracking, dispatch integration - plus any domain-specific workflows Healthcare: Patient records, HIPAA compliance, appointment scheduling, insurance verification, medical licensing - plus relevant medical workflows
Finance: Account management, PCI DSS compliance, fraud prevention, transaction processing, tax reporting - plus financial service needs E-commerce: Inventory management, order processing, payment gateways, shipping integration, customer management - plus retail-specific requirements Education: Student records, FERPA compliance, grading systems, parent communication, course management - plus educational workflows Business: User management, authentication, data export, team collaboration, analytics integration, role-based permissions, audit logging, API access management, workflow automation - plus organization-specific needs

For Generic/Ambiguous Inputs (Low Confidence Cases):
When domain is unclear, provide business-focused requirements rather than basic UI features:
Focus on user workflows and business processes
Include security, compliance, and scalability considerations
Consider integration needs and data management requirements
Assume professional/business context rather than consumer app

Step 3: User Context Analysis (Consider These Aspects)
Analyze the user context by considering questions like these:
Who uses this? (specific user types, not generic "users")
When/where do they use it? (environment, constraints, interruptions)
What are their primary goals? (business objectives, personal needs)
What are their pain points? (current frustrations, inefficiencies)
What technical constraints apply? (devices, connectivity, time pressure)

Adapt your analysis to the specific domain and request.

YOUR TASK:
Analyze this user request and create a Product Requirements Document.

User Request: [USER_INPUT]

OUTPUT FORMAT (Adapt this structure as needed):
Use this structure as a guide - include all key information but adapt sections and headings to fit the specific request:

Product Requirements Document: [Feature Name]

Domain Analysis
Primary Domain: [Transportation/Healthcare/Finance/E-commerce/Education/Business] Confidence Level: [High 90%+ | Medium 70-89% | Low <70%] Key Evidence: [Specific words/phrases that indicate this domain] Alternative Domains Considered: [Other possibilities and why rejected] Validation Check: [Assessment of classification strength and reasoning quality]

User Profile
Include information about: Primary Users: [Specific user types with demographics/context] Usage Context: [When, where, how they use this - be specific] Environment: [Device, location, interruptions, constraints] Primary Goals: [What they're trying to accomplish]

Core Use Cases
List 3-6 specific scenarios like:
[Use Case Name]: [Specific scenario - who does what, when, why]
[Use Case Name]: [Specific scenario]
[Use Case Name]: [Specific scenario]

Functional Requirements
For each major functional area, include relevant details such as:
[Function Area Name] [Priority: Critical/High/Medium/Low]
Purpose: [Why this function exists from business perspective] Core Capabilities: [Specific things users can do] Data Requirements: [Information needed - input/display/storage]
Integration Needs: [External systems, APIs, real-time requirements]

[Repeat for all major functional areas - adapt subsections as needed]

Business Requirements
Success Metrics: [Specific, measurable outcomes] Performance Targets: [Speed, accuracy, adoption goals - be quantitative] Compliance: [Regulatory requirements for this domain]

User Experience Requirements
Information Priority: [What's most important to show prominently] Interaction Patterns: [How users expect to interact - be specific] Platform Constraints: [Mobile/desktop considerations, accessibility]

CRITICAL GUIDELINES:
Focus on BUSINESS LOGIC and USER NEEDS, not design solutions
Be specific about user types - avoid generic "users"
Include domain-specific workflows and compliance requirements
Define measurable success criteria
Consider regulatory requirements for the identified domain
Specify user environment and constraints
Validate your domain classification with evidence and reasoning
Create a PRD that eliminates guesswork for the UX Designer.`;

  // src/prompts/roles/product-designer.js
  var PRODUCT_DESIGNER_PROMPT = `You are a Senior Product Designer with 6+ years of experience bridging business requirements and UX design implementation. You excel at translating business-focused PRDs into actionable design briefs that UX designers can implement without guesswork.

Your Core Expertise:
Business-to-Design Translation: You understand what business requirements mean for actual user experiences
Information Architecture: You can structure functional requirements into clear design hierarchies
User-Centered Thinking: You translate business goals into user-focused design requirements
Design Systems Knowledge: You understand how business functions map to design patterns and components
Cross-Functional Communication: You bridge the gap between product strategy and design execution

Your Transformation Framework:

Step 1: Extract User-Facing Elements
Ask yourself: "What does the user actually see, touch, and interact with?"
Filter out backend integrations, business metrics, and compliance implementation details
Focus on user workflows, information display, and interaction patterns
Identify what needs to be prominent vs. secondary vs. hidden

Step 2: Structure by User Priority
Think: "How does the user actually use this? What's most important to them?"
Reorganize by user frequency and importance, not business logic
Consider the user's mental model and natural workflow
Account for mobile usage patterns and environmental constraints

Step 3: Add Design Context
Consider: "What does a UX designer need to know to implement this well?"
Specify information hierarchy (primary/secondary/tertiary content)
Define interaction flows and state changes
Include mobile-specific guidance and accessibility considerations
Describe content structure and display patterns

Step 4: Remove Design Noise
Ask: "Does this help a UX designer create better user experiences?"
Remove technical implementation details that don't affect user experience
Filter out business metrics and success criteria
Eliminate compliance specifics that don't influence design decisions

Transformation Examples:

Business Requirement \u2192 Design Requirement:
Business: "Integration with Stripe Connect for payment processing with PCI DSS compliance" Your Translation: "Payment method display: Show masked bank information (Bank ****1234) with security trust indicators. Edit flow: guided multi-step process with progress indication and security messaging."

Business: "Reduce support tickets by 25% through self-service account management" Your Translation: "Account status must be immediately visible with clear visual indicators. Critical issues (document expiration, account problems) need prominent alert styling that's unmissable but not disruptive."

Business: "DOT compliance tracking for driver licensing with third-party verification APIs" Your Translation: "License status: Green checkmark (verified), yellow warning (expires <30 days), red alert (expired/action needed). Upload flow: Camera \u2192 crop \u2192 preview \u2192 submit \u2192 verification pending state with timeline."

Information Hierarchy Thinking:
Business: Lists functions by business priority (Critical/High/Medium) Your Approach: Reorganize by user interaction frequency and importance
What does the user check most often? (Make it largest/most prominent)
What needs immediate attention? (Alert styling, top positioning)
What's administrative maintenance? (Organized access, not prominent)

Content Structure Reasoning:
Business: "Display vehicle make, model, year, color, license plate, verification status" Your Translation: "Vehicle display hierarchy:
Primary line: Make + Model (most recognizable to user)
Secondary line: License plate (quick identification)
Status badge: Verification indicator (critical for work eligibility)
Detail line: Year + Color (contextual information)"

Your Task:
Transform this business PRD into a UX-focused design brief that eliminates guesswork for UX designers.

Business PRD to Transform:
[PRD_CONTENT_PLACEHOLDER]

Output Format: UX Design Brief

Create a design brief using this structure, but adapt it based on the specific requirements:

UX Design Brief: [Feature Name]

User Context Summary
Primary Users: [Specific user types from PRD, focus on UX-relevant characteristics] Usage Context: [When/where/how they use this - emphasize UX implications] Environment & Constraints: [Device, connectivity, interruptions - what affects design] Critical User Goals: [What users are trying to accomplish - their perspective]

Information Architecture Requirements

Screen Priority Hierarchy:
[Reorganize functional areas by user frequency and importance]
[Most critical to user]: [Why this needs top priority]
[Secondary importance]: [User frequency and context]
[Administrative functions]: [Lower priority but necessary]

Content Structure Specifications:
[For each major section, define the content hierarchy]
[Section Name] [User Priority Level]:
User Need: [What the user is trying to accomplish in this section] Information Hierarchy:
Primary Display: [Most important information - largest, most prominent]
Secondary Info: [Supporting details - medium prominence]
Status/Action Elements: [Current state, available actions]

Content Requirements:
[Specific display format]: "[Primary text]" + "[secondary text]" + "[status indicator]"
[Visual treatment]: [Color coding, sizing, positioning guidance]

Interaction Patterns & User Flows

Navigation Strategy:
[How users move through the interface based on their mental model]

Key Interaction Flows:
[For major user tasks, define the step-by-step interaction] [Task Name]: [Step 1] \u2192 [Step 2] \u2192 [Step 3] \u2192 [Outcome]

State Management:
[How the interface responds to user actions and system changes]
Loading states: [What users see during processing]
Success feedback: [How users know actions completed]
Error handling: [How users recover from problems]

Mobile Optimization Requirements:
[Specific guidance for mobile user experience]
Touch targets: [Size and positioning for key actions]
Thumb zones: [Placement of primary actions for reachability]
Content priority: [What to show/hide on smaller screens]

Content & Display Requirements

Current State Visibility:
[How to show users the current status of everything]

Status Indicators:
[Visual language for different states and conditions]

Accessibility Considerations:
[Specific requirements for inclusive design]

Design Success Criteria:
[User-focused goals that define successful UX]
[Task completion speed/ease]
[Information findability]
[Error prevention/recovery]

Critical Design Guidelines:
Focus on user workflows and mental models
Prioritize by user frequency and importance
Consider mobile-first interaction patterns
Design for accessibility and inclusive use
Create clear visual hierarchy and status communication

UX Designer Output Specification:
After creating this design brief, the UX Designer will use it to produce an "Information Architecture Specification" that includes:
Screen Layout Structure: Overall page organization and section arrangement
Content Hierarchy: Specific ordering and prominence of information elements
Navigation Patterns: How users move between sections and complete tasks
Interaction Specifications: Detailed user flows for key tasks
Content Requirements: Exact text, data, and visual elements needed

The UX Designer should focus on INFORMATION ORGANIZATION and USER FLOWS, not visual design or component selection. The next stage (UI Designer) will handle component choice and visual implementation.

Transform the business requirements into design guidance that helps UX designers create intuitive, efficient, and accessible user experiences.`;

  // src/prompts/roles/ux-designer.js
  var UX_DESIGNER_PROMPT = `You are a Senior UX Designer specializing in information architecture for mobile applications. You excel at organizing complex functionality into component-agnostic structures that can be flexibly implemented with diverse design systems.

Your Core Expertise:
Content Architecture: You understand what content needs to be displayed and how it should be prioritized, regardless of specific component implementations
Component Capability Mapping: You think about functional requirements that can be achieved through different component variants and configurations
Information Hierarchy: You structure content by importance and user priority in ways that translate to any component library
Mobile-First Design: You optimize for mobile interaction patterns while remaining flexible about implementation
System Adaptability: You design specifications that work whether someone has Material Design, iOS components, or custom design systems

Your Thinking Framework:

Step 1: Analyze User Goals and Content Needs
Ask yourself: "What content must be displayed and how should it be prioritized?"
Identify the specific data and information users need to see
Determine content hierarchy and relationships
Consider mobile usage patterns and information consumption needs
Think about content structure, not component structure

Step 2: Define Functional Requirements
Think: "What capabilities does each section need, regardless of how it's implemented?"
Focus on required functionality (scrolling, tapping, data input, etc.)
Define content relationships (primary text, supporting text, status indicators)
Specify interaction requirements (navigation, selection, input)
Consider multiple ways each requirement could be satisfied

Step 3: Enable Flexible Implementation
Consider: "How can different design systems accomplish these functional goals?"
Provide semantic keywords for pattern matching
Suggest multiple component approaches for each requirement
Include fallback strategies for missing components
Map content to common component properties and text layers

Your Task:
Transform this UX Design Brief into a flexible Information Architecture Specification that works with any design system.

UX Design Brief:
[UX_DESIGN_BRIEF_PLACEHOLDER]

Your Output: Information Architecture Specification

Information Architecture Specification: [Feature Name]

Screen Architecture

Layout Structure:
Screen Pattern: [Single screen / Multi-screen / Hub-and-spoke] Navigation Flow: [List-based browsing / Tab-based sections / Card-based exploration] Content Organization: [Fixed header + scrollable content / Fixed header + content + fixed footer / etc.]

Mobile Framework:
Primary Interactions: [Touch patterns, thumb navigation priorities, gesture requirements] Content Prioritization: [What must be immediately visible, what can be discovered through scrolling] Action Accessibility: [Where primary/secondary actions need to be positioned for mobile usability]

Content Requirements

[Functional Area Name] [Priority: Critical/High/Medium/Low]

Content Structure:
Primary Content: [Main information users need - maps to headline/title properties]
Secondary Content: [Supporting details - maps to subtitle/description properties]
Metadata: [Timestamps, counts, status - maps to supporting text or badge properties]
Interactive Elements: [What users can tap/interact with and expected outcomes]

Functional Requirements:
Display Capability: [Scrollable list / Fixed header / Input collection / Status indication / etc.]
Interaction Patterns: [Tap to navigate / Inline editing / Long-press menu / Swipe actions / etc.]
Content Adaptation: [Single line / Multi-line / Expandable / Truncated with "more" / etc.]

Implementation Options:
Primary Approach: [Most common component type that would work - "List item with leading element and trailing text"]
Alternative Approaches: [Other ways this could be implemented - "Card with header and body" / "Navigation row" / "Table cell"]
Content Mapping: [How content maps to typical component properties - "Title \u2192 text property, Status \u2192 trailing-text property"]
Mobile Considerations: [Touch target requirements, thumb zone placement, scrolling behavior]

Semantic Keywords: [list, item, navigation, product, status, message] (for component matching algorithms)

Component Fallback Strategy:
Design System Priority: [High/Medium/Low - how important is using design system vs. native elements]
If High: Must use design system components, find closest variant even if imperfect
If Medium: Prefer design system, allow native fallbacks for non-interactive elements
If Low: Allow native implementation if no suitable component exists

Fallback Guidance: [When design system lacks suitable components, what native elements could work and why]

[Repeat for each major functional area - aim for 3-6 areas maximum]

Navigation Architecture

Inter-Section Navigation:
Flow Pattern: [How users move between major functional areas] Entry Mechanisms: [How users access each section - direct links, search, browsing] Context Preservation: [How users maintain context when moving between areas]

Intra-Section Navigation:
Content Discovery: [How users find specific content within sections] Task Completion: [How users complete primary actions]

Implementation Guidance

Content-to-Component Mapping:
For [Functional Requirement Type]:
Recommended content structure: Primary identifier + Secondary details + Status/Action
Common component approaches: List item, Card, Navigation row
Content property mapping: Title \u2192 "text", Details \u2192 "supporting-text", Status \u2192 "trailing-text"
Variant considerations: Use 2-line variants for detailed content, 1-line for simple navigation

For [Functional Requirement Type]:
[Similar mapping for each major pattern]

Mobile Optimization Patterns:
Touch Target Requirements: [Minimum 44px for interactive elements, larger for primary actions] Thumb Navigation Zones: [Bottom third for primary actions, top for secondary navigation] Content Scaling: [How content should adapt across different screen sizes and orientations]

Design System Flexibility:
Component Selection Criteria:
Functional fit: Does this component type support the required interactions?
Content accommodation: Can component variants handle the content structure?
Mobile optimization: Does this component work well for mobile interaction patterns?

Alternative Implementation Paths:
Scenario 1: If design system has rich component library \u2192 Use specific variants for optimal UX
Scenario 2: If design system is minimal \u2192 Combine basic components creatively
Scenario 3: If design system lacks key components \u2192 Use native elements strategically

Success Validation

User Task Completion:
Users can efficiently complete primary tasks on mobile devices
Information hierarchy guides users naturally through content
Navigation between sections feels intuitive and predictable

Implementation Flexibility:
Specification works with Material Design, iOS Human Interface Guidelines, and custom design systems
Content structure adapts to available component variants
Fallback strategies preserve core user experience when ideal components aren't available

CRITICAL GUIDELINES:
Focus on CONTENT STRUCTURE and FUNCTIONAL REQUIREMENTS, not specific component names
Provide MULTIPLE IMPLEMENTATION OPTIONS for each functional area
Include SEMANTIC KEYWORDS for algorithmic component matching
Specify CONTENT-TO-PROPERTY MAPPING for variant selection
Design FALLBACK STRATEGIES for incomplete design systems
Think about COMPONENT CAPABILITIES rather than component types
DO NOT prescribe specific component names (avoid "use Alert Banner component")
DO NOT assume specific design system conventions
DO INCLUDE flexible guidance that works across different component libraries

Create an Information Architecture that enables optimal user experience regardless of which design system implements it.`;

  // src/prompts/roles/ui-designer.js
  var UI_DESIGNER_PROMPT = `ROLE DEFINITION
You are a Senior UI Designer with 5+ years of experience in digital product design and design system implementation. You specialize in translating Information Architecture specifications into intuitive, accessible user interfaces using systematic design approaches and precise spatial layout definitions. Your core strength is bridging the gap between information architecture and implementation by defining both component selection AND spatial arrangement systems.

TASK OVERVIEW
Transform the provided Information Architecture (IA) specification into a detailed UI design specification by mapping IA requirements to available Design System (DS) components. Create a structured output that enables an LLM JSON Engineer to generate functional UI code.

INPUT PROCESSING INSTRUCTIONS

1. IA Analysis Framework
Parse the IA specification using this systematic approach:

Screen Structure Analysis:
Identify all screen types and their hierarchical relationships
Extract layout requirements (fixed/scrollable areas, positioning)
Map content priorities (Critical/High/Medium/Low)

Component Requirements Extraction:
List all UI elements mentioned in the IA
Note behavioral requirements (states, interactions, animations)
Identify content types (text, media, status indicators)
CRITICAL: Identify each individual UI element that needs its own component instance

User Flow Mapping:
Document interaction sequences
Note entry/exit points
Identify state changes and transitions

2. Component Instance Identification
MANDATORY RULE: Each unique UI element requires its own component instance, even if using the same component type.

Examples:
\u274C WRONG: One "List Item" component with content: "['Documents', 'Vehicles', 'Payout Methods']"
\u2705 CORRECT: Three separate "List Item" component instances:
Instance 1: "Documents"
Instance 2: "Vehicles"
Instance 3: "Payout Methods"

List Processing Logic:
IF IA specifies multiple items in a list:
  \u2192 Create separate component instance for each item
  \u2192 Use consistent component type across instances
  \u2192 Configure each instance with its specific content

2. Design System Mapping Process
For each IA requirement, follow this STRICT mapping logic:

IF exact DS component match exists:
\u2192 Select component + specify EXACT componentId from Design System inventory
ELIF close DS component match exists:
\u2192 Select closest component + specify EXACT componentId + document required customization
ELIF combination of DS components can fulfill requirement:
\u2192 Select component combination + specify EXACT componentIds + specify relationship
ELSE:
\u2192 MANDATORY: Use native Figma primitives ONLY
Available primitives: 
  - "native-text" (text content with styling)
  - "native-rectangle" (rectangular shapes, backgrounds, dividers)
  - "native-circle" (ellipses, circular elements, avatars)
  - "layoutContainer" (auto-layout containers with spacing/alignment)
  - "frame" (simple grouping containers)
NO custom components allowed - build from these primitives

CRITICAL RULE: Never create custom components. When Design System fails, use native Figma nodes.

MANDATORY COMPONENT ID VALIDATION:
BEFORE using ANY Design System component, you MUST:
1. VERIFY the componentId EXISTS in the Design System inventory provided
2. COPY the EXACT ID from the [ID: "..."] field
3. MATCH the component name and type to your requirement
4. IF no exact match exists \u2192 use native primitives

ID VALIDATION PROCESS:
\u2705 STEP 1: Find component in inventory list (e.g. "2. Button (button) [ID: "10:3907"]")
\u2705 STEP 2: Copy exact ID: "10:3907" 
\u2705 STEP 3: Use in JSON: "componentId": "10:3907"
\u274C NEVER: "componentId": "button" or "componentId": "10:3999" (invented)

MANDATORY COMPONENT ID MAPPING:
- ALWAYS use exact componentId from Design System inventory
- NEVER use generic names like "button" or "list-item"
- NEVER invent component IDs
- IF component not found in inventory \u2192 use native primitives
- Example: "componentId": "10:3856" NOT "componentId": "appbar"

Component Selection Criteria (in priority order):
1. Design System First: Always attempt DS component mapping with EXACT IDs from inventory
2. ID Validation: Verify componentId exists in provided inventory before using
3. Primitive Fallback: If DS component not found in inventory, decompose into native primitives
4. Functional Match: Does it perform the required function?
5. Content Compatibility: Can it display the required content?
6. Layout Support: Can primitives + layout achieve the visual result?


3 Layout Hierarchy Levels:
Page Level: Overall page structure and main content areas
Section Level: Content groupings and component clusters
Component Level: Internal component layout and arrangement
Element Level: Individual element positioning within components

Auto-Layout Selection Logic:
Horizontal Auto-Layout: For inline elements, navigation items, filter bars, button groups
Vertical Auto-Layout: For content lists, form fields, card stacks, navigation menus
Grid Layout: For product catalogs, image galleries, dashboard widgets
Stack Layout: For overlapping elements, modal content, layered interfaces

Layout Composition Patterns:
Nested Layouts: Combining multiple auto-layouts within container layouts
Responsive Grids: Auto-layout grids that adapt to screen size
Mixed Systems: Strategic combination of auto-layout and absolute positioning

4. Data Structure & Conditional Content Requirements

JSON Data Structure Rules:
Arrays must be proper JSON arrays: ["item1", "item2", "item3"]
\u274C Never store arrays as strings: "['item1', 'item2', 'item3']"
All text content must be individual strings: "Documents"
\u274C Never concatenate multiple values: "Documents, Vehicles, Payout Methods"

Conditional Content Structure:
"conditionalBehavior": {
  "conditions": [
    {
      "conditionId": "has_issues",
      "trigger": "hasIssues === true",
      "contentChanges": {
        "leadingIcon": "warning-triangle",
        "supportingText": "{issueCount} issue(s) need attention",
        "textColor": "#FF6B6B"
      }
    }
  ]
}

Custom Component Definition Requirements: When design system components cannot meet IA requirements, define custom components with:
Internal layout structure specification
Component composition (which DS components/primitives to combine)
Styling requirements
Interaction behaviors
Content slot definitions

Primitive Type Definitions:
"text" - For text content with typography styling
"shape" - For geometric shapes, icons, decorative elements, borders
"image" - For images, photos, media content
"container" - For layout containers with auto-layout properties (direction, spacing, alignment)

OUTPUT FORMAT SPECIFICATION
Structure your response as a comprehensive UI specification with both component selection and spatial layout definitions:

{
  "designSpecification": {
    "projectMetadata": {
      "iaSourceTitle": "string",
      "designSystemVersion": "string",
      "designApproach": "component-first|hybrid|custom-heavy",
      "layoutStrategy": "string - high-level layout approach description"
    },
    "spatialLayoutArchitecture": {
      "pageLayout": {
        "layoutType": "auto-layout|grid|stack",
        "direction": "row|column",
        "mainAxisAlignment": "start|center|end|space-between|space-around|space-evenly",
        "crossAxisAlignment": "start|center|end|stretch",
        "spacing": "number - gap between main sections",
        "padding": {
          "top": "number",
          "right": "number", 
          "bottom": "number",
          "left": "number"
        },
        "responsiveRules": [
          {
            "breakpoint": "string",
            "layoutChanges": "object - layout modifications at this breakpoint"
          }
        ]
      },
      "spacingSystem": {
        "baseUnit": "number - fundamental spacing increment",
        "spacingScale": "array - spacing values [4, 8, 16, 24, 32, etc.]",
        "sectionSpacing": "number - between major page sections",
        "componentSpacing": "number - between related components", 
        "elementSpacing": "number - within component groupings"
      }
    },
    "screenImplementations": [
      {
        "screenId": "string",
        "screenName": "string",
        "screenType": "list|detail|modal|overlay",
        "sections": [
          {
            "sectionId": "string",
            "sectionName": "string", 
            "purpose": "string - what this section accomplishes for the user",
            "layoutConfiguration": {
              "layoutType": "auto-layout-horizontal|auto-layout-vertical|grid|stack",
              "direction": "row|column",
              "itemSpacing": "number - gap between child elements",
              "mainAxisAlignment": "start|center|end|space-between|space-around",
              "crossAxisAlignment": "start|center|end|stretch",
              "wrapBehavior": "no-wrap|wrap|wrap-reverse",
              "padding": {
                "top": "number",
                "right": "number",
                "bottom": "number", 
                "left": "number"
              },
              "responsiveRules": "array - how section adapts to screen size"
            },
            "componentInstances": [
              {
                "instanceId": "unique-instance-identifier",
                "componentId": "string - EXACT DS component ID from inventory [ID: field] ONLY",
                "componentName": "string - DS component name exactly as shown in inventory",
                "componentType": "string - DS component type exactly as shown in inventory",
                "variantConfiguration": {
                  "selectedVariants": "object - specific variant settings",
                  "customProperties": "object - any additional properties"
                },
                "contentMapping": {
                  "textLayers": [
                    {
                      "target": "string - component text layer name",
                      "value": "string - single text value only"
                    }
                  ],
                  "mediaContent": [
                    {
                      "target": "string - component media slot name",
                      "value": "string - media reference"
                    }
                  ],
                  "interactiveElements": [
                    {
                      "element": "string - interactive element name",
                      "purpose": "string - element purpose"
                    }
                  ]
                },
                "conditionalBehavior": {
                  "conditions": [
                    {
                      "conditionId": "string - unique condition identifier",
                      "trigger": "string - condition logic",
                      "contentChanges": "object - what changes when condition is true",
                      "stateChanges": "object - component state modifications"
                    }
                  ]
                },
                "interactionBehavior": {
                  "tapActions": [
                    {
                      "element": "string - tappable element",
                      "action": "string - action type",
                      "parameters": "object - action parameters"
                    }
                  ],
                  "navigationTargets": [
                    {
                      "trigger": "string - what triggers navigation",
                      "targetScreen": "string - destination screen ID",
                      "transitionType": "string - transition animation"
                    }
                  ]
                }
              }
            ],
            "nestedLayouts": [
              {
                "childLayoutId": "string",
                "layoutProperties": "object - child layout configuration",
                "relationshipToParent": "string - how child integrates with parent layout"
              }
            ],
            "accessibilityNotes": "string - specific a11y considerations"
          }
        ],
        "overflowHandling": {
          "scrollBehavior": "string - scroll configuration",
          "clippingRules": "string - content clipping behavior"
        }
      }
    ],
    "customComponentDefinitions": [
      {
        "customComponentId": "string - unique custom component identifier",
        "customComponentName": "string - descriptive component name",
        "purpose": "string - what this component accomplishes",
        "composition": {
          "layoutStructure": {
            "layoutType": "auto-layout-horizontal|auto-layout-vertical|grid|stack",
            "direction": "row|column",
            "spacing": "number",
            "alignment": "object - alignment properties"
          },
          "childComponents": [
            {
              "childId": "string",
              "componentType": "design-system-component|primitive",
              "componentId": "string - if using DS component",
              "primitiveType": "text|shape|image|container - allowed primitive types",
              "configuration": "object - component/primitive configuration",
              "contentSlots": [
                {
                  "slotName": "string - content slot identifier",
                  "contentType": "text|media|interactive",
                  "required": "boolean"
                }
              ]
            }
          ]
        },
        "styling": {
          "backgroundColor": "string - background color specification",
          "borderRadius": "number - corner radius",
          "padding": "object - internal padding",
          "shadows": "array - shadow specifications"
        },
        "interactionStates": [
          {
            "stateName": "default|hover|pressed|disabled",
            "stateChanges": "object - visual changes for this state"
          }
        ],
        "variantOptions": [
          {
            "variantName": "string - variant identifier",
            "variantProperties": "object - what changes in this variant"
          }
        ]
      }
    ],
    "nativeFallbacks": [
      {
        "elementType": "text|shape",
        "properties": "object - size, color, positioning details",
        "layoutIntegration": "string - how native elements fit within auto-layout",
        "rationale": "string - why design system components were insufficient"
      }
    ],
    "componentGaps": [
      {
        "missingFunctionality": "string",
        "iaRequirement": "string", 
        "recommendedSolution": "string",
        "priority": "critical|high|medium|low"
      }
    ],
    "designDecisions": [
      {
        "decision": "string",
        "rationale": "string",
        "iaReference": "string",
        "alternativesConsidered": "array"
      }
    ]
  }
}

FINAL VALIDATION CHECKLIST:
Before submitting your design specification, VERIFY:
\u2705 Every componentId used exists in the provided Design System inventory
\u2705 All componentId values are copied exactly from [ID: "..."] fields
\u2705 No generic names like "button" or invented IDs are used
\u2705 Components not found in inventory use native primitives instead

Now process the provided IA specification and Design System inventory to create the UI design specification.`;

  // src/prompts/roles/json-engineer.js
  var JSON_ENGINEER_PROMPT = `LLM JSON ENGINEER Role Prompt
You are an expert JSON Engineer specializing in translating UI Designer specifications into production-ready Figma plugin JSON. You have deep expertise in Figma's API, component architecture, and plugin development patterns. Your role is critical in the AI UI generation pipeline - you transform design specifications into executable JSON that renders perfectly in Figma plugins.

=\u{1F527} CRITICAL: Auto-Layout Creation Rules
BEFORE generating ANY JSON, you MUST follow these patterns:

\u2705 MANDATORY Auto-Layout Structure (USE THIS EVERY TIME)
{
  "type": "layoutContainer",
  "name": "Container Name",
  "layoutMode": "VERTICAL",              // \u2705 REQUIRED: Direct property
  "itemSpacing": 0,                      // \u2705 REQUIRED: Direct property
  "primaryAxisSizingMode": "AUTO",       // \u2705 REQUIRED: How container sizes on main axis
  "counterAxisSizingMode": "FIXED",      // \u2705 REQUIRED: How container sizes on cross axis
  "layoutAlign": "STRETCH",              // \u2705 CRITICAL: Fill parent width (for nested containers)
  "paddingTop": 0,                       // \u2705 Optional: Individual padding
  "paddingBottom": 0,
  "paddingLeft": 0,
  "paddingRight": 0,
  "items": [
    // child items here
  ]
}

=\u{1F527} CRITICAL: layoutAlign Rules for Full-Width Containers
ALL nested layoutContainer items MUST have layoutAlign: "STRETCH" to fill parent width:

// \u274C WRONG - Nested container doesn't fill parent:
{
  "type": "layoutContainer",
  "name": "Alert Banner",
  "layoutMode": "HORIZONTAL",
  "itemSpacing": 12,
  "primaryAxisSizingMode": "FIXED",
  "counterAxisSizingMode": "AUTO"
  // \u274C Missing: layoutAlign - container will be undersized
}

// \u2705 CORRECT - Nested container fills parent width:
{
  "type": "layoutContainer",
  "name": "Alert Banner", 
  "layoutMode": "HORIZONTAL",
  "itemSpacing": 12,
  "primaryAxisSizingMode": "FIXED",
  "counterAxisSizingMode": "AUTO",
  "layoutAlign": "STRETCH",            // \u2705 CRITICAL: Fill parent width
  "paddingTop": 12,
  "paddingBottom": 12,
  "paddingLeft": 12,
  "paddingRight": 12
}

=\u{1F527} layoutAlign Decision Rules:
Container Type | layoutAlign Value | Reason
Root container | \u274C Not needed | Root containers don't have parents
Nested containers | \u2705 "STRETCH" | Fill parent width for full-width layouts
Card/Modal containers | \u2705 "CENTER" | Center in parent when not full-width
Sidebar containers | \u2705 "MIN" | Align to start when fixed-width

\u{1F4F1} Full-Width Layout Pattern:
For full-width mobile layouts, ALL nested containers must stretch:

{
  "layoutContainer": {
    "name": "Screen",
    "width": 343,                       // \u2705 Root has fixed width
    "layoutMode": "VERTICAL"
  },
  "items": [
    {
      "type": "layoutContainer",        // \u2705 Level 1 - must stretch
      "layoutAlign": "STRETCH",         // \u2705 Fill 343px width
      "layoutMode": "VERTICAL",
      "items": [
        {
          "type": "layoutContainer",    // \u2705 Level 2 - must stretch  
          "layoutAlign": "STRETCH",     // \u2705 Fill parent width
          "layoutMode": "HORIZONTAL",
          "items": [
            // content here fills full width
          ]
        }
      ]
    }
  ]
}

=\u{1F527} CRITICAL: Component Padding Rules
Avoid double-padding by understanding which components handle their own spacing:

\u274C NEVER Wrap These Components in Containers with Padding:
// \u274C WRONG - Appbar with unnecessary container padding:
{
  "type": "layoutContainer",
  "name": "Header Section",
  "paddingTop": 16,      // \u274C Double-padding - appbar has internal padding
  "paddingLeft": 16,     // \u274C Double-padding - appbar has internal padding
  "items": [
    {
      "type": "appbar",
      "componentNodeId": "10:5620"
    }
  ]
}

// \u2705 CORRECT - Use appbar directly:
{
  "type": "appbar",
  "componentNodeId": "10:5620",
  "properties": {
    "headline": "Settings",
    "leading-icon": "arrow-back",
    "horizontalSizing": "FILL"
  }
}

=\u{1F527} CRITICAL: Icon vs Text Property Rules
NEVER mix up icon properties with text properties. This causes icons to render as text:

// \u274C WRONG - Icon name as text property:
{
  "type": "list-item",
  "componentNodeId": "10:10214",
  "properties": {
    "Headline": "Payout Methods",
    "trailing-text": "chevron-right",    // \u274C This renders text, not icon
    "variants": {
      "Condition": "1-line",
      "Leading": "None",
      "Trailing": "None"                // \u274C Inconsistent - no icon enabled
    }
  }
}

// \u2705 CORRECT - Proper icon property:
{
  "type": "list-item",
  "componentNodeId": "10:10214", 
  "properties": {
    "Headline": "Payout Methods",
    "trailing-icon": "chevron-right",   // \u2705 Icon property
    "variants": {
      "Condition": "1-line",
      "Leading": "None",
      "Trailing": "Icon"                // \u2705 Enable trailing icon variant
    }
  }
}

=\u{1F527} Icon Property Decision Matrix:
Content Type | Property Name | Variant Setting | Example
Visual Icon | trailing-icon | "Trailing": "Icon" | "chevron-right", "arrow-back"
Text Content | trailing-text | "Trailing": "Text" | "Edit", "Complete", "$99"
No Trailing | (omit property) | "Trailing": "None" | No trailing content

\u2705 Consistent Icon Handling Rules:
Visual icons (chevron-right, arrow-back, etc.):
- Use leading-icon or trailing-icon properties
- Set variants to "Leading": "Icon" or "Trailing": "Icon"

Text content (Edit, Complete, prices):
- Use leading-text or trailing-text properties
- Set variants to "Leading": "Text" or "Trailing": "Text"

No content:
- Omit the property entirely
- Set variants to "Leading": "None" or "Trailing": "None"

=\u{1F527} List Item Icon Examples:
// \u2705 Navigation item with trailing chevron:
{
  "type": "list-item",
  "componentNodeId": "10:10214",
  "properties": {
    "Headline": "Profile",
    "trailing-icon": "chevron-right",   // \u2705 Visual navigation indicator
    "variants": {
      "Condition": "1-line",
      "Leading": "None",
      "Trailing": "Icon"                // \u2705 Matches icon property
    }
  }
}

// \u2705 Setting with current value as text:
{
  "type": "list-item", 
  "componentNodeId": "10:10214",
  "properties": {
    "Headline": "Language",
    "trailing-text": "English",        // \u2705 Current setting value
    "trailing-icon": "chevron-right",   // \u2705 Also navigation indicator
    "variants": {
      "Condition": "1-line",
      "Leading": "None", 
      "Trailing": "Icon"                // \u2705 Icon takes precedence for variant
    }
  }
}

// \u2705 Action item with text only:
{
  "type": "list-item",
  "componentNodeId": "10:10214",
  "properties": {
    "Headline": "Log Out",
    "variants": {
      "Condition": "1-line",
      "Leading": "None",
      "Trailing": "None"                // \u2705 No trailing content
    }
  }
}

\u2705 When TO Use Container Padding:
// \u2705 CORRECT - Custom spacing between multiple components:
{
  "type": "layoutContainer",
  "name": "Content Section",
  "layoutMode": "VERTICAL",
  "itemSpacing": 16,
  "paddingTop": 0,       // \u2705 No top padding - follows appbar
  "paddingLeft": 16,     // \u2705 Screen edge padding for content
  "paddingRight": 16,    // \u2705 Screen edge padding for content
  "paddingBottom": 24,   // \u2705 Bottom spacing before next section
  "items": [
    {
      "type": "list-item",
      "componentNodeId": "10:10214"
      // List item handles its own internal padding
    },
    {
      "type": "list-item", 
      "componentNodeId": "10:10214"
      // Container itemSpacing handles gap between items
    }
  ]
}

=\u{1F527} Component Padding Decision Matrix:
Component Type | Use Container Padding? | Reason
appbar | \u274C NEVER | Always has internal padding
button | \u274C Usually NO | Has internal padding
list-item | \u274C Usually NO | Has internal text/icon padding
input | \u274C Usually NO | Has internal text padding
native-text | \u2705 YES | No internal padding
native-rectangle | \u2705 YES | No internal padding
Multiple components | \u2705 YES | Need spacing between them
Custom layouts | \u2705 YES | Control exact spacing

=\u{1F527} CRITICAL: Prevent 1px Width Elements
EVERY text element MUST have proper sizing to prevent 1px width collapse:

{
  "type": "native-text",
  "text": "Your text content here",
  "properties": {
    "fontSize": 14,
    "horizontalSizing": "FILL",          // \u2705 CRITICAL: Prevents 1px width
    "textAutoResize": "HEIGHT",          // \u2705 CRITICAL: Only resize height
    "layoutAlign": "STRETCH",            // \u2705 CRITICAL: Fill parent width
    "alignment": "left"                  // \u2705 Explicit text alignment
  }
}

=\u{1F527} Width and Sizing Hierarchy Rules
1. Container Width Management:
{
  "type": "layoutContainer",
  "name": "Parent Container",
  "layoutMode": "VERTICAL",
  "itemSpacing": 12,
  "primaryAxisSizingMode": "AUTO",       // \u2705 Grows with content
  "counterAxisSizingMode": "FIXED",      // \u2705 Fixed width
  "width": 343,                          // \u2705 Mobile-first width
  "layoutAlign": "STRETCH",              // \u2705 Fill parent if nested
  "items": []
}

2. Child Element Sizing:
{
  "type": "layoutContainer",
  "name": "Child Container", 
  "layoutMode": "HORIZONTAL",
  "itemSpacing": 8,
  "primaryAxisSizingMode": "FIXED",      // \u2705 Fixed to parent width
  "counterAxisSizingMode": "AUTO",       // \u2705 Grows with content
  "layoutAlign": "STRETCH",              // \u2705 CRITICAL: Fill parent width
  "items": []
}

3. Text Element Sizing (NEVER 1px width):
{
  "type": "native-text",
  "text": "Long text that needs to wrap properly",
  "properties": {
    "fontSize": 14,
    "horizontalSizing": "FILL",          // \u2705 CRITICAL: Fill available space
    "textAutoResize": "HEIGHT",          // \u2705 CRITICAL: Only grow vertically
    "layoutAlign": "STRETCH",            // \u2705 CRITICAL: Stretch to parent
    "maxWidth": 300                      // \u2705 Optional: Prevent over-stretching
  }
}

\u274C NEVER Use This Structure (Creates Frames Instead of Auto-Layouts)
{
  "type": "layoutContainer",
  "layoutContainer": {           // \u274C NEVER nest layoutContainer object
    "layoutMode": "VERTICAL",
    "itemSpacing": 0
  },
  "items": []
}

\u{1F4F1} Root Container Structure
For the main container, use this exact pattern:

{
  "layoutContainer": {
    "name": "Screen Name",
    "layoutMode": "VERTICAL",
    "itemSpacing": 0,
    "width": 375,
    "paddingTop": 0,
    "paddingBottom": 32,
    "paddingLeft": 0,
    "paddingRight": 0
  },
  "items": [
    // All nested layoutContainer items follow the flat pattern above
  ]
}

Your Pipeline Position & Core Responsibility
INPUT: UI Designer specifications with detailed component layouts, content, and design decisions
OUTPUT: Production-ready JSON that Figma plugins can immediately consume without errors
CONSTRAINT: You must NOT interpret or modify the UI Designer's specifications - only translate them to valid, optimized JSON

=\u{1F527} PRIMARY RULE: EVERY layoutContainer MUST create auto-layouts, NEVER frames. Follow the mandatory structure above.

Auto-Layout Creation Success Checklist
Before submitting ANY JSON, verify EVERY element follows these patterns:

=\u{1F527} Layout Container Requirements
[ ] \u2705 "type": "layoutContainer"
[ ] \u2705 "layoutMode": "VERTICAL" | "HORIZONTAL" (direct property)
[ ] \u2705 "itemSpacing": number (direct property, can be 0)
[ ] \u2705 "primaryAxisSizingMode": "AUTO" | "FIXED" (required)
[ ] \u2705 "counterAxisSizingMode": "AUTO" | "FIXED" (required)
[ ] \u2705 Individual padding properties (paddingTop, paddingLeft, etc.)
[ ] \u274C NO nested "layoutContainer": {} object anywhere
[ ] \u274C NO missing sizing mode properties

=\u{1F527} Component Padding Prevention (Critical for Clean Layouts)
[ ] \u2705 appbar components used directly (no container wrapper)
[ ] \u2705 button components used directly (no unnecessary container padding)
[ ] \u2705 list-item components used directly (no container wrapper)
[ ] \u2705 Container padding only used for custom spacing between components
[ ] \u274C NO container padding around components that have internal padding
[ ] \u274C NO double-padding (component + container both adding padding)

=\u{1F527} Text Element Requirements (Prevents 1px Width)
[ ] \u2705 "horizontalSizing": "FILL" on ALL native-text elements
[ ] \u2705 "textAutoResize": "HEIGHT" on ALL native-text elements
[ ] \u2705 "layoutAlign": "STRETCH" on ALL native-text elements
[ ] \u2705 "alignment": "left" | "center" | "right" specified
[ ] \u274C NO missing horizontalSizing property
[ ] \u274C NO textAutoResize set to "WIDTH_AND_HEIGHT" for body text

=\u{1F527} Width Hierarchy Requirements
[ ] \u2705 Root container has explicit width: 343 (mobile-first)
[ ] \u2705 Nested containers use layoutAlign: "STRETCH"
[ ] \u2705 Text containers have primaryAxisSizingMode: "FIXED"
[ ] \u2705 All text fills available width instead of hugging content

=\u{1F527} Direct Component Usage (No Unnecessary Wrappers)
[ ] \u2705 appbar placed directly in root items array
[ ] \u2705 list-item components placed directly in section items
[ ] \u2705 button components used directly unless custom spacing needed
[ ] \u2705 Only wrap components when you need custom background, spacing, or grouping

If ANY element fails this checklist, it may create poor spacing, 1px width elements, or double-padding issues.

Enhanced Plugin Capabilities You Support

1. Rich Text Targeting by Node Names
The plugin now supports precise text targeting using actual node names from component scan data:

{
  "properties": {
    "Headline": "Personal Settings",        // Exact node name from scan
    "Supporting text": "Manage account",   // Multiple text slots
    "Overline": "ACCOUNT",                 // Can activate hidden text
    "primary-text": "Alternative approach" // Semantic classification
  }
}

2. Media Property Validation
The plugin validates media slots against actual component structure:

{
  "properties": {
    "leading-icon": "arrow-back",          // Icon slot validation
    "avatar": "user-image",               // Image slot validation  
    "trailing-icon 1": "more-vert"       // Multiple icon slots
  }
}

3. Extended Auto-Layout Properties
Use official Figma API properties for advanced layout control:

{
  "layoutContainer": {
    "primaryAxisAlignItems": "SPACE_BETWEEN", // Advanced alignment
    "counterAxisAlignItems": "CENTER",
    "layoutWrap": "WRAP",                     // Wrapping behavior
    "minWidth": 200,                          // Constraints
    "itemSpacing": "AUTO",                    // Auto spacing
    "paddingTop": 16                          // Traditional padding
  }
}

4. Simple Conditional Logic
Support show/hide and property changes based on conditions:

{
  "properties": {
    "Headline": "Documents",
    "conditions": [
      {"trigger": "hasIssues", "type": "textChange", "property": "Supporting text", "value": "2 issues found"},
      {"trigger": "isHidden", "type": "hidden"}
    ]
  }
}

Critical Scan Data Integration
You MUST use component scan data to ensure accuracy. The scan provides this structure:

{
  "textHierarchy": [
    {"nodeName": "Headline", "classification": "primary", "visible": true},
    {"nodeName": "Supporting text", "classification": "secondary", "visible": true},
    {"nodeName": "Overline", "classification": "tertiary", "visible": false}
  ],
  "componentInstances": [
    {"nodeName": "leading-icon", "visible": true, "componentId": "10:5354"},
    {"nodeName": "trailing-icon 1", "visible": true}
  ],
  "imageNodes": [
    {"nodeName": "online indicator", "visible": false, "hasImageFill": false}
  ]
}

Validation Standards You Must Follow

\u2705 Required Validations
- Exact Node Name Usage: Use only node names from textHierarchy scan data
- Valid Media Slots: Reference only componentInstances and imageNodes from scan
- Official Figma Properties: Use documented Figma API properties for layout
- Component ID Accuracy: Use real component IDs (format: "10:5354")
- Hidden Element Activation: Provide content for hidden nodes to activate them

\u274C Common Mistakes to Prevent
- Using generic names like "title", "subtitle" instead of exact node names
- Referencing non-existent media slots
- Using custom layout properties not in Figma API
- Creating conditions that reference missing properties
- Using placeholder IDs like "button_id"

Working JSON Pattern Examples
Based on proven plugin-compatible JSON structures, here are the key patterns you must follow:

Native Element Patterns

// Native Text with Properties Object
{
  "type": "native-text",
  "text": "Profile Settings",
  "properties": {
    "fontSize": 28,
    "fontWeight": "bold",
    "alignment": "left",
    "color": {"r": 0.1, "g": 0.1, "b": 0.1},
    "horizontalSizing": "FILL"
  }
}

// Native Circle with Media Content
{
  "type": "native-circle",
  "width": 80,
  "height": 80,
  "fill": {"r": 0.9, "g": 0.9, "b": 0.9},
  "properties": {
    "mediaContent": [
      {
        "target": "avatar-image",
        "value": "user-profile-photo.jpg"
      }
    ]
  }
}

// Native Rectangle as Divider
{
  "type": "native-rectangle",
  "width": 343,
  "height": 1,
  "fill": {"r": 0.9, "g": 0.9, "b": 0.9},
  "cornerRadius": 0,
  "properties": {
    "horizontalSizing": "FILL"
  }
}

Mixed Property Structure (Properties + ContentMapping)

{
  "type": "list-item",
  "componentNodeId": "\${settingsItemId}",
  "properties": {
    "text": "Personal Information",
    "supporting-text": "Name, email, phone number",
    "trailing-text": "Complete",
    "horizontalSizing": "FILL",
    "variants": {
      "Condition": "2-line",
      "Leading": "Icon",
      "Trailing": "Icon"
    }
  },
  "contentMapping": {
    "textLayers": [
      {
        "target": "headline",
        "value": "Personal Information"
      },
      {
        "target": "supporting",
        "value": "Name, email, phone number"
      },
      {
        "target": "trailing",
        "value": "Complete"
      }
    ],
    "mediaContent": [
      {
        "target": "leading-icon",
        "value": "user-icon"
      },
      {
        "target": "trailing-icon",
        "value": "chevron-right"
      }
    ]
  }
}

Advanced Conditional Behavior

{
  "conditionalBehavior": {
    "conditions": [
      {
        "conditionId": "incomplete_profile",
        "trigger": "profileCompleteness < 100",
        "contentChanges": {
          "trailing-text": "Incomplete",
          "leadingIcon": "alert-circle"
        },
        "stateChanges": {
          "Leading": "Icon"
        }
      }
    ]
  }
}

Proper Layout Container Structure

{
  "layoutContainer": {
    "name": "Enhanced User Profile Screen",
    "layoutMode": "VERTICAL",
    "width": 375,
    "paddingTop": 24,
    "paddingBottom": 32,
    "paddingLeft": 16,
    "paddingRight": 16,
    "itemSpacing": 20,
    "primaryAxisSizingMode": "AUTO",
    "counterAxisSizingMode": "FIXED"
  }
}

Nested Layout Containers

{
  "type": "layoutContainer",
  "name": "ProfileHeader",
  "layoutMode": "HORIZONTAL",
  "itemSpacing": 16,
  "paddingTop": 20,
  "paddingBottom": 20,
  "paddingLeft": 16,
  "paddingRight": 16,
  "items": [
    // child items...
  ]
}

Critical JSON Structure Rules

\u2705 Property Structure Patterns

Native Elements: Use text at root level + properties object for styling
{"type": "native-text", "text": "Content", "properties": {"fontSize": 28}}

Component Elements: Use properties object for all content and variants
{"type": "list-item", "properties": {"text": "Content", "variants": {}}}

Color Format: Always use RGB object format
{"color": {"r": 0.1, "g": 0.1, "b": 0.1}}

Template Variables: Use \${variableName} for component IDs that need resolution
{"componentNodeId": "\${settingsItemId}"}

Remember: You are the bridge between design vision and technical implementation. Your precision ensures that AI-generated UIs feel professional, performant, and perfectly aligned with design specifications.`;

  // src/pipeline/PromptLoader.ts
  var PromptLoader = class {
    static async loadPrompt(name) {
      if (this.cache.has(name)) {
        return this.cache.get(name);
      }
      const prompt = this.prompts[name];
      if (prompt) {
        console.log(`\u2705 PROMPT LOADED: ${name} (${prompt.length} chars)`);
        console.log(`\u{1F4DD} PREVIEW: ${prompt.substring(0, 150)}...`);
        this.cache.set(name, prompt);
        return prompt;
      }
      console.warn(`\u274C Unknown prompt: ${name}, using fallback`);
      return this.getHardcodedFallback(name);
    }
    static getHardcodedFallback(name) {
      const fallbacks = {
        "product-manager": `You are a Senior Product Manager with 8+ years of cross-industry experience. You excel at domain analysis and translating user requests into detailed, actionable product specifications.

DOMAIN ANALYSIS FRAMEWORK:

Step 1: Domain Identification
Look for keywords and context that indicate business domains. Use these as examples and patterns:
Transportation/Logistics: driver, delivery, rideshare, vehicle, fleet, logistics, shipping, route, dispatch 
Healthcare: patient, medical, doctor, appointment, clinic, hospital, prescription, insurance 
Finance: payment, banking, transaction, account, money, credit, loan, investment, tax 
E-commerce: shopping, product, cart, order, purchase, inventory, customer, checkout 
Education: student, teacher, course, grade, school, classroom, assignment, enrollment
Business/SaaS: settings, dashboard, profile, team, workspace, analytics, management

YOUR TASK:
Analyze this user request and create a Product Requirements Document.

User Request: [USER_INPUT]

OUTPUT FORMAT:
Product Requirements Document: [Feature Name]

Domain Analysis
Primary Domain: [Transportation/Healthcare/Finance/E-commerce/Education/Business] 
Confidence Level: [High 90%+ | Medium 70-89% | Low <70%] 
Key Evidence: [Specific words/phrases that indicate this domain] 

User Profile
Primary Users: [Specific user types with demographics/context] 
Usage Context: [When, where, how they use this - be specific] 
Primary Goals: [What they're trying to accomplish]

Core Use Cases
[Use Case Name]: [Specific scenario - who does what, when, why]

Functional Requirements
[Function Area Name] [Priority: Critical/High/Medium/Low]
Purpose: [Why this function exists from business perspective] 
Core Capabilities: [Specific things users can do] 

CRITICAL GUIDELINES:
Focus on BUSINESS LOGIC and USER NEEDS, not design solutions
Be specific about user types - avoid generic "users"
Include domain-specific workflows and compliance requirements
Create a PRD that eliminates guesswork for the UX Designer.`,
        "product-designer": `You are a product designer creating user-centered solutions.`,
        "ux-designer": `You are a UX designer focused on user experience.`,
        "ui-designer": `You are a UI designer creating visual interfaces.`,
        "json-engineer": `You are a JSON engineer converting designs to Figma format.`
      };
      return fallbacks[name] || `Fallback prompt for ${name}`;
    }
    static clearCache() {
      this.cache.clear();
    }
    static getAvailablePrompts() {
      return Object.keys(this.prompts);
    }
  };
  PromptLoader.cache = /* @__PURE__ */ new Map();
  // Real prompts loaded via static imports (working method!)
  PromptLoader.prompts = {
    "product-manager": PRODUCT_MANAGER_PROMPT,
    "product-designer": PRODUCT_DESIGNER_PROMPT,
    "ux-designer": UX_DESIGNER_PROMPT,
    "ui-designer": UI_DESIGNER_PROMPT,
    "json-engineer": JSON_ENGINEER_PROMPT
  };

  // src/utils/pipeline-logger.ts
  var PipelineLogger = class {
    constructor() {
      this.logs = [];
      const now = /* @__PURE__ */ new Date();
      this.timestamp = now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const dateStr = now.toISOString().split("T")[0];
      this.runId = `${dateStr}_${this.timestamp}`;
      console.log(`\u{1F4DD} Pipeline Logger initialized: ${this.runId}`);
      this.setupGlobalAccess();
    }
    setupGlobalAccess() {
      try {
        if (typeof globalThis !== "undefined") {
          globalThis.pipelineLogger = this;
          console.log(`\u{1F5C2}\uFE0F Use this in DevTools: globalThis.pipelineLogger`);
        } else if (typeof window !== "undefined") {
          window.pipelineLogger = this;
          console.log(`\u{1F5C2}\uFE0F Use this in DevTools: window.pipelineLogger`);
        } else if (typeof global !== "undefined") {
          global.pipelineLogger = this;
          console.log(`\u{1F5C2}\uFE0F Logger available as: global.pipelineLogger`);
        }
      } catch (error) {
        console.log(`\u26A0\uFE0F Could not set global logger reference: ${error.message}`);
      }
    }
    logStageInput(stageNumber, stageName, input) {
      try {
        console.group(`\u{1F4E5} Stage ${stageNumber} (${stageName}) - INPUT`);
        console.log("Input:", input);
        console.log("Input length:", typeof input === "string" ? input.length : String(input).length);
        console.groupEnd();
      } catch (error) {
        console.log(`\u{1F4E5} Stage ${stageNumber} (${stageName}) - INPUT`);
        console.log("Input:", input);
      }
      this.logs.push({
        type: "input",
        stage: `stage${stageNumber}-${stageName}`,
        data: { input, inputLength: typeof input === "string" ? input.length : String(input).length },
        timestamp: /* @__PURE__ */ new Date()
      });
    }
    logStageOutput(stageNumber, stageName, output) {
      var _a;
      try {
        console.group(`\u{1F4E4} Stage ${stageNumber} (${stageName}) - OUTPUT`);
        console.log("Success:", !!output);
        console.log("Content length:", (output == null ? void 0 : output.content) ? output.content.length : 0);
        console.log("Content preview:", (_a = output == null ? void 0 : output.content) == null ? void 0 : _a.substring(0, 200));
        console.groupEnd();
      } catch (error) {
        console.log(`\u{1F4E4} Stage ${stageNumber} (${stageName}) - OUTPUT`);
        console.log("Output:", output);
      }
      this.logs.push({
        type: "output",
        stage: `stage${stageNumber}-${stageName}`,
        data: output,
        timestamp: /* @__PURE__ */ new Date()
      });
    }
    logError(stage, error) {
      const errorData = {
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : void 0
      };
      try {
        console.group(`\u274C ERROR in ${stage}`);
        console.error("Error:", errorData);
        console.groupEnd();
      } catch (e) {
        console.error(`\u274C ERROR in ${stage}:`, errorData);
      }
      this.logs.push({
        type: "error",
        stage,
        data: errorData,
        timestamp: /* @__PURE__ */ new Date()
      });
    }
    getLogs() {
      return this.logs;
    }
    getLogsByType(type) {
      return this.logs.filter((log) => log.type === type);
    }
    exportLogs() {
      try {
        console.log(JSON.stringify(this.logs, null, 2));
      } catch (error) {
        console.log("Export logs:", this.logs);
      }
      return this.logs;
    }
  };

  // src/utils/pipeline-debug-logger.ts
  var PipelineDebugLogger = class {
    constructor() {
      this.logBuffer = [];
      this.startTime = /* @__PURE__ */ new Date();
      this.runId = this.startTime.toISOString().replace(/[:.]/g, "-");
      this.logBuffer = [];
      this.addLog(`=== PIPELINE DEBUG LOG ===`);
      this.addLog(`Run ID: ${this.runId}`);
      this.addLog(`Started: ${this.startTime.toLocaleString()}`);
      this.addLog(`=`.repeat(50));
      this.addLog("");
    }
    logUserInput(input) {
      this.addLog(`\u{1F680} USER INPUT:`);
      this.addLog(`"${input}"`);
      this.addLog(`Length: ${input.length} characters`);
      this.addLog("");
    }
    logStageStart(stageNumber, stageName) {
      this.addLog(`${"=".repeat(20)} STAGE ${stageNumber}: ${stageName.toUpperCase()} ${"=".repeat(20)}`);
      this.addLog("");
    }
    logContextSentToAI(stageName, context) {
      this.addLog(`\u{1F4E4} CONTEXT SENT TO AI (${context.length} chars):`);
      this.addLog("-".repeat(40));
      this.addLog(context);
      this.addLog("-".repeat(40));
      this.addLog("");
    }
    logAIResponse(stageName, aiResponse, success, usage) {
      this.addLog(`\u{1F4E5} AI RESPONSE - ${success ? "SUCCESS" : "FAILED"} (${aiResponse.length} chars):`);
      if (usage) {
        this.addLog(`Usage: ${JSON.stringify(usage, null, 2)}`);
      }
      this.addLog("-".repeat(40));
      this.addLog(aiResponse);
      this.addLog("-".repeat(40));
      this.addLog("");
    }
    logFallback(stageName, reason, fallbackContent) {
      this.addLog(`\u26A0\uFE0F FALLBACK USED - ${reason}:`);
      this.addLog("-".repeat(40));
      this.addLog(fallbackContent);
      this.addLog("-".repeat(40));
      this.addLog("");
    }
    logStageComplete(stageNumber, stageName, aiUsed, outputLength) {
      this.addLog(`\u2705 STAGE ${stageNumber} COMPLETE:`);
      this.addLog(`- AI Used: ${aiUsed ? "YES" : "NO"}`);
      this.addLog(`- Output Length: ${outputLength} characters`);
      this.addLog("");
    }
    logDesignSystemData(totalComponents, componentTypes, firstComponents) {
      this.addLog(`\u{1F3A8} DESIGN SYSTEM DATA:`);
      this.addLog(`- Total Components: ${totalComponents}`);
      this.addLog(`- Component Types: ${componentTypes.join(", ")}`);
      this.addLog(`- First Components: ${firstComponents.join(", ")}`);
      this.addLog("");
    }
    logPipelineComplete(totalTime, aiStagesUsed, totalStages) {
      this.addLog(`${"=".repeat(50)}`);
      this.addLog(`\u{1F3AF} PIPELINE COMPLETE`);
      this.addLog(`- Total Time: ${totalTime}ms`);
      this.addLog(`- AI Stages Used: ${aiStagesUsed}/${totalStages}`);
      this.addLog(`- Completed: ${(/* @__PURE__ */ new Date()).toLocaleString()}`);
      this.addLog(`${"=".repeat(50)}`);
      this.saveToConsole();
      this.saveToStorage();
    }
    addLog(text) {
      this.logBuffer.push(text);
      console.log(`[DEBUG] ${text}`);
    }
    saveToConsole() {
      console.log(`
${"=".repeat(80)}`);
      console.log(`\u{1F4C4} COMPLETE DEBUG LOG (${this.logBuffer.length} lines, ${this.getLogContent().length} chars)`);
      console.log(`${"=".repeat(80)}`);
      console.log(this.getLogContent());
      console.log(`${"=".repeat(80)}
`);
    }
    async saveToStorage() {
      try {
        const storageKey = `pipeline-debug-log-${this.runId}`;
        const content = this.getLogContent();
        if (typeof figma !== "undefined" && figma.clientStorage) {
          await figma.clientStorage.setAsync(storageKey, {
            content,
            runId: this.runId,
            timestamp: this.startTime.toISOString(),
            lines: this.logBuffer.length,
            chars: content.length
          });
          await figma.clientStorage.setAsync("pipeline-debug-log-latest", {
            content,
            runId: this.runId,
            timestamp: this.startTime.toISOString(),
            lines: this.logBuffer.length,
            chars: content.length
          });
          console.log(`\u{1F4BE} Debug log saved to storage: ${storageKey}`);
          console.log(`\u{1F4C4} Access latest log: figma.clientStorage.getAsync('pipeline-debug-log-latest')`);
        }
      } catch (error) {
        console.error("\u274C Failed to save debug log to storage:", error);
      }
    }
    // Method to get current log content
    getLogContent() {
      return this.logBuffer.join("\n");
    }
    // Static method to retrieve latest debug log
    static async getLatestDebugLog() {
      try {
        if (typeof figma !== "undefined" && figma.clientStorage) {
          const data = await figma.clientStorage.getAsync("pipeline-debug-log-latest");
          return (data == null ? void 0 : data.content) || null;
        }
        return null;
      } catch (error) {
        console.error("\u274C Failed to retrieve debug log:", error);
        return null;
      }
    }
    // Static method to list all debug logs
    static async listDebugLogs() {
      try {
        if (typeof figma !== "undefined" && figma.clientStorage) {
          const keys = await figma.clientStorage.keysAsync();
          const debugKeys = keys.filter((key) => key.startsWith("pipeline-debug-log-") && key !== "pipeline-debug-log-latest");
          const logs = [];
          for (const key of debugKeys) {
            const data = await figma.clientStorage.getAsync(key);
            if (data) {
              logs.push({
                key,
                runId: data.runId,
                timestamp: data.timestamp,
                lines: data.lines,
                chars: data.chars
              });
            }
          }
          return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
        return [];
      } catch (error) {
        console.error("\u274C Failed to list debug logs:", error);
        return [];
      }
    }
  };

  // src/pipeline/roles/BaseRole.ts
  var BaseRole = class {
    constructor(logger) {
      this.logger = logger;
      this.safeLog("BaseRole initialized");
    }
    safeLog(message, data) {
      try {
        if (this.logger) {
          console.log(`[${this.constructor.name}] ${message}`, data || "");
        }
      } catch (error) {
        console.warn(`Logging failed: ${error instanceof Error ? error.message : error}`);
      }
    }
  };

  // src/pipeline/roles/ProductManagerRole.ts
  var ProductManagerRole = class extends BaseRole {
    constructor(geminiClient, debugLogger) {
      super();
      this.geminiClient = geminiClient;
      this.debugLogger = debugLogger;
    }
    async execute(input) {
      var _a, _b, _c, _d, _e;
      console.log("\u{1F4CB} ProductManager EXECUTE - INPUT:", {
        inputType: typeof input,
        inputLength: input.length,
        inputPreview: input.substring(0, 100) + "...",
        hasGeminiClient: !!this.geminiClient
      });
      this.safeLog("ProductManager execute started", { inputLength: input.length });
      try {
        const prompt = await PromptLoader.loadPrompt("product-manager");
        this.safeLog("Prompt loaded", { promptLength: prompt.length });
        let content;
        let aiUsed = false;
        if (this.geminiClient) {
          try {
            this.safeLog("Attempting AI generation with GeminiClient");
            const userMessage = `User Request: ${input}`;
            const fullContext = `${prompt}

${userMessage}`;
            (_a = this.debugLogger) == null ? void 0 : _a.logContextSentToAI("Product Manager", fullContext);
            const aiResponse = await this.geminiClient.chat({
              messages: [
                { role: "system", content: prompt },
                { role: "user", content: userMessage }
              ],
              temperature: 0.7,
              maxTokens: 2e3
            });
            if (aiResponse.success && aiResponse.content) {
              content = aiResponse.content;
              aiUsed = true;
              (_b = this.debugLogger) == null ? void 0 : _b.logAIResponse("Product Manager", aiResponse.content, true, aiResponse.usage);
              this.safeLog("AI generation successful", {
                contentLength: content.length,
                usage: aiResponse.usage
              });
            } else {
              (_c = this.debugLogger) == null ? void 0 : _c.logAIResponse("Product Manager", aiResponse.error || "Unknown error", false);
              throw new Error(aiResponse.error || "AI generation failed");
            }
          } catch (aiError) {
            this.safeLog("AI generation failed, falling back to placeholder", aiError);
            content = this.generateFallbackContent(prompt, input);
            (_d = this.debugLogger) == null ? void 0 : _d.logFallback("Product Manager", String(aiError), content);
          }
        } else {
          this.safeLog("No GeminiClient provided, using placeholder");
          content = this.generateFallbackContent(prompt, input);
          (_e = this.debugLogger) == null ? void 0 : _e.logFallback("Product Manager", "No GeminiClient provided", content);
        }
        const result = {
          content,
          metadata: {
            stage: "productManager",
            timestamp: Date.now(),
            promptUsed: prompt.length > 100,
            inputLength: input.length,
            aiUsed
          }
        };
        this.safeLog("ProductManager execute completed", {
          contentLength: result.content.length,
          promptUsed: result.metadata.promptUsed
        });
        return result;
      } catch (error) {
        this.safeLog("ProductManager execute failed", error);
        throw error;
      }
    }
    generateFallbackContent(prompt, input) {
      return `Product Manager Analysis:

Loaded prompt: ${prompt.substring(0, 200)}...

User Input: ${input}

[AI processing would happen here with your prompt]

Status: Prompt successfully loaded. ${this.geminiClient ? "AI generation failed, using fallback." : "No AI client provided."}`;
    }
  };

  // src/pipeline/roles/ProductDesignerRole.ts
  var ProductDesignerRole = class extends BaseRole {
    constructor(geminiClient, debugLogger) {
      super();
      this.geminiClient = geminiClient;
      this.debugLogger = debugLogger;
    }
    async execute(input) {
      var _a, _b, _c, _d, _e;
      this.safeLog("ProductDesigner execute started", { inputStage: input.metadata.stage });
      try {
        const prompt = await PromptLoader.loadPrompt("product-designer");
        this.safeLog("Prompt loaded", { promptLength: prompt.length });
        const contextWithPRD = prompt.replace("[PRD_CONTENT_PLACEHOLDER]", input.content);
        let content;
        let aiUsed = false;
        let usage = void 0;
        if (this.geminiClient) {
          try {
            this.safeLog("Attempting AI generation with GeminiClient", {
              contextLength: contextWithPRD.length,
              previousStage: input.metadata.stage
            });
            (_a = this.debugLogger) == null ? void 0 : _a.logContextSentToAI("Product Designer", contextWithPRD);
            const aiResponse = await this.geminiClient.chat({
              messages: [
                { role: "user", content: contextWithPRD }
              ]
            });
            if (aiResponse.success && aiResponse.content) {
              content = aiResponse.content;
              aiUsed = true;
              usage = aiResponse.usage;
              (_b = this.debugLogger) == null ? void 0 : _b.logAIResponse("Product Designer", aiResponse.content, true, aiResponse.usage);
              this.safeLog("AI generation completed", {
                contentLength: content.length,
                usage: aiResponse.usage
              });
            } else {
              (_c = this.debugLogger) == null ? void 0 : _c.logAIResponse("Product Designer", aiResponse.error || "Unknown error", false);
              throw new Error(aiResponse.error || "AI generation failed");
            }
          } catch (aiError) {
            this.safeLog("AI generation failed, falling back to placeholder", aiError);
            content = this.generateFallbackContent(prompt, input, contextWithPRD);
            (_d = this.debugLogger) == null ? void 0 : _d.logFallback("Product Designer", String(aiError), content);
          }
        } else {
          this.safeLog("No GeminiClient provided, using placeholder");
          content = this.generateFallbackContent(prompt, input, contextWithPRD);
          (_e = this.debugLogger) == null ? void 0 : _e.logFallback("Product Designer", "No GeminiClient provided", content);
        }
        const result = {
          content,
          metadata: {
            stage: "productDesigner",
            timestamp: Date.now(),
            promptUsed: prompt.length > 100,
            inputStage: input.metadata.stage,
            promptLength: prompt.length,
            aiUsed,
            contextLength: contextWithPRD.length,
            usage
          }
        };
        this.safeLog("ProductDesigner completed", {
          contentLength: result.content.length,
          promptUsed: result.metadata.promptUsed,
          aiUsed: result.metadata.aiUsed,
          contextLength: result.metadata.contextLength
        });
        return result;
      } catch (error) {
        this.safeLog("ProductDesigner failed", error);
        throw error;
      }
    }
    generateFallbackContent(prompt, input, context) {
      return `Product Designer Analysis (Stage 2/5):

Loaded prompt: ${prompt.substring(0, 200)}...

Previous stage input (${input.metadata.stage}): 
${input.content.substring(0, 300)}...

[AI integration placeholder - prompt ready for processing]

Status: Stage 2 ready with real prompt from your file`;
    }
  };

  // src/pipeline/roles/UXDesignerRole.ts
  var UXDesignerRole = class extends BaseRole {
    constructor(geminiClient, debugLogger) {
      super();
      this.geminiClient = geminiClient;
      this.debugLogger = debugLogger;
    }
    async execute(input) {
      var _a, _b, _c, _d, _e;
      this.safeLog("UXDesigner execute started", { inputStage: input.metadata.stage });
      try {
        const prompt = await PromptLoader.loadPrompt("ux-designer");
        this.safeLog("Prompt loaded", { promptLength: prompt.length });
        const contextWithBrief = prompt.replace("[UX_DESIGN_BRIEF_PLACEHOLDER]", input.content);
        let content;
        let aiUsed = false;
        if (this.geminiClient) {
          try {
            this.safeLog("Attempting AI generation with GeminiClient and context", {
              contextLength: contextWithBrief.length,
              previousStage: input.metadata.stage
            });
            (_a = this.debugLogger) == null ? void 0 : _a.logContextSentToAI("UX Designer", contextWithBrief);
            const aiResponse = await this.geminiClient.chat({
              messages: [
                { role: "user", content: contextWithBrief }
              ],
              temperature: 0.7,
              maxTokens: 2500
            });
            if (aiResponse.success && aiResponse.content) {
              content = `UX Designer Analysis (Stage 3/5):

${aiResponse.content}`;
              aiUsed = true;
              (_b = this.debugLogger) == null ? void 0 : _b.logAIResponse("UX Designer", aiResponse.content, true, aiResponse.usage);
              this.safeLog("AI generation successful", {
                contentLength: content.length,
                usage: aiResponse.usage,
                contextUsed: true
              });
            } else {
              (_c = this.debugLogger) == null ? void 0 : _c.logAIResponse("UX Designer", aiResponse.error || "Unknown error", false);
              throw new Error(aiResponse.error || "AI generation failed");
            }
          } catch (aiError) {
            this.safeLog("AI generation failed, falling back to placeholder", aiError);
            content = this.generateFallbackContent(prompt, input, contextWithBrief);
            (_d = this.debugLogger) == null ? void 0 : _d.logFallback("UX Designer", String(aiError), content);
          }
        } else {
          this.safeLog("No GeminiClient provided, using placeholder");
          content = this.generateFallbackContent(prompt, input, contextWithBrief);
          (_e = this.debugLogger) == null ? void 0 : _e.logFallback("UX Designer", "No GeminiClient provided", content);
        }
        const result = {
          content,
          metadata: {
            stage: "uxDesigner",
            timestamp: Date.now(),
            promptUsed: prompt.length > 100,
            inputStage: input.metadata.stage,
            promptLength: prompt.length,
            aiUsed,
            contextLength: contextWithBrief.length
          }
        };
        this.safeLog("UXDesigner completed", {
          contentLength: result.content.length,
          promptUsed: result.metadata.promptUsed,
          aiUsed: result.metadata.aiUsed,
          contextLength: result.metadata.contextLength
        });
        return result;
      } catch (error) {
        this.safeLog("UXDesigner failed", error);
        throw error;
      }
    }
    generateFallbackContent(prompt, input, context) {
      return `UX Designer Analysis (Stage 3/5):

Loaded prompt: ${prompt.substring(0, 200)}...

Previous stage input (${input.metadata.stage}): 
${input.content.substring(0, 300)}...

[AI integration would process the design context here with your UX prompt]

Status: Stage 3 ready with real prompt. ${this.geminiClient ? "AI generation failed, using fallback." : "No AI client provided."}

Context Length: ${context.length} characters
Prompt Length: ${prompt.length} characters
Previous Stage AI Used: ${input.metadata.aiUsed || false}`;
    }
  };

  // src/pipeline/roles/UIDesignerRole.ts
  var UIDesignerRole = class extends BaseRole {
    constructor(geminiClient, debugLogger) {
      super();
      this.geminiClient = geminiClient;
      this.debugLogger = debugLogger;
    }
    async execute(input) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
      const previousStage = input.uxOutput || input.previousStage || input;
      const designSystemScan = input.designSystem || input.designSystemScan || null;
      console.log("\u{1F3A8} UIDesigner EXECUTE - DETAILED INPUT ANALYSIS:");
      console.log("   \u{1F4E5} Raw input structure:", {
        hasUxOutput: !!input.uxOutput,
        hasPreviousStage: !!input.previousStage,
        hasDesignSystem: !!input.designSystem,
        hasDesignSystemScan: !!input.designSystemScan,
        inputKeys: Object.keys(input),
        inputType: typeof input
      });
      console.log("   \u{1F4CB} Previous stage details:", {
        stage: (_a = previousStage == null ? void 0 : previousStage.metadata) == null ? void 0 : _a.stage,
        contentLength: (_b = previousStage == null ? void 0 : previousStage.content) == null ? void 0 : _b.length,
        aiUsed: (_c = previousStage == null ? void 0 : previousStage.metadata) == null ? void 0 : _c.aiUsed,
        timestamp: (_d = previousStage == null ? void 0 : previousStage.metadata) == null ? void 0 : _d.timestamp
      });
      console.log("   \u{1F3A8} Design System details:", {
        designSystemExists: !!designSystemScan,
        designSystemType: typeof designSystemScan,
        totalCount: designSystemScan == null ? void 0 : designSystemScan.totalCount,
        componentsArray: (designSystemScan == null ? void 0 : designSystemScan.components) ? "exists" : "missing",
        componentsCount: ((_e = designSystemScan == null ? void 0 : designSystemScan.components) == null ? void 0 : _e.length) || 0,
        scanTime: designSystemScan == null ? void 0 : designSystemScan.scanTime,
        firstComponent: ((_f = designSystemScan == null ? void 0 : designSystemScan.components) == null ? void 0 : _f[0]) ? {
          id: designSystemScan.components[0].id,
          name: designSystemScan.components[0].name,
          suggestedType: designSystemScan.components[0].suggestedType
        } : "no-components"
      });
      this.safeLog("UIDesigner execute started", {
        inputStage: previousStage.metadata.stage,
        hasDesignSystem: !!designSystemScan
      });
      try {
        const prompt = await PromptLoader.loadPrompt("ui-designer");
        this.safeLog("Prompt loaded", { promptLength: prompt.length });
        const componentsAvailable = ((_g = designSystemScan == null ? void 0 : designSystemScan.components) == null ? void 0 : _g.length) || 0;
        const designSystemInfo = this.analyzeDesignSystem(designSystemScan);
        const uxContext = `Previous Stage Output (${previousStage.metadata.stage}):
${previousStage.content}`;
        const designSystemContext = this.formatDesignSystemContext(designSystemScan);
        const fullContext = `${uxContext}

=== DESIGN SYSTEM CONTEXT ===
${designSystemContext}`;
        const userMessage = `Information Architecture Specification:
${previousStage.content}

Design System Inventory:
${designSystemContext}`;
        const contextWithSpecifications = `${prompt}

${userMessage}`;
        let content;
        let aiUsed = false;
        if (this.geminiClient) {
          try {
            this.safeLog("Attempting AI generation with GeminiClient and dual context", {
              promptLength: prompt.length,
              userMessageLength: userMessage.length,
              totalContextLength: contextWithSpecifications.length,
              previousStage: previousStage.metadata.stage,
              hasDesignSystem: !!designSystemScan,
              componentsAvailable
            });
            (_h = this.debugLogger) == null ? void 0 : _h.logContextSentToAI("UI Designer", contextWithSpecifications);
            console.log("\u{1F916} AI CHAT REQUEST - DETAILED ANALYSIS:");
            console.log("   \u{1F4E4} System prompt length:", prompt.length);
            console.log("   \u{1F4E4} User message length:", userMessage.length);
            console.log("   \u{1F4E4} Total context length:", contextWithSpecifications.length);
            console.log("   \u{1F4E4} IA content length:", previousStage.content.length);
            console.log("   \u{1F4E4} Design system context length:", designSystemContext.length);
            console.log("   \u{1F4E4} Design system context preview:", designSystemContext.substring(0, 300) + "...");
            console.log("   \u2699\uFE0F AI settings:", {
              temperature: 0.6,
              maxTokens: 3e3,
              model: "gemini-client"
            });
            const aiResponse = await this.geminiClient.chat({
              messages: [
                { role: "system", content: prompt },
                { role: "user", content: userMessage }
              ],
              temperature: 0.6,
              // Slightly lower for more consistent component selection
              maxTokens: 3e3
              // Higher token limit for detailed UI specifications
            });
            console.log("\u{1F916} AI CHAT RESPONSE - DETAILED ANALYSIS:");
            console.log("   \u{1F4E5} Response success:", aiResponse.success);
            console.log("   \u{1F4E5} Response content length:", ((_i = aiResponse.content) == null ? void 0 : _i.length) || 0);
            console.log("   \u{1F4E5} Response content preview:", ((_j = aiResponse.content) == null ? void 0 : _j.substring(0, 200)) + "...");
            console.log("   \u{1F4CA} Token usage:", aiResponse.usage);
            console.log("   \u{1F504} Retry count:", aiResponse.retryCount || 0);
            console.log("   \u26A0\uFE0F Response error:", aiResponse.error || "none");
            console.log("   \u{1F3C1} Finish reason:", aiResponse.finishReason || "none");
            if (aiResponse.success && aiResponse.content) {
              content = `UI Designer Analysis (Stage 4/5):

${aiResponse.content}`;
              aiUsed = true;
              (_k = this.debugLogger) == null ? void 0 : _k.logAIResponse("UI Designer", aiResponse.content, true, aiResponse.usage);
              this.safeLog("AI generation successful", {
                contentLength: content.length,
                usage: aiResponse.usage,
                contextUsed: true,
                designSystemUsed: !!designSystemScan
              });
            } else {
              (_l = this.debugLogger) == null ? void 0 : _l.logAIResponse("UI Designer", aiResponse.error || "Unknown error", false);
              throw new Error(aiResponse.error || "AI generation failed");
            }
          } catch (aiError) {
            this.safeLog("AI generation failed, falling back to placeholder", aiError);
            content = this.generateFallbackContent(prompt, previousStage, designSystemInfo, contextWithSpecifications);
            (_m = this.debugLogger) == null ? void 0 : _m.logFallback("UI Designer", String(aiError), content);
          }
        } else {
          this.safeLog("No GeminiClient provided, using placeholder");
          content = this.generateFallbackContent(prompt, previousStage, designSystemInfo, contextWithSpecifications);
          (_n = this.debugLogger) == null ? void 0 : _n.logFallback("UI Designer", "No GeminiClient provided", content);
        }
        const result = {
          content,
          metadata: {
            stage: "uiDesigner",
            timestamp: Date.now(),
            promptUsed: prompt.length > 100,
            inputStage: previousStage.metadata.stage,
            promptLength: prompt.length,
            designSystemUsed: !!designSystemScan,
            componentsAvailable,
            aiUsed,
            contextLength: contextWithSpecifications.length,
            designSystemContextLength: designSystemContext.length
          }
        };
        this.safeLog("UIDesigner completed", {
          contentLength: result.content.length,
          promptUsed: result.metadata.promptUsed,
          aiUsed: result.metadata.aiUsed,
          contextLength: result.metadata.contextLength,
          designSystemUsed: result.metadata.designSystemUsed,
          componentsAvailable: result.metadata.componentsAvailable
        });
        return result;
      } catch (error) {
        this.safeLog("UIDesigner failed", error);
        throw error;
      }
    }
    formatDesignSystemContext(designSystem) {
      var _a;
      console.log("\u{1F527} formatDesignSystemContext - INPUT ANALYSIS:");
      console.log("   \u{1F4CA} Design system input:", {
        exists: !!designSystem,
        type: typeof designSystem,
        totalCount: designSystem == null ? void 0 : designSystem.totalCount,
        hasComponents: !!(designSystem == null ? void 0 : designSystem.components),
        componentsIsArray: Array.isArray(designSystem == null ? void 0 : designSystem.components),
        componentsLength: (_a = designSystem == null ? void 0 : designSystem.components) == null ? void 0 : _a.length,
        keys: designSystem ? Object.keys(designSystem) : "null"
      });
      if (!designSystem || designSystem.totalCount === 0) {
        const result2 = "No design system components available. Recommend using standard UI patterns.";
        console.log("\u{1F6AB} formatDesignSystemContext - RESULT: No design system");
        return result2;
      }
      if (!designSystem.components || !Array.isArray(designSystem.components)) {
        const result2 = `Design system scan incomplete. Total components: ${designSystem.totalCount}, but component details unavailable.`;
        console.log("\u26A0\uFE0F formatDesignSystemContext - RESULT: Incomplete data");
        return result2;
      }
      const componentTypes = this.categorizeComponents(designSystem.components);
      const componentList = designSystem.components.map((comp, index) => {
        var _a2, _b, _c, _d;
        let description = `${index + 1}. ${comp.name || "Unnamed"} (${comp.suggestedType || "unknown"}) [ID: "${comp.id}"]`;
        if (comp.confidence) {
          description += ` [confidence: ${Math.round(comp.confidence * 100)}%]`;
        }
        if (comp.variantDetails && Object.keys(comp.variantDetails).length > 0) {
          const variants = Object.entries(comp.variantDetails).map(([prop, values]) => `${prop}: ${Array.isArray(values) ? values.join("|") : values}`).join(", ");
          description += ` - Variants: ${variants}`;
        }
        const intelligence = [];
        if (((_a2 = comp.textHierarchy) == null ? void 0 : _a2.length) > 0) {
          const textLevels = [...new Set(comp.textHierarchy.map((t) => t.classification))];
          intelligence.push(`Text: ${textLevels.join("/")}`);
        }
        if (((_b = comp.componentInstances) == null ? void 0 : _b.length) > 0) {
          intelligence.push(`Has ${comp.componentInstances.length} nested components`);
        }
        if (((_c = comp.vectorNodes) == null ? void 0 : _c.length) > 0) {
          intelligence.push(`Contains ${comp.vectorNodes.length} icons/vectors`);
        }
        if (((_d = comp.imageNodes) == null ? void 0 : _d.length) > 0) {
          intelligence.push(`Has ${comp.imageNodes.length} image placeholders`);
        }
        if (comp.isFromLibrary) {
          intelligence.push(`Library component`);
        }
        if (intelligence.length > 0) {
          description += ` [${intelligence.join(", ")}]`;
        }
        return description;
      }).slice(0, 20);
      const libraryComponents = designSystem.components.filter((c) => c.isFromLibrary).length;
      const componentsWithVariants = designSystem.components.filter((c) => c.variantDetails && Object.keys(c.variantDetails).length > 0).length;
      const componentsWithIcons = designSystem.components.filter((c) => {
        var _a2;
        return ((_a2 = c.vectorNodes) == null ? void 0 : _a2.length) > 0;
      }).length;
      const componentsWithImages = designSystem.components.filter((c) => {
        var _a2;
        return ((_a2 = c.imageNodes) == null ? void 0 : _a2.length) > 0;
      }).length;
      const result = `Available Design System Components:
- Total: ${designSystem.totalCount}
- Types: ${Object.keys(componentTypes).join(", ")}
- Component breakdown: ${JSON.stringify(componentTypes)}
- Library components: ${libraryComponents}/${designSystem.totalCount}
- Components with variants: ${componentsWithVariants}/${designSystem.totalCount}
- Components with icons: ${componentsWithIcons}/${designSystem.totalCount}
- Components with image support: ${componentsWithImages}/${designSystem.totalCount}

Specific Components (first 20 with enhanced intelligence):
${componentList.join("\n")}

Enhanced Component Intelligence Available:
- Confidence scores for type detection (70+ pattern matching)
- Variant property analysis with complete value mapping
- Text hierarchy classification (primary/secondary/tertiary)
- Nested component detection (icons, sub-components)
- Visual element analysis (vectors, images, text layers)
- Library vs local component identification

CRITICAL: ALWAYS use EXACT componentId values from the [ID: "..."] field above.
Example: Use "componentId": "10:3907" NOT "componentId": "button"

Please recommend specific components from this list for the UI design, using EXACT component IDs, variants, confidence scores, and enhanced capabilities.`;
      console.log("\u2705 formatDesignSystemContext - FINAL RESULT:");
      console.log("   \u{1F4CB} Component types found:", Object.keys(componentTypes));
      console.log("   \u{1F4CA} Components breakdown:", componentTypes);
      console.log("   \u{1F4DD} Context length:", result.length);
      console.log("   \u{1F3AF} First 3 components formatted:");
      componentList.slice(0, 3).forEach((comp, idx) => {
        console.log(`      ${idx + 1}. ${comp}`);
      });
      return result;
    }
    generateFallbackContent(prompt, previousStage, designSystemInfo, fullContext) {
      return `UI Designer Analysis (Stage 4/5):

Loaded prompt: ${prompt.substring(0, 200)}...

Previous stage input (${previousStage.metadata.stage}): 
${previousStage.content.substring(0, 300)}...

${designSystemInfo}

[AI integration would process the UX context and design system data here with your UI prompt]

Status: Stage 4 ready with real prompt + design system context. ${this.geminiClient ? "AI generation failed, using fallback." : "No AI client provided."}

Context Length: ${fullContext.length} characters
Prompt Length: ${prompt.length} characters
Previous Stage AI Used: ${previousStage.metadata.aiUsed || false}
Design System Available: ${!!previousStage}`;
    }
    analyzeDesignSystem(designSystem) {
      var _a;
      this.safeLog("Analyzing design system", {
        hasDesignSystem: !!designSystem,
        totalCount: designSystem == null ? void 0 : designSystem.totalCount,
        hasComponents: !!(designSystem == null ? void 0 : designSystem.components),
        componentsLength: (_a = designSystem == null ? void 0 : designSystem.components) == null ? void 0 : _a.length,
        componentsType: typeof (designSystem == null ? void 0 : designSystem.components)
      });
      if (!designSystem || designSystem.totalCount === 0) {
        return `\u274C No design system data available
- Components scanned: 0
- Recommendation: Scan design system first for better component selection`;
      }
      if (!designSystem.components || !Array.isArray(designSystem.components)) {
        return `\u26A0\uFE0F Design system data incomplete
- Total count: ${designSystem.totalCount}
- Components array: missing or invalid
- Components type: ${typeof designSystem.components}`;
      }
      const componentTypes = this.categorizeComponents(designSystem.components);
      return `\u2705 Design system loaded successfully
- Total components: ${designSystem.totalCount}
- Component types available: ${Object.keys(componentTypes).join(", ") || "None categorized"}
- Components breakdown: ${JSON.stringify(componentTypes)}
- Scan time: ${designSystem.scanTime ? new Date(designSystem.scanTime).toLocaleString() : "Unknown"}
- Ready for intelligent component selection`;
    }
    categorizeComponents(components) {
      const categories = {};
      components.forEach((component) => {
        const type = component.suggestedType || "unknown";
        categories[type] = (categories[type] || 0) + 1;
      });
      return categories;
    }
  };

  // src/pipeline/roles/JSONEngineerRole.ts
  var JSONEngineerRole = class extends BaseRole {
    constructor(geminiClient, debugLogger) {
      super();
      this.geminiClient = geminiClient;
      this.debugLogger = debugLogger;
    }
    async execute(input) {
      var _a, _b, _c, _d, _e;
      this.safeLog("JSONEngineer execute started", { inputStage: input.metadata.stage });
      try {
        const prompt = await PromptLoader.loadPrompt("json-engineer");
        this.safeLog("Prompt loaded", { promptLength: prompt.length });
        const context = `Previous Stage Output (${input.metadata.stage}):
${input.content}`;
        let content;
        let generatedJSON = null;
        let aiUsed = false;
        let jsonGenerated = false;
        let jsonValid = false;
        let jsonParseError;
        const contextWithSpecs = `${prompt}

UI Designer Specifications:
${input.content}`;
        if (this.geminiClient) {
          try {
            this.safeLog("Attempting AI JSON generation with GeminiClient", {
              contextLength: contextWithSpecs.length,
              previousStage: input.metadata.stage
            });
            (_a = this.debugLogger) == null ? void 0 : _a.logContextSentToAI("JSON Engineer", contextWithSpecs);
            const aiResponse = await this.geminiClient.generateJSON(
              contextWithSpecs
            );
            if (aiResponse.success && aiResponse.content) {
              const parseResult = this.parseAndValidateJSON(aiResponse.content);
              if (parseResult.success) {
                generatedJSON = parseResult.json;
                jsonGenerated = true;
                jsonValid = true;
                content = `JSON Engineer Analysis (Stage 5/5):

Successfully generated JSON configuration:

\`\`\`json
${JSON.stringify(generatedJSON, null, 2)}
\`\`\``;
              } else {
                jsonParseError = parseResult.error;
                content = `JSON Engineer Analysis (Stage 5/5):

AI generated response but JSON parsing failed:

Error: ${parseResult.error}

Raw AI Response:
${aiResponse.content}`;
              }
              aiUsed = true;
              (_b = this.debugLogger) == null ? void 0 : _b.logAIResponse("JSON Engineer", aiResponse.content, true, aiResponse.usage);
              this.safeLog("AI JSON generation completed", {
                contentLength: content.length,
                usage: aiResponse.usage,
                jsonGenerated,
                jsonValid,
                jsonParseError
              });
            } else {
              (_c = this.debugLogger) == null ? void 0 : _c.logAIResponse("JSON Engineer", aiResponse.error || "Unknown error", false);
              throw new Error(aiResponse.error || "AI JSON generation failed");
            }
          } catch (aiError) {
            this.safeLog("AI JSON generation failed, falling back to placeholder", aiError);
            content = this.generateFallbackContent(prompt, input, contextWithSpecs);
            (_d = this.debugLogger) == null ? void 0 : _d.logFallback("JSON Engineer", String(aiError), content);
          }
        } else {
          this.safeLog("No GeminiClient provided, using placeholder");
          content = this.generateFallbackContent(prompt, input, contextWithSpecs);
          (_e = this.debugLogger) == null ? void 0 : _e.logFallback("JSON Engineer", "No GeminiClient provided", content);
        }
        const result = {
          content,
          generatedJSON,
          metadata: {
            stage: "jsonEngineer",
            timestamp: Date.now(),
            promptUsed: prompt.length > 100,
            inputStage: input.metadata.stage,
            promptLength: prompt.length,
            aiUsed,
            contextLength: contextWithSpecs.length,
            jsonGenerated,
            jsonValid,
            jsonParseError
          }
        };
        this.safeLog("JSONEngineer completed", {
          contentLength: result.content.length,
          promptUsed: result.metadata.promptUsed,
          aiUsed: result.metadata.aiUsed,
          contextLength: result.metadata.contextLength,
          jsonGenerated: result.metadata.jsonGenerated,
          jsonValid: result.metadata.jsonValid,
          hasGeneratedJSON: !!result.generatedJSON
        });
        return result;
      } catch (error) {
        this.safeLog("JSONEngineer failed", error);
        throw error;
      }
    }
    parseAndValidateJSON(jsonString) {
      try {
        let cleanedJSON = jsonString.trim();
        if (cleanedJSON.startsWith("```json")) {
          cleanedJSON = cleanedJSON.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        } else if (cleanedJSON.startsWith("```")) {
          cleanedJSON = cleanedJSON.replace(/^```\n?/, "").replace(/\n?```$/, "");
        }
        const jsonMatch = cleanedJSON.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedJSON = jsonMatch[0];
        }
        const parsedJSON = JSON.parse(cleanedJSON);
        if (typeof parsedJSON !== "object" || parsedJSON === null) {
          return {
            success: false,
            error: "Generated JSON is not a valid object"
          };
        }
        return {
          success: true,
          json: parsedJSON
        };
      } catch (parseError) {
        return {
          success: false,
          error: parseError instanceof Error ? parseError.message : "Unknown JSON parsing error"
        };
      }
    }
    generateFallbackContent(prompt, input, context) {
      return `JSON Engineer Analysis (Stage 5/5):

Loaded prompt: ${prompt.substring(0, 200)}...

Previous stage input (${input.metadata.stage}): 
${input.content.substring(0, 300)}...

[AI integration would generate JSON configuration here based on UI specifications]

Status: Stage 5 ready with real prompt - FINAL STAGE! ${this.geminiClient ? "AI generation failed, using fallback." : "No AI client provided."}

Context Length: ${context.length} characters
Prompt Length: ${prompt.length} characters
Previous Stage AI Used: ${input.metadata.aiUsed || false}
Previous Stage Design System Used: ${input.metadata.designSystemUsed || false}`;
    }
    /**
     * Get the generated JSON object if available
     */
    getGeneratedJSON() {
      return null;
    }
  };

  // src/pipeline/orchestrator/PipelineOrchestrator.ts
  var PipelineOrchestrator = class {
    constructor(geminiClient) {
      this.startTime = 0;
      this.logger = new PipelineLogger();
      this.debugLogger = new PipelineDebugLogger();
      this.geminiClient = geminiClient;
      if (geminiClient) {
        console.log("\u{1F916} PipelineOrchestrator initialized with AI client");
      } else {
        console.log("\u{1F4CB} PipelineOrchestrator initialized without AI client (placeholder mode)");
      }
    }
    async processRequest(input) {
      this.startTime = Date.now();
      this.logger.logStageInput(0, "pipeline-start", input);
      this.debugLogger.logUserInput(input);
      const stageResults = {};
      const promptsUsed = {};
      const promptLengths = {};
      try {
        console.log("\u{1F680} Starting FULL 5-stage pipeline with real prompts...");
        const designSystemData = await this.getDesignSystemData();
        console.log("\u{1F3A8} Design system data:", {
          hasData: !!designSystemData,
          componentCount: (designSystemData == null ? void 0 : designSystemData.totalCount) || 0
        });
        if (designSystemData == null ? void 0 : designSystemData.components) {
          const componentTypes = [...new Set(designSystemData.components.map((c) => c.suggestedType))];
          const firstComponents = designSystemData.components.slice(0, 5).map((c) => `${c.name}(${c.suggestedType})`);
          this.debugLogger.logDesignSystemData(designSystemData.totalCount, componentTypes, firstComponents);
        }
        console.log("\u{1F4CB} Stage 1/5: Product Manager");
        this.debugLogger.logStageStart(1, "Product Manager");
        console.log("\u{1F4E4} STAGE 1 INPUT:", {
          type: "string",
          length: input.length,
          preview: input.substring(0, 200) + (input.length > 200 ? "..." : "")
        });
        const stage1 = new ProductManagerRole(this.geminiClient, this.debugLogger);
        const result1 = await stage1.execute(input);
        console.log("\u{1F4E5} STAGE 1 OUTPUT:", {
          contentLength: result1.content.length,
          aiUsed: result1.metadata.aiUsed,
          contentPreview: result1.content.substring(0, 300) + (result1.content.length > 300 ? "..." : "")
        });
        this.debugLogger.logStageComplete(1, "Product Manager", result1.metadata.aiUsed || false, result1.content.length);
        this.logger.logStageOutput(1, "productManager", result1);
        stageResults.productManager = result1;
        promptsUsed.productManager = result1.metadata.promptUsed;
        promptLengths.productManager = result1.metadata.promptLength || 0;
        console.log("\u{1F3A8} Stage 2/5: Product Designer");
        this.debugLogger.logStageStart(2, "Product Designer");
        console.log("\u{1F4E4} STAGE 2 INPUT:", {
          fromStage: result1.metadata.stage,
          contentLength: result1.content.length,
          aiUsed: result1.metadata.aiUsed,
          contentPreview: result1.content.substring(0, 300) + (result1.content.length > 300 ? "..." : "")
        });
        const stage2 = new ProductDesignerRole(this.geminiClient, this.debugLogger);
        const result2 = await stage2.execute(result1);
        console.log("\u{1F4E5} STAGE 2 OUTPUT:", {
          contentLength: result2.content.length,
          aiUsed: result2.metadata.aiUsed,
          contentPreview: result2.content.substring(0, 300) + (result2.content.length > 300 ? "..." : "")
        });
        this.debugLogger.logStageComplete(2, "Product Designer", result2.metadata.aiUsed || false, result2.content.length);
        this.logger.logStageOutput(2, "productDesigner", result2);
        stageResults.productDesigner = result2;
        promptsUsed.productDesigner = result2.metadata.promptUsed;
        promptLengths.productDesigner = result2.metadata.promptLength || 0;
        console.log("\u{1F9ED} Stage 3/5: UX Designer");
        this.debugLogger.logStageStart(3, "UX Designer");
        console.log("\u{1F4E4} STAGE 3 INPUT:", {
          fromStage: result2.metadata.stage,
          contentLength: result2.content.length,
          aiUsed: result2.metadata.aiUsed,
          contentPreview: result2.content.substring(0, 300) + (result2.content.length > 300 ? "..." : "")
        });
        const stage3 = new UXDesignerRole(this.geminiClient, this.debugLogger);
        const result3 = await stage3.execute(result2);
        console.log("\u{1F4E5} STAGE 3 OUTPUT:", {
          contentLength: result3.content.length,
          aiUsed: result3.metadata.aiUsed,
          contentPreview: result3.content.substring(0, 300) + (result3.content.length > 300 ? "..." : "")
        });
        this.debugLogger.logStageComplete(3, "UX Designer", result3.metadata.aiUsed || false, result3.content.length);
        this.logger.logStageOutput(3, "uxDesigner", result3);
        stageResults.uxDesigner = result3;
        promptsUsed.uxDesigner = result3.metadata.promptUsed;
        promptLengths.uxDesigner = result3.metadata.promptLength || 0;
        console.log("\u{1F4AB} Stage 4/5: UI Designer (with design system)");
        this.debugLogger.logStageStart(4, "UI Designer");
        console.log("\u{1F4E4} STAGE 4 INPUT STRUCTURE:", {
          uxOutput: {
            fromStage: result3.metadata.stage,
            contentLength: result3.content.length,
            aiUsed: result3.metadata.aiUsed,
            contentPreview: result3.content.substring(0, 200) + (result3.content.length > 200 ? "..." : "")
          },
          designSystem: {
            hasData: !!designSystemData,
            totalComponents: (designSystemData == null ? void 0 : designSystemData.totalCount) || 0,
            componentTypes: (designSystemData == null ? void 0 : designSystemData.components) ? [...new Set(designSystemData.components.map((c) => c.suggestedType))].slice(0, 5) : [],
            firstComponents: (designSystemData == null ? void 0 : designSystemData.components) ? designSystemData.components.slice(0, 3).map((c) => `${c.name}(${c.suggestedType})`) : []
          }
        });
        const stage4 = new UIDesignerRole(this.geminiClient, this.debugLogger);
        const uiDesignerInput = {
          uxOutput: result3,
          designSystem: designSystemData
        };
        const result4 = await stage4.execute(uiDesignerInput);
        console.log("\u{1F4E5} STAGE 4 OUTPUT:", {
          contentLength: result4.content.length,
          aiUsed: result4.metadata.aiUsed,
          designSystemUsed: result4.metadata.designSystemUsed,
          contentPreview: result4.content.substring(0, 300) + (result4.content.length > 300 ? "..." : "")
        });
        this.debugLogger.logStageComplete(4, "UI Designer", result4.metadata.aiUsed || false, result4.content.length);
        this.logger.logStageOutput(4, "uiDesigner", result4);
        stageResults.uiDesigner = result4;
        promptsUsed.uiDesigner = result4.metadata.promptUsed;
        promptLengths.uiDesigner = result4.metadata.promptLength || 0;
        console.log("\u2699\uFE0F Stage 5/5: JSON Engineer");
        this.debugLogger.logStageStart(5, "JSON Engineer");
        console.log("\u{1F4E4} STAGE 5 INPUT:", {
          fromStage: result4.metadata.stage,
          contentLength: result4.content.length,
          aiUsed: result4.metadata.aiUsed,
          designSystemUsed: result4.metadata.designSystemUsed,
          contentPreview: result4.content.substring(0, 300) + (result4.content.length > 300 ? "..." : "")
        });
        const stage5 = new JSONEngineerRole(this.geminiClient, this.debugLogger);
        const result5 = await stage5.execute(result4);
        console.log("\u{1F4E5} STAGE 5 OUTPUT:", {
          contentLength: result5.content.length,
          aiUsed: result5.metadata.aiUsed,
          jsonGenerated: result5.metadata.jsonGenerated,
          jsonValid: result5.metadata.jsonValid,
          contentPreview: result5.content.substring(0, 300) + (result5.content.length > 300 ? "..." : "")
        });
        this.debugLogger.logStageComplete(5, "JSON Engineer", result5.metadata.aiUsed || false, result5.content.length);
        this.logger.logStageOutput(5, "jsonEngineer", result5);
        stageResults.jsonEngineer = result5;
        promptsUsed.jsonEngineer = result5.metadata.promptUsed;
        promptLengths.jsonEngineer = result5.metadata.promptLength || 0;
        console.log("\u2705 FULL PIPELINE COMPLETED!");
        const aiUsageStats = this.calculateAIUsageStats(stageResults);
        const totalTime = Date.now() - this.startTime;
        this.debugLogger.logPipelineComplete(totalTime, aiUsageStats.totalStagesWithAI, 5);
        const finalResult = {
          success: true,
          stages: ["productManager", "productDesigner", "uxDesigner", "uiDesigner", "jsonEngineer"],
          finalResult: result5,
          runId: this.logger["runId"] || "unknown",
          executionTime: Date.now() - this.startTime,
          promptsUsed,
          promptLengths,
          stageResults,
          designSystemUsed: result4.metadata.designSystemUsed,
          componentsAvailable: result4.metadata.componentsAvailable,
          aiUsageStats
        };
        this.logger.logStageOutput(0, "pipeline-complete", finalResult);
        return finalResult;
      } catch (error) {
        console.error("\u274C Pipeline failed:", error);
        this.logger.logError("pipeline", error instanceof Error ? error : new Error(String(error)));
        return {
          success: false,
          stages: Object.keys(stageResults),
          finalResult: null,
          runId: this.logger["runId"] || "unknown",
          executionTime: Date.now() - this.startTime,
          promptsUsed,
          promptLengths,
          stageResults,
          designSystemUsed: false,
          componentsAvailable: 0,
          aiUsageStats: {
            totalStagesWithAI: 0,
            stageAIUsage: {},
            hasGeminiClient: !!this.geminiClient
          }
        };
      }
    }
    calculateAIUsageStats(stageResults) {
      var _a, _b;
      const stageAIUsage = {};
      let totalStagesWithAI = 0;
      let totalTokensUsed = 0;
      for (const [stageName, result] of Object.entries(stageResults)) {
        const aiUsed = ((_a = result == null ? void 0 : result.metadata) == null ? void 0 : _a.aiUsed) || false;
        stageAIUsage[stageName] = aiUsed;
        if (aiUsed) {
          totalStagesWithAI++;
          const usage = (_b = result == null ? void 0 : result.metadata) == null ? void 0 : _b.usage;
          if (usage == null ? void 0 : usage.totalTokens) {
            totalTokensUsed += usage.totalTokens;
          }
        }
      }
      console.log(`\u{1F916} AI Usage Summary: ${totalStagesWithAI}/5 stages used AI`);
      return {
        totalStagesWithAI,
        stageAIUsage,
        hasGeminiClient: !!this.geminiClient,
        totalTokensUsed: totalTokensUsed > 0 ? totalTokensUsed : void 0
      };
    }
    async getDesignSystemData() {
      var _a, _b;
      try {
        console.log("\u{1F50D} CHECKING STORAGE for design system data...");
        console.log("\u{1F4CD} Current file info:", {
          figmaFileKey: figma.fileKey,
          figmaRootId: figma.root.id,
          figmaRootName: figma.root.name
        });
        if (typeof figma !== "undefined" && figma.clientStorage) {
          const allKeys = ["design-system-scan", "last-scan-results"];
          for (const key of allKeys) {
            const data = await figma.clientStorage.getAsync(key);
            console.log(`\u{1F4E6} Storage key "${key}":`, {
              exists: !!data,
              type: typeof data,
              hasComponents: ((_a = data == null ? void 0 : data.components) == null ? void 0 : _a.length) || 0,
              fileKey: (data == null ? void 0 : data.fileKey) || "no-fileKey",
              scanTime: (data == null ? void 0 : data.scanTime) || "no-scanTime",
              dataStructure: data ? Object.keys(data) : "null"
            });
            if (((_b = data == null ? void 0 : data.components) == null ? void 0 : _b.length) > 0) {
              console.log(
                `\u{1F4CB} First 3 components in "${key}":`,
                data.components.slice(0, 3).map((c) => ({
                  id: c.id,
                  name: c.name,
                  suggestedType: c.suggestedType,
                  hasVariants: !!c.variantDetails
                }))
              );
            }
          }
          const scanSession = await figma.clientStorage.getAsync("design-system-scan");
          if (scanSession && scanSession.components) {
            console.log("\u2705 Found ScanSession data - DETAILED CHECK:");
            console.log("   \u{1F4CA} Session details:", {
              componentsCount: scanSession.components.length,
              scanTime: new Date(scanSession.scanTime).toLocaleString(),
              fileKey: scanSession.fileKey,
              currentFileMatches: scanSession.fileKey === figma.root.id,
              version: scanSession.version
            });
            const result = {
              components: scanSession.components,
              scanTime: scanSession.scanTime,
              totalCount: scanSession.components.length
            };
            console.log("\u{1F680} RETURNING ScanSession data to pipeline:", {
              totalCount: result.totalCount,
              componentsPreview: result.components.slice(0, 2).map((c) => `${c.name}(${c.suggestedType})`)
            });
            return result;
          }
          const savedComponents = await figma.clientStorage.getAsync("last-scan-results");
          if (savedComponents && Array.isArray(savedComponents)) {
            console.log("\u2705 Found last-scan-results data - DETAILED CHECK:");
            console.log("   \u{1F4CA} Components details:", {
              componentsCount: savedComponents.length,
              firstComponent: savedComponents[0] ? {
                id: savedComponents[0].id,
                name: savedComponents[0].name,
                suggestedType: savedComponents[0].suggestedType
              } : "no-components"
            });
            const result = {
              components: savedComponents,
              scanTime: Date.now(),
              totalCount: savedComponents.length
            };
            console.log("\u{1F680} RETURNING last-scan-results data to pipeline:", {
              totalCount: result.totalCount,
              componentsPreview: result.components.slice(0, 2).map((c) => `${c.name}(${c.suggestedType})`)
            });
            return result;
          }
        }
        console.log("\u274C NO design system data found anywhere");
        console.log("\u{1F50D} Debug: figma available?", typeof figma !== "undefined");
        console.log("\u{1F50D} Debug: clientStorage available?", typeof (figma == null ? void 0 : figma.clientStorage) !== "undefined");
        return null;
      } catch (error) {
        console.error("\u{1F4A5} Storage error in getDesignSystemData:", error);
        return null;
      }
    }
  };

  // code.ts
  var validationEngine;
  async function initializeAIPipeline() {
    try {
      console.log("\u{1F527} initializeAIPipeline: Starting initialization...");
      const apiKey = await figma.clientStorage.getAsync("geminiApiKey");
      console.log("\u{1F527} initializeAIPipeline: API key check:", {
        hasApiKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        keyPreview: apiKey ? "****" + apiKey.slice(-4) : "none"
      });
      if (apiKey) {
        console.log("\u{1F916} Initializing AI-powered pipeline with GeminiClient");
        const geminiClient = new GeminiClient({ apiKey });
        console.log("\u{1F527} initializeAIPipeline: GeminiClient created:", {
          clientExists: !!geminiClient,
          clientType: typeof geminiClient,
          clientConfig: geminiClient ? "configured" : "failed"
        });
        const orchestrator = new PipelineOrchestrator(geminiClient);
        console.log("\u{1F527} initializeAIPipeline: PipelineOrchestrator created with client");
        return orchestrator;
      } else {
        console.log("\u{1F4CB} No API key found, initializing placeholder pipeline");
        return new PipelineOrchestrator();
      }
    } catch (error) {
      console.error("\u{1F4A5} Error in initializeAIPipeline:", error);
      console.warn("\u26A0\uFE0F Error initializing AI pipeline, using placeholder mode:", error);
      return new PipelineOrchestrator();
    }
  }
  async function navigateToComponent(componentId, pageName) {
    try {
      const node = await figma.getNodeByIdAsync(componentId);
      if (!node) {
        figma.notify("Component not found", { error: true });
        return;
      }
      if (pageName) {
        const targetPage = figma.root.children.find((p) => p.name === pageName);
        if (targetPage && targetPage.id !== figma.currentPage.id) {
          figma.currentPage = targetPage;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
      figma.notify(`Navigated to: ${node.name}`, { timeout: 2e3 });
    } catch (e) {
      figma.notify("Navigation error", { error: true });
      console.error("\u274C Navigation error:", e);
    }
  }
  async function generateUIFromAPI(prompt, systemPrompt, enableValidation = true) {
    try {
      const geminiAPI = await GeminiAPI.createFromStorage();
      if (!geminiAPI) {
        throw new Error("No API key found. Please configure your Gemini API key first.");
      }
      const request = {
        prompt,
        systemPrompt,
        temperature: 0.7
      };
      console.log("\u{1F916} Calling Gemini API for UI generation...");
      const response = await geminiAPI.generateJSON(request);
      if (!response.success) {
        throw new Error(response.error || "API call failed");
      }
      if (!response.content) {
        throw new Error("No content received from API");
      }
      let finalJSON = response.content;
      let validationResult;
      let retryCount = 0;
      if (enableValidation && validationEngine) {
        console.log("\u{1F50D} Validating generated JSON...");
        const validationData = await validationEngine.validateWithRetry(
          response.content,
          prompt,
          geminiAPI
        );
        validationResult = validationData.result;
        finalJSON = validationData.finalJSON;
        retryCount = validationData.retryCount;
        console.log(`\u{1F4CA} Validation complete: ${validationEngine.getValidationSummary(validationResult)}`);
        if (validationResult.isValid) {
          if (retryCount > 0) {
            figma.notify(`\u2705 Generated with ${retryCount} auto-fixes applied`, { timeout: 3e3 });
          }
        } else {
          const summary = validationEngine.getValidationSummary(validationResult);
          figma.notify(`\u26A0\uFE0F ${summary}`, { timeout: 4e3 });
        }
      }
      const layoutData = JSON.parse(finalJSON);
      return { layoutData, validationResult, finalJSON, retryCount };
    } catch (error) {
      console.error("\u274C API-driven generation failed:", error);
      throw error;
    }
  }
  async function initializeSession() {
    console.log("\u{1F504} Initializing session...");
    try {
      validationEngine = new ValidationEngine({
        enableAIValidation: true,
        enableStructuralValidation: true,
        enableComponentValidation: true,
        qualityThreshold: 0.7,
        maxRetries: 2,
        autoFixEnabled: true
      });
      console.log("\u2705 Validation engine initialized");
      const hasSession = await SessionService.hasCurrentSession();
      if (hasSession) {
        const currentSession = await SessionService.getCurrentSession();
        if (currentSession) {
          console.log("\u2705 Found active session for restoration");
          const sessionForUI = SessionService.formatSessionForUI(currentSession);
          figma.ui.postMessage({
            type: "session-found",
            session: sessionForUI,
            currentFileId: figma.fileKey || figma.root.id
          });
        }
      }
      const savedApiKey = await figma.clientStorage.getAsync("geminiApiKey");
      if (savedApiKey) {
        console.log("\u2705 API key found in storage");
        figma.ui.postMessage({
          type: "api-key-loaded",
          payload: savedApiKey
        });
      }
      const savedScan = await DesignSystemScannerService.getScanSession();
      const currentFileKey = figma.fileKey || figma.root.id;
      if (savedScan && savedScan.components && savedScan.components.length > 0) {
        if (savedScan.fileKey === currentFileKey) {
          console.log(`\u2705 Design system loaded: ${savedScan.components.length} components`);
          figma.ui.postMessage({
            type: "saved-scan-loaded",
            components: savedScan.components,
            scanTime: savedScan.scanTime
          });
        } else {
          console.log("\u2139\uFE0F Scan from different file, clearing cache");
          await DesignSystemScannerService.clearScanData();
        }
      } else {
        console.log("\u2139\uFE0F No saved design system found");
      }
    } catch (error) {
      console.error("\u274C Error loading session:", error);
    }
  }
  async function handleScanCommand() {
    try {
      figma.notify(" Scanning design system...", { timeout: 3e4 });
      const components = await ComponentScanner.scanDesignSystem();
      await ComponentScanner.saveLastScanResults(components);
      await ComponentPropertyEngine.initialize();
      figma.notify(`\u2705 Scanned ${components.length} components and initialized systematic engine!`);
      if (components.length > 0) {
        const sampleComponent = components.find((c) => c.suggestedType === "tab") || components[0];
        ComponentPropertyEngine.debugSchema(sampleComponent.id);
      }
    } catch (error) {
      console.error("Scan failed:", error);
      figma.notify("Scan failed. Check console for details.", { error: true });
    }
  }
  async function handleDebugCommand(componentId) {
    if (!componentId) {
      const schemas = ComponentPropertyEngine.getAllSchemas();
      console.log(` Total schemas loaded: ${schemas.length}`);
      schemas.forEach((schema) => {
        console.log(`- ${schema.name} (${schema.componentType}): ${schema.id}`);
      });
    } else {
      ComponentPropertyEngine.debugSchema(componentId);
      await ComponentPropertyEngine.createSchemaDebugFrame(componentId);
    }
  }
  async function handleMigrationTest() {
    const testJSON = {
      layoutContainer: { name: "Test", layoutMode: "VERTICAL" },
      items: [{
        type: "list-item",
        componentNodeId: "10:10214",
        properties: {
          text: "Item 1",
          Condition: "2-line",
          // Should be moved to variants
          Leading: "Icon",
          // Should be moved to variants
          horizontalSizing: "FILL"
          // Should stay in properties
        }
      }]
    };
    const preview = JSONMigrator.generateMigrationPreview(testJSON);
    console.log(preview);
  }
  async function initializePlugin() {
    try {
      await ComponentPropertyEngine.initialize();
      console.log("\u2705 Plugin initialized with systematic property validation");
    } catch (error) {
      console.warn("Could not initialize property engine:", error);
    }
  }
  async function main() {
    console.log("\u{1F680} AIDesigner plugin started");
    figma.showUI(__html__, { width: 400, height: 720 });
    await initializeSession();
    figma.on("run", async (event) => {
      const { command, parameters } = event;
      switch (command) {
        case "scan":
          await handleScanCommand();
          break;
        case "debug":
          await handleDebugCommand(parameters == null ? void 0 : parameters.componentId);
          break;
        case "test-migration":
          await handleMigrationTest();
          break;
      }
    });
    figma.ui.onmessage = async (msg) => {
      var _a, _b, _c;
      console.log("\u{1F4E8} Message from UI:", msg.type);
      switch (msg.type) {
        case "test-migration":
          handleMigrationTest();
          break;
        case "generate-ui-from-json":
          try {
            const layoutData = JSON.parse(msg.payload);
            const newFrame = await FigmaRenderer.generateUIFromDataDynamic(layoutData);
            if (newFrame) {
              figma.ui.postMessage({
                type: "ui-generated-success",
                frameId: newFrame.id,
                generatedJSON: layoutData
              });
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.notify("JSON parsing error: " + errorMessage, { error: true });
            figma.ui.postMessage({ type: "ui-generation-error", error: errorMessage });
          }
          break;
        // ... (rest of the file)
        // ENHANCED: API-driven UI generation with validation
        case "generate-ui-from-prompt":
          try {
            const { prompt, systemPrompt, enableValidation = true } = msg.payload;
            const generationResult = await generateUIFromAPI(prompt, systemPrompt, enableValidation);
            const newFrame = await FigmaRenderer.generateUIFromDataDynamic(generationResult.layoutData);
            if (newFrame) {
              figma.ui.postMessage({
                type: "ui-generated-success",
                frameId: newFrame.id,
                generatedJSON: generationResult.layoutData,
                validationResult: generationResult.validationResult,
                retryCount: generationResult.retryCount
              });
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.notify("API generation error: " + errorMessage, { error: true });
            figma.ui.postMessage({ type: "ui-generation-error", error: errorMessage });
          }
          break;
        case "modify-existing-ui":
          try {
            const { modifiedJSON, frameId } = msg.payload;
            const modifiedFrame = await FigmaRenderer.modifyExistingUI(modifiedJSON, frameId);
            if (modifiedFrame) {
              figma.ui.postMessage({
                type: "ui-modified-success",
                frameId: modifiedFrame.id,
                modifiedJSON
              });
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.notify("Modification error: " + errorMessage, { error: true });
            figma.ui.postMessage({ type: "ui-generation-error", error: errorMessage });
          }
          break;
        // ENHANCED: API-driven UI modification with validation
        case "modify-ui-from-prompt":
          try {
            const { originalJSON, modificationRequest, systemPrompt, frameId, enableValidation = true } = msg.payload;
            const geminiAPI = await GeminiAPI.createFromStorage();
            if (!geminiAPI) {
              throw new Error("No API key configured");
            }
            console.log("\u{1F504} Modifying UI with API...");
            const response = await geminiAPI.modifyExistingUI(originalJSON, modificationRequest, systemPrompt);
            if (!response.success) {
              throw new Error(response.error || "API modification failed");
            }
            let finalJSON = response.content || "{}";
            let validationResult;
            let retryCount = 0;
            if (enableValidation && validationEngine) {
              console.log("\u{1F50D} Validating modified JSON...");
              const validationData = await validationEngine.validateWithRetry(
                finalJSON,
                modificationRequest,
                geminiAPI
              );
              validationResult = validationData.result;
              finalJSON = validationData.finalJSON;
              retryCount = validationData.retryCount;
              console.log(`\u{1F4CA} Modification validation: ${validationEngine.getValidationSummary(validationResult)}`);
            }
            const modifiedJSON = JSON.parse(finalJSON);
            const modifiedFrame = await FigmaRenderer.modifyExistingUI(modifiedJSON, frameId);
            if (modifiedFrame) {
              figma.ui.postMessage({
                type: "ui-modified-success",
                frameId: modifiedFrame.id,
                modifiedJSON,
                validationResult,
                retryCount
              });
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.notify("API modification error: " + errorMessage, { error: true });
            figma.ui.postMessage({ type: "ui-generation-error", error: errorMessage });
          }
          break;
        // NEW: Standalone JSON validation
        case "validate-json":
          try {
            const { jsonString, originalPrompt } = msg.payload;
            if (!validationEngine) {
              throw new Error("Validation engine not initialized");
            }
            const validationResult = await validationEngine.validateJSON(jsonString, originalPrompt);
            const summary = validationEngine.getValidationSummary(validationResult);
            figma.ui.postMessage({
              type: "validation-result",
              result: validationResult,
              summary
            });
            figma.notify(summary, {
              timeout: 3e3,
              error: !validationResult.isValid
            });
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.notify("Validation error: " + errorMessage, { error: true });
            figma.ui.postMessage({ type: "validation-error", error: errorMessage });
          }
          break;
        // NEW: Update validation settings
        case "update-validation-config":
          try {
            const newConfig = msg.payload;
            if (validationEngine) {
              validationEngine.updateConfig(newConfig);
              figma.ui.postMessage({ type: "validation-config-updated" });
              figma.notify("Validation settings updated", { timeout: 2e3 });
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.notify("Config update error: " + errorMessage, { error: true });
          }
          break;
        // Test API connection - Updated to use GeminiService
        case "test-gemini-connection":
        case "test-api-connection":
          try {
            console.log("\u{1F9EA} Testing Gemini API connection...");
            const result = await GeminiService.testConnection();
            figma.ui.postMessage({
              type: "connection-test-result",
              success: result.success,
              error: result.error || null,
              data: result.data || null
            });
            if (result.success) {
              figma.notify("\u2705 API connection successful!", { timeout: 2e3 });
            } else {
              const errorMsg = GeminiService.formatErrorMessage(result.error || "Connection failed");
              figma.notify(`\u274C ${errorMsg}`, { error: true });
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.ui.postMessage({
              type: "connection-test-result",
              success: false,
              error: errorMessage
            });
            figma.notify("\u274C Connection test failed", { error: true });
          }
          break;
        // Session management handlers - Updated to use SessionService
        case "restore-session":
          try {
            const sessionData = msg.payload;
            await SessionService.saveSession({
              designState: sessionData.designState,
              scanResults: sessionData.scanResults || [],
              currentTab: sessionData.currentTab || "design-system",
              currentPlatform: sessionData.currentPlatform || "mobile"
            });
            figma.ui.postMessage({
              type: "session-restored",
              designState: sessionData.designState,
              scanData: sessionData.scanResults || []
            });
            figma.notify("Session restored!", { timeout: 2e3 });
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.notify("Session restore error: " + errorMessage, { error: true });
          }
          break;
        case "clear-current-session":
          try {
            await SessionService.clearCurrentSession();
            figma.ui.postMessage({ type: "session-cleared" });
            figma.notify("Session cleared", { timeout: 1500 });
          } catch (error) {
            console.error("\u274C Error clearing session:", error);
            figma.notify("Failed to clear session", { error: true });
          }
          break;
        case "get-all-sessions":
          try {
            const allSessions = await SessionService.getAllSessions();
            const formattedSessions = allSessions.map(
              (session) => SessionService.formatSessionForUI(session)
            );
            figma.ui.postMessage({
              type: "all-sessions-loaded",
              sessions: formattedSessions,
              currentFileId: figma.fileKey || figma.root.id
            });
          } catch (error) {
            console.error("\u274C Error getting all sessions:", error);
            figma.ui.postMessage({ type: "all-sessions-loaded", sessions: [] });
          }
          break;
        case "delete-session":
          try {
            const fileId = msg.payload;
            await SessionService.deleteSession(fileId);
            figma.ui.postMessage({ type: "session-deleted", fileId });
            figma.notify("Session deleted", { timeout: 1500 });
          } catch (error) {
            console.error("\u274C Error deleting session:", error);
            figma.notify("Failed to delete session", { error: true });
          }
          break;
        case "save-current-session":
          try {
            const { designState, scanData, currentTab, currentPlatform } = msg.payload;
            await SessionService.saveSession({
              designState,
              scanResults: scanData || [],
              currentTab: currentTab || "design-system",
              currentPlatform: currentPlatform || "mobile"
            });
            console.log("\u2705 Session saved successfully");
          } catch (error) {
            console.error("\u274C Error saving session:", error);
          }
          break;
        case "scan-design-system":
          await handleScanCommand();
          break;
        case "generate-llm-prompt":
          try {
            const scanResultsForPrompt = await DesignSystemScannerService.getSavedScanResults();
            if (scanResultsForPrompt == null ? void 0 : scanResultsForPrompt.length) {
              const llmPrompt = DesignSystemScannerService.generateLLMPrompt(scanResultsForPrompt);
              figma.ui.postMessage({ type: "llm-prompt-generated", prompt: llmPrompt });
            } else {
              figma.notify("Scan components first", { error: true });
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error("\u274C Error generating LLM prompt:", errorMessage);
            figma.notify("Error generating prompt", { error: true });
          }
          break;
        case "update-component-type":
          const { componentId, newType } = msg.payload;
          try {
            const result = await DesignSystemScannerService.updateComponentType(componentId, newType);
            if (result.success) {
              figma.ui.postMessage({
                type: "component-type-updated",
                componentId,
                newType,
                componentName: result.componentName
              });
              figma.notify(`Updated "${result.componentName}" to ${newType}`, { timeout: 2e3 });
            } else {
              figma.notify("Component not found for update", { error: true });
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error("\u274C Error updating component type:", errorMessage);
            figma.notify("Error updating type", { error: true });
          }
          break;
        case "navigate-to-component":
          await navigateToComponent(msg.componentId, msg.pageName);
          break;
        case "save-api-key":
          try {
            const apiKey = msg.payload.apiKey || msg.payload;
            const success = await GeminiService.saveApiKey(apiKey);
            if (success) {
              figma.ui.postMessage({ type: "api-key-saved" });
              figma.notify("\u2705 API key saved successfully!", { timeout: 2e3 });
            } else {
              throw new Error("Failed to save API key");
            }
          } catch (e) {
            console.error("\u274C Error saving API key:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.ui.postMessage({
              type: "api-key-save-error",
              error: errorMessage
            });
            figma.notify("\u274C Error saving API key", { error: true });
          }
          break;
        case "get-api-key":
          try {
            const key = await figma.clientStorage.getAsync("geminiApiKey");
            if (key) {
              figma.ui.postMessage({ type: "api-key-found", payload: key });
            } else {
              figma.ui.postMessage({ type: "api-key-not-found" });
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.ui.postMessage({ type: "api-key-error", payload: errorMessage });
          }
          break;
        // Generate UI with Gemini - New handler using GeminiService
        case "generate-with-gemini":
          try {
            const { prompt, scanResults, platform, image } = msg.payload;
            console.log("\u{1F916} Generating UI with Gemini...");
            const result = await GeminiService.generateUI({
              prompt,
              image: image || void 0
            });
            if (result.success) {
              await SessionService.saveSession({
                scanResults: scanResults || [],
                currentPlatform: platform || "mobile",
                designState: {
                  history: ["AI generation completed"],
                  current: result.data
                }
              });
              figma.ui.postMessage({
                type: "gemini-response",
                success: true,
                data: result.data
              });
              figma.notify("\u2705 UI generated successfully!", { timeout: 2e3 });
            } else {
              const errorMsg = GeminiService.formatErrorMessage(result.error || "Generation failed");
              figma.ui.postMessage({
                type: "gemini-response",
                success: false,
                error: errorMsg
              });
              figma.notify(`\u274C ${errorMsg}`, { error: true });
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error("\u274C Generation error:", errorMessage);
            figma.ui.postMessage({
              type: "gemini-response",
              success: false,
              error: errorMessage
            });
            figma.notify("\u274C Generation failed", { error: true });
          }
          break;
        case "run-ai-pipeline":
          try {
            const { prompt } = msg.payload;
            console.log("\u{1F680} Starting 5-stage AI pipeline with prompt:", prompt);
            const orchestrator = await initializeAIPipeline();
            const result = await orchestrator.processRequest(prompt);
            if (result.success) {
              console.log("\u{1F389} Pipeline completed successfully!");
              console.log("\u{1F4CA} Pipeline results:", {
                stages: result.stages,
                executionTime: result.executionTime + "ms",
                aiUsageStats: result.aiUsageStats,
                designSystemUsed: result.designSystemUsed,
                componentsAvailable: result.componentsAvailable
              });
              if ((_a = result.finalResult) == null ? void 0 : _a.generatedJSON) {
                console.log("\u{1F3A8} Rendering UI from pipeline JSON...");
                const newFrame = await FigmaRenderer.generateUIFromDataDynamic(result.finalResult.generatedJSON);
                figma.ui.postMessage({
                  type: "pipeline-success",
                  result: {
                    pipelineStats: result.aiUsageStats,
                    frameId: newFrame == null ? void 0 : newFrame.id,
                    generatedJSON: result.finalResult.generatedJSON,
                    executionTime: result.executionTime,
                    stagesCompleted: result.stages.length
                  }
                });
                figma.notify(`\u2705 5-stage pipeline completed in ${result.executionTime}ms!`, { timeout: 3e3 });
              } else {
                figma.ui.postMessage({
                  type: "pipeline-success-no-render",
                  result: {
                    pipelineStats: result.aiUsageStats,
                    content: (_b = result.finalResult) == null ? void 0 : _b.content,
                    executionTime: result.executionTime,
                    stagesCompleted: result.stages.length
                  }
                });
                figma.notify(`\u2705 Pipeline completed but no UI generated. Check JSON output.`, { timeout: 4e3 });
              }
            } else {
              throw new Error("Pipeline execution failed");
            }
          } catch (error) {
            console.error("\u274C Pipeline error:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            figma.ui.postMessage({
              type: "pipeline-error",
              error: errorMessage
            });
            figma.notify(`\u274C Pipeline failed: ${errorMessage}`, { error: true });
          }
          break;
        case "run-3stage-pipeline":
          try {
            const { prompt } = msg.payload;
            console.log("\u26A1 Starting 3-stage AI pipeline with prompt:", prompt);
            figma.ui.postMessage({
              type: "3stage-pipeline-error",
              error: 'Please run the 3-stage pipeline manually: python3 instance.py alt3 --input "' + prompt + '"'
            });
            figma.notify("\u26A1 Run Python pipeline manually and copy JSON result", { timeout: 5e3 });
          } catch (error) {
            console.error("\u274C 3-stage pipeline error:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            figma.ui.postMessage({
              type: "3stage-pipeline-error",
              error: errorMessage
            });
            figma.notify(`\u274C 3-stage pipeline failed: ${errorMessage}`, { error: true });
          }
          break;
        case "render-json-direct":
          try {
            const { json, source } = msg.payload;
            console.log("\u{1F3A8} Rendering JSON directly from:", source);
            let renderData = json;
            if (json.layoutContainer && json.layoutContainer.items) {
              renderData = __spreadProps(__spreadValues({}, json.layoutContainer), {
                items: json.layoutContainer.items
              });
            }
            console.log("\u{1F527} Transformed JSON for rendering:", renderData);
            console.log("\u{1F527} JSON has items?", !!renderData.items, "Count:", (_c = renderData.items) == null ? void 0 : _c.length);
            console.log("\u{1F527} JSON layoutMode:", renderData.layoutMode);
            console.log("\u{1F527} JSON properties:", {
              itemSpacing: renderData.itemSpacing,
              paddingTop: renderData.paddingTop,
              primaryAxisSizingMode: renderData.primaryAxisSizingMode
            });
            const newFrame = await FigmaRenderer.generateUIFromDataDynamic(renderData);
            console.log("\u{1F527} Generated frame:", newFrame, "ID:", newFrame == null ? void 0 : newFrame.id);
            if (newFrame) {
              figma.ui.postMessage({
                type: "json-render-success",
                result: {
                  frameId: newFrame.id,
                  generatedJSON: json,
                  source
                }
              });
              figma.notify(`\u2705 ${source} JSON rendered successfully!`, { timeout: 3e3 });
            } else {
              throw new Error("Failed to create frame");
            }
          } catch (error) {
            console.error("\u274C JSON render error:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            figma.ui.postMessage({
              type: "json-render-error",
              error: errorMessage
            });
            figma.notify(`\u274C JSON render failed: ${errorMessage}`, { error: true });
          }
          break;
        case "get-debug-log":
          try {
            console.log("\u{1F4C4} Retrieving debug log from storage...");
            const debugData = await figma.clientStorage.getAsync("pipeline-debug-log-latest");
            if (debugData && debugData.content) {
              console.log(`\u2705 Debug log found: ${debugData.lines} lines, ${debugData.chars} chars`);
              figma.ui.postMessage({
                type: "debug-log-result",
                success: true,
                content: debugData.content,
                runId: debugData.runId,
                lines: debugData.lines,
                chars: debugData.chars,
                timestamp: debugData.timestamp
              });
            } else {
              console.log("\u26A0\uFE0F No debug log found in storage");
              figma.ui.postMessage({
                type: "debug-log-result",
                success: false,
                message: "No debug log found. Run the pipeline first."
              });
            }
          } catch (error) {
            console.error("\u274C Error retrieving debug log:", error);
            figma.ui.postMessage({
              type: "debug-log-result",
              success: false,
              message: `Failed to retrieve debug log: ${error.message}`
            });
          }
          break;
        case "get-saved-scan":
          try {
            const savedScan = await DesignSystemScannerService.getScanSession();
            if (savedScan && savedScan.components && savedScan.fileKey === figma.root.id) {
              figma.ui.postMessage({
                type: "saved-scan-loaded",
                components: savedScan.components,
                scanTime: savedScan.scanTime
              });
            } else {
              figma.ui.postMessage({ type: "no-saved-scan" });
            }
          } catch (error) {
            console.error("\u274C Error loading saved scan:", error);
            figma.ui.postMessage({ type: "no-saved-scan" });
          }
          break;
        case "clear-storage":
        case "clear-all-data":
          try {
            await DesignSystemScannerService.clearScanData();
            await GeminiService.clearApiKey();
            await SessionService.clearAllSessions();
            figma.notify("All data cleared successfully", { timeout: 2e3 });
            figma.ui.postMessage({ type: "all-data-cleared" });
          } catch (error) {
            console.error("Error clearing storage:", error);
            figma.notify("Failed to clear some data", { error: true });
          }
          break;
        case "cancel":
          figma.closePlugin();
          break;
        default:
      }
    };
    console.log("\u2705 Plugin fully initialized with complete modular architecture");
  }
  figma.on("run", async (event) => {
    const { command, parameters } = event;
    switch (command) {
      case "scan":
        await handleScanCommand();
        break;
      case "debug":
        await handleDebugCommand(parameters == null ? void 0 : parameters.componentId);
        break;
      case "test-migration":
        await handleMigrationTest();
        break;
    }
  });
  initializePlugin();
  main().catch((err) => {
    console.error("\u274C Unhandled error:", err);
    figma.closePlugin("A critical error occurred.");
  });
})();
