// component-scanner.ts
// Design system component scanning and analysis for AIDesigner

import { ComponentInfo, TextHierarchy, ComponentInstance, VectorNode, ImageNode, StyleInfo, ColorInfo, TextStyleDetails } from './session-manager';

export interface ColorStyle {
  id: string;
  name: string;
  description?: string;
  paints: Paint[];
  category?: 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'semantic' | 'surface' | 'other';
  variant?: string; // e.g., '50', '100', '900' for material design scales
  colorInfo: ColorInfo;
}

export interface ColorStyleCollection {
  primary: ColorStyle[];
  secondary: ColorStyle[];
  tertiary: ColorStyle[];
  neutral: ColorStyle[];
  semantic: ColorStyle[];
  surface: ColorStyle[];
  other: ColorStyle[];
}

export interface TextStyle {
  id: string;
  name: string;
  description?: string;
  
  // Core Typography Properties
  fontSize: number;
  fontName: FontName;
  lineHeight: LineHeight;
  letterSpacing: LetterSpacing;
  
  // Enhanced Properties
  textDecoration?: TextDecoration; // 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH'
  textCase?: TextCase; // 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS'
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  
  // Spacing Properties (if available)
  paragraphSpacing?: number;
  paragraphIndent?: number;
}

export interface DesignToken {
  id: string;
  name: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  value: any;
  collection: string;
  mode: string;
  description?: string;
}

export interface ScanSession {
  components: ComponentInfo[];
  colorStyles?: ColorStyleCollection;
  textStyles?: TextStyle[];
  designTokens?: DesignToken[]; // NEW: Design tokens support
  scanTime: number;
  version: string;
  fileKey?: string;
}

export class ComponentScanner {
  
  // Static cache for text style lookups (id -> name mapping)
  private static textStyleMap: Map<string, string> = new Map();
  private static loggedMissingIds: Set<string> = new Set();
  
  // NEW: Static cache for detailed text style properties (for exact matching)
  private static textStyleDetails: Map<string, TextStyleDetails> = new Map();
  
  // Static cache for color style lookups (id -> name mapping)
  private static paintStyleMap: Map<string, string> = new Map();
  
