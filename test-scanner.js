"use strict";
(() => {
  // src/core/component-scanner.ts
  var ComponentScanner = class {
    /**
     * NEW: Scan Figma Variables (Design Tokens) from the local file
     */
    static async scanFigmaVariables() {
      var _a;
      console.log("\u{1F527} Scanning Figma Variables (Design Tokens)...");
      try {
        if (!figma.variables) {
          console.warn("\u274C figma.variables API not available in this Figma version");
          return [];
        }
        console.log("\u2705 figma.variables API is available");
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        console.log(`\u2705 Found ${collections.length} variable collections`);
        if (collections.length === 0) {
          console.warn("\u26A0\uFE0F No variable collections found. Possible reasons:");
          console.warn("  1. File has no Variables/Design Tokens defined");
          console.warn("  2. Variables are in a different library/file");
          console.warn("  3. Variables API permissions issue");
          try {
          } catch (e) {
            console.log("\u{1F4DD} Non-local variable check not available");
          }
          return [];
        }
        const tokens = [];
        for (const collection of collections) {
          console.log(`\u{1F4E6} Processing collection: "${collection.name}" (ID: ${collection.id})`);
          try {
            if (!collection.variableIds || collection.variableIds.length === 0) {
              console.log(`  No variables found in collection "${collection.name}"`);
              continue;
            }
            console.log(`  Found ${collection.variableIds.length} variable IDs in "${collection.name}"`);
            const variables = [];
            for (const variableId of collection.variableIds) {
              try {
                const variable = await figma.variables.getVariableByIdAsync(variableId);
                if (variable) {
                  variables.push(variable);
                }
              } catch (varErr) {
                console.warn(`    Failed to get variable ${variableId}:`, varErr);
              }
            }
            console.log(`  Successfully loaded ${variables.length} variables from "${collection.name}"`);
            console.log(`  Collection modes:`, Object.keys(collection.modes || {}));
            for (const variable of variables) {
              try {
                console.log(`    Processing variable: "${variable.name}" (Type: ${variable.resolvedType})`);
                const modes = Object.keys(variable.valuesByMode);
                console.log(`      Available modes: [${modes.join(", ")}]`);
                if (modes.length === 0) {
                  console.warn(`      \u26A0\uFE0F Variable "${variable.name}" has no modes`);
                  continue;
                }
                const firstMode = modes[0];
                const value = variable.valuesByMode[firstMode];
                console.log(`      Using mode "${firstMode}" with value:`, value);
                const token = {
                  id: variable.id,
                  name: variable.name,
                  type: variable.resolvedType,
                  value,
                  collection: collection.name,
                  mode: firstMode,
                  description: variable.description || void 0
                };
                tokens.push(token);
                if (variable.resolvedType === "COLOR") {
                  console.log(`\u{1F3A8} Color token: "${variable.name}" = ${JSON.stringify(value)}`);
                } else {
                  console.log(`\u{1F527} ${variable.resolvedType} token: "${variable.name}"`);
                }
              } catch (varError) {
                console.warn(`\u26A0\uFE0F Failed to process variable "${variable.name}":`, varError);
              }
            }
          } catch (collectionError) {
            console.warn(`\u26A0\uFE0F Failed to process collection "${collection.name}": ${collectionError.message}`);
            console.warn(`\u26A0\uFE0F Error type: ${typeof collectionError}, Stack:`, collectionError.stack);
            if ((_a = collectionError.message) == null ? void 0 : _a.includes("not a function")) {
              console.warn(`\u26A0\uFE0F This appears to be a Figma API version issue`);
              console.warn(`\u26A0\uFE0F getVariablesByCollectionAsync may not be available in this Figma version`);
            }
          }
        }
        const colorTokens = tokens.filter((t) => t.type === "COLOR");
        const otherTokens = tokens.filter((t) => t.type !== "COLOR");
        console.log(`\u{1F527} Design Tokens Summary:`);
        console.log(`   Color Tokens: ${colorTokens.length}`);
        console.log(`   Other Tokens: ${otherTokens.length}`);
        console.log(`   Total: ${tokens.length} tokens`);
        if (tokens.length === 0) {
          console.log("\u{1F914} Debug suggestions:");
          console.log("  1. Check if this file has Variables in the right panel");
          console.log("  2. Try creating a simple color variable as a test");
          console.log("  3. Check if Variables are published from a library");
        }
        return tokens;
      } catch (error) {
        console.warn("\u26A0\uFE0F Failed to scan design tokens:", error);
        console.warn("  This could be due to:");
        console.warn("  - Variables API not available in this Figma version");
        console.warn("  - Plugin permissions");
        console.warn("  - File access restrictions");
        return [];
      }
    }
    /**
     * NEW: Fallback - Create design tokens from color styles for testing
     * This allows testing the token system even when Variables API doesn't work
     */
    static async createDesignTokensFromColorStyles() {
      console.log("\u{1F504} Creating fallback design tokens from color styles...");
      try {
        const colorStyleCollection = await this.scanFigmaColorStyles();
        const tokens = [];
        Object.entries(colorStyleCollection).forEach(([category, styles]) => {
          styles.forEach((style) => {
            const tokenName = style.name.toLowerCase().replace(/[\/\s]+/g, "-").replace(/[^a-z0-9\-]/g, "");
            let rgbValue = { r: 0, g: 0, b: 0 };
            if (style.colorInfo.type === "SOLID" && style.colorInfo.color) {
              const hex = style.colorInfo.color.replace("#", "");
              rgbValue = {
                r: parseInt(hex.substr(0, 2), 16) / 255,
                g: parseInt(hex.substr(2, 2), 16) / 255,
                b: parseInt(hex.substr(4, 2), 16) / 255
              };
            }
            const token = {
              id: `fallback-${style.id}`,
              name: tokenName,
              type: "COLOR",
              value: rgbValue,
              collection: `${category}-colors`,
              mode: "default",
              description: `Fallback token from color style: ${style.name}`
            };
            tokens.push(token);
            console.log(`\u{1F3A8} Created fallback token: "${tokenName}" from "${style.name}"`);
          });
        });
        console.log(`\u{1F504} Created ${tokens.length} fallback design tokens from color styles`);
        return tokens;
      } catch (error) {
        console.warn("\u26A0\uFE0F Failed to create fallback design tokens:", error);
        return [];
      }
    }
    /**
     * Scan Figma Color Styles from the local file
     */
    static async scanFigmaColorStyles() {
      console.log("\u{1F3A8} Scanning Figma Color Styles...");
      try {
        const paintStyles = await figma.getLocalPaintStylesAsync();
        console.log(`\u2705 Found ${paintStyles.length} paint styles`);
        const colorStyleCollection = {
          primary: [],
          secondary: [],
          tertiary: [],
          neutral: [],
          semantic: [],
          surface: [],
          other: []
        };
        for (const paintStyle of paintStyles) {
          try {
            const colorStyle = await this.convertPaintStyleToColorStyle(paintStyle);
            const category = this.categorizeColorStyle(colorStyle.name);
            colorStyleCollection[category].push(colorStyle);
            console.log(`\u{1F3A8} Categorized "${colorStyle.name}" as ${category} (variant: ${colorStyle.variant || "none"})`);
          } catch (error) {
            console.warn(`\u26A0\uFE0F Failed to process paint style "${paintStyle.name}":`, error);
          }
        }
        const totalStyles = Object.values(colorStyleCollection).reduce((sum, styles) => sum + styles.length, 0);
        console.log(`\u{1F3A8} Color Styles Summary:`);
        console.log(`   Primary: ${colorStyleCollection.primary.length}`);
        console.log(`   Secondary: ${colorStyleCollection.secondary.length}`);
        console.log(`   Tertiary: ${colorStyleCollection.tertiary.length}`);
        console.log(`   Neutral: ${colorStyleCollection.neutral.length}`);
        console.log(`   Semantic: ${colorStyleCollection.semantic.length}`);
        console.log(`   Surface: ${colorStyleCollection.surface.length}`);
        console.log(`   Other: ${colorStyleCollection.other.length}`);
        console.log(`   Total: ${totalStyles} styles`);
        return colorStyleCollection;
      } catch (error) {
        console.error("\u274C Failed to scan color styles:", error);
        return {
          primary: [],
          secondary: [],
          tertiary: [],
          neutral: [],
          semantic: [],
          surface: [],
          other: []
        };
      }
    }
    /**
     * Scans all local text styles in the current Figma file
     * Mirrors the scanFigmaColorStyles pattern exactly
     */
    static async scanFigmaTextStyles() {
      try {
        console.log("\u{1F50D} Scanning text styles...");
        const figmaTextStyles = await figma.getLocalTextStylesAsync();
        console.log(`Found ${figmaTextStyles.length} text styles`);
        const textStyles = figmaTextStyles.map((style) => {
          const textStyle = {
            id: style.id,
            name: style.name,
            description: style.description || "",
            fontSize: style.fontSize,
            fontName: style.fontName,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing
          };
          if (style.textDecoration) {
            textStyle.textDecoration = style.textDecoration;
          }
          if (style.textCase) {
            textStyle.textCase = style.textCase;
          }
          if (style.paragraphSpacing !== void 0) {
            textStyle.paragraphSpacing = style.paragraphSpacing;
          }
          if (style.paragraphIndent !== void 0) {
            textStyle.paragraphIndent = style.paragraphIndent;
          }
          console.log(`\u2705 Processed text style: ${style.name} (${style.fontSize}px)`);
          return textStyle;
        });
        console.log(`\u{1F4DD} Successfully scanned ${textStyles.length} text styles`);
        return textStyles;
      } catch (error) {
        console.error("\u274C Error scanning text styles:", error);
        throw new Error(`Failed to scan text styles: ${error.message}`);
      }
    }
    /**
     * Convert Figma PaintStyle to our ColorStyle interface
     */
    static async convertPaintStyleToColorStyle(paintStyle) {
      const colorInfo = this.convertPaintToColorInfo(paintStyle.paints[0], paintStyle.id);
      const { category, variant } = this.parseColorStyleName(paintStyle.name);
      return {
        id: paintStyle.id,
        name: paintStyle.name,
        description: paintStyle.description || void 0,
        paints: [...paintStyle.paints],
        // Convert readonly to mutable array
        category,
        variant,
        colorInfo: colorInfo || { type: "SOLID", color: "#000000", opacity: 1 }
      };
    }
    /**
     * Categorize a color style based on its name
     * Supports patterns like: 'primary90', 'secondary50', 'neutral-100', 'Primary/500', etc.
     */
    static categorizeColorStyle(styleName) {
      const name = styleName.toLowerCase();
      if (name.includes("primary") || name.includes("brand")) {
        return "primary";
      }
      if (name.includes("secondary") || name.includes("accent")) {
        return "secondary";
      }
      if (name.includes("tertiary")) {
        return "tertiary";
      }
      if (name.includes("neutral") || name.includes("gray") || name.includes("grey") || name.includes("black") || name.includes("white") || name.includes("slate")) {
        return "neutral";
      }
      if (name.includes("success") || name.includes("error") || name.includes("warning") || name.includes("info") || name.includes("danger") || name.includes("alert") || name.includes("green") || name.includes("red") || name.includes("yellow") || name.includes("blue") || name.includes("orange")) {
        return "semantic";
      }
      if (name.includes("surface") || name.includes("background") || name.includes("container") || name.includes("backdrop") || name.includes("overlay")) {
        return "surface";
      }
      return "other";
    }
    /**
     * Parse color style name to extract category and variant
     * Examples: 'primary90' -> { category: 'primary', variant: '90' }
     *          'Primary/500' -> { category: 'primary', variant: '500' }
     *          'neutral-100' -> { category: 'neutral', variant: '100' }
     */
    static parseColorStyleName(styleName) {
      const name = styleName.toLowerCase();
      const pattern1 = name.match(/^(primary|secondary|tertiary|neutral|semantic|surface|brand|accent|gray|grey|success|error|warning|info|danger|green|red|yellow|blue|orange)(\d+)$/);
      if (pattern1) {
        const [, colorName, variant] = pattern1;
        return {
          category: this.categorizeColorStyle(colorName),
          variant
        };
      }
      const pattern2 = name.match(/^([^\/\-\d]+)[\/-](\d+)$/);
      if (pattern2) {
        const [, colorName, variant] = pattern2;
        return {
          category: this.categorizeColorStyle(colorName),
          variant
        };
      }
      return {
        category: this.categorizeColorStyle(name),
        variant: void 0
      };
    }
    /**
     * Main scanning function - scans all pages for components and color styles
     */
    static async scanDesignSystem() {
      console.log("\u{1F50D} Starting comprehensive design system scan with optimization...");
      const components = [];
      let colorStyles;
      let textStyles;
      try {
        await figma.loadAllPagesAsync();
        console.log("\u2705 All pages loaded");
        console.log("\n\u{1F527} Phase 1: Scanning Design Tokens...");
        let designTokens;
        try {
          designTokens = await this.scanFigmaVariables();
          if (designTokens && designTokens.length > 0) {
            console.log(`\u{1F680} SUCCESS: Found ${designTokens.length} design tokens from Variables API`);
          } else {
            console.log(`\u274C PROBLEM: Variables API returned empty or undefined`);
          }
          if (!designTokens || designTokens.length === 0) {
            console.log("\u{1F504} No Variables found, trying fallback design tokens from color styles...");
            designTokens = await this.createDesignTokensFromColorStyles();
            if (designTokens && designTokens.length > 0) {
              console.log("\u2705 Using fallback design tokens created from color styles");
            } else {
              console.log("\u26A0\uFE0F Fallback also returned no tokens");
            }
          } else {
            console.log("\u2705 Using Variables API design tokens");
          }
        } catch (error) {
          console.warn("\u26A0\uFE0F Design Tokens scanning failed, trying fallback:", error);
          try {
            designTokens = await this.createDesignTokensFromColorStyles();
            console.log("\u2705 Using fallback design tokens despite Variables API error");
          } catch (fallbackError) {
            console.warn("\u26A0\uFE0F Fallback design tokens also failed:", fallbackError);
            designTokens = void 0;
          }
        }
        console.log("\n\u{1F3A8} Phase 2: Scanning Color Styles...");
        try {
          colorStyles = await this.scanFigmaColorStyles();
          if (colorStyles && Object.keys(colorStyles).length > 0) {
            this.paintStyleMap.clear();
            Object.values(colorStyles).forEach((categoryStyles) => {
              if (Array.isArray(categoryStyles)) {
                categoryStyles.forEach((style) => {
                  this.paintStyleMap.set(style.id, style.name);
                });
              }
            });
            console.log(`\u2705 Built color style lookup map with ${this.paintStyleMap.size} entries`);
            const firstEntries = Array.from(this.paintStyleMap.entries()).slice(0, 3);
            console.log("\u{1F50D} First color style IDs in map:", firstEntries);
          } else {
            console.warn("\u26A0\uFE0F No color styles available for lookup map");
            this.paintStyleMap.clear();
          }
          if (designTokens && designTokens.length > 0) {
            this.buildVariableMap(designTokens);
          } else {
            console.warn("\u26A0\uFE0F No variables available for lookup map");
            this.variableMap.clear();
            this.variableDetails.clear();
          }
        } catch (error) {
          console.warn("\u26A0\uFE0F Color Styles scanning failed, continuing without color styles:", error);
          colorStyles = void 0;
          this.paintStyleMap.clear();
        }
        console.log("\n\u{1F4DD} Phase 3: Scanning Text Styles...");
        try {
          textStyles = await this.scanFigmaTextStyles();
          if (textStyles && textStyles.length > 0) {
            this.textStyleMap.clear();
            this.textStyleDetails.clear();
            textStyles.forEach((style) => {
              var _a, _b;
              this.textStyleMap.set(style.id, style.name);
              this.textStyleDetails.set(style.id, {
                id: style.id,
                name: style.name,
                fontSize: style.fontSize,
                fontFamily: ((_a = style.fontName) == null ? void 0 : _a.family) || "Unknown",
                fontWeight: ((_b = style.fontName) == null ? void 0 : _b.style) || "Regular"
              });
            });
            console.log(`\u2705 Built text style lookup map with ${this.textStyleMap.size} entries`);
            console.log(`\u2705 Built text style details map with ${this.textStyleDetails.size} entries`);
            const firstEntries = Array.from(this.textStyleMap.entries()).slice(0, 3);
            console.log("\u{1F50D} First text style IDs in map:", firstEntries);
          }
        } catch (error) {
          console.warn("\u26A0\uFE0F Text Styles scanning failed, continuing without text styles:", error);
          textStyles = void 0;
          this.textStyleMap.clear();
        }
        console.log("\n\u{1F9E9} Phase 4: Scanning Components...");
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
                  const componentInfo = await this.analyzeComponentOptimized(node);
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
        const scanSession = {
          components,
          colorStyles,
          textStyles,
          designTokens,
          // NEW: Include design tokens
          scanTime: Date.now(),
          version: "2.1.0",
          // Bump version for token support
          fileKey: figma.fileKey || void 0
        };
        console.log(`
\u{1F389} Comprehensive scan complete!`);
        console.log(`   \u{1F4E6} Components: ${components.length}`);
        console.log(`   \u{1F527} Design Tokens: ${designTokens ? designTokens.length : 0}`);
        console.log(`   \u{1F3A8} Color Styles: ${colorStyles ? Object.values(colorStyles).reduce((sum, styles) => sum + styles.length, 0) : 0}`);
        console.log(`   \u{1F4DD} Text Styles: ${textStyles ? textStyles.length : 0}`);
        console.log(`   \u{1F4C4} File Key: ${scanSession.fileKey || "Unknown"}`);
        if (textStyles && textStyles.length > 0) {
          this.textStyleMap.clear();
          this.textStyleDetails.clear();
          textStyles.forEach((style) => {
            var _a, _b;
            this.textStyleMap.set(style.id, style.name);
            this.textStyleDetails.set(style.id, {
              id: style.id,
              name: style.name,
              fontSize: style.fontSize,
              fontFamily: ((_a = style.fontName) == null ? void 0 : _a.family) || "Unknown",
              fontWeight: ((_b = style.fontName) == null ? void 0 : _b.style) || "Regular"
            });
          });
          console.log(`\u2705 Built text style lookup map with ${this.textStyleMap.size} entries`);
          console.log(`\u2705 Built text style details map with ${this.textStyleDetails.size} entries`);
          const firstEntries = Array.from(this.textStyleMap.entries()).slice(0, 3);
          console.log("\u{1F50D} First text style IDs in map:", firstEntries);
        } else {
          console.warn("\u26A0\uFE0F No text styles available for lookup map");
          this.textStyleMap.clear();
          this.textStyleDetails.clear();
        }
        return scanSession;
      } catch (e) {
        console.error("\u274C Critical error in scanDesignSystem:", e);
        throw e;
      }
    }
    /**
     * Legacy method for backward compatibility - returns only components
     */
    static async scanComponents() {
      const session = await this.scanDesignSystem();
      return session.components;
    }
    /**
     * Recursively searches for auto-layout containers with padding to find visual padding
     */
    static findNestedAutolayoutPadding(node, depth = 0) {
      if (depth > 3) return null;
      try {
        if (node.layoutMode && node.layoutMode !== "NONE") {
          const padding = {
            paddingTop: node.paddingTop || 0,
            paddingLeft: node.paddingLeft || 0,
            paddingRight: node.paddingRight || 0,
            paddingBottom: node.paddingBottom || 0
          };
          if (padding.paddingTop > 0 || padding.paddingLeft > 0 || padding.paddingRight > 0 || padding.paddingBottom > 0) {
            console.log(`  \u{1F50D} Found nested auto-layout padding at depth ${depth}:`, padding, `(${node.name})`);
            return padding;
          }
        }
        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            const childPadding = this.findNestedAutolayoutPadding(child, depth + 1);
            if (childPadding) {
              return childPadding;
            }
          }
        }
        return null;
      } catch (error) {
        console.warn(`\u26A0\uFE0F Error searching nested padding at depth ${depth}:`, error);
        return null;
      }
    }
    /**
     * Extracts internal padding information from a component, including nested auto-layout containers
     */
    static extractInternalPadding(comp) {
      try {
        let targetNode = comp;
        if (comp.type === "COMPONENT_SET") {
          const defaultVariant = comp.defaultVariant || comp.children[0];
          if (defaultVariant && defaultVariant.type === "COMPONENT") {
            targetNode = defaultVariant;
          }
        }
        if (targetNode.type === "COMPONENT") {
          console.log(`\u{1F50D} Analyzing component "${comp.name}" for padding...`);
          if (targetNode.layoutMode !== "NONE") {
            const rootPadding = {
              paddingTop: targetNode.paddingTop || 0,
              paddingLeft: targetNode.paddingLeft || 0,
              paddingRight: targetNode.paddingRight || 0,
              paddingBottom: targetNode.paddingBottom || 0
            };
            if (rootPadding.paddingTop > 0 || rootPadding.paddingLeft > 0 || rootPadding.paddingRight > 0 || rootPadding.paddingBottom > 0) {
              console.log(`  \u2705 Found root auto-layout padding:`, rootPadding);
              return rootPadding;
            }
          }
          const nestedPadding = this.findNestedAutolayoutPadding(targetNode);
          if (nestedPadding) {
            console.log(`  \u2705 Using nested auto-layout padding:`, nestedPadding);
            return nestedPadding;
          }
          if (targetNode.children && targetNode.children.length > 0) {
            const firstChild = targetNode.children[0];
            if (firstChild.x !== void 0 && firstChild.y !== void 0) {
              const paddingLeft = firstChild.x;
              const paddingTop = firstChild.y;
              const paddingRight = targetNode.width - (firstChild.x + firstChild.width);
              const paddingBottom = targetNode.height - (firstChild.y + firstChild.height);
              if (paddingLeft >= 0 && paddingTop >= 0 && paddingRight >= 0 && paddingBottom >= 0 && paddingLeft <= 100 && paddingTop <= 100 && paddingRight <= 100 && paddingBottom <= 100) {
                const geometricPadding = {
                  paddingTop: Math.round(paddingTop),
                  paddingLeft: Math.round(paddingLeft),
                  paddingRight: Math.round(paddingRight),
                  paddingBottom: Math.round(paddingBottom)
                };
                console.log(`  \u2705 Using geometric padding detection:`, geometricPadding);
                return geometricPadding;
              }
            }
          }
          console.log(`  \u274C No meaningful padding found for "${comp.name}"`);
        }
        return null;
      } catch (error) {
        console.warn(`\u26A0\uFE0F Error extracting padding for component ${comp.name}:`, error);
        return null;
      }
    }
    /**
     * DEPRECATED: Heavy recursive method - replaced by analyzeComponentOptimized
     * This method was causing 3.2MB JSON files due to deep recursion and coordinate data
     * Keeping for backup - DO NOT USE in production
     * 
     * @param node Starting node (component, frame, or any child node)
     * @param parentId Parent node ID (undefined for root)
     * @param depth Current depth in hierarchy (0 for root)
     * @param maxDepth Maximum recursion depth to prevent infinite loops
     */
    /*
      static async analyzeComponentStructure(
        node: SceneNode, 
        parentId?: string, 
        depth: number = 0,
        maxDepth: number = 10
      ): Promise<ComponentStructure> {
        console.log(`🔍 Analyzing structure for "${node.name}" at depth ${depth} (type: ${node.type})`);
        
        // Prevent infinite recursion
        if (depth > maxDepth) {
          console.warn(`⚠️ Max depth ${maxDepth} reached for node "${node.name}", stopping recursion`);
          return {
            id: node.id,
            type: node.type,
            name: node.name,
            children: [],
            parent: parentId,
            depth,
            visible: node.visible
          };
        }
    
        const structure: ComponentStructure = {
          id: node.id,
          type: node.type,
          name: node.name,
          children: [],
          parent: parentId,
          depth,
          visible: node.visible
        };
    
        // Extract node-specific properties
        try {
          structure.nodeProperties = await this.extractNodeProperties(node);
        } catch (error) {
          console.warn(`⚠️ Failed to extract properties for "${node.name}":`, error);
        }
    
        // Check for special flags
        this.setSpecialFlags(structure, node, parentId);
    
        // Recursively analyze children (if node has children and we should traverse them)
        if ('children' in node && node.children && node.children.length > 0 && this.shouldTraverseChildren(node)) {
          
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            try {
              const childStructure = await this.analyzeComponentStructure(child, node.id, depth + 1, maxDepth);
              structure.children.push(childStructure);
            } catch (error) {
              console.warn(`⚠️ Failed to analyze child "${child.name}" of "${node.name}":`, error);
            }
          }
          
          console.log(`  ✅ Analyzed ${structure.children.length} children for "${node.name}"`);
        }
    
        return structure;
      }
    
      /**
       * NEW: Extract node-specific properties based on node type
       */
    static async extractNodeProperties(node) {
      const properties = {};
      if ("width" in node && "height" in node) {
        properties.width = node.width;
        properties.height = node.height;
      }
      if ("x" in node && "y" in node) {
        properties.x = node.x;
        properties.y = node.y;
      }
      if ("layoutAlign" in node && node.layoutAlign) {
        properties.layoutAlign = node.layoutAlign;
      }
      if ("layoutGrow" in node && typeof node.layoutGrow === "number") {
        properties.layoutGrow = node.layoutGrow;
      }
      if ("layoutSizingHorizontal" in node && node.layoutSizingHorizontal) {
        properties.layoutSizingHorizontal = node.layoutSizingHorizontal;
      }
      if ("layoutSizingVertical" in node && node.layoutSizingVertical) {
        properties.layoutSizingVertical = node.layoutSizingVertical;
      }
      switch (node.type) {
        case "TEXT":
          properties.textHierarchy = await this.extractSingleTextHierarchy(node);
          break;
        case "COMPONENT":
        case "INSTANCE":
          properties.componentInstance = await this.extractSingleComponentInstance(node);
          break;
        case "VECTOR":
          properties.vectorNode = this.extractSingleVectorNode(node);
          break;
        case "RECTANGLE":
        case "ELLIPSE":
          properties.imageNode = this.extractSingleImageNode(node);
          break;
      }
      if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") {
        try {
          const autoLayout = this.analyzeAutoLayoutBehavior(node);
          properties.autoLayoutBehavior = autoLayout || void 0;
        } catch (error) {
          console.warn(`\u26A0\uFE0F Failed to analyze auto-layout for "${node.name}":`, error);
        }
      }
      if (this.isVisualNode(node)) {
        try {
          properties.styleInfo = this.extractStyleInfo(node);
        } catch (error) {
          console.warn(`\u26A0\uFE0F Failed to extract style info for "${node.name}":`, error);
        }
      }
      return Object.keys(properties).length > 0 ? properties : void 0;
    }
    /**
     * NEW: Set special flags for component structure
     */
    static setSpecialFlags(structure2, node, parentId) {
      if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") {
        if (parentId) {
          structure2.isNestedAutoLayout = true;
          if (node.type === "COMPONENT" || node.type === "INSTANCE") {
          }
        } else {
        }
      }
      if (node.type === "COMPONENT" || node.type === "INSTANCE") {
        structure2.isComponentInstanceReference = true;
        const hasAutoLayout = "layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE";
        if (hasAutoLayout && parentId) {
        }
      }
      if (this.isLikelyIcon(node)) {
        structure2.iconContext = this.determineIconContext(node, parentId);
        if (structure2.iconContext) {
          console.log(`  \u{1F3A8} Icon context for "${node.name}": ${structure2.iconContext}`);
        }
      }
    }
    /**
     * NEW: Enhanced icon detection
     */
    static isLikelyIcon(node) {
      const name = node.name.toLowerCase();
      if (node.type === "VECTOR") {
        return true;
      }
      if ((node.type === "COMPONENT" || node.type === "INSTANCE") && name.includes("icon")) {
        return true;
      }
      if ((node.type === "COMPONENT" || node.type === "INSTANCE") && "width" in node && "height" in node) {
        const maxDimension = Math.max(node.width, node.height);
        if (maxDimension <= 48) {
          console.log(`    \u{1F50D} Small component "${node.name}" (${node.width}x${node.height}) - likely icon`);
          return true;
        }
      }
      const iconKeywords = ["arrow", "chevron", "star", "heart", "plus", "minus", "close", "menu", "search", "check", "cross"];
      if (iconKeywords.some((keyword) => name.includes(keyword))) {
        return true;
      }
      return false;
    }
    /**
     * NEW: Determine whether to traverse children of a node
     */
    static shouldTraverseChildren(node) {
      if (node.type === "COMPONENT" || node.type === "INSTANCE") {
        const hasAutoLayout = "layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE";
        if (hasAutoLayout) {
          return true;
        }
        return false;
      }
      if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") {
        return true;
      }
      if (node.type === "FRAME" || node.type === "GROUP" || node.type === "COMPONENT_SET") {
        return true;
      }
      if (["TEXT", "VECTOR", "RECTANGLE", "ELLIPSE", "LINE", "STAR", "POLYGON"].includes(node.type)) {
        return false;
      }
      return true;
    }
    /**
     * NEW: Enhanced icon context determination based on position, parent, and siblings
     */
    static determineIconContext(node, parentId) {
      if (!parentId) return "standalone";
      const name = node.name.toLowerCase();
      if (name.includes("leading") || name.includes("start") || name.includes("left")) {
        return "leading";
      }
      if (name.includes("trailing") || name.includes("end") || name.includes("right") || name.includes("chevron") || name.includes("arrow")) {
        return "trailing";
      }
      if (name.includes("decoration") || name.includes("ornament") || name.includes("badge")) {
        return "decorative";
      }
      try {
        const parent = node.parent;
        if (parent && "children" in parent && parent.children) {
          return this.analyzeIconPositionInParent(node, parent);
        }
      } catch (error) {
        console.warn(`Could not analyze parent context for icon "${node.name}"`);
      }
      return "standalone";
    }
    /**
     * NEW: Analyze icon position within its parent to determine context
     */
    static analyzeIconPositionInParent(node, parent) {
      const children = parent.children;
      const nodeIndex = children.indexOf(node);
      if (nodeIndex === -1) return "standalone";
      const isAutoLayoutParent = "layoutMode" in parent && parent.layoutMode && parent.layoutMode !== "NONE";
      if (isAutoLayoutParent) {
        const layoutMode = parent.layoutMode;
        if (layoutMode === "HORIZONTAL") {
          if (nodeIndex === 0) {
            return "leading";
          }
          if (nodeIndex === children.length - 1) {
            return "trailing";
          }
        }
        if (layoutMode === "VERTICAL") {
          return "decorative";
        }
      }
      const hasTextSiblings = children.some((child) => child.type === "TEXT");
      if (hasTextSiblings) {
        const textNodes = children.filter((child) => child.type === "TEXT");
        const firstTextIndex = children.indexOf(textNodes[0]);
        if (nodeIndex < firstTextIndex) {
          return "leading";
        } else {
          return "trailing";
        }
      }
      if ("x" in node && "x" in parent && "width" in parent) {
        const relativeX = node.x;
        const parentWidth = parent.width;
        if (relativeX < parentWidth * 0.3) {
          return "leading";
        } else if (relativeX > parentWidth * 0.7) {
          return "trailing";
        }
      }
      return "standalone";
    }
    /**
     * NEW: Check if node is a visual node that can have style information
     */
    static isVisualNode(node) {
      return ["TEXT", "RECTANGLE", "ELLIPSE", "VECTOR", "FRAME", "COMPONENT", "INSTANCE"].includes(node.type);
    }
    /**
     * NEW: Extract text hierarchy for a single text node
     */
    static async extractSingleTextHierarchy(textNode) {
      const fontSize = typeof textNode.fontSize === "number" ? textNode.fontSize : 14;
      const fontWeight = textNode.fontWeight || "normal";
      const fontFamily = textNode.fontName && typeof textNode.fontName === "object" && textNode.fontName.family ? textNode.fontName.family : "Unknown";
      let characters;
      try {
        characters = textNode.characters || "[empty]";
      } catch (e) {
        characters = void 0;
      }
      let textColor;
      try {
        if (textNode.fills && Array.isArray(textNode.fills) && textNode.fills.length > 0) {
          const fillStyleId = "fillStyleId" in textNode ? textNode.fillStyleId : void 0;
          const styleId = fillStyleId && fillStyleId !== figma.mixed ? fillStyleId : void 0;
          const firstFill = textNode.fills[0];
          if (firstFill.visible !== false) {
            textColor = this.convertPaintToColorInfo(firstFill, styleId) || void 0;
          }
        }
      } catch (e) {
        console.warn(`Could not extract text color for "${textNode.name}"`);
      }
      let textStyleId;
      let textStyleName;
      let boundTextStyleId;
      try {
        textStyleId = textNode.textStyleId && textNode.textStyleId !== figma.mixed ? textNode.textStyleId : void 0;
        boundTextStyleId = void 0;
        if (textStyleId) {
          textStyleName = this.textStyleMap.get(textStyleId);
          if (!textStyleName) {
            const baseId = textStyleId.split(",")[0];
            const mapFormatId = baseId + ",";
            textStyleName = this.textStyleMap.get(mapFormatId) || this.textStyleMap.get(baseId);
            if (!textStyleName) {
              console.log(`\u{1F504} External textStyleId detected: ${textStyleId}, trying exact match fallback`);
              const weightValue2 = typeof fontWeight === "symbol" ? "normal" : fontWeight;
              textStyleName = this.findExactMatchingLocalStyle(fontSize, fontFamily, weightValue2);
              if (textStyleName) {
                console.log(`\u2705 External style mapped to local: "${textStyleName}"`);
              }
            }
          }
        }
      } catch (e) {
        console.warn(`Could not extract text style references for "${textNode.name}"`, e);
      }
      let classification = "tertiary";
      const weightValue = typeof fontWeight === "symbol" ? "normal" : fontWeight;
      const weight = String(weightValue).toLowerCase();
      if (weight.includes("bold") || weight.includes("700") || weight.includes("800") || weight.includes("900")) {
        classification = "primary";
      } else if (weight.includes("medium") || weight.includes("500") || weight.includes("600")) {
        classification = "secondary";
      }
      const usesDesignSystemStyle = !!(textStyleId || boundTextStyleId);
      return {
        nodeName: textNode.name,
        nodeId: textNode.id,
        fontSize,
        fontWeight: weightValue,
        // Use the cleaned weight value
        classification,
        visible: textNode.visible,
        characters,
        textColor,
        textStyleId,
        textStyleName,
        boundTextStyleId,
        usesDesignSystemStyle
      };
    }
    /**
     * NEW: Extract component instance for a single component/instance node
     */
    static async extractSingleComponentInstance(node) {
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
      return instance;
    }
    /**
     * NEW: Extract vector node for a single vector
     */
    static extractSingleVectorNode(vectorNode) {
      return {
        nodeName: vectorNode.name,
        nodeId: vectorNode.id,
        visible: vectorNode.visible
      };
    }
    /**
     * NEW: Extract image node for a single rectangle/ellipse
     */
    static extractSingleImageNode(node) {
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
      return {
        nodeName: node.name,
        nodeId: node.id,
        nodeType: node.type,
        visible: node.visible,
        hasImageFill
      };
    }
    /**
     * Analyzes a single component to extract metadata
     */
    static async analyzeComponent(comp) {
      const name = comp.name;
      const suggestedType = this.guessComponentType(name.toLowerCase());
      const confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
      console.log(`\u{1F3D7}\uFE0F Building hierarchical structure for "${comp.name}"`);
      let componentStructure;
      try {
        let nodeToAnalyze = comp;
        if (comp.type === "COMPONENT_SET" && comp.children.length > 0) {
          nodeToAnalyze = comp.defaultVariant || comp.children[0];
        }
      } catch (error) {
        console.warn(`\u26A0\uFE0F Failed to build hierarchical structure for "${comp.name}":`, error);
      }
      const styleInfo = this.extractStyleInfo(comp);
      const internalPadding = this.extractInternalPadding(comp);
      if (internalPadding) {
        console.log(`\u{1F4CF} Found internal padding for "${comp.name}":`, internalPadding);
      }
      const autoLayoutBehavior = this.analyzeAutoLayoutBehavior(comp);
      if (autoLayoutBehavior && autoLayoutBehavior.isAutoLayout) {
        console.log(`\u{1F3AF} Found auto-layout behavior for "${comp.name}":`, autoLayoutBehavior.layoutMode);
      }
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
        textLayers: void 0,
        // DEPRECATED: Disabled for optimization
        textHierarchy: void 0,
        // DEPRECATED: Disabled for optimization
        componentInstances: void 0,
        // DEPRECATED: Disabled for optimization
        vectorNodes: void 0,
        // DEPRECATED: Disabled for optimization
        imageNodes: void 0,
        // DEPRECATED: Disabled for optimization
        styleInfo,
        // NEW: Include color and style information
        internalPadding: internalPadding || void 0,
        // NEW: Include internal padding information
        autoLayoutBehavior: autoLayoutBehavior || void 0,
        // NEW: Include auto-layout behavior analysis
        componentStructure: void 0,
        // DEPRECATED: Disabled for optimization
        isFromLibrary: false
      };
    }
    /**
     * NEW: Count total nodes in component structure (for debugging)
     */
    static countStructureNodes(structure2) {
      let count = 1;
      if (structure2.children && structure2.children.length > 0) {
        for (const child of structure2.children) {
          count += this.countStructureNodes(child);
        }
      }
      return count;
    }
    /**
     * NEW: Optimized component analysis for LLM context (replaces heavy analyzeComponent)
     */
    static async analyzeComponentOptimized(comp) {
      console.log(`\u{1F680} Optimized analysis for "${comp.name}"`);
      try {
        const name = comp.name;
        const suggestedType = this.guessComponentType(name.toLowerCase());
        const confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
        const variantOptions = this.extractVariantOptionsOptimized(comp);
        const textSlots = this.extractTextSlotsOptimized(comp);
        const componentSlots = await this.extractComponentSlotsOptimized(comp);
        const layoutBehavior = this.extractLayoutBehaviorOptimized(comp);
        const styleContext = this.extractStyleContextOptimized(comp);
        console.log(`\u2705 Optimized analysis complete for "${name}"`);
        return {
          id: comp.id,
          name,
          suggestedType,
          confidence,
          isFromLibrary: false,
          variantOptions,
          textSlots,
          componentSlots,
          layoutBehavior,
          styleContext
        };
      } catch (error) {
        console.error(`\u274C Failed to analyze component "${comp.name}":`, error);
        try {
          console.log(`\u{1F504} Retrying with basic analysis for "${comp.name}"`);
          const name = comp.name;
          const suggestedType = this.guessComponentType(name.toLowerCase());
          const confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
          return {
            id: comp.id,
            name,
            suggestedType,
            confidence: Math.max(0.1, confidence - 0.3),
            // Lower confidence for failed analysis
            isFromLibrary: false
          };
        } catch (retryError) {
          console.error(`\u274C Retry failed for component "${comp.name}":`, retryError);
          throw new Error(`Component analysis completely failed for "${comp.name}": ${retryError.message}`);
        }
      }
    }
    /**
     * Extract variant options only (no combinations)
     */
    static extractVariantOptionsOptimized(comp) {
      if (comp.type !== "COMPONENT_SET") return void 0;
      const variantOptions = {};
      const variantProps = comp.variantGroupProperties;
      if (!variantProps) return void 0;
      for (const [propName, prop] of Object.entries(variantProps)) {
        if ("values" in prop && prop.values.length > 0) {
          variantOptions[propName] = prop.values;
        }
      }
      return Object.keys(variantOptions).length > 0 ? variantOptions : void 0;
    }
    /**
     * Extract text slots with exact names (SHALLOW - no recursion)
     */
    static extractTextSlotsOptimized(comp) {
      const slots = {};
      const nodeToAnalyze = comp.type === "COMPONENT_SET" ? comp.defaultVariant || comp.children[0] : comp;
      if (!nodeToAnalyze || !("children" in nodeToAnalyze)) return void 0;
      for (const child of nodeToAnalyze.children) {
        if (child.type === "TEXT") {
          const textNode = child;
          slots[child.name] = {
            required: child.visible !== false,
            type: textNode.textAutoResize === "HEIGHT" ? "multi-line" : "single-line",
            maxLength: this.estimateMaxLength(textNode)
          };
        }
      }
      return Object.keys(slots).length > 0 ? slots : void 0;
    }
    /**
     * Extract component slots with exact names (SHALLOW - references only)
     */
    static async extractComponentSlotsOptimized(comp) {
      const slots = {};
      const nodeToAnalyze = comp.type === "COMPONENT_SET" ? comp.defaultVariant || comp.children[0] : comp;
      if (!nodeToAnalyze || !("children" in nodeToAnalyze)) return void 0;
      for (const child of nodeToAnalyze.children) {
        if (child.type === "INSTANCE") {
          const instance = child;
          try {
            const mainComp = await instance.getMainComponentAsync();
            const category = this.guessComponentCategory((mainComp == null ? void 0 : mainComp.name) || child.name);
            slots[child.name] = {
              componentId: mainComp == null ? void 0 : mainComp.id,
              category,
              swappable: true,
              required: child.visible !== false
            };
          } catch (error) {
            console.warn(`Failed to analyze component slot "${child.name}"`);
          }
        }
      }
      return Object.keys(slots).length > 0 ? slots : void 0;
    }
    /**
     * Extract layout behavior (semantic, no absolute coordinates)
     */
    static extractLayoutBehaviorOptimized(comp) {
      const node = comp.type === "COMPONENT_SET" ? comp.defaultVariant || comp.children[0] : comp;
      if (!node || !("layoutMode" in node) || node.layoutMode === "NONE") {
        return void 0;
      }
      const isIcon = "width" in node && "height" in node && Math.max(node.width, node.height) <= 48;
      const isTouchTarget = "height" in node && node.height >= 44;
      return {
        type: node.primaryAxisSizingMode === "AUTO" ? "hug-content" : node.layoutAlign === "STRETCH" ? "fill-container" : "fixed",
        direction: node.layoutMode === "HORIZONTAL" ? "horizontal" : "vertical",
        hasInternalPadding: (node.paddingTop || 0) > 0,
        canWrap: node.layoutWrap === "WRAP",
        minHeight: node.minHeight || void 0,
        isIcon,
        isTouchTarget
      };
    }
    /**
     * Extract style context (design system colors only, no detailed fills)
     */
    static extractStyleContextOptimized(comp) {
      var _a;
      const node = comp.type === "COMPONENT_SET" ? comp.defaultVariant || comp.children[0] : comp;
      let primaryColor;
      try {
        const styleInfo = this.extractStyleInfo(node);
        primaryColor = (_a = styleInfo == null ? void 0 : styleInfo.primaryColor) == null ? void 0 : _a.paintStyleName;
      } catch (error) {
      }
      const hasImageSlot = this.hasImageSlotShallow(node);
      const semanticRole = this.inferSemanticRole(comp.name, comp.id);
      return {
        primaryColor,
        hasImageSlot,
        semanticRole
      };
    }
    /**
     * Helper: Guess component category for slots
     */
    static guessComponentCategory(name) {
      const lowName = name.toLowerCase();
      if (lowName.includes("icon")) return "icon";
      if (lowName.includes("button") || lowName.includes("btn")) return "button";
      if (lowName.includes("input") || lowName.includes("field")) return "input";
      if (lowName.includes("image") || lowName.includes("photo")) return "image";
      return "container";
    }
    /**
     * Helper: Estimate max text length
     */
    static estimateMaxLength(textNode) {
      if (!textNode.width) return void 0;
      const avgCharWidth = (textNode.fontSize || 14) * 0.6;
      const lines = textNode.textAutoResize === "HEIGHT" ? 3 : 1;
      return Math.floor(textNode.width / avgCharWidth * lines);
    }
    /**
     * Helper: Check for image slots (shallow)
     */
    static hasImageSlotShallow(node) {
      if (!node || !("children" in node)) return false;
      for (const child of node.children) {
        if (child.type === "RECTANGLE" || child.type === "ELLIPSE") {
          try {
            const fills = child.fills;
            if (Array.isArray(fills) && fills.some((f) => f.type === "IMAGE")) {
              return true;
            }
          } catch (error) {
          }
        }
      }
      return false;
    }
    /**
     * Helper: Infer semantic role
     */
    static inferSemanticRole(name, id) {
      const lowName = name.toLowerCase();
      if (lowName.includes("nav") || lowName.includes("tab") || lowName.includes("menu")) {
        return "navigation";
      }
      if (lowName.includes("button") || lowName.includes("cta")) {
        return "action";
      }
      if (lowName.includes("card") || lowName.includes("item") || lowName.includes("list")) {
        return "display";
      }
      if (lowName.includes("input") || lowName.includes("field") || lowName.includes("form")) {
        return "input";
      }
      return "container";
    }
    /**
     * NEW: Generate a summary of component structure for debugging
     */
    static generateStructureSummary(structure2, indent = "") {
      var _a, _b;
      let summary = `${indent}${structure2.type}:${structure2.name} (id:${structure2.id.slice(-8)})`;
      const flags = [];
      if (structure2.isNestedAutoLayout) flags.push("\u{1F3AF}nested-auto");
      if (structure2.isComponentInstanceReference) flags.push("\u{1F4E6}comp-ref");
      if (structure2.iconContext) flags.push(`\u{1F3A8}${structure2.iconContext}`);
      if (flags.length > 0) {
        summary += ` [${flags.join(", ")}]`;
      }
      if (structure2.nodeProperties) {
        const props = [];
        if ((_a = structure2.nodeProperties.autoLayoutBehavior) == null ? void 0 : _a.isAutoLayout) {
          props.push(`auto-layout:${structure2.nodeProperties.autoLayoutBehavior.layoutMode}`);
        }
        if (structure2.nodeProperties.textHierarchy) {
          props.push(`text:${((_b = structure2.nodeProperties.textHierarchy.characters) == null ? void 0 : _b.slice(0, 20)) || "empty"}`);
        }
        if (structure2.nodeProperties.componentInstance) {
          props.push("component-instance");
        }
        if (structure2.nodeProperties.vectorNode) {
          props.push("vector");
        }
        if (structure2.nodeProperties.imageNode) {
          props.push(`image:${structure2.nodeProperties.imageNode.hasImageFill ? "has-fill" : "no-fill"}`);
        }
        if (props.length > 0) {
          summary += ` {${props.join(", ")}}`;
        }
      }
      summary += `
`;
      if (structure2.children && structure2.children.length > 0) {
        for (const child of structure2.children) {
          summary += this.generateStructureSummary(child, indent + "  ");
        }
      }
      return summary;
    }
    /**
     * NEW: Test function to analyze a specific component by ID and log the structure
     */
    static async testComponentStructure(componentId) {
      try {
        const component = figma.getNodeById(componentId);
        if (!component) {
          console.error(`\u274C Component not found: ${componentId}`);
          return;
        }
        if (component.type !== "COMPONENT" && component.type !== "COMPONENT_SET") {
          console.error(`\u274C Node is not a component: ${component.type}`);
          return;
        }
        const nodeCount = this.countStructureNodes(structure);
        const depthStats = this.calculateDepthStatistics(structure);
      } catch (error) {
        console.error(`\u274C Error testing component structure:`, error);
      }
    }
    /**
     * NEW: Calculate depth statistics for a component structure
     */
    static calculateDepthStatistics(structure2) {
      const depthCounts = {};
      let totalNodes = 0;
      let totalDepth = 0;
      let maxDepth = 0;
      const traverse = (node) => {
        const depth = node.depth;
        depthCounts[depth] = (depthCounts[depth] || 0) + 1;
        totalNodes++;
        totalDepth += depth;
        maxDepth = Math.max(maxDepth, depth);
        if (node.children) {
          for (const child of node.children) {
            traverse(child);
          }
        }
      };
      traverse(structure2);
      return {
        maxDepth,
        nodesByDepth: depthCounts,
        avgDepth: totalNodes > 0 ? totalDepth / totalNodes : 0
      };
    }
    /**
     * NEW: Quick test with known component IDs from JSON data
     */
    static async runQuickTests() {
      const testComponentIds = [
        "10:3856",
        // snackbar
        "10:3907",
        // Button
        "10:3918"
        // Another component if exists
      ];
      for (const componentId of testComponentIds) {
        try {
          await this.testComponentStructure(componentId);
        } catch (error) {
          console.warn(`\u26A0\uFE0F Failed to test component ${componentId}:`, error);
        }
      }
    }
    /**
     * NEW: Export a component structure to JSON for inspection
     */
    static async exportComponentStructureToJson(componentId) {
      try {
        const component = figma.getNodeById(componentId);
        if (!component || component.type !== "COMPONENT" && component.type !== "COMPONENT_SET") {
          console.error(`\u274C Invalid component: ${componentId}`);
          return null;
        }
        return JSON.stringify({}, null, 2);
      } catch (error) {
        console.error(`\u274C Error exporting component structure:`, error);
        return null;
      }
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
     * NEW: Normalize fontWeight to comparable format
     */
    static normalizeFontWeight(fontWeight) {
      if (typeof fontWeight === "number") {
        if (fontWeight <= 300) return "Light";
        if (fontWeight <= 400) return "Regular";
        if (fontWeight <= 500) return "Medium";
        if (fontWeight <= 600) return "SemiBold";
        if (fontWeight <= 700) return "Bold";
        return "ExtraBold";
      }
      const weight = String(fontWeight).toLowerCase();
      if (weight.includes("regular") || weight.includes("normal")) return "Regular";
      if (weight.includes("medium")) return "Medium";
      if (weight.includes("light")) return "Light";
      if (weight.includes("bold")) return "Bold";
      if (weight.includes("semibold")) return "SemiBold";
      if (weight.includes("extrabold") || weight.includes("black")) return "ExtraBold";
      return String(fontWeight);
    }
    /**
     * NEW: Find exact matching local text style based on fontSize, fontFamily, and fontWeight
     * Used as fallback when external textStyleId is not found in local styles
     */
    static findExactMatchingLocalStyle(fontSize, fontFamily, fontWeight) {
      const normalizedWeight = this.normalizeFontWeight(fontWeight);
      console.log(`\u{1F50D} Looking for exact match: ${fontSize}px, ${fontFamily}, ${normalizedWeight} (original: ${fontWeight})`);
      for (const [styleId, styleDetails] of this.textStyleDetails.entries()) {
        const styleNormalizedWeight = this.normalizeFontWeight(styleDetails.fontWeight);
        if (styleDetails.fontSize === fontSize && styleDetails.fontFamily === fontFamily && styleNormalizedWeight === normalizedWeight) {
          console.log(`\u2705 Exact match found: "${styleDetails.name}" (${styleId})`);
          return styleDetails.name;
        }
      }
      console.warn(`\u274C No exact match found for: ${fontSize}px, ${fontFamily}, ${normalizedWeight}`);
      return void 0;
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
    static async analyzeTextHierarchy(comp) {
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
                const fontWeightValue = typeof fontWeight === "symbol" ? "normal" : fontWeight;
                const fontFamily = textNode.fontName && typeof textNode.fontName === "object" && textNode.fontName.family ? textNode.fontName.family : "Unknown";
                fontSizes.push(fontSize);
                textNodeData.push({ node: textNode, fontSize, fontWeight: fontWeightValue, fontFamily });
              } catch (e) {
                console.warn(`Could not read font properties for text node "${textNode.name}"`);
              }
            }
          });
          const uniqueSizes = [...new Set(fontSizes)].sort((a, b) => b - a);
          for (const { node, fontSize, fontWeight, fontFamily } of textNodeData) {
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
            let textColor;
            try {
              if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
                const fillStyleId = "fillStyleId" in node ? node.fillStyleId : void 0;
                const styleId = fillStyleId && fillStyleId !== figma.mixed ? fillStyleId : void 0;
                const firstFill = node.fills[0];
                if (firstFill.visible !== false) {
                  textColor = this.convertPaintToColorInfo(firstFill, styleId) || void 0;
                }
              }
            } catch (e) {
              console.warn(`Could not extract text color for "${node.name}"`);
            }
            let textStyleId;
            let textStyleName;
            let boundTextStyleId;
            try {
              textStyleId = node.textStyleId && node.textStyleId !== figma.mixed ? node.textStyleId : void 0;
              boundTextStyleId = void 0;
              if (textStyleId) {
                textStyleName = this.textStyleMap.get(textStyleId);
                if (!textStyleName) {
                  const baseId = textStyleId.split(",")[0];
                  const mapFormatId = baseId + ",";
                  textStyleName = this.textStyleMap.get(mapFormatId) || this.textStyleMap.get(baseId);
                  if (!textStyleName) {
                    console.log(`\u{1F504} External textStyleId detected: ${textStyleId}, trying exact match fallback`);
                    textStyleName = this.findExactMatchingLocalStyle(fontSize, fontFamily, fontWeight);
                    if (textStyleName) {
                      console.log(`\u2705 External style mapped to local: "${textStyleName}"`);
                    }
                  }
                }
              }
            } catch (e) {
              console.warn(`Could not extract text style references for "${node.name}"`, e);
            }
            const usesDesignSystemStyle = !!(textStyleId || boundTextStyleId);
            textHierarchy.push({
              nodeName: node.name,
              nodeId: node.id,
              fontSize,
              fontWeight,
              classification,
              visible: node.visible,
              characters,
              textColor,
              // Include text color information
              // NEW: Include Design System references
              textStyleId,
              textStyleName,
              boundTextStyleId,
              usesDesignSystemStyle
            });
          }
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
     * Generate LLM prompt based on scanned components and color styles
     */
    static generateLLMPrompt(components, colorStyles) {
      var _a;
      const componentsByType = {};
      components.forEach((comp) => {
        if (comp.confidence >= 0.7) {
          if (!componentsByType[comp.suggestedType]) componentsByType[comp.suggestedType] = [];
          componentsByType[comp.suggestedType].push(comp);
        }
      });
      let prompt = `# AIDesigner JSON Generation Instructions

`;
      if (colorStyles) {
        const totalColorStyles = Object.values(colorStyles).reduce((sum, styles) => sum + styles.length, 0);
        if (totalColorStyles > 0) {
          prompt += `## Available Color Styles in Design System:

`;
          Object.entries(colorStyles).forEach(([category, styles]) => {
            if (styles.length > 0) {
              prompt += `### ${category.toUpperCase()} COLORS
`;
              styles.forEach((style) => {
                prompt += `- **${style.name}**: ${style.colorInfo.color}`;
                if (style.variant) {
                  prompt += ` (variant: ${style.variant})`;
                }
                if (style.description) {
                  prompt += ` - ${style.description}`;
                }
                prompt += `
`;
              });
              prompt += `
`;
            }
          });
          prompt += `### Color Usage Guidelines:
`;
          prompt += `- Use PRIMARY colors for main actions, headers, and brand elements
`;
          prompt += `- Use SECONDARY colors for supporting actions and accents
`;
          prompt += `- Use NEUTRAL colors for text, backgrounds, and borders
`;
          prompt += `- Use SEMANTIC colors for success/error/warning states
`;
          prompt += `- Use SURFACE colors for backgrounds and containers
`;
          prompt += `- Reference colors by their exact name: "${((_a = colorStyles.primary[0]) == null ? void 0 : _a.name) || "Primary/500"}"

`;
        }
      }
      prompt += `## CRITICAL RENDERER CONSTRAINTS

`;
      prompt += `### The ONLY native elements supported:
`;
      prompt += `- **native-text**: Text elements with styling
`;
      prompt += `- **native-rectangle**: Rectangles (supports image fills)
`;
      prompt += `- **native-circle**: Circles/ellipses (supports image fills)

`;
      prompt += `### NEVER use these (they don't exist):
`;
      prompt += `- \u274C native-grid (use layoutContainer with wrap)
`;
      prompt += `- \u274C native-list-item (use list components)
`;
      prompt += `- \u274C native-rating (use star components)
`;
      prompt += `- \u274C native-image (use native-rectangle with image fill)
`;
      prompt += `- \u274C Any other native-* type

`;
      prompt += `### Sizing Rules:
`;
      prompt += `- \u2705 Use "horizontalSizing": "FILL" for full width
`;
      prompt += `- \u2705 Use numeric values for fixed width (e.g., 200)
`;
      prompt += `- \u274C NEVER use percentages like "50%" or "100%"

`;
      prompt += `## Available Components in Design System:

`;
      Object.keys(componentsByType).sort().forEach((type) => {
        var _a2, _b, _c, _d, _e, _f;
        const comps = componentsByType[type];
        const bestComponent = comps.sort((a, b) => b.confidence - a.confidence)[0];
        prompt += `### ${type.toUpperCase()}
`;
        prompt += `- Component ID: "${bestComponent.id}"
`;
        prompt += `- Component Name: "${bestComponent.name}"
`;
        if ((_a2 = bestComponent.textLayers) == null ? void 0 : _a2.length) prompt += `- Text Layers: ${bestComponent.textLayers.map((l) => `"${l}"`).join(", ")}
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
    /**
     * NEW: Build Variable Maps (similar to buildTextStyleMap)
     */
    static buildVariableMap(variables) {
      if (variables && variables.length > 0) {
        this.variableMap.clear();
        this.variableDetails.clear();
        variables.forEach((variable) => {
          var _a;
          this.variableMap.set(variable.id, variable.name);
          this.variableDetails.set(variable.id, {
            id: variable.id,
            name: variable.name,
            resolvedType: variable.resolvedType,
            scopes: variable.scopes || [],
            collection: (_a = variable.collection) == null ? void 0 : _a.name
          });
        });
        console.log(`\u2705 Built variable lookup map with ${this.variableMap.size} entries`);
        const firstEntries = Array.from(this.variableMap.entries()).slice(0, 3);
        console.log("\u{1F50D} First variable IDs in map:", firstEntries);
      }
    }
    /**
     * NEW: Extract color and style information from component
     */
    static extractStyleInfo(node) {
      var _a, _b, _c;
      const styleInfo = {};
      try {
        let primaryNode = node;
        if (node.type === "COMPONENT_SET" && node.children.length > 0) {
          primaryNode = node.children[0];
        }
        const fills = this.extractFills(primaryNode);
        if (fills.length > 0) {
          styleInfo.fills = fills;
          styleInfo.primaryColor = fills[0];
        }
        const strokes = this.extractStrokes(primaryNode);
        if (strokes.length > 0) {
          styleInfo.strokes = strokes;
        }
        const textColor = this.findPrimaryTextColor(primaryNode);
        if (textColor) {
          styleInfo.textColor = textColor;
        }
        const backgroundColor = this.findBackgroundColor(primaryNode);
        if (backgroundColor) {
          styleInfo.backgroundColor = backgroundColor;
        }
        if (styleInfo.primaryColor || styleInfo.backgroundColor || styleInfo.textColor) {
          console.log(`\u{1F3A8} Colors extracted for "${node.name}":`, {
            primary: (_a = styleInfo.primaryColor) == null ? void 0 : _a.color,
            background: (_b = styleInfo.backgroundColor) == null ? void 0 : _b.color,
            text: (_c = styleInfo.textColor) == null ? void 0 : _c.color
          });
        }
      } catch (error) {
        console.warn(`\u26A0\uFE0F Error extracting style info for "${node.name}":`, error);
      }
      return styleInfo;
    }
    /**
     * Extract fill colors from a node
     */
    static extractFills(node) {
      const colorInfos = [];
      try {
        if ("fills" in node && node.fills && Array.isArray(node.fills)) {
          const fillStyleId = "fillStyleId" in node ? node.fillStyleId : void 0;
          const styleId = fillStyleId && fillStyleId !== figma.mixed ? fillStyleId : void 0;
          for (const fill of node.fills) {
            if (fill.visible !== false) {
              const colorInfo = this.convertPaintToColorInfo(fill, styleId);
              if (colorInfo) {
                colorInfos.push(colorInfo);
              }
            }
          }
        }
      } catch (error) {
        console.warn("Error extracting fills:", error);
      }
      return colorInfos;
    }
    /**
     * Extract stroke colors from a node
     */
    static extractStrokes(node) {
      const colorInfos = [];
      try {
        if ("strokes" in node && node.strokes && Array.isArray(node.strokes)) {
          const strokeStyleId = "strokeStyleId" in node ? node.strokeStyleId : void 0;
          const styleId = strokeStyleId && typeof strokeStyleId === "string" ? strokeStyleId : void 0;
          for (const stroke of node.strokes) {
            if (stroke.visible !== false) {
              const colorInfo = this.convertPaintToColorInfo(stroke, styleId);
              if (colorInfo) {
                colorInfos.push(colorInfo);
              }
            }
          }
        }
      } catch (error) {
        console.warn("Error extracting strokes:", error);
      }
      return colorInfos;
    }
    /**
     * Convert Figma Paint to ColorInfo
     * @param paint Paint object from Figma API
     * @param styleId Optional fillStyleId or strokeStyleId from the node
     */
    static convertPaintToColorInfo(paint, styleId) {
      var _a, _b;
      try {
        if (paint.type === "SOLID" && paint.color) {
          let designToken;
          let usesDesignToken = false;
          if ((_b = (_a = paint.boundVariables) == null ? void 0 : _a.color) == null ? void 0 : _b.id) {
            const variableId = paint.boundVariables.color.id;
            designToken = this.variableMap.get(variableId);
            usesDesignToken = !!designToken;
            if (designToken) {
              console.log(`\u{1F3A8} Resolved variable: ${variableId} \u2192 "${designToken}"`);
            } else {
              console.warn(`\u26A0\uFE0F Variable ID not found in map: ${variableId}`);
            }
          }
          let paintStyleName;
          if (styleId) {
            paintStyleName = this.paintStyleMap.get(styleId);
            if (!paintStyleName) {
              const baseId = styleId.split(",")[0];
              const mapFormatId = baseId + ",";
              paintStyleName = this.paintStyleMap.get(mapFormatId) || this.paintStyleMap.get(baseId);
            }
          }
          return {
            type: "SOLID",
            color: this.rgbToHex(paint.color),
            opacity: paint.opacity || 1,
            // NEW: Design System color style references
            paintStyleId: void 0,
            // GradientPaint doesn't have paintStyleId
            paintStyleName,
            boundVariables: paint.boundVariables || void 0,
            usesDesignSystemColor: !!(styleId || usesDesignToken),
            // NEW: Design Token fields
            designToken,
            usesDesignToken
          };
        }
        if (paint.type === "GRADIENT_LINEAR" && paint.gradientStops) {
          let paintStyleName;
          if (styleId) {
            paintStyleName = this.paintStyleMap.get(styleId);
            if (!paintStyleName) {
              const baseId = styleId.split(",")[0];
              const mapFormatId = baseId + ",";
              paintStyleName = this.paintStyleMap.get(mapFormatId) || this.paintStyleMap.get(baseId);
            }
          }
          return {
            type: "GRADIENT_LINEAR",
            gradientStops: paint.gradientStops.map((stop) => ({
              color: this.rgbToHex(stop.color),
              position: stop.position
            })),
            opacity: paint.opacity || 1,
            // NEW: Design System color style references
            paintStyleId: void 0,
            // GradientPaint doesn't have paintStyleId
            paintStyleName,
            boundVariables: void 0,
            // GradientPaint doesn't have boundVariables 
            usesDesignSystemColor: !!styleId,
            // NEW: Design Token fields (gradients don't typically use color variables)
            designToken: void 0,
            usesDesignToken: false
          };
        }
        if ((paint.type === "GRADIENT_RADIAL" || paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") && paint.gradientStops) {
          let paintStyleName;
          if (styleId) {
            paintStyleName = this.paintStyleMap.get(styleId);
            if (!paintStyleName) {
              const baseId = styleId.split(",")[0];
              const mapFormatId = baseId + ",";
              paintStyleName = this.paintStyleMap.get(mapFormatId) || this.paintStyleMap.get(baseId);
            }
          }
          return {
            type: paint.type,
            gradientStops: paint.gradientStops.map((stop) => ({
              color: this.rgbToHex(stop.color),
              position: stop.position
            })),
            opacity: paint.opacity || 1,
            // NEW: Design System color style references
            paintStyleId: void 0,
            // GradientPaint doesn't have paintStyleId
            paintStyleName,
            boundVariables: void 0,
            // GradientPaint doesn't have boundVariables 
            usesDesignSystemColor: !!styleId,
            // NEW: Design Token fields (gradients don't typically use color variables)
            designToken: void 0,
            usesDesignToken: false
          };
        }
        if (paint.type === "IMAGE") {
          return {
            type: "IMAGE",
            opacity: paint.opacity || 1,
            // NEW: Design Token fields (images don't use color variables)
            designToken: void 0,
            usesDesignToken: false
          };
        }
      } catch (error) {
        console.warn("Error converting paint to color info:", error);
      }
      return null;
    }
    /**
     * Convert RGB to hex color
     */
    static rgbToHex(rgb) {
      const toHex = (value) => {
        const hex = Math.round(value * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };
      return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    }
    /**
     * Find primary text color by analyzing text nodes
     */
    static findPrimaryTextColor(node) {
      try {
        if (!("findAll" in node)) {
          return null;
        }
        const textNodes = node.findAll((n) => n.type === "TEXT");
        for (const textNode of textNodes) {
          if (textNode.visible && textNode.fills && Array.isArray(textNode.fills)) {
            for (const fill of textNode.fills) {
              if (fill.visible !== false && fill.type === "SOLID") {
                const styleId = textNode.fillStyleId && typeof textNode.fillStyleId === "string" ? textNode.fillStyleId : void 0;
                return this.convertPaintToColorInfo(fill, styleId);
              }
            }
          }
        }
      } catch (error) {
        console.warn("Error finding text color:", error);
      }
      return null;
    }
    /**
     * Find background color by analyzing the largest rectangle or container
     */
    static findBackgroundColor(node) {
      try {
        if (!("findAll" in node)) {
          return null;
        }
        const rectangles = node.findAll(
          (n) => n.type === "RECTANGLE" || n.type === "FRAME" || n.type === "COMPONENT"
        );
        rectangles.sort((a, b) => {
          const areaA = a.width * a.height;
          const areaB = b.width * b.height;
          return areaB - areaA;
        });
        for (const rect of rectangles) {
          if ("fills" in rect && rect.fills && Array.isArray(rect.fills)) {
            for (const fill of rect.fills) {
              if (fill.visible !== false) {
                const styleId = "fillStyleId" in rect && rect.fillStyleId && typeof rect.fillStyleId === "string" ? rect.fillStyleId : void 0;
                const colorInfo = this.convertPaintToColorInfo(fill, styleId);
                if (colorInfo && colorInfo.type === "SOLID") {
                  return colorInfo;
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn("Error finding background color:", error);
      }
      return null;
    }
    /**
     * NEW: Analyze auto-layout behavior of a component or frame
     * Extracts comprehensive auto-layout properties including nested behavior
     */
    static analyzeAutoLayoutBehavior(node) {
      try {
        console.log(`\u{1F3AF} Analyzing auto-layout behavior for "${node.name}" (${node.type})`);
        if (!("layoutMode" in node) || !node.layoutMode || node.layoutMode === "NONE") {
          console.log(`  \u274C No auto-layout detected for "${node.name}"`);
          return {
            isAutoLayout: false,
            layoutMode: "NONE"
          };
        }
        console.log(`  \u2705 Auto-layout detected: ${node.layoutMode}`);
        const behavior = {
          isAutoLayout: true,
          layoutMode: node.layoutMode
        };
        if ("primaryAxisSizingMode" in node && node.primaryAxisSizingMode) {
          behavior.primaryAxisSizingMode = node.primaryAxisSizingMode;
          console.log(`    primaryAxisSizingMode: ${behavior.primaryAxisSizingMode}`);
        }
        if ("counterAxisSizingMode" in node && node.counterAxisSizingMode) {
          behavior.counterAxisSizingMode = node.counterAxisSizingMode;
          console.log(`    counterAxisSizingMode: ${behavior.counterAxisSizingMode}`);
        }
        if ("layoutWrap" in node && node.layoutWrap) {
          behavior.layoutWrap = node.layoutWrap;
          console.log(`    layoutWrap: ${behavior.layoutWrap}`);
        }
        if ("itemSpacing" in node && typeof node.itemSpacing === "number") {
          behavior.itemSpacing = node.itemSpacing;
          console.log(`    itemSpacing: ${behavior.itemSpacing}`);
        }
        if ("counterAxisSpacing" in node && typeof node.counterAxisSpacing === "number") {
          behavior.counterAxisSpacing = node.counterAxisSpacing;
          console.log(`    counterAxisSpacing: ${behavior.counterAxisSpacing}`);
        }
        if ("paddingLeft" in node && typeof node.paddingLeft === "number") {
          behavior.paddingLeft = node.paddingLeft;
        }
        if ("paddingRight" in node && typeof node.paddingRight === "number") {
          behavior.paddingRight = node.paddingRight;
        }
        if ("paddingTop" in node && typeof node.paddingTop === "number") {
          behavior.paddingTop = node.paddingTop;
        }
        if ("paddingBottom" in node && typeof node.paddingBottom === "number") {
          behavior.paddingBottom = node.paddingBottom;
        }
        console.log(`    padding: T${behavior.paddingTop || 0} R${behavior.paddingRight || 0} B${behavior.paddingBottom || 0} L${behavior.paddingLeft || 0}`);
        if ("primaryAxisAlignItems" in node && node.primaryAxisAlignItems) {
          behavior.primaryAxisAlignItems = node.primaryAxisAlignItems;
          console.log(`    primaryAxisAlignItems: ${behavior.primaryAxisAlignItems}`);
        }
        if ("counterAxisAlignItems" in node && node.counterAxisAlignItems) {
          behavior.counterAxisAlignItems = node.counterAxisAlignItems;
          console.log(`    counterAxisAlignItems: ${behavior.counterAxisAlignItems}`);
        }
        if ("counterAxisAlignContent" in node && node.counterAxisAlignContent) {
          behavior.counterAxisAlignContent = node.counterAxisAlignContent;
          console.log(`    counterAxisAlignContent: ${behavior.counterAxisAlignContent}`);
        }
        if ("itemReverseZIndex" in node && typeof node.itemReverseZIndex === "boolean") {
          behavior.itemReverseZIndex = node.itemReverseZIndex;
          console.log(`    itemReverseZIndex: ${behavior.itemReverseZIndex}`);
        }
        if ("layoutPositioning" in node && node.layoutPositioning) {
          behavior.layoutPositioning = node.layoutPositioning;
          console.log(`    layoutPositioning: ${behavior.layoutPositioning}`);
        }
        if ("children" in node && node.children && node.children.length > 0) {
          console.log(`    \u{1F50D} Analyzing ${node.children.length} children for nested auto-layout...`);
          const childrenBehavior = [];
          for (const child of node.children) {
            try {
              const childBehavior = {
                nodeId: child.id,
                nodeName: child.name,
                nodeType: child.type
              };
              if ("layoutAlign" in child && child.layoutAlign) {
                childBehavior.layoutAlign = child.layoutAlign;
              }
              if ("layoutGrow" in child && typeof child.layoutGrow === "number") {
                childBehavior.layoutGrow = child.layoutGrow;
              }
              if ("layoutSizingHorizontal" in child && child.layoutSizingHorizontal) {
                childBehavior.layoutSizingHorizontal = child.layoutSizingHorizontal;
              }
              if ("layoutSizingVertical" in child && child.layoutSizingVertical) {
                childBehavior.layoutSizingVertical = child.layoutSizingVertical;
              }
              if ((child.type === "FRAME" || child.type === "COMPONENT" || child.type === "INSTANCE") && "layoutMode" in child && child.layoutMode && child.layoutMode !== "NONE") {
                childBehavior.autoLayoutBehavior = this.analyzeAutoLayoutBehavior(child);
              }
              childrenBehavior.push(childBehavior);
            } catch (childError) {
              console.warn(`      \u26A0\uFE0F Failed to analyze child "${child.name}":`, childError);
            }
          }
          if (childrenBehavior.length > 0) {
            behavior.childrenAutoLayoutBehavior = childrenBehavior;
            console.log(`    \u2705 Analyzed ${childrenBehavior.length} children behaviors`);
          }
        }
        console.log(`  \u2705 Auto-layout analysis completed for "${node.name}"`);
        return behavior;
      } catch (error) {
        console.warn(`\u274C Error analyzing auto-layout behavior for "${node.name}":`, error);
        return {
          isAutoLayout: false,
          layoutMode: "NONE"
        };
      }
    }
  };
  // Static cache for text style lookups (id -> name mapping)
  ComponentScanner.textStyleMap = /* @__PURE__ */ new Map();
  ComponentScanner.loggedMissingIds = /* @__PURE__ */ new Set();
  // NEW: Static cache for detailed text style properties (for exact matching)
  ComponentScanner.textStyleDetails = /* @__PURE__ */ new Map();
  // Static cache for color style lookups (id -> name mapping)
  ComponentScanner.paintStyleMap = /* @__PURE__ */ new Map();
  // NEW: Static cache for variable lookups (id -> name mapping)
  ComponentScanner.variableMap = /* @__PURE__ */ new Map();
  ComponentScanner.variableDetails = /* @__PURE__ */ new Map();
})();
