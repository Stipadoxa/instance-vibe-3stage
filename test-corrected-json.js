"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// test-corrected-json.ts
var test_corrected_json_exports = {};
__export(test_corrected_json_exports, {
  testCorrectedJSON: () => testCorrectedJSON
});
module.exports = __toCommonJS(test_corrected_json_exports);

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
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
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
    const processedRawProperties = handler ? handler.preprocessProperties({ ...rawProperties }) : rawProperties;
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
        const newTab = {
          ...tabGroup[0],
          properties: {
            ...tabGroup[0].properties,
            Label: tabGroup.map((tab) => tab.properties.Label)
          }
        };
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
      await PerformanceTracker.track("ui-generation-total", async () => {
        figma.skipInvisibleInstanceChildren = true;
        await ComponentPropertyEngine.initialize();
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
      });
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
    if (!ComponentPropertyEngine.getAllSchemas().length) {
      await ComponentPropertyEngine.initialize();
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

// test-corrected-json.ts
var fs = __toESM(require("fs"));
async function testCorrectedJSON() {
  await ComponentPropertyEngine.initialize();
  const correctedJSON = JSON.parse(fs.readFileSync("./corrected-ui.json", "utf-8"));
  console.log(" Testing corrected JSON with systematic engine...");
  try {
    const frame = await FigmaRenderer.generateUIFromDataDynamic(correctedJSON);
    if (frame) {
      console.log("\u2705 Corrected JSON test completed!");
      const tabInstance = frame.findOne((n) => n.type === "INSTANCE");
      if (tabInstance) {
        const textNodes = tabInstance.findAll((n) => n.type === "TEXT");
        console.log(" Tab labels found:");
        textNodes.forEach((node, i) => {
          if (node.visible) {
            console.log(`  Tab ${i + 1}: "${node.characters}"`);
          }
        });
      }
    }
  } catch (error) {
    console.error("\u274C Corrected JSON test failed:", error);
  }
}
testCorrectedJSON();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  testCorrectedJSON
});