  /**
   * NEW: Scan Figma Variables (Design Tokens) from the local file
   */
  static async scanFigmaVariables(): Promise<DesignToken[]> {
    console.log("🔧 Scanning Figma Variables (Design Tokens)...");
    
    try {
      // Debug: Check if Variables API exists
      if (!figma.variables) {
        console.warn("❌ figma.variables API not available in this Figma version");
        return [];
      }
      
      console.log("✅ figma.variables API is available");
      
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      console.log(`✅ Found ${collections.length} variable collections`);
      
      // Debug: Check if we have any collections at all
      if (collections.length === 0) {
        console.warn("⚠️ No variable collections found. Possible reasons:");
        console.warn("  1. File has no Variables/Design Tokens defined");
        console.warn("  2. Variables are in a different library/file");
        console.warn("  3. Variables API permissions issue");
        
        // Try to get ALL variables (not just local)
        try {
          console.log("🔍 Checking for non-local variables...");
          // Note: This might not be available, but worth trying
        } catch (e) {
          console.log("📝 Non-local variable check not available");
        }
        
        return [];
      }
      
      const tokens: DesignToken[] = [];
      
      for (const collection of collections) {
        console.log(`📦 Processing collection: "${collection.name}" (ID: ${collection.id})`);
        
        try {
          // Correct way: use collection.variableIds and getVariableByIdAsync
          if (!collection.variableIds || collection.variableIds.length === 0) {
            console.log(`  No variables found in collection "${collection.name}"`);
            continue;
          }
          
          console.log(`  Found ${collection.variableIds.length} variable IDs in "${collection.name}"`);
          const variables = [];
          
          // Get each variable by ID
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
          
          // Debug: Log collection details
          console.log(`  Collection modes:`, Object.keys(collection.modes || {}));
          
          for (const variable of variables) {
            try {
              console.log(`    Processing variable: "${variable.name}" (Type: ${variable.resolvedType})`);
              
              // Get the first mode for the value
              const modes = Object.keys(variable.valuesByMode);
              console.log(`      Available modes: [${modes.join(', ')}]`);
              
              if (modes.length === 0) {
                console.warn(`      ⚠️ Variable "${variable.name}" has no modes`);
                continue;
              }
              
              const firstMode = modes[0];
              const value = variable.valuesByMode[firstMode];
              console.log(`      Using mode "${firstMode}" with value:`, value);
              
              const token: DesignToken = {
                id: variable.id,
                name: variable.name,
                type: variable.resolvedType,
                value: value,
                collection: collection.name,
                mode: firstMode,
                description: variable.description || undefined
              };
              
              tokens.push(token);
              
              if (variable.resolvedType === 'COLOR') {
                console.log(`🎨 Color token: "${variable.name}" = ${JSON.stringify(value)}`);
              } else {
                console.log(`🔧 ${variable.resolvedType} token: "${variable.name}"`);
              }
            } catch (varError) {
              console.warn(`⚠️ Failed to process variable "${variable.name}":`, varError);
            }
          }
        } catch (collectionError) {
          console.warn(`⚠️ Failed to process collection "${collection.name}": ${collectionError.message}`);
          console.warn(`⚠️ Error type: ${typeof collectionError}, Stack:`, collectionError.stack);
          
          // Check if it's specifically the getVariablesByCollectionAsync issue
          if (collectionError.message?.includes('not a function')) {
            console.warn(`⚠️ This appears to be a Figma API version issue`);
            console.warn(`⚠️ getVariablesByCollectionAsync may not be available in this Figma version`);
          }
        }
      }
      
      // Log summary
      const colorTokens = tokens.filter(t => t.type === 'COLOR');
      const otherTokens = tokens.filter(t => t.type !== 'COLOR');
      
      console.log(`🔧 Design Tokens Summary:`);
      console.log(`   Color Tokens: ${colorTokens.length}`);
      console.log(`   Other Tokens: ${otherTokens.length}`);
      console.log(`   Total: ${tokens.length} tokens`);
      
      if (tokens.length === 0) {
        console.log("🤔 Debug suggestions:");
        console.log("  1. Check if this file has Variables in the right panel");
        console.log("  2. Try creating a simple color variable as a test");
        console.log("  3. Check if Variables are published from a library");
      }
      
      return tokens;
    } catch (error) {
      console.warn("⚠️ Failed to scan design tokens:", error);
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
  static async createDesignTokensFromColorStyles(): Promise<DesignToken[]> {
    console.log("🔄 Creating fallback design tokens from color styles...");
    
    try {
      const colorStyleCollection = await this.scanFigmaColorStyles();
      const tokens: DesignToken[] = [];
      
      // Convert each color style to a design token format
      Object.entries(colorStyleCollection).forEach(([category, styles]) => {
        styles.forEach(style => {
          // Create a token name from the style name
          const tokenName = style.name.toLowerCase()
            .replace(/[\/\s]+/g, '-')  // Replace / and spaces with -
            .replace(/[^a-z0-9\-]/g, ''); // Remove special chars
          
          // Convert hex color to RGB format for consistency with Variables API
          let rgbValue = { r: 0, g: 0, b: 0 };
          if (style.colorInfo.type === 'SOLID' && style.colorInfo.color) {
            const hex = style.colorInfo.color.replace('#', '');
            rgbValue = {
              r: parseInt(hex.substr(0, 2), 16) / 255,
              g: parseInt(hex.substr(2, 2), 16) / 255,
              b: parseInt(hex.substr(4, 2), 16) / 255
            };
          }
          
          const token: DesignToken = {
            id: `fallback-${style.id}`,
            name: tokenName,
            type: 'COLOR',
            value: rgbValue,
            collection: `${category}-colors`,
            mode: 'default',
            description: `Fallback token from color style: ${style.name}`
          };
          
          tokens.push(token);
          console.log(`🎨 Created fallback token: "${tokenName}" from "${style.name}"`);
        });
      });
      
      console.log(`🔄 Created ${tokens.length} fallback design tokens from color styles`);
      return tokens;
      
    } catch (error) {
      console.warn("⚠️ Failed to create fallback design tokens:", error);
      return [];
    }
  }

  /**
   * Scan Figma Color Styles from the local file
   */
  static async scanFigmaColorStyles(): Promise<ColorStyleCollection> {
    console.log("🎨 Scanning Figma Color Styles...");
    
    try {
      const paintStyles = await figma.getLocalPaintStylesAsync();
      console.log(`✅ Found ${paintStyles.length} paint styles`);
      
      const colorStyleCollection: ColorStyleCollection = {
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
          
          console.log(`🎨 Categorized "${colorStyle.name}" as ${category} (variant: ${colorStyle.variant || 'none'})`);
        } catch (error) {
          console.warn(`⚠️ Failed to process paint style "${paintStyle.name}":`, error);
        }
      }
      
      // Log summary
      const totalStyles = Object.values(colorStyleCollection).reduce((sum, styles) => sum + styles.length, 0);
      console.log(`🎨 Color Styles Summary:`);
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
      console.error("❌ Failed to scan color styles:", error);
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
  static async scanFigmaTextStyles(): Promise<TextStyle[]> {
    try {
      console.log('🔍 Scanning text styles...');
      const figmaTextStyles = await figma.getLocalTextStylesAsync();
      
      console.log(`Found ${figmaTextStyles.length} text styles`);
      
      const textStyles: TextStyle[] = figmaTextStyles.map(style => {
        // Build text style object with safe property access
        const textStyle: TextStyle = {
          id: style.id,
          name: style.name,
          description: style.description || '',
          fontSize: style.fontSize,
          fontName: style.fontName,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
        };
        
        // Add optional properties if they exist
        if (style.textDecoration) {
          textStyle.textDecoration = style.textDecoration;
        }
        
        if (style.textCase) {
          textStyle.textCase = style.textCase;
        }
        
        if (style.textAlignHorizontal) {
          textStyle.textAlignHorizontal = style.textAlignHorizontal;
        }
        
        if (style.textAlignVertical) {
          textStyle.textAlignVertical = style.textAlignVertical;
        }
        
        if (style.paragraphSpacing !== undefined) {
          textStyle.paragraphSpacing = style.paragraphSpacing;
        }
        
        if (style.paragraphIndent !== undefined) {
          textStyle.paragraphIndent = style.paragraphIndent;
        }
        
        console.log(`✅ Processed text style: ${style.name} (${style.fontSize}px)`);
        return textStyle;
      });

      console.log(`📝 Successfully scanned ${textStyles.length} text styles`);
      return textStyles;
    } catch (error) {
      console.error('❌ Error scanning text styles:', error);
      throw new Error(`Failed to scan text styles: ${error.message}`);
    }
  }
  
  /**
   * Convert Figma PaintStyle to our ColorStyle interface
   */
  private static async convertPaintStyleToColorStyle(paintStyle: PaintStyle): Promise<ColorStyle> {
    const colorInfo = this.convertPaintToColorInfo(paintStyle.paints[0], paintStyle.id);
    const { category, variant } = this.parseColorStyleName(paintStyle.name);
    
    return {
      id: paintStyle.id,
      name: paintStyle.name,
      description: paintStyle.description || undefined,
      paints: paintStyle.paints,
      category,
      variant,
      colorInfo: colorInfo || { type: 'SOLID', color: '#000000', opacity: 1 }
    };
  }
  
  /**
   * Categorize a color style based on its name
   * Supports patterns like: 'primary90', 'secondary50', 'neutral-100', 'Primary/500', etc.
   */
  static categorizeColorStyle(styleName: string): keyof ColorStyleCollection {
    const name = styleName.toLowerCase();
    
    // Primary patterns
    if (name.includes('primary') || name.includes('brand')) {
      return 'primary';
    }
    
    // Secondary patterns
    if (name.includes('secondary') || name.includes('accent')) {
      return 'secondary';
    }
    
    // Tertiary patterns
    if (name.includes('tertiary')) {
      return 'tertiary';
    }
    
    // Neutral patterns (grays, blacks, whites)
    if (name.includes('neutral') || name.includes('gray') || name.includes('grey') || 
        name.includes('black') || name.includes('white') || name.includes('slate')) {
      return 'neutral';
    }
    
    // Semantic patterns (success, error, warning, info)
    if (name.includes('success') || name.includes('error') || name.includes('warning') || 
        name.includes('info') || name.includes('danger') || name.includes('alert') ||
        name.includes('green') || name.includes('red') || name.includes('yellow') || 
        name.includes('blue') || name.includes('orange')) {
      return 'semantic';
    }
    
    // Surface patterns (background, surface, container)
    if (name.includes('surface') || name.includes('background') || name.includes('container') ||
        name.includes('backdrop') || name.includes('overlay')) {
      return 'surface';
    }
    
    // Default to other
    return 'other';
  }
  
  /**
   * Parse color style name to extract category and variant
   * Examples: 'primary90' -> { category: 'primary', variant: '90' }
   *          'Primary/500' -> { category: 'primary', variant: '500' }
   *          'neutral-100' -> { category: 'neutral', variant: '100' }
   */
  private static parseColorStyleName(styleName: string): { category: keyof ColorStyleCollection, variant?: string } {
    const name = styleName.toLowerCase();
    
    // Pattern 1: name + number (e.g., 'primary90', 'secondary50')
    const pattern1 = name.match(/^(primary|secondary|tertiary|neutral|semantic|surface|brand|accent|gray|grey|success|error|warning|info|danger|green|red|yellow|blue|orange)(\d+)$/);
    if (pattern1) {
      const [, colorName, variant] = pattern1;
      return {
        category: this.categorizeColorStyle(colorName),
        variant
      };
    }
    
    // Pattern 2: name/number or name-number (e.g., 'Primary/500', 'neutral-100')
    const pattern2 = name.match(/^([^\/\-\d]+)[\/-](\d+)$/);
    if (pattern2) {
      const [, colorName, variant] = pattern2;
      return {
        category: this.categorizeColorStyle(colorName),
        variant
      };
    }
    
    // Pattern 3: just category name
    return {
      category: this.categorizeColorStyle(name),
      variant: undefined
    };
  }
  
  /**
   * Main scanning function - scans all pages for components and color styles
   */
  static async scanDesignSystem(): Promise<ScanSession> {
    console.log("🔍 Starting comprehensive design system scan...");
    const components: ComponentInfo[] = [];
    let colorStyles: ColorStyleCollection | undefined;
    let textStyles: TextStyle[] | undefined;
    
    try {
      await figma.loadAllPagesAsync();
      console.log("✅ All pages loaded");
      
      // First, scan Design Tokens (Variables)
      console.log("\n🔧 Phase 1: Scanning Design Tokens...");
      let designTokens: DesignToken[] | undefined;
      try {
        designTokens = await this.scanFigmaVariables();
        
        // Debug: Log what we got from Variables API
        console.log(`🔍 Variables API returned:`, designTokens);
        console.log(`🔍 Type: ${typeof designTokens}, Length: ${designTokens ? designTokens.length : 'undefined'}`);
        
        // If Variables API returned no tokens, try fallback method
        if (!designTokens || designTokens.length === 0) {
          console.log("🔄 No Variables found, trying fallback design tokens from color styles...");
          designTokens = await this.createDesignTokensFromColorStyles();
          
          if (designTokens && designTokens.length > 0) {
            console.log("✅ Using fallback design tokens created from color styles");
          } else {
            console.log("⚠️ Fallback also returned no tokens");
          }
        } else {
          console.log("✅ Using Variables API design tokens");
        }
      } catch (error) {
        console.warn("⚠️ Design Tokens scanning failed, trying fallback:", error);
        try {
          designTokens = await this.createDesignTokensFromColorStyles();
          console.log("✅ Using fallback design tokens despite Variables API error");
        } catch (fallbackError) {
          console.warn("⚠️ Fallback design tokens also failed:", fallbackError);
          designTokens = undefined;
        }
      }
      
      // Second, scan Color Styles
      console.log("\n🎨 Phase 2: Scanning Color Styles...");
      try {
        colorStyles = await this.scanFigmaColorStyles();
        
        // NEW: Build color style lookup map for fast ID->name resolution
        if (colorStyles && Object.keys(colorStyles).length > 0) {
          this.paintStyleMap.clear();
          
          // Iterate through all categories and their styles
          Object.values(colorStyles).forEach(categoryStyles => {
            if (Array.isArray(categoryStyles)) {
              categoryStyles.forEach(style => {
                this.paintStyleMap.set(style.id, style.name);
              });
            }
          });
          
          console.log(`✅ Built color style lookup map with ${this.paintStyleMap.size} entries`);
          
          // DEBUG: Log first few entries to understand ID format
          const firstEntries = Array.from(this.paintStyleMap.entries()).slice(0, 3);
          console.log('🔍 First color style IDs in map:', firstEntries);
        } else {
          console.warn('⚠️ No color styles available for lookup map');
          this.paintStyleMap.clear();
        }
      } catch (error) {
        console.warn("⚠️ Color Styles scanning failed, continuing without color styles:", error);
        colorStyles = undefined;
        this.paintStyleMap.clear();
      }
      
      // Third, scan Text Styles
      console.log("\n📝 Phase 3: Scanning Text Styles...");
      try {
        textStyles = await this.scanFigmaTextStyles();
        
        // NEW: Build text style lookup map for fast ID->name resolution
        if (textStyles && textStyles.length > 0) {
          this.textStyleMap.clear();
          this.textStyleDetails.clear();
          
          textStyles.forEach(style => {
            this.textStyleMap.set(style.id, style.name);
            
            // NEW: Build detailed style properties for exact matching
            this.textStyleDetails.set(style.id, {
              id: style.id,
              name: style.name,
              fontSize: style.fontSize,
              fontFamily: style.fontName?.family || 'Unknown',
              fontWeight: style.fontName?.style || 'Regular'
            });
          });
          
          console.log(`✅ Built text style lookup map with ${this.textStyleMap.size} entries`);
          console.log(`✅ Built text style details map with ${this.textStyleDetails.size} entries`);
          
          // DEBUG: Log first few entries to understand ID format
          const firstEntries = Array.from(this.textStyleMap.entries()).slice(0, 3);
          console.log('🔍 First text style IDs in map:', firstEntries);
        }
      } catch (error) {
        console.warn("⚠️ Text Styles scanning failed, continuing without text styles:", error);
        textStyles = undefined;
        this.textStyleMap.clear();
      }
      
      // Fourth, scan components
      console.log("\n🧩 Phase 4: Scanning Components...");
      for (const page of figma.root.children) {
        console.log(`📋 Scanning page: "${page.name}"`);
        try {
          const allNodes = page.findAll(node => {
              if (node.type === 'COMPONENT_SET') {
                  return true;
              }
              if (node.type === 'COMPONENT') {
                  return !!(node.parent && node.parent.type !== 'COMPONENT_SET');
              }
              return false;
          });
          
          console.log(`✅ Found ${allNodes.length} main components on page "${page.name}"`);
          
          for (const node of allNodes) {
            try {
              if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
                const componentInfo = await this.analyzeComponent(node as ComponentNode | ComponentSetNode);
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
              console.error(`❌ Error analyzing component "${node.name}":`, e);
            }
          }
        } catch (e) {
          console.error(`❌ Error scanning page "${page.name}":`, e);
        }
      }
      
      const scanSession: ScanSession = {
        components,
        colorStyles,
        textStyles,
        designTokens, // NEW: Include design tokens
        scanTime: Date.now(),
        version: "2.1.0", // Bump version for token support
        fileKey: figma.fileKey || undefined
      };
      
      console.log(`\n🎉 Comprehensive scan complete!`);
      console.log(`   📦 Components: ${components.length}`);
      console.log(`   🔧 Design Tokens: ${designTokens ? designTokens.length : 0}`);
      console.log(`   🎨 Color Styles: ${colorStyles ? Object.values(colorStyles).reduce((sum, styles) => sum + styles.length, 0) : 0}`);
      console.log(`   📝 Text Styles: ${textStyles ? textStyles.length : 0}`);
      console.log(`   📄 File Key: ${scanSession.fileKey || 'Unknown'}`);
      
      // NEW: Build text style lookup map for component analysis (done at the end to ensure textStyles are available)
      if (textStyles && textStyles.length > 0) {
        this.textStyleMap.clear();
        this.textStyleDetails.clear();
        
        textStyles.forEach(style => {
          this.textStyleMap.set(style.id, style.name);
          
          // NEW: Build detailed style properties for exact matching
          this.textStyleDetails.set(style.id, {
            id: style.id,
            name: style.name,
            fontSize: style.fontSize,
            fontFamily: style.fontName?.family || 'Unknown',
            fontWeight: style.fontName?.style || 'Regular'
          });
        });
        
        console.log(`✅ Built text style lookup map with ${this.textStyleMap.size} entries`);
        console.log(`✅ Built text style details map with ${this.textStyleDetails.size} entries`);
        
        // DEBUG: Log first few entries to understand ID format
        const firstEntries = Array.from(this.textStyleMap.entries()).slice(0, 3);
        console.log('🔍 First text style IDs in map:', firstEntries);
      } else {
        console.warn('⚠️ No text styles available for lookup map');
        this.textStyleMap.clear();
        this.textStyleDetails.clear();
      }
      
      return scanSession;
    } catch (e) {
      console.error("❌ Critical error in scanDesignSystem:", e);
      throw e;
    }
  }
  
  /**
   * Legacy method for backward compatibility - returns only components
   */
  static async scanComponents(): Promise<ComponentInfo[]> {
    const session = await this.scanDesignSystem();
    return session.components;
  }

  /**
   * Recursively searches for auto-layout containers with padding to find visual padding
   */
  static findNestedAutolayoutPadding(node: any, depth: number = 0): {
    paddingTop: number;
    paddingLeft: number;
    paddingRight: number;
    paddingBottom: number;
  } | null {
    // Limit recursion depth to prevent infinite loops
    if (depth > 3) return null;

    try {
      // Check if current node has auto-layout with meaningful padding
      if (node.layoutMode && node.layoutMode !== 'NONE') {
        const padding = {
          paddingTop: node.paddingTop || 0,
          paddingLeft: node.paddingLeft || 0,
          paddingRight: node.paddingRight || 0,
          paddingBottom: node.paddingBottom || 0
        };

        // If this auto-layout has meaningful padding, return it
        if (padding.paddingTop > 0 || padding.paddingLeft > 0 || 
            padding.paddingRight > 0 || padding.paddingBottom > 0) {
          console.log(`  🔍 Found nested auto-layout padding at depth ${depth}:`, padding, `(${node.name})`);
          return padding;
        }
      }

      // Recursively search children
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
      console.warn(`⚠️ Error searching nested padding at depth ${depth}:`, error);
      return null;
    }
  }

  /**
   * Extracts internal padding information from a component, including nested auto-layout containers
   */
  static extractInternalPadding(comp: ComponentNode | ComponentSetNode): {
    paddingTop: number;
    paddingLeft: number;
    paddingRight: number;
    paddingBottom: number;
  } | null {
    try {
      // For component sets, analyze the default variant
      let targetNode = comp;
      if (comp.type === 'COMPONENT_SET') {
        const defaultVariant = comp.defaultVariant || comp.children[0];
        if (defaultVariant && defaultVariant.type === 'COMPONENT') {
          targetNode = defaultVariant;
        }
      }

      if (targetNode.type === 'COMPONENT') {
        console.log(`🔍 Analyzing component "${comp.name}" for padding...`);
        
        // Method 1: Check if root component has auto-layout with padding
        if (targetNode.layoutMode !== 'NONE') {
          const rootPadding = {
            paddingTop: targetNode.paddingTop || 0,
            paddingLeft: targetNode.paddingLeft || 0,
            paddingRight: targetNode.paddingRight || 0,
            paddingBottom: targetNode.paddingBottom || 0
          };

          // If root has meaningful padding, return it
          if (rootPadding.paddingTop > 0 || rootPadding.paddingLeft > 0 || 
              rootPadding.paddingRight > 0 || rootPadding.paddingBottom > 0) {
            console.log(`  ✅ Found root auto-layout padding:`, rootPadding);
            return rootPadding;
          }
        }

        // Method 2: Search for nested auto-layout containers with padding
        const nestedPadding = this.findNestedAutolayoutPadding(targetNode);
        if (nestedPadding) {
          console.log(`  ✅ Using nested auto-layout padding:`, nestedPadding);
          return nestedPadding;
        }

        // Method 3: Fallback to geometric detection (original method)
        if (targetNode.children && targetNode.children.length > 0) {
          const firstChild = targetNode.children[0];
          if (firstChild.x !== undefined && firstChild.y !== undefined) {
            const paddingLeft = firstChild.x;
            const paddingTop = firstChild.y;
            const paddingRight = targetNode.width - (firstChild.x + firstChild.width);
            const paddingBottom = targetNode.height - (firstChild.y + firstChild.height);
            
            // Only return if padding values are reasonable (between 0 and 100)
            if (paddingLeft >= 0 && paddingTop >= 0 && paddingRight >= 0 && paddingBottom >= 0 &&
                paddingLeft <= 100 && paddingTop <= 100 && paddingRight <= 100 && paddingBottom <= 100) {
              const geometricPadding = {
                paddingTop: Math.round(paddingTop),
                paddingLeft: Math.round(paddingLeft),
                paddingRight: Math.round(paddingRight),
                paddingBottom: Math.round(paddingBottom)
              };
              console.log(`  ✅ Using geometric padding detection:`, geometricPadding);
              return geometricPadding;
            }
          }
        }

        console.log(`  ❌ No meaningful padding found for "${comp.name}"`);
      }

      return null;
    } catch (error) {
      console.warn(`⚠️ Error extracting padding for component ${comp.name}:`, error);
      return null;
    }
  }

  /**
   * Analyzes a single component to extract metadata
   */
  static async analyzeComponent(comp: ComponentNode | ComponentSetNode): Promise<ComponentInfo> {
      const name = comp.name;
      const suggestedType = this.guessComponentType(name.toLowerCase());
      const confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
      const textLayers = this.findTextLayers(comp);
      const textHierarchy = await this.analyzeTextHierarchy(comp);
      const componentInstances = await this.findComponentInstances(comp);
      const vectorNodes = this.findVectorNodes(comp);
      const imageNodes = this.findImageNodes(comp);
      
      // NEW: Extract color and style information
      const styleInfo = this.extractStyleInfo(comp);
      
      // NEW: Extract internal padding information
      const internalPadding = this.extractInternalPadding(comp);
      if (internalPadding) {
          console.log(`📏 Found internal padding for "${comp.name}":`, internalPadding);
      }
      
      let variants: string[] = [];
      const variantDetails: { [key: string]: string[] } = {};
      
      if (comp.type === 'COMPONENT_SET') {
          const variantProps = comp.variantGroupProperties;
          if (variantProps) {
              variants = Object.keys(variantProps);
              
              Object.entries(variantProps).forEach(([propName, propInfo]) => {
                  if (propInfo.values && propInfo.values.length > 0) {
                      variantDetails[propName] = [...propInfo.values].sort();
                      console.log(`✅ Found variant property: ${propName} with values: [${propInfo.values.join(', ')}]`);
                  }
              });
              
              console.log(`🎯 Variant details for "${comp.name}":`, variantDetails);
          }
      }
      
      return {
          id: comp.id,
          name: name,
          suggestedType,
          confidence,
          variants: variants.length > 0 ? variants : undefined,
          variantDetails: Object.keys(variantDetails).length > 0 ? variantDetails : undefined,
          textLayers: textLayers.length > 0 ? textLayers : undefined,
          textHierarchy: textHierarchy.length > 0 ? textHierarchy : undefined,
          componentInstances: componentInstances.length > 0 ? componentInstances : undefined,
          vectorNodes: vectorNodes.length > 0 ? vectorNodes : undefined,
          imageNodes: imageNodes.length > 0 ? imageNodes : undefined,
          styleInfo: styleInfo, // NEW: Include color and style information
          internalPadding: internalPadding, // NEW: Include internal padding information
          isFromLibrary: false
      };
  }

  /**
   * Intelligent component type detection based on naming patterns
   */
  static guessComponentType(name: string): string {
      const patterns: {[key: string]: RegExp} = {
          'icon-button': /icon.*button|button.*icon/i,
          'upload': /upload|file.*drop|drop.*zone|attach/i,
          'form': /form|captcha|verification/i,
          'context-menu': /context-menu|context menu|contextual menu|options menu/i,
          'modal-header': /modal-header|modal header|modalstack|modal_stack/i,
          'list-item': /list-item|list item|list_item|list[\s\-_]*row|list[\s\-_]*cell/i,
          'appbar': /appbar|app-bar|navbar|nav-bar|header|top bar|page header/i,
          'dialog': /dialog|dialogue|popup|modal(?!-header)/i,
          'list': /list(?!-item)/i,
          'navigation': /nav|navigation(?!-bar)/i,
          'header': /h[1-6]|title|heading(?! bar)/i,
          'button': /button|btn|cta|action/i,
          'input': /input|field|textfield|text-field|entry/i,
          'textarea': /textarea|text-area|multiline/i,
          'select': /select|dropdown|drop-down|picker/i,
          'checkbox': /checkbox|check-box/i,
          'radio': /radio|radiobutton|radio-button/i,
          'switch': /switch|toggle/i,
          'slider': /slider|range/i,
          'searchbar': /search|searchbar|search-bar/i,
          'tab': /tab|tabs|tabbar|tab-bar/i,
          'breadcrumb': /breadcrumb|bread-crumb/i,
          'pagination': /pagination|pager/i,
          'bottomsheet': /bottomsheet|bottom-sheet|drawer/i,
          'sidebar': /sidebar|side-bar/i,
          'snackbar': /snack|snackbar|toast|notification/i,
          'alert': /alert/i,
          'tooltip': /tooltip|tip|hint/i,
          'badge': /badge|indicator|count/i,
          'progress': /progress|loader|loading|spinner/i,
          'skeleton': /skeleton|placeholder/i,
          'card': /card|tile|block|panel/i,
          'avatar': /avatar|profile|user|photo/i,
          'image': /image|img|picture/i,
          'video': /video|player/i,
          'icon': /icon|pictogram|symbol/i,
          'text': /text|label|paragraph|caption|copy/i,
          'link': /link|anchor/i,
          'container': /container|wrapper|box|frame/i,
          'grid': /grid/i,
          'divider': /divider|separator|delimiter/i,
          'spacer': /spacer|space|gap/i,
          'fab': /fab|floating|float/i,
          'chip': /chip|tag/i,
          'actionsheet': /actionsheet|action-sheet/i,
          'chart': /chart|graph/i,
          'table': /table/i,
          'calendar': /calendar|date/i,
          'timeline': /timeline/i,
          'gallery': /gallery|carousel/i,
          'price': /price|cost/i,
          'rating': /rating|star/i,
          'cart': /cart|basket/i,
          'map': /map|location/i,
          'code': /code|syntax/i,
          'terminal': /terminal|console/i
      };
      
      const priorityPatterns = [
          'icon-button', 'upload', 'form', 'context-menu', 'modal-header', 'list-item', 
          'appbar', 'dialog', 'snackbar', 'bottomsheet', 'actionsheet', 'searchbar', 
          'fab', 'breadcrumb', 'pagination', 'skeleton', 'textarea', 'checkbox', 
          'radio', 'switch', 'slider', 'tab', 'navigation', 'tooltip', 'badge', 
          'progress', 'avatar', 'chip', 'stepper', 'chart', 'table', 'calendar', 
          'timeline', 'gallery', 'rating'
      ];
      
      for (const type of priorityPatterns) {
          if (patterns[type]?.test(name)) return type;
      }
      
      for (const type in patterns) {
          if (Object.prototype.hasOwnProperty.call(patterns, type) && !priorityPatterns.includes(type)) {
              if (patterns[type].test(name)) return type;
          }
      }
      
      return 'unknown';
  }

  /**
   * Calculates confidence score for component type detection
   */
  static calculateConfidence(name: string, suggestedType: string): number {
      if (suggestedType === 'unknown') return 0.1;
      if (name.toLowerCase() === suggestedType.toLowerCase()) return 0.95;
      if (name.includes(suggestedType)) return 0.9;
      if (name.toLowerCase().includes(suggestedType + '-') || name.toLowerCase().includes(suggestedType + '_')) return 0.85;
      return 0.7;
  }

  /**
   * NEW: Normalize fontWeight to comparable format
   */
  private static normalizeFontWeight(fontWeight: string | number): string {
    if (typeof fontWeight === 'number') {
      // Convert number to string representation
      if (fontWeight <= 300) return 'Light';
      if (fontWeight <= 400) return 'Regular';
      if (fontWeight <= 500) return 'Medium';
      if (fontWeight <= 600) return 'SemiBold';
      if (fontWeight <= 700) return 'Bold';
      return 'ExtraBold';
    }
    
    // Normalize string weights
    const weight = String(fontWeight).toLowerCase();
    if (weight.includes('regular') || weight.includes('normal')) return 'Regular';
    if (weight.includes('medium')) return 'Medium';
    if (weight.includes('light')) return 'Light';
    if (weight.includes('bold')) return 'Bold';
    if (weight.includes('semibold')) return 'SemiBold';
    if (weight.includes('extrabold') || weight.includes('black')) return 'ExtraBold';
    
    return String(fontWeight); // fallback to original
  }

  /**
   * NEW: Find exact matching local text style based on fontSize, fontFamily, and fontWeight
   * Used as fallback when external textStyleId is not found in local styles
   */
  private static findExactMatchingLocalStyle(fontSize: number, fontFamily: string, fontWeight: string | number): string | undefined {
    const normalizedWeight = this.normalizeFontWeight(fontWeight);
    console.log(`🔍 Looking for exact match: ${fontSize}px, ${fontFamily}, ${normalizedWeight} (original: ${fontWeight})`);
    
    for (const [styleId, styleDetails] of this.textStyleDetails.entries()) {
      const styleNormalizedWeight = this.normalizeFontWeight(styleDetails.fontWeight);
      
      if (styleDetails.fontSize === fontSize &&
          styleDetails.fontFamily === fontFamily &&
          styleNormalizedWeight === normalizedWeight) {
        
        console.log(`✅ Exact match found: "${styleDetails.name}" (${styleId})`);
        return styleDetails.name;
      }
    }
    
    console.warn(`❌ No exact match found for: ${fontSize}px, ${fontFamily}, ${normalizedWeight}`);
    return undefined;
  }

  /**
   * Finds and catalogs text layers within a component
   */
  static findTextLayers(comp: ComponentNode | ComponentSetNode): string[] {
      const textLayers: string[] = [];
      try {
          const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
          if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
              const allNodes = (nodeToAnalyze as ComponentNode).findAll((node) => node.type === 'TEXT');
              
              allNodes.forEach(node => {
                  if (node.type === 'TEXT' && node.name) {
                      const textNode = node as TextNode;
                      textLayers.push(textNode.name);
                      
                      try {
                          const chars = textNode.characters || '[empty]';
                          console.log(`📝 Found text layer: "${textNode.name}" with content: "${chars}"`);
                      } catch (charError) {
                          console.log(`📝 Found text layer: "${textNode.name}" (could not read characters)`);
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
  static async analyzeTextHierarchy(comp: ComponentNode | ComponentSetNode): Promise<TextHierarchy[]> {
    const textHierarchy: TextHierarchy[] = [];
    try {
      const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
      if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
        const textNodes = (nodeToAnalyze as ComponentNode).findAll((node) => node.type === 'TEXT');
        
        // Collect font info for classification
        const fontSizes: number[] = [];
        const textNodeData: Array<{node: TextNode, fontSize: number, fontWeight: string | number, fontFamily: string}> = [];
        
        textNodes.forEach(node => {
          if (node.type === 'TEXT') {
            const textNode = node as TextNode;
            try {
              const fontSize = typeof textNode.fontSize === 'number' ? textNode.fontSize : 14;
              const fontWeight = textNode.fontWeight || 'normal';
              // NEW: Extract fontFamily for exact matching
              const fontFamily = (textNode.fontName && typeof textNode.fontName === 'object' && textNode.fontName.family) 
                ? textNode.fontName.family 
                : 'Unknown';
              
              fontSizes.push(fontSize);
              textNodeData.push({node: textNode, fontSize, fontWeight, fontFamily});
            } catch (e) {
              console.warn(`Could not read font properties for text node "${textNode.name}"`);
            }
          }
        });
        
        // Sort font sizes to determine hierarchy thresholds
        const uniqueSizes = [...new Set(fontSizes)].sort((a, b) => b - a);
        
        for (const {node, fontSize, fontWeight, fontFamily} of textNodeData) {
          let classification: 'primary' | 'secondary' | 'tertiary' = 'tertiary';
          
          if (uniqueSizes.length >= 3) {
            if (fontSize >= uniqueSizes[0]) classification = 'primary';
            else if (fontSize >= uniqueSizes[1]) classification = 'secondary';
            else classification = 'tertiary';
          } else if (uniqueSizes.length === 2) {
            classification = fontSize >= uniqueSizes[0] ? 'primary' : 'secondary';
          } else {
            // Single font size or unable to determine - classify by font weight
            const weight = String(fontWeight).toLowerCase();
            if (weight.includes('bold') || weight.includes('700') || weight.includes('800') || weight.includes('900')) {
              classification = 'primary';
            } else if (weight.includes('medium') || weight.includes('500') || weight.includes('600')) {
              classification = 'secondary';
            } else {
              classification = 'tertiary';
            }
          }
          
          let characters: string | undefined;
          try {
            characters = node.characters || '[empty]';
          } catch (e) {
            characters = undefined;
          }

          // NEW: Extract text color
          let textColor: ColorInfo | undefined;
          try {
            if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
              // Get fillStyleId for text color
              const fillStyleId = ('fillStyleId' in node) ? node.fillStyleId : undefined;
              const styleId = (fillStyleId && fillStyleId !== figma.mixed) ? fillStyleId : undefined;
              
              const firstFill = node.fills[0];
              if (firstFill.visible !== false) {
                textColor = this.convertPaintToColorInfo(firstFill, styleId) || undefined;
              }
            }
          } catch (e) {
            console.warn(`Could not extract text color for "${node.name}"`);
          }

          // NEW: Extract Design System text style references
          let textStyleId: string | undefined;
          let textStyleName: string | undefined;
          let boundTextStyleId: string | undefined;
          
          try {
            // Get text style ID if available
            textStyleId = node.textStyleId || undefined;
            boundTextStyleId = node.boundTextStyleId || undefined;
            
            // Resolve style name using pre-built lookup map (exactly like paintStyleName)
            if (textStyleId) {
              textStyleName = this.textStyleMap.get(textStyleId);
              if (!textStyleName) {
                // Try format variations similar to paintStyleId approach
                const baseId = textStyleId.split(',')[0];
                const mapFormatId = baseId + ',';
                
                textStyleName = this.textStyleMap.get(mapFormatId) || this.textStyleMap.get(baseId);
                
                // NEW: If still not found, try exact matching fallback for external styles
                if (!textStyleName) {
                  console.log(`🔄 External textStyleId detected: ${textStyleId}, trying exact match fallback`);
                  textStyleName = this.findExactMatchingLocalStyle(fontSize, fontFamily, fontWeight);
                  
                  if (textStyleName) {
                    console.log(`✅ External style mapped to local: "${textStyleName}"`);
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
            textColor, // Include text color information
            
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
  static async findComponentInstances(comp: ComponentNode | ComponentSetNode): Promise<ComponentInstance[]> {
    const componentInstances: ComponentInstance[] = [];
    try {
      const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
      if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
        const instanceNodes = (nodeToAnalyze as ComponentNode).findAll((node) => 
          node.type === 'COMPONENT' || node.type === 'INSTANCE'
        );
        
        for (const node of instanceNodes) {
          if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
            const instance: ComponentInstance = {
              nodeName: node.name,
              nodeId: node.id,
              visible: node.visible
            };
            
            if (node.type === 'INSTANCE') {
              try {
                const mainComponent = await (node as InstanceNode).getMainComponentAsync();
                instance.componentId = mainComponent?.id;
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
  static findVectorNodes(comp: ComponentNode | ComponentSetNode): VectorNode[] {
    const vectorNodes: VectorNode[] = [];
    try {
      const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
      if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
        const vectors = (nodeToAnalyze as ComponentNode).findAll((node) => node.type === 'VECTOR');
        
        vectors.forEach(node => {
          if (node.type === 'VECTOR') {
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
  static findImageNodes(comp: ComponentNode | ComponentSetNode): ImageNode[] {
    const imageNodes: ImageNode[] = [];
    try {
      const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
      if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
        const shapeNodes = (nodeToAnalyze as ComponentNode).findAll((node) => 
          node.type === 'RECTANGLE' || node.type === 'ELLIPSE'
        );
        
        shapeNodes.forEach(node => {
          if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
            let hasImageFill = false;
            
            try {
              const fills = (node as RectangleNode | EllipseNode).fills;
              if (Array.isArray(fills)) {
                hasImageFill = fills.some(fill => 
                  typeof fill === 'object' && fill !== null && fill.type === 'IMAGE'
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
  static generateLLMPrompt(components: ComponentInfo[], colorStyles?: ColorStyleCollection): string {
      const componentsByType: { [key: string]: ComponentInfo[] } = {};
      components.forEach(comp => {
          if (comp.confidence >= 0.7) {
              if (!componentsByType[comp.suggestedType]) componentsByType[comp.suggestedType] = [];
              componentsByType[comp.suggestedType].push(comp);
          }
      });
      
      let prompt = `# AIDesigner JSON Generation Instructions\n\n`;
      
      // Add Color Styles section if available
      if (colorStyles) {
          const totalColorStyles = Object.values(colorStyles).reduce((sum, styles) => sum + styles.length, 0);
          if (totalColorStyles > 0) {
              prompt += `## Available Color Styles in Design System:\n\n`;
              
              Object.entries(colorStyles).forEach(([category, styles]) => {
                  if (styles.length > 0) {
                      prompt += `### ${category.toUpperCase()} COLORS\n`;
                      styles.forEach(style => {
                          prompt += `- **${style.name}**: ${style.colorInfo.color}`;
                          if (style.variant) {
                              prompt += ` (variant: ${style.variant})`;
                          }
                          if (style.description) {
                              prompt += ` - ${style.description}`;
                          }
                          prompt += `\n`;
                      });
                      prompt += `\n`;
                  }
              });
              
              prompt += `### Color Usage Guidelines:\n`;
              prompt += `- Use PRIMARY colors for main actions, headers, and brand elements\n`;
              prompt += `- Use SECONDARY colors for supporting actions and accents\n`;
              prompt += `- Use NEUTRAL colors for text, backgrounds, and borders\n`;
              prompt += `- Use SEMANTIC colors for success/error/warning states\n`;
              prompt += `- Use SURFACE colors for backgrounds and containers\n`;
              prompt += `- Reference colors by their exact name: "${colorStyles.primary[0]?.name || 'Primary/500'}"\n\n`;
          }
      }
      
      // Add renderer constraints section
      prompt += `## CRITICAL RENDERER CONSTRAINTS\n\n`;
      prompt += `### The ONLY native elements supported:\n`;
      prompt += `- **native-text**: Text elements with styling\n`;
      prompt += `- **native-rectangle**: Rectangles (supports image fills)\n`;
      prompt += `- **native-circle**: Circles/ellipses (supports image fills)\n\n`;
      prompt += `### NEVER use these (they don't exist):\n`;
      prompt += `- ❌ native-grid (use layoutContainer with wrap)\n`;
      prompt += `- ❌ native-list-item (use list components)\n`;
      prompt += `- ❌ native-rating (use star components)\n`;
      prompt += `- ❌ native-image (use native-rectangle with image fill)\n`;
      prompt += `- ❌ Any other native-* type\n\n`;
      prompt += `### Sizing Rules:\n`;
      prompt += `- ✅ Use "horizontalSizing": "FILL" for full width\n`;
      prompt += `- ✅ Use numeric values for fixed width (e.g., 200)\n`;
      prompt += `- ❌ NEVER use percentages like "50%" or "100%"\n\n`;
      
      prompt += `## Available Components in Design System:\n\n`;
      
      Object.keys(componentsByType).sort().forEach(type => {
          const comps = componentsByType[type];
          const bestComponent = comps.sort((a, b) => b.confidence - a.confidence)[0];
          prompt += `### ${type.toUpperCase()}\n`;
          prompt += `- Component ID: "${bestComponent.id}"\n`;
          prompt += `- Component Name: "${bestComponent.name}"\n`;
          if (bestComponent.textLayers?.length) prompt += `- Text Layers: ${bestComponent.textLayers.map(l => `"${l}"`).join(', ')}\n`;
          
          if (bestComponent.textHierarchy?.length) {
            prompt += `- Text Hierarchy:\n`;
            bestComponent.textHierarchy.forEach(text => {
              prompt += `  - ${text.classification.toUpperCase()}: "${text.nodeName}" (${text.fontSize}px, ${text.fontWeight}${text.visible ? '' : ', hidden'})\n`;
            });
          }
          
          if (bestComponent.componentInstances?.length) {
            prompt += `- Component Instances: ${bestComponent.componentInstances.map(c => `"${c.nodeName}"${c.visible ? '' : ' (hidden)'}`).join(', ')}\n`;
          }
          
          if (bestComponent.vectorNodes?.length) {
            prompt += `- Vector Icons: ${bestComponent.vectorNodes.map(v => `"${v.nodeName}"${v.visible ? '' : ' (hidden)'}`).join(', ')}\n`;
          }
          
          if (bestComponent.imageNodes?.length) {
            prompt += `- Image Containers: ${bestComponent.imageNodes.map(i => `"${i.nodeName}" (${i.nodeType}${i.hasImageFill ? ', has image' : ''}${i.visible ? '' : ', hidden'})`).join(', ')}\n`;
          }
          
          if (bestComponent.variantDetails && Object.keys(bestComponent.variantDetails).length > 0) {
              prompt += `\n  - 🎯 VARIANTS AVAILABLE:\n`;
              Object.entries(bestComponent.variantDetails).forEach(([propName, values]) => {
                  prompt += `    - **${propName}**: [${values.map(v => `"${v}"`).join(', ')}]\n`;
                  
                  const propLower = propName.toLowerCase();
                  if (propLower.includes('condition') || propLower.includes('layout')) {
                      prompt += `      💡 Layout control: ${values.includes('1-line') ? '"1-line" = single line, ' : ''}${values.includes('2-line') ? '"2-line" = detailed view' : ''}\n`;
                  }
                  if (propLower.includes('leading') || propLower.includes('start')) {
                      prompt += `      💡 Leading element: "Icon" = shows leading icon, "None" = text only\n`;
                  }
                  if (propLower.includes('trailing') || propLower.includes('end')) {
                      prompt += `      💡 Trailing element: "Icon" = shows trailing icon/chevron, "None" = no trailing element\n`;
                  }
                  if (propLower.includes('state') || propLower.includes('status')) {
                      prompt += `      💡 Component state: controls enabled/disabled/selected appearance\n`;
                  }
                  if (propLower.includes('size')) {
                      prompt += `      💡 Size control: affects padding, text size, and touch targets\n`;
                  }
                  if (propLower.includes('type') || propLower.includes('style') || propLower.includes('emphasis')) {
                      prompt += `      💡 Visual emphasis: controls hierarchy and visual weight\n`;
                  }
              });
              
              prompt += `\n  - ⚡ QUICK VARIANT GUIDE:\n`;
              prompt += `    - "single line" request → use "Condition": "1-line"\n`;
              prompt += `    - "with icon" request → use "Leading": "Icon"\n`;
              prompt += `    - "arrow" or "chevron" → use "Trailing": "Icon"\n`;
              prompt += `    - "simple" or "minimal" → omit variants to use defaults\n`;
              prompt += `    - Only specify variants you want to change from defaults\n`;
          }

          prompt += `- Page: ${bestComponent.pageInfo?.pageName || 'Unknown'}\n\n`;
      });
      
      prompt += `## JSON Structure & Rules:

### Variant Usage Rules:
- **Variants must be in a separate "variants" object inside properties**
- **NEVER mix variants with regular properties at the same level**
- Variant properties are case-sensitive: "Condition" not "condition"
- Variant values are case-sensitive: "1-line" not "1-Line"

### ✅ CORRECT Variant Structure:
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

### ❌ WRONG - Never do this:
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

### ✅ VARIANT BEST PRACTICES:
- **Always use exact property names**: "Condition" not "condition"
- **Use exact values**: "1-line" not "1-Line" or "single-line"
- **Specify complete variant sets**: Include all required properties for that variant
- **Common patterns**:
  - Simple navigation: \`"Condition": "1-line", "Leading": "Icon", "Trailing": "None"\`
  - With current value: \`"Condition": "1-line", "Leading": "Icon", "Trailing": "Icon"\`
  - Detailed info: \`"Condition": "2-line", "Leading": "Icon", "Trailing": "Icon"\`

*🎯 Pro tip: Study your design system's variant combinations in Figma to understand which variants work together.*
`;
      return prompt;
  }

  /**
   * Save scan results to Figma storage
   */
  static async saveLastScanResults(components: ComponentInfo[]): Promise<void> {
    try {
      const scanSession: ScanSession = {
        components,
        scanTime: Date.now(),
        version: "1.0",
        fileKey: figma.root.id
      };
      
      await figma.clientStorage.setAsync('design-system-scan', scanSession);
      await figma.clientStorage.setAsync('last-scan-results', components);
      
      console.log(`💾 Saved ${components.length} components with session data`);
    } catch (error) {
      console.error("❌ Error saving scan results:", error);
      try {
        await figma.clientStorage.setAsync('last-scan-results', components);
        console.log("💾 Fallback save successful");
      } catch (fallbackError) {
        console.warn("⚠️ Could not save scan results:", fallbackError);
      }
    }
  }

  /**
   * Get component ID by type for UI generation
   */
  static async getComponentIdByType(type: string): Promise<string | null> {
      const searchType = type.toLowerCase();
      const scanResults: ComponentInfo[] | undefined = await figma.clientStorage.getAsync('last-scan-results');
      if (scanResults && Array.isArray(scanResults)) {
          const matchingComponent = scanResults.find((comp) => comp.suggestedType.toLowerCase() === searchType && comp.confidence >= 0.7);
          if (matchingComponent) return matchingComponent.id;
          const nameMatchingComponent = scanResults.find((comp) => comp.name.toLowerCase().includes(searchType));
          if (nameMatchingComponent) return nameMatchingComponent.id;
      }
      console.log(`❌ ID for type ${type} not found`);
      return null;
  }

  /**
   * NEW: Extract color and style information from component
   */
  static extractStyleInfo(node: ComponentNode | ComponentSetNode): StyleInfo {
    const styleInfo: StyleInfo = {};

    try {
      // Get the primary node to analyze (for component sets, use the first variant)
      let primaryNode: SceneNode = node;
      if (node.type === 'COMPONENT_SET' && node.children.length > 0) {
        primaryNode = node.children[0];
      }

      // Extract fills and background colors
      const fills = this.extractFills(primaryNode);
      if (fills.length > 0) {
        styleInfo.fills = fills;
        styleInfo.primaryColor = fills[0]; // Use first fill as primary color
      }

      // Extract strokes
      const strokes = this.extractStrokes(primaryNode);
      if (strokes.length > 0) {
        styleInfo.strokes = strokes;
      }

      // Find text color from text nodes
      const textColor = this.findPrimaryTextColor(primaryNode);
      if (textColor) {
        styleInfo.textColor = textColor;
      }

      // Extract background color (look for the largest rectangle/background)
      const backgroundColor = this.findBackgroundColor(primaryNode);
      if (backgroundColor) {
        styleInfo.backgroundColor = backgroundColor;
      }

      // Log summary of extracted colors for debugging
      if (styleInfo.primaryColor || styleInfo.backgroundColor || styleInfo.textColor) {
        console.log(`🎨 Colors extracted for "${node.name}":`, {
          primary: styleInfo.primaryColor?.color,
          background: styleInfo.backgroundColor?.color,
          text: styleInfo.textColor?.color
        });
      }

    } catch (error) {
      console.warn(`⚠️ Error extracting style info for "${node.name}":`, error);
    }

    return styleInfo;
  }

  /**
   * Extract fill colors from a node
   */
  static extractFills(node: SceneNode): ColorInfo[] {
    const colorInfos: ColorInfo[] = [];

    try {
      if ('fills' in node && node.fills && Array.isArray(node.fills)) {
        // Get fillStyleId if available
        const fillStyleId = ('fillStyleId' in node) ? node.fillStyleId : undefined;
        const styleId = (fillStyleId && fillStyleId !== figma.mixed) ? fillStyleId : undefined;
        
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
      console.warn('Error extracting fills:', error);
    }

    return colorInfos;
  }

  /**
   * Extract stroke colors from a node
   */
  static extractStrokes(node: SceneNode): ColorInfo[] {
    const colorInfos: ColorInfo[] = [];

    try {
      if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
        // Get strokeStyleId if available
        const strokeStyleId = ('strokeStyleId' in node) ? node.strokeStyleId : undefined;
        const styleId = (strokeStyleId && strokeStyleId !== figma.mixed) ? strokeStyleId : undefined;
        
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
      console.warn('Error extracting strokes:', error);
    }

    return colorInfos;
  }

  /**
   * Convert Figma Paint to ColorInfo
   * @param paint Paint object from Figma API
   * @param styleId Optional fillStyleId or strokeStyleId from the node
   */
  static convertPaintToColorInfo(paint: Paint, styleId?: string): ColorInfo | null {
    try {
      if (paint.type === 'SOLID' && paint.color) {
        // NEW: Extract Design System color style references using node.fillStyleId/strokeStyleId
        let paintStyleName: string | undefined;
        if (styleId) {
          paintStyleName = this.paintStyleMap.get(styleId);
          if (!paintStyleName) {
            // Try format variations similar to textStyleId approach
            const baseId = styleId.split(',')[0];
            const mapFormatId = baseId + ',';
            
            paintStyleName = this.paintStyleMap.get(mapFormatId) || this.paintStyleMap.get(baseId);
          }
        }
        
        return {
          type: 'SOLID',
          color: this.rgbToHex(paint.color),
          opacity: paint.opacity || 1,
          
          // NEW: Design System color style references
          paintStyleId: styleId || undefined,
          paintStyleName: paintStyleName,
          boundVariables: paint.boundVariables || undefined,
          usesDesignSystemColor: !!(styleId || (paint.boundVariables && Object.keys(paint.boundVariables).length > 0))
        };
      }

      if (paint.type === 'GRADIENT_LINEAR' && paint.gradientStops) {
        // NEW: Extract Design System color style references for gradients
        let paintStyleName: string | undefined;
        if (styleId) {
          paintStyleName = this.paintStyleMap.get(styleId);
          if (!paintStyleName) {
            const baseId = styleId.split(',')[0];
            const mapFormatId = baseId + ',';
            paintStyleName = this.paintStyleMap.get(mapFormatId) || this.paintStyleMap.get(baseId);
          }
        }
        
        return {
          type: 'GRADIENT_LINEAR',
          gradientStops: paint.gradientStops.map(stop => ({
            color: this.rgbToHex(stop.color),
            position: stop.position
          })),
          opacity: paint.opacity || 1,
          
          // NEW: Design System color style references
          paintStyleId: styleId || undefined,
          paintStyleName: paintStyleName,
          boundVariables: paint.boundVariables || undefined,
          usesDesignSystemColor: !!(styleId || (paint.boundVariables && Object.keys(paint.boundVariables).length > 0))
        };
      }

      // Add support for other gradient types
      if ((paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') && paint.gradientStops) {
        // NEW: Extract Design System color style references for other gradients
        let paintStyleName: string | undefined;
        if (paint.paintStyleId) {
          paintStyleName = this.paintStyleMap.get(paint.paintStyleId);
          if (!paintStyleName) {
            const baseId = paint.paintStyleId.split(',')[0];
            const mapFormatId = baseId + ',';
            paintStyleName = this.paintStyleMap.get(mapFormatId) || this.paintStyleMap.get(baseId);
          }
        }
        
        return {
          type: paint.type,
          gradientStops: paint.gradientStops.map(stop => ({
            color: this.rgbToHex(stop.color),
            position: stop.position
          })),
          opacity: paint.opacity || 1,
          
          // NEW: Design System color style references
          paintStyleId: styleId || undefined,
          paintStyleName: paintStyleName,
          boundVariables: paint.boundVariables || undefined,
          usesDesignSystemColor: !!(styleId || (paint.boundVariables && Object.keys(paint.boundVariables).length > 0))
        };
      }

      if (paint.type === 'IMAGE') {
        return {
          type: 'IMAGE',
          opacity: paint.opacity || 1
        };
      }

    } catch (error) {
      console.warn('Error converting paint to color info:', error);
    }

    return null;
  }

  /**
   * Convert RGB to hex color
   */
  static rgbToHex(rgb: RGB): string {
    const toHex = (value: number): string => {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  /**
   * Find primary text color by analyzing text nodes
   */
  static findPrimaryTextColor(node: SceneNode): ColorInfo | null {
    try {
      const textNodes = node.findAll(n => n.type === 'TEXT') as TextNode[];
      
      for (const textNode of textNodes) {
        if (textNode.visible && textNode.fills && Array.isArray(textNode.fills)) {
          for (const fill of textNode.fills) {
            if (fill.visible !== false && fill.type === 'SOLID') {
              const styleId = textNode.fillStyleId && typeof textNode.fillStyleId === 'string' ? textNode.fillStyleId : undefined;
              return this.convertPaintToColorInfo(fill, styleId);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error finding text color:', error);
    }

    return null;
  }

  /**
   * Find background color by analyzing the largest rectangle or container
   */
  static findBackgroundColor(node: SceneNode): ColorInfo | null {
    try {
      // Look for rectangles that could be backgrounds
      const rectangles = node.findAll(n => 
        n.type === 'RECTANGLE' || n.type === 'FRAME' || n.type === 'COMPONENT'
      );

      // Sort by size (area) to find the largest one that's likely the background
      rectangles.sort((a, b) => {
        const areaA = a.width * a.height;
        const areaB = b.width * b.height;
        return areaB - areaA;
      });

      for (const rect of rectangles) {
        if ('fills' in rect && rect.fills && Array.isArray(rect.fills)) {
          for (const fill of rect.fills) {
            if (fill.visible !== false) {
              const styleId = 'fillStyleId' in rect && rect.fillStyleId && typeof rect.fillStyleId === 'string' ? rect.fillStyleId : undefined;
              const colorInfo = this.convertPaintToColorInfo(fill, styleId);
              if (colorInfo && colorInfo.type === 'SOLID') {
                return colorInfo;
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error finding background color:', error);
    }

    return null;
  }
}