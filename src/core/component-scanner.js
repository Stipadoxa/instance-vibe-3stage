"use strict";
// component-scanner.ts
// Design system component scanning and analysis for AIDesigner
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentScanner = void 0;
class ComponentScanner {
    /**
     * NEW: Scan Figma Variables (Design Tokens) from the local file
     */
    static async scanFigmaVariables() {
        var _a;
        console.log("🔧 Scanning Figma Variables (Design Tokens)...");
        try {
            // Debug: Check if Variables API exists
            if (!figma.variables) {
                console.warn("❌ figma.variables API not available in this Figma version");
                // DEBUG log removed for cleaner console output
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
                    // Note: This might not be available, but worth trying
                }
                catch (e) {
                    console.log("📝 Non-local variable check not available");
                }
                return [];
            }
            const tokens = [];
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
                        }
                        catch (varErr) {
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
                            const token = {
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
                            }
                            else {
                                console.log(`🔧 ${variable.resolvedType} token: "${variable.name}"`);
                            }
                        }
                        catch (varError) {
                            console.warn(`⚠️ Failed to process variable "${variable.name}":`, varError);
                        }
                    }
                }
                catch (collectionError) {
                    console.warn(`⚠️ Failed to process collection "${collection.name}": ${collectionError.message}`);
                    console.warn(`⚠️ Error type: ${typeof collectionError}, Stack:`, collectionError.stack);
                    // Check if it's specifically the getVariablesByCollectionAsync issue
                    if ((_a = collectionError.message) === null || _a === void 0 ? void 0 : _a.includes('not a function')) {
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
        }
        catch (error) {
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
    static async createDesignTokensFromColorStyles() {
        console.log("🔄 Creating fallback design tokens from color styles...");
        try {
            const colorStyleCollection = await this.scanFigmaColorStyles();
            const tokens = [];
            // Convert each color style to a design token format
            Object.entries(colorStyleCollection).forEach(([category, styles]) => {
                styles.forEach(style => {
                    // Create a token name from the style name
                    const tokenName = style.name.toLowerCase()
                        .replace(/[\/\s]+/g, '-') // Replace / and spaces with -
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
                    const token = {
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
        }
        catch (error) {
            console.warn("⚠️ Failed to create fallback design tokens:", error);
            return [];
        }
    }
    /**
     * Scan Figma Color Styles from the local file
     */
    static async scanFigmaColorStyles() {
        console.log("🎨 Scanning Figma Color Styles...");
        try {
            const paintStyles = await figma.getLocalPaintStylesAsync();
            console.log(`✅ Found ${paintStyles.length} paint styles`);
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
                    console.log(`🎨 Categorized "${colorStyle.name}" as ${category} (variant: ${colorStyle.variant || 'none'})`);
                }
                catch (error) {
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
        }
        catch (error) {
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
    static async scanFigmaTextStyles() {
        try {
            console.log('🔍 Scanning text styles...');
            const figmaTextStyles = await figma.getLocalTextStylesAsync();
            console.log(`Found ${figmaTextStyles.length} text styles`);
            const textStyles = figmaTextStyles.map(style => {
                // Build text style object with safe property access
                const textStyle = {
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
                // Note: textAlignHorizontal and textAlignVertical don't exist in current Figma API
                // Skip these properties for now - they may have been moved or renamed
                /*
                if (style.textAlignHorizontal) {
                  textStyle.textAlignHorizontal = style.textAlignHorizontal;
                }
                
                if (style.textAlignVertical) {
                  textStyle.textAlignVertical = style.textAlignVertical;
                }
                */
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
        }
        catch (error) {
            console.error('❌ Error scanning text styles:', error);
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
            description: paintStyle.description || undefined,
            paints: [...paintStyle.paints], // Convert readonly to mutable array
            category,
            variant,
            colorInfo: colorInfo || { type: 'SOLID', color: '#000000', opacity: 1 }
        };
    }
    /**
     * Categorize a color style based on its name
     * Supports patterns like: 'primary90', 'secondary50', 'neutral-100', 'Primary/500', etc.
     */
    static categorizeColorStyle(styleName) {
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
    static parseColorStyleName(styleName) {
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
    static async scanDesignSystem() {
        console.log("🔍 Starting comprehensive design system scan with optimization...");
        const components = [];
        let colorStyles;
        let textStyles;
        try {
            await figma.loadAllPagesAsync();
            console.log("✅ All pages loaded");
            // First, scan Design Tokens (Variables)
            console.log("\n🔧 Phase 1: Scanning Design Tokens...");
            let designTokens;
            try {
                designTokens = await this.scanFigmaVariables();
                if (designTokens && designTokens.length > 0) {
                    console.log(`🚀 SUCCESS: Found ${designTokens.length} design tokens from Variables API`);
                }
                else {
                    console.log(`❌ PROBLEM: Variables API returned empty or undefined`);
                }
                // If Variables API returned no tokens, try fallback method
                if (!designTokens || designTokens.length === 0) {
                    console.log("🔄 No Variables found, trying fallback design tokens from color styles...");
                    designTokens = await this.createDesignTokensFromColorStyles();
                    if (designTokens && designTokens.length > 0) {
                        console.log("✅ Using fallback design tokens created from color styles");
                    }
                    else {
                        console.log("⚠️ Fallback also returned no tokens");
                    }
                }
                else {
                    console.log("✅ Using Variables API design tokens");
                }
            }
            catch (error) {
                console.warn("⚠️ Design Tokens scanning failed, trying fallback:", error);
                try {
                    designTokens = await this.createDesignTokensFromColorStyles();
                    console.log("✅ Using fallback design tokens despite Variables API error");
                }
                catch (fallbackError) {
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
                }
                else {
                    console.warn('⚠️ No color styles available for lookup map');
                    this.paintStyleMap.clear();
                }
                // NEW: Build variable lookup map for fast ID->name resolution
                if (designTokens && designTokens.length > 0) {
                    this.buildVariableMap(designTokens);
                }
                else {
                    console.warn('⚠️ No variables available for lookup map');
                    this.variableMap.clear();
                    this.variableDetails.clear();
                }
            }
            catch (error) {
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
                        var _a, _b;
                        this.textStyleMap.set(style.id, style.name);
                        // NEW: Build detailed style properties for exact matching
                        this.textStyleDetails.set(style.id, {
                            id: style.id,
                            name: style.name,
                            fontSize: style.fontSize,
                            fontFamily: ((_a = style.fontName) === null || _a === void 0 ? void 0 : _a.family) || 'Unknown',
                            fontWeight: ((_b = style.fontName) === null || _b === void 0 ? void 0 : _b.style) || 'Regular'
                        });
                    });
                    console.log(`✅ Built text style lookup map with ${this.textStyleMap.size} entries`);
                    console.log(`✅ Built text style details map with ${this.textStyleDetails.size} entries`);
                    // DEBUG: Log first few entries to understand ID format
                    const firstEntries = Array.from(this.textStyleMap.entries()).slice(0, 3);
                    console.log('🔍 First text style IDs in map:', firstEntries);
                }
            }
            catch (error) {
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
                        }
                        catch (e) {
                            console.error(`❌ Error analyzing component "${node.name}":`, e);
                        }
                    }
                }
                catch (e) {
                    console.error(`❌ Error scanning page "${page.name}":`, e);
                }
            }
            const scanSession = {
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
                    var _a, _b;
                    this.textStyleMap.set(style.id, style.name);
                    // NEW: Build detailed style properties for exact matching
                    this.textStyleDetails.set(style.id, {
                        id: style.id,
                        name: style.name,
                        fontSize: style.fontSize,
                        fontFamily: ((_a = style.fontName) === null || _a === void 0 ? void 0 : _a.family) || 'Unknown',
                        fontWeight: ((_b = style.fontName) === null || _b === void 0 ? void 0 : _b.style) || 'Regular'
                    });
                });
                console.log(`✅ Built text style lookup map with ${this.textStyleMap.size} entries`);
                console.log(`✅ Built text style details map with ${this.textStyleDetails.size} entries`);
                // DEBUG: Log first few entries to understand ID format
                const firstEntries = Array.from(this.textStyleMap.entries()).slice(0, 3);
                console.log('🔍 First text style IDs in map:', firstEntries);
            }
            else {
                console.warn('⚠️ No text styles available for lookup map');
                this.textStyleMap.clear();
                this.textStyleDetails.clear();
            }
            return scanSession;
        }
        catch (e) {
            console.error("❌ Critical error in scanDesignSystem:", e);
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
        // Limit recursion depth to prevent infinite loops
        if (depth > 3)
            return null;
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
        }
        catch (error) {
            console.warn(`⚠️ Error searching nested padding at depth ${depth}:`, error);
            return null;
        }
    }
    /**
     * Extracts internal padding information from a component, including nested auto-layout containers
     */
    static extractInternalPadding(comp) {
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
        }
        catch (error) {
            console.warn(`⚠️ Error extracting padding for component ${comp.name}:`, error);
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
        // Extract basic dimensions and positioning
        if ('width' in node && 'height' in node) {
            properties.width = node.width;
            properties.height = node.height;
        }
        if ('x' in node && 'y' in node) {
            properties.x = node.x;
            properties.y = node.y;
        }
        // Extract layout properties
        if ('layoutAlign' in node && node.layoutAlign) {
            properties.layoutAlign = node.layoutAlign;
        }
        if ('layoutGrow' in node && typeof node.layoutGrow === 'number') {
            properties.layoutGrow = node.layoutGrow;
        }
        if ('layoutSizingHorizontal' in node && node.layoutSizingHorizontal) {
            properties.layoutSizingHorizontal = node.layoutSizingHorizontal;
        }
        if ('layoutSizingVertical' in node && node.layoutSizingVertical) {
            properties.layoutSizingVertical = node.layoutSizingVertical;
        }
        // Extract type-specific properties
        switch (node.type) {
            case 'TEXT':
                properties.textHierarchy = await this.extractSingleTextHierarchy(node);
                break;
            case 'COMPONENT':
            case 'INSTANCE':
                properties.componentInstance = await this.extractSingleComponentInstance(node);
                break;
            case 'VECTOR':
                properties.vectorNode = this.extractSingleVectorNode(node);
                break;
            case 'RECTANGLE':
            case 'ELLIPSE':
                properties.imageNode = this.extractSingleImageNode(node);
                break;
        }
        // Extract auto-layout behavior if node has it
        if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
            try {
                const autoLayout = this.analyzeAutoLayoutBehavior(node);
                properties.autoLayoutBehavior = autoLayout || undefined;
            }
            catch (error) {
                console.warn(`⚠️ Failed to analyze auto-layout for "${node.name}":`, error);
            }
        }
        // Extract style information for visual nodes
        if (this.isVisualNode(node)) {
            try {
                properties.styleInfo = this.extractStyleInfo(node);
            }
            catch (error) {
                console.warn(`⚠️ Failed to extract style info for "${node.name}":`, error);
            }
        }
        return Object.keys(properties).length > 0 ? properties : undefined;
    }
    /**
     * NEW: Set special flags for component structure
     */
    static setSpecialFlags(structure, node, parentId) {
        // Check if this is a nested auto-layout
        if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
            if (parentId) {
                structure.isNestedAutoLayout = true;
                // Special handling for nested auto-layouts within component instances
                if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
                }
            }
            else {
            }
        }
        // Check if this is a component instance reference
        if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
            structure.isComponentInstanceReference = true;
            // Enhanced logging for component instances
            const hasAutoLayout = 'layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE';
            // If this is a component instance with auto-layout in a nested context, it's likely an icon container
            if (hasAutoLayout && parentId) {
            }
        }
        // Enhanced icon context detection
        if (this.isLikelyIcon(node)) {
            structure.iconContext = this.determineIconContext(node, parentId);
            if (structure.iconContext) {
                console.log(`  🎨 Icon context for "${node.name}": ${structure.iconContext}`);
            }
        }
    }
    /**
     * NEW: Enhanced icon detection
     */
    static isLikelyIcon(node) {
        const name = node.name.toLowerCase();
        // Vector nodes are often icons
        if (node.type === 'VECTOR') {
            return true;
        }
        // Component instances with "icon" in the name
        if ((node.type === 'COMPONENT' || node.type === 'INSTANCE') && name.includes('icon')) {
            return true;
        }
        // Small components/instances that are likely icons (heuristic based on size)
        if ((node.type === 'COMPONENT' || node.type === 'INSTANCE') && 'width' in node && 'height' in node) {
            const maxDimension = Math.max(node.width, node.height);
            if (maxDimension <= 48) { // Icons are usually 48px or smaller
                console.log(`    🔍 Small component "${node.name}" (${node.width}x${node.height}) - likely icon`);
                return true;
            }
        }
        // Names that suggest icons
        const iconKeywords = ['arrow', 'chevron', 'star', 'heart', 'plus', 'minus', 'close', 'menu', 'search', 'check', 'cross'];
        if (iconKeywords.some(keyword => name.includes(keyword))) {
            return true;
        }
        return false;
    }
    /**
     * NEW: Determine whether to traverse children of a node
     */
    static shouldTraverseChildren(node) {
        // SPECIAL CASE: Component instances - note relationship but don't analyze deeply
        if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
            // Exception: If this is a top-level component we're analyzing, we DO want to traverse
            // Exception: If this contains nested auto-layout patterns, we may want shallow traversal
            const hasAutoLayout = 'layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE';
            if (hasAutoLayout) {
                // Structural analysis log removed for cleaner console output
                return true; // Allow traversal to capture nested auto-layout structure
            }
            // Component reference log removed for cleaner console output
            return false; // Standard behavior: don't analyze internal structure deeply
        }
        // SPECIAL CASE: Nested auto-layout containers - always traverse these
        if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
            // Auto-layout traversal log removed for cleaner console output
            return true;
        }
        // Always traverse standard containers
        if (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'COMPONENT_SET') {
            return true;
        }
        // Don't traverse into basic elements like TEXT, VECTOR, RECTANGLE, ELLIPSE
        if (['TEXT', 'VECTOR', 'RECTANGLE', 'ELLIPSE', 'LINE', 'STAR', 'POLYGON'].includes(node.type)) {
            return false;
        }
        // Default to traversing for other types
        return true;
    }
    /**
     * NEW: Enhanced icon context determination based on position, parent, and siblings
     */
    static determineIconContext(node, parentId) {
        if (!parentId)
            return 'standalone';
        const name = node.name.toLowerCase();
        // Explicit naming patterns
        if (name.includes('leading') || name.includes('start') || name.includes('left')) {
            return 'leading';
        }
        if (name.includes('trailing') || name.includes('end') || name.includes('right') || name.includes('chevron') || name.includes('arrow')) {
            return 'trailing';
        }
        if (name.includes('decoration') || name.includes('ornament') || name.includes('badge')) {
            return 'decorative';
        }
        // Try to get parent node for contextual analysis
        try {
            const parent = node.parent;
            if (parent && 'children' in parent && parent.children) {
                return this.analyzeIconPositionInParent(node, parent);
            }
        }
        catch (error) {
            console.warn(`Could not analyze parent context for icon "${node.name}"`);
        }
        return 'standalone';
    }
    /**
     * NEW: Analyze icon position within its parent to determine context
     */
    static analyzeIconPositionInParent(node, parent) {
        const children = parent.children;
        const nodeIndex = children.indexOf(node);
        if (nodeIndex === -1)
            return 'standalone';
        // Check if parent is an auto-layout container
        const isAutoLayoutParent = 'layoutMode' in parent && parent.layoutMode && parent.layoutMode !== 'NONE';
        if (isAutoLayoutParent) {
            const layoutMode = parent.layoutMode;
            // In horizontal layouts
            if (layoutMode === 'HORIZONTAL') {
                if (nodeIndex === 0) {
                    return 'leading';
                }
                if (nodeIndex === children.length - 1) {
                    return 'trailing';
                }
            }
            // In vertical layouts, icons are more likely decorative or standalone
            if (layoutMode === 'VERTICAL') {
                return 'decorative';
            }
        }
        // Look for text siblings to determine icon relationship
        const hasTextSiblings = children.some(child => child.type === 'TEXT');
        if (hasTextSiblings) {
            const textNodes = children.filter(child => child.type === 'TEXT');
            const firstTextIndex = children.indexOf(textNodes[0]);
            if (nodeIndex < firstTextIndex) {
                return 'leading';
            }
            else {
                return 'trailing';
            }
        }
        // Check position based on coordinates (fallback for non-auto-layout)
        if ('x' in node && 'x' in parent && 'width' in parent) {
            const relativeX = node.x;
            const parentWidth = parent.width;
            if (relativeX < parentWidth * 0.3) {
                return 'leading';
            }
            else if (relativeX > parentWidth * 0.7) {
                return 'trailing';
            }
        }
        return 'standalone';
    }
    /**
     * NEW: Check if node is a visual node that can have style information
     */
    static isVisualNode(node) {
        return ['TEXT', 'RECTANGLE', 'ELLIPSE', 'VECTOR', 'FRAME', 'COMPONENT', 'INSTANCE'].includes(node.type);
    }
    /**
     * NEW: Extract text hierarchy for a single text node
     */
    static async extractSingleTextHierarchy(textNode) {
        const fontSize = typeof textNode.fontSize === 'number' ? textNode.fontSize : 14;
        const fontWeight = textNode.fontWeight || 'normal';
        const fontFamily = (textNode.fontName && typeof textNode.fontName === 'object' && textNode.fontName.family)
            ? textNode.fontName.family
            : 'Unknown';
        let characters;
        try {
            characters = textNode.characters || '[empty]';
        }
        catch (e) {
            characters = undefined;
        }
        // Extract text color
        let textColor;
        try {
            if (textNode.fills && Array.isArray(textNode.fills) && textNode.fills.length > 0) {
                const fillStyleId = ('fillStyleId' in textNode) ? textNode.fillStyleId : undefined;
                const styleId = (fillStyleId && fillStyleId !== figma.mixed) ? fillStyleId : undefined;
                const firstFill = textNode.fills[0];
                if (firstFill.visible !== false) {
                    textColor = this.convertPaintToColorInfo(firstFill, styleId) || undefined;
                }
            }
        }
        catch (e) {
            console.warn(`Could not extract text color for "${textNode.name}"`);
        }
        // Extract Design System text style references
        let textStyleId;
        let textStyleName;
        let boundTextStyleId;
        try {
            textStyleId = (textNode.textStyleId && textNode.textStyleId !== figma.mixed) ? textNode.textStyleId : undefined;
            // Note: boundTextStyleId doesn't exist in current Figma API
            boundTextStyleId = undefined;
            if (textStyleId) {
                textStyleName = this.textStyleMap.get(textStyleId);
                if (!textStyleName) {
                    const baseId = textStyleId.split(',')[0];
                    const mapFormatId = baseId + ',';
                    textStyleName = this.textStyleMap.get(mapFormatId) || this.textStyleMap.get(baseId);
                    if (!textStyleName) {
                        console.log(`🔄 External textStyleId detected: ${textStyleId}, trying exact match fallback`);
                        const weightValue = (typeof fontWeight === 'symbol') ? 'normal' : fontWeight;
                        textStyleName = this.findExactMatchingLocalStyle(fontSize, fontFamily, weightValue);
                        if (textStyleName) {
                            console.log(`✅ External style mapped to local: "${textStyleName}"`);
                        }
                    }
                }
            }
        }
        catch (e) {
            console.warn(`Could not extract text style references for "${textNode.name}"`, e);
        }
        // Determine classification (simplified for single node)
        let classification = 'tertiary';
        const weightValue = (typeof fontWeight === 'symbol') ? 'normal' : fontWeight;
        const weight = String(weightValue).toLowerCase();
        if (weight.includes('bold') || weight.includes('700') || weight.includes('800') || weight.includes('900')) {
            classification = 'primary';
        }
        else if (weight.includes('medium') || weight.includes('500') || weight.includes('600')) {
            classification = 'secondary';
        }
        const usesDesignSystemStyle = !!(textStyleId || boundTextStyleId);
        return {
            nodeName: textNode.name,
            nodeId: textNode.id,
            fontSize,
            fontWeight: weightValue, // Use the cleaned weight value
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
        if (node.type === 'INSTANCE') {
            try {
                const mainComponent = await node.getMainComponentAsync();
                instance.componentId = mainComponent === null || mainComponent === void 0 ? void 0 : mainComponent.id;
            }
            catch (e) {
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
                hasImageFill = fills.some(fill => typeof fill === 'object' && fill !== null && fill.type === 'IMAGE');
            }
        }
        catch (e) {
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
        // DEPRECATED: Heavy methods disabled for optimization
        // const textLayers = this.findTextLayers(comp);
        // const textHierarchy = await this.analyzeTextHierarchy(comp);
        // const componentInstances = await this.findComponentInstances(comp);
        // const vectorNodes = this.findVectorNodes(comp);
        // const imageNodes = this.findImageNodes(comp);
        // NEW: Extract hierarchical component structure
        console.log(`🏗️ Building hierarchical structure for "${comp.name}"`);
        let componentStructure;
        try {
            // For component sets, analyze the default variant or first variant
            let nodeToAnalyze = comp;
            if (comp.type === 'COMPONENT_SET' && comp.children.length > 0) {
                nodeToAnalyze = comp.defaultVariant || comp.children[0];
            }
            // DEPRECATED: Heavy method disabled - use analyzeComponentOptimized instead
            // componentStructure = await this.analyzeComponentStructure(nodeToAnalyze as SceneNode);
            // console.log(`✅ Built hierarchical structure with ${this.countStructureNodes(componentStructure)} total nodes`);
        }
        catch (error) {
            console.warn(`⚠️ Failed to build hierarchical structure for "${comp.name}":`, error);
        }
        // NEW: Extract color and style information
        const styleInfo = this.extractStyleInfo(comp);
        // NEW: Extract internal padding information
        const internalPadding = this.extractInternalPadding(comp);
        if (internalPadding) {
            console.log(`📏 Found internal padding for "${comp.name}":`, internalPadding);
        }
        // NEW: Analyze auto-layout behavior
        const autoLayoutBehavior = this.analyzeAutoLayoutBehavior(comp);
        if (autoLayoutBehavior && autoLayoutBehavior.isAutoLayout) {
            console.log(`🎯 Found auto-layout behavior for "${comp.name}":`, autoLayoutBehavior.layoutMode);
        }
        let variants = [];
        const variantDetails = {};
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
            textLayers: undefined, // DEPRECATED: Disabled for optimization
            textHierarchy: undefined, // DEPRECATED: Disabled for optimization
            componentInstances: undefined, // DEPRECATED: Disabled for optimization
            vectorNodes: undefined, // DEPRECATED: Disabled for optimization
            imageNodes: undefined, // DEPRECATED: Disabled for optimization
            styleInfo: styleInfo, // NEW: Include color and style information
            internalPadding: internalPadding || undefined, // NEW: Include internal padding information
            autoLayoutBehavior: autoLayoutBehavior || undefined, // NEW: Include auto-layout behavior analysis
            componentStructure: undefined, // DEPRECATED: Disabled for optimization
            isFromLibrary: false
        };
    }
    /**
     * NEW: Count total nodes in component structure (for debugging)
     */
    static countStructureNodes(structure) {
        let count = 1; // Count this node
        if (structure.children && structure.children.length > 0) {
            for (const child of structure.children) {
                count += this.countStructureNodes(child);
            }
        }
        return count;
    }
    /**
     * NEW: Optimized component analysis for LLM context (replaces heavy analyzeComponent)
     */
    static async analyzeComponentOptimized(comp) {
        console.log(`🚀 Optimized analysis for "${comp.name}"`);
        try {
            const name = comp.name;
            const suggestedType = this.guessComponentType(name.toLowerCase());
            const confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
            // Extract variant OPTIONS only (not combinations)
            const variantOptions = this.extractVariantOptionsOptimized(comp);
            // Shallow text slot analysis (no deep recursion)
            const textSlots = this.extractTextSlotsOptimized(comp);
            // Component slots with exact names (for visibility override)
            const componentSlots = await this.extractComponentSlotsOptimized(comp);
            // Layout behavior hints (no absolute coordinates)
            const layoutBehavior = this.extractLayoutBehaviorOptimized(comp);
            // Style context (no detailed fills/strokes)
            const styleContext = this.extractStyleContextOptimized(comp);
            console.log(`✅ Optimized analysis complete for "${name}"`);
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
        }
        catch (error) {
            console.error(`❌ Failed to analyze component "${comp.name}":`, error);
            // Retry once with basic fallback
            try {
                console.log(`🔄 Retrying with basic analysis for "${comp.name}"`);
                const name = comp.name;
                const suggestedType = this.guessComponentType(name.toLowerCase());
                const confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
                return {
                    id: comp.id,
                    name,
                    suggestedType,
                    confidence: Math.max(0.1, confidence - 0.3), // Lower confidence for failed analysis
                    isFromLibrary: false
                };
            }
            catch (retryError) {
                console.error(`❌ Retry failed for component "${comp.name}":`, retryError);
                throw new Error(`Component analysis completely failed for "${comp.name}": ${retryError.message}`);
            }
        }
    }
    /**
     * Extract variant options only (no combinations)
     */
    static extractVariantOptionsOptimized(comp) {
        if (comp.type !== 'COMPONENT_SET')
            return undefined;
        const variantOptions = {};
        const variantProps = comp.variantGroupProperties;
        if (!variantProps)
            return undefined;
        for (const [propName, prop] of Object.entries(variantProps)) {
            if ('values' in prop && prop.values.length > 0) {
                variantOptions[propName] = prop.values;
            }
        }
        return Object.keys(variantOptions).length > 0 ? variantOptions : undefined;
    }
    /**
     * Extract text slots with exact names (SHALLOW - no recursion)
     */
    static extractTextSlotsOptimized(comp) {
        const slots = {};
        const nodeToAnalyze = comp.type === 'COMPONENT_SET' ?
            (comp.defaultVariant || comp.children[0]) : comp;
        if (!nodeToAnalyze || !('children' in nodeToAnalyze))
            return undefined;
        // ONLY scan immediate children (depth 1)
        for (const child of nodeToAnalyze.children) {
            if (child.type === 'TEXT') {
                const textNode = child;
                slots[child.name] = {
                    required: child.visible !== false,
                    type: textNode.textAutoResize === 'HEIGHT' ? 'multi-line' : 'single-line',
                    maxLength: this.estimateMaxLength(textNode)
                };
            }
        }
        return Object.keys(slots).length > 0 ? slots : undefined;
    }
    /**
     * Extract component slots with exact names (SHALLOW - references only)
     */
    static async extractComponentSlotsOptimized(comp) {
        const slots = {};
        const nodeToAnalyze = comp.type === 'COMPONENT_SET' ?
            (comp.defaultVariant || comp.children[0]) : comp;
        if (!nodeToAnalyze || !('children' in nodeToAnalyze))
            return undefined;
        // ONLY scan immediate children (depth 1)
        for (const child of nodeToAnalyze.children) {
            if (child.type === 'INSTANCE') {
                const instance = child;
                try {
                    const mainComp = await instance.getMainComponentAsync();
                    const category = this.guessComponentCategory((mainComp === null || mainComp === void 0 ? void 0 : mainComp.name) || child.name);
                    slots[child.name] = {
                        componentId: mainComp === null || mainComp === void 0 ? void 0 : mainComp.id,
                        category,
                        swappable: true,
                        required: child.visible !== false
                    };
                }
                catch (error) {
                    console.warn(`Failed to analyze component slot "${child.name}"`);
                }
            }
        }
        return Object.keys(slots).length > 0 ? slots : undefined;
    }
    /**
     * Extract layout behavior (semantic, no absolute coordinates)
     */
    static extractLayoutBehaviorOptimized(comp) {
        const node = comp.type === 'COMPONENT_SET' ?
            (comp.defaultVariant || comp.children[0]) : comp;
        if (!node || !('layoutMode' in node) || node.layoutMode === 'NONE') {
            return undefined;
        }
        const isIcon = 'width' in node && 'height' in node &&
            Math.max(node.width, node.height) <= 48;
        const isTouchTarget = 'height' in node && node.height >= 44;
        return {
            type: node.primaryAxisSizingMode === 'AUTO' ? 'hug-content' :
                node.layoutAlign === 'STRETCH' ? 'fill-container' : 'fixed',
            direction: node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical',
            hasInternalPadding: (node.paddingTop || 0) > 0,
            canWrap: node.layoutWrap === 'WRAP',
            minHeight: node.minHeight || undefined,
            isIcon,
            isTouchTarget
        };
    }
    /**
     * Extract style context (design system colors only, no detailed fills)
     */
    static extractStyleContextOptimized(comp) {
        var _a;
        const node = comp.type === 'COMPONENT_SET' ?
            (comp.defaultVariant || comp.children[0]) : comp;
        // Quick check for primary design system color
        let primaryColor;
        try {
            const styleInfo = this.extractStyleInfo(node);
            primaryColor = (_a = styleInfo === null || styleInfo === void 0 ? void 0 : styleInfo.primaryColor) === null || _a === void 0 ? void 0 : _a.paintStyleName;
        }
        catch (error) {
            // Ignore styling errors
        }
        // Quick check for image slots (shallow scan)
        const hasImageSlot = this.hasImageSlotShallow(node);
        // Infer semantic role
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
        if (lowName.includes('icon'))
            return 'icon';
        if (lowName.includes('button') || lowName.includes('btn'))
            return 'button';
        if (lowName.includes('input') || lowName.includes('field'))
            return 'input';
        if (lowName.includes('image') || lowName.includes('photo'))
            return 'image';
        return 'container';
    }
    /**
     * Helper: Estimate max text length
     */
    static estimateMaxLength(textNode) {
        if (!textNode.width)
            return undefined;
        const avgCharWidth = (textNode.fontSize || 14) * 0.6;
        const lines = textNode.textAutoResize === 'HEIGHT' ? 3 : 1;
        return Math.floor((textNode.width / avgCharWidth) * lines);
    }
    /**
     * Helper: Check for image slots (shallow)
     */
    static hasImageSlotShallow(node) {
        if (!node || !('children' in node))
            return false;
        // Only check immediate children
        for (const child of node.children) {
            if (child.type === 'RECTANGLE' || child.type === 'ELLIPSE') {
                try {
                    const fills = child.fills;
                    if (Array.isArray(fills) && fills.some(f => f.type === 'IMAGE')) {
                        return true;
                    }
                }
                catch (error) {
                    // Ignore fill check errors
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
        if (lowName.includes('nav') || lowName.includes('tab') || lowName.includes('menu')) {
            return 'navigation';
        }
        if (lowName.includes('button') || lowName.includes('cta')) {
            return 'action';
        }
        if (lowName.includes('card') || lowName.includes('item') || lowName.includes('list')) {
            return 'display';
        }
        if (lowName.includes('input') || lowName.includes('field') || lowName.includes('form')) {
            return 'input';
        }
        return 'container';
    }
    /**
     * NEW: Generate a summary of component structure for debugging
     */
    static generateStructureSummary(structure, indent = "") {
        var _a, _b;
        let summary = `${indent}${structure.type}:${structure.name} (id:${structure.id.slice(-8)})`;
        // Add special flags
        const flags = [];
        if (structure.isNestedAutoLayout)
            flags.push("🎯nested-auto");
        if (structure.isComponentInstanceReference)
            flags.push("📦comp-ref");
        if (structure.iconContext)
            flags.push(`🎨${structure.iconContext}`);
        if (flags.length > 0) {
            summary += ` [${flags.join(", ")}]`;
        }
        // Add node properties summary
        if (structure.nodeProperties) {
            const props = [];
            if ((_a = structure.nodeProperties.autoLayoutBehavior) === null || _a === void 0 ? void 0 : _a.isAutoLayout) {
                props.push(`auto-layout:${structure.nodeProperties.autoLayoutBehavior.layoutMode}`);
            }
            if (structure.nodeProperties.textHierarchy) {
                props.push(`text:${((_b = structure.nodeProperties.textHierarchy.characters) === null || _b === void 0 ? void 0 : _b.slice(0, 20)) || "empty"}`);
            }
            if (structure.nodeProperties.componentInstance) {
                props.push("component-instance");
            }
            if (structure.nodeProperties.vectorNode) {
                props.push("vector");
            }
            if (structure.nodeProperties.imageNode) {
                props.push(`image:${structure.nodeProperties.imageNode.hasImageFill ? "has-fill" : "no-fill"}`);
            }
            if (props.length > 0) {
                summary += ` {${props.join(", ")}}`;
            }
        }
        summary += `\n`;
        // Recursively add children
        if (structure.children && structure.children.length > 0) {
            for (const child of structure.children) {
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
            // Find the component by ID
            const component = figma.getNodeById(componentId);
            if (!component) {
                console.error(`❌ Component not found: ${componentId}`);
                return;
            }
            if (component.type !== 'COMPONENT' && component.type !== 'COMPONENT_SET') {
                console.error(`❌ Node is not a component: ${component.type}`);
                return;
            }
            // DEPRECATED: Heavy method disabled
            // const structure = await this.analyzeComponentStructure(component as SceneNode);
            // Generate and log the structure summary
            // Count nodes
            const nodeCount = this.countStructureNodes(structure);
            // Log depth statistics
            const depthStats = this.calculateDepthStatistics(structure);
        }
        catch (error) {
            console.error(`❌ Error testing component structure:`, error);
        }
    }
    /**
     * NEW: Calculate depth statistics for a component structure
     */
    static calculateDepthStatistics(structure) {
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
        traverse(structure);
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
        // Test with known component IDs from JSON data
        const testComponentIds = [
            "10:3856", // snackbar
            "10:3907", // Button
            "10:3918", // Another component if exists
        ];
        for (const componentId of testComponentIds) {
            try {
                await this.testComponentStructure(componentId);
            }
            catch (error) {
                console.warn(`⚠️ Failed to test component ${componentId}:`, error);
            }
        }
    }
    /**
     * NEW: Export a component structure to JSON for inspection
     */
    static async exportComponentStructureToJson(componentId) {
        try {
            const component = figma.getNodeById(componentId);
            if (!component || (component.type !== 'COMPONENT' && component.type !== 'COMPONENT_SET')) {
                console.error(`❌ Invalid component: ${componentId}`);
                return null;
            }
            // DEPRECATED: Heavy method disabled
            // const structure = await this.analyzeComponentStructure(component as SceneNode);
            return JSON.stringify({}, null, 2);
        }
        catch (error) {
            console.error(`❌ Error exporting component structure:`, error);
            return null;
        }
    }
    /**
     * Intelligent component type detection based on naming patterns
     */
    static guessComponentType(name) {
        var _a;
        const patterns = {
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
            if ((_a = patterns[type]) === null || _a === void 0 ? void 0 : _a.test(name))
                return type;
        }
        for (const type in patterns) {
            if (Object.prototype.hasOwnProperty.call(patterns, type) && !priorityPatterns.includes(type)) {
                if (patterns[type].test(name))
                    return type;
            }
        }
        return 'unknown';
    }
    /**
     * Calculates confidence score for component type detection
     */
    static calculateConfidence(name, suggestedType) {
        if (suggestedType === 'unknown')
            return 0.1;
        if (name.toLowerCase() === suggestedType.toLowerCase())
            return 0.95;
        if (name.includes(suggestedType))
            return 0.9;
        if (name.toLowerCase().includes(suggestedType + '-') || name.toLowerCase().includes(suggestedType + '_'))
            return 0.85;
        return 0.7;
    }
    /**
     * NEW: Normalize fontWeight to comparable format
     */
    static normalizeFontWeight(fontWeight) {
        if (typeof fontWeight === 'number') {
            // Convert number to string representation
            if (fontWeight <= 300)
                return 'Light';
            if (fontWeight <= 400)
                return 'Regular';
            if (fontWeight <= 500)
                return 'Medium';
            if (fontWeight <= 600)
                return 'SemiBold';
            if (fontWeight <= 700)
                return 'Bold';
            return 'ExtraBold';
        }
        // Normalize string weights
        const weight = String(fontWeight).toLowerCase();
        if (weight.includes('regular') || weight.includes('normal'))
            return 'Regular';
        if (weight.includes('medium'))
            return 'Medium';
        if (weight.includes('light'))
            return 'Light';
        if (weight.includes('bold'))
            return 'Bold';
        if (weight.includes('semibold'))
            return 'SemiBold';
        if (weight.includes('extrabold') || weight.includes('black'))
            return 'ExtraBold';
        return String(fontWeight); // fallback to original
    }
    /**
     * NEW: Find exact matching local text style based on fontSize, fontFamily, and fontWeight
     * Used as fallback when external textStyleId is not found in local styles
     */
    static findExactMatchingLocalStyle(fontSize, fontFamily, fontWeight) {
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
    static findTextLayers(comp) {
        const textLayers = [];
        try {
            const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
            if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
                const allNodes = nodeToAnalyze.findAll((node) => node.type === 'TEXT');
                allNodes.forEach(node => {
                    if (node.type === 'TEXT' && node.name) {
                        const textNode = node;
                        textLayers.push(textNode.name);
                        try {
                            const chars = textNode.characters || '[empty]';
                            console.log(`📝 Found text layer: "${textNode.name}" with content: "${chars}"`);
                        }
                        catch (charError) {
                            console.log(`📝 Found text layer: "${textNode.name}" (could not read characters)`);
                        }
                    }
                });
            }
        }
        catch (e) {
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
            const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
            if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
                const textNodes = nodeToAnalyze.findAll((node) => node.type === 'TEXT');
                // Collect font info for classification
                const fontSizes = [];
                const textNodeData = [];
                textNodes.forEach(node => {
                    if (node.type === 'TEXT') {
                        const textNode = node;
                        try {
                            const fontSize = typeof textNode.fontSize === 'number' ? textNode.fontSize : 14;
                            const fontWeight = textNode.fontWeight || 'normal';
                            const fontWeightValue = (typeof fontWeight === 'symbol') ? 'normal' : fontWeight;
                            // NEW: Extract fontFamily for exact matching
                            const fontFamily = (textNode.fontName && typeof textNode.fontName === 'object' && textNode.fontName.family)
                                ? textNode.fontName.family
                                : 'Unknown';
                            fontSizes.push(fontSize);
                            textNodeData.push({ node: textNode, fontSize, fontWeight: fontWeightValue, fontFamily });
                        }
                        catch (e) {
                            console.warn(`Could not read font properties for text node "${textNode.name}"`);
                        }
                    }
                });
                // Sort font sizes to determine hierarchy thresholds
                const uniqueSizes = [...new Set(fontSizes)].sort((a, b) => b - a);
                for (const { node, fontSize, fontWeight, fontFamily } of textNodeData) {
                    let classification = 'tertiary';
                    if (uniqueSizes.length >= 3) {
                        if (fontSize >= uniqueSizes[0])
                            classification = 'primary';
                        else if (fontSize >= uniqueSizes[1])
                            classification = 'secondary';
                        else
                            classification = 'tertiary';
                    }
                    else if (uniqueSizes.length === 2) {
                        classification = fontSize >= uniqueSizes[0] ? 'primary' : 'secondary';
                    }
                    else {
                        // Single font size or unable to determine - classify by font weight
                        const weight = String(fontWeight).toLowerCase();
                        if (weight.includes('bold') || weight.includes('700') || weight.includes('800') || weight.includes('900')) {
                            classification = 'primary';
                        }
                        else if (weight.includes('medium') || weight.includes('500') || weight.includes('600')) {
                            classification = 'secondary';
                        }
                        else {
                            classification = 'tertiary';
                        }
                    }
                    let characters;
                    try {
                        characters = node.characters || '[empty]';
                    }
                    catch (e) {
                        characters = undefined;
                    }
                    // NEW: Extract text color
                    let textColor;
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
                    }
                    catch (e) {
                        console.warn(`Could not extract text color for "${node.name}"`);
                    }
                    // NEW: Extract Design System text style references
                    let textStyleId;
                    let textStyleName;
                    let boundTextStyleId;
                    try {
                        // Get text style ID if available
                        textStyleId = (node.textStyleId && node.textStyleId !== figma.mixed) ? node.textStyleId : undefined;
                        // Note: boundTextStyleId doesn't exist in current Figma API
                        boundTextStyleId = undefined;
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
                    }
                    catch (e) {
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
        }
        catch (e) {
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
            const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
            if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
                const instanceNodes = nodeToAnalyze.findAll((node) => node.type === 'COMPONENT' || node.type === 'INSTANCE');
                for (const node of instanceNodes) {
                    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
                        const instance = {
                            nodeName: node.name,
                            nodeId: node.id,
                            visible: node.visible
                        };
                        if (node.type === 'INSTANCE') {
                            try {
                                const mainComponent = await node.getMainComponentAsync();
                                instance.componentId = mainComponent === null || mainComponent === void 0 ? void 0 : mainComponent.id;
                            }
                            catch (e) {
                                console.warn(`Could not get main component ID for instance "${node.name}"`);
                            }
                        }
                        componentInstances.push(instance);
                    }
                }
            }
        }
        catch (e) {
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
            const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
            if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
                const vectors = nodeToAnalyze.findAll((node) => node.type === 'VECTOR');
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
        }
        catch (e) {
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
            const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
            if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
                const shapeNodes = nodeToAnalyze.findAll((node) => node.type === 'RECTANGLE' || node.type === 'ELLIPSE');
                shapeNodes.forEach(node => {
                    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
                        let hasImageFill = false;
                        try {
                            const fills = node.fills;
                            if (Array.isArray(fills)) {
                                hasImageFill = fills.some(fill => typeof fill === 'object' && fill !== null && fill.type === 'IMAGE');
                            }
                        }
                        catch (e) {
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
        }
        catch (e) {
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
        components.forEach(comp => {
            if (comp.confidence >= 0.7) {
                if (!componentsByType[comp.suggestedType])
                    componentsByType[comp.suggestedType] = [];
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
                prompt += `- Reference colors by their exact name: "${((_a = colorStyles.primary[0]) === null || _a === void 0 ? void 0 : _a.name) || 'Primary/500'}"\n\n`;
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
            var _a, _b, _c, _d, _e, _f;
            const comps = componentsByType[type];
            const bestComponent = comps.sort((a, b) => b.confidence - a.confidence)[0];
            prompt += `### ${type.toUpperCase()}\n`;
            prompt += `- Component ID: "${bestComponent.id}"\n`;
            prompt += `- Component Name: "${bestComponent.name}"\n`;
            if ((_a = bestComponent.textLayers) === null || _a === void 0 ? void 0 : _a.length)
                prompt += `- Text Layers: ${bestComponent.textLayers.map(l => `"${l}"`).join(', ')}\n`;
            if ((_b = bestComponent.textHierarchy) === null || _b === void 0 ? void 0 : _b.length) {
                prompt += `- Text Hierarchy:\n`;
                bestComponent.textHierarchy.forEach(text => {
                    prompt += `  - ${text.classification.toUpperCase()}: "${text.nodeName}" (${text.fontSize}px, ${text.fontWeight}${text.visible ? '' : ', hidden'})\n`;
                });
            }
            if ((_c = bestComponent.componentInstances) === null || _c === void 0 ? void 0 : _c.length) {
                prompt += `- Component Instances: ${bestComponent.componentInstances.map(c => `"${c.nodeName}"${c.visible ? '' : ' (hidden)'}`).join(', ')}\n`;
            }
            if ((_d = bestComponent.vectorNodes) === null || _d === void 0 ? void 0 : _d.length) {
                prompt += `- Vector Icons: ${bestComponent.vectorNodes.map(v => `"${v.nodeName}"${v.visible ? '' : ' (hidden)'}`).join(', ')}\n`;
            }
            if ((_e = bestComponent.imageNodes) === null || _e === void 0 ? void 0 : _e.length) {
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
            prompt += `- Page: ${((_f = bestComponent.pageInfo) === null || _f === void 0 ? void 0 : _f.pageName) || 'Unknown'}\n\n`;
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
    static async saveLastScanResults(components) {
        try {
            const scanSession = {
                components,
                scanTime: Date.now(),
                version: "1.0",
                fileKey: figma.root.id
            };
            await figma.clientStorage.setAsync('design-system-scan', scanSession);
            await figma.clientStorage.setAsync('last-scan-results', components);
            console.log(`💾 Saved ${components.length} components with session data`);
        }
        catch (error) {
            console.error("❌ Error saving scan results:", error);
            try {
                await figma.clientStorage.setAsync('last-scan-results', components);
                console.log("💾 Fallback save successful");
            }
            catch (fallbackError) {
                console.warn("⚠️ Could not save scan results:", fallbackError);
            }
        }
    }
    /**
     * Get component ID by type for UI generation
     */
    static async getComponentIdByType(type) {
        const searchType = type.toLowerCase();
        const scanResults = await figma.clientStorage.getAsync('last-scan-results');
        if (scanResults && Array.isArray(scanResults)) {
            const matchingComponent = scanResults.find((comp) => comp.suggestedType.toLowerCase() === searchType && comp.confidence >= 0.7);
            if (matchingComponent)
                return matchingComponent.id;
            const nameMatchingComponent = scanResults.find((comp) => comp.name.toLowerCase().includes(searchType));
            if (nameMatchingComponent)
                return nameMatchingComponent.id;
        }
        console.log(`❌ ID for type ${type} not found`);
        return null;
    }
    /**
     * NEW: Build Variable Maps (similar to buildTextStyleMap)
     */
    static buildVariableMap(variables) {
        if (variables && variables.length > 0) {
            this.variableMap.clear();
            this.variableDetails.clear();
            variables.forEach(variable => {
                var _a;
                this.variableMap.set(variable.id, variable.name);
                this.variableDetails.set(variable.id, {
                    id: variable.id,
                    name: variable.name,
                    resolvedType: variable.resolvedType,
                    scopes: variable.scopes || [],
                    collection: (_a = variable.collection) === null || _a === void 0 ? void 0 : _a.name
                });
            });
            console.log(`✅ Built variable lookup map with ${this.variableMap.size} entries`);
            // DEBUG: Log first few entries to understand ID format
            const firstEntries = Array.from(this.variableMap.entries()).slice(0, 3);
            console.log('🔍 First variable IDs in map:', firstEntries);
        }
    }
    /**
     * NEW: Extract color and style information from component
     */
    static extractStyleInfo(node) {
        var _a, _b, _c;
        const styleInfo = {};
        try {
            // Get the primary node to analyze (for component sets, use the first variant)
            let primaryNode = node;
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
                    primary: (_a = styleInfo.primaryColor) === null || _a === void 0 ? void 0 : _a.color,
                    background: (_b = styleInfo.backgroundColor) === null || _b === void 0 ? void 0 : _b.color,
                    text: (_c = styleInfo.textColor) === null || _c === void 0 ? void 0 : _c.color
                });
            }
        }
        catch (error) {
            console.warn(`⚠️ Error extracting style info for "${node.name}":`, error);
        }
        return styleInfo;
    }
    /**
     * Extract fill colors from a node
     */
    static extractFills(node) {
        const colorInfos = [];
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
        }
        catch (error) {
            console.warn('Error extracting fills:', error);
        }
        return colorInfos;
    }
    /**
     * Extract stroke colors from a node
     */
    static extractStrokes(node) {
        const colorInfos = [];
        try {
            if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
                // Get strokeStyleId if available
                const strokeStyleId = ('strokeStyleId' in node) ? node.strokeStyleId : undefined;
                const styleId = (strokeStyleId && typeof strokeStyleId === 'string') ? strokeStyleId : undefined;
                for (const stroke of node.strokes) {
                    if (stroke.visible !== false) {
                        const colorInfo = this.convertPaintToColorInfo(stroke, styleId);
                        if (colorInfo) {
                            colorInfos.push(colorInfo);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.warn('Error extracting strokes:', error);
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
            if (paint.type === 'SOLID' && paint.color) {
                let designToken;
                let usesDesignToken = false;
                // NEW: Check for boundVariables and resolve to token name
                if ((_b = (_a = paint.boundVariables) === null || _a === void 0 ? void 0 : _a.color) === null || _b === void 0 ? void 0 : _b.id) {
                    const variableId = paint.boundVariables.color.id;
                    designToken = this.variableMap.get(variableId);
                    usesDesignToken = !!designToken;
                    if (designToken) {
                        console.log(`🎨 Resolved variable: ${variableId} → "${designToken}"`);
                    }
                    else {
                        console.warn(`⚠️ Variable ID not found in map: ${variableId}`);
                    }
                }
                // NEW: Extract Design System color style references using node.fillStyleId/strokeStyleId
                let paintStyleName;
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
                    paintStyleId: undefined, // GradientPaint doesn't have paintStyleId
                    paintStyleName: paintStyleName,
                    boundVariables: paint.boundVariables || undefined,
                    usesDesignSystemColor: !!(styleId || usesDesignToken),
                    // NEW: Design Token fields
                    designToken: designToken,
                    usesDesignToken: usesDesignToken
                };
            }
            if (paint.type === 'GRADIENT_LINEAR' && paint.gradientStops) {
                // NEW: Extract Design System color style references for gradients
                let paintStyleName;
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
                    paintStyleId: undefined, // GradientPaint doesn't have paintStyleId
                    paintStyleName: paintStyleName,
                    boundVariables: undefined, // GradientPaint doesn't have boundVariables 
                    usesDesignSystemColor: !!(styleId),
                    // NEW: Design Token fields (gradients don't typically use color variables)
                    designToken: undefined,
                    usesDesignToken: false
                };
            }
            // Add support for other gradient types
            if ((paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') && paint.gradientStops) {
                // NEW: Extract Design System color style references for other gradients
                // Note: GradientPaint doesn't have paintStyleId property in current Figma API
                let paintStyleName;
                if (styleId) {
                    paintStyleName = this.paintStyleMap.get(styleId);
                    if (!paintStyleName) {
                        const baseId = styleId.split(',')[0];
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
                    paintStyleId: undefined, // GradientPaint doesn't have paintStyleId
                    paintStyleName: paintStyleName,
                    boundVariables: undefined, // GradientPaint doesn't have boundVariables 
                    usesDesignSystemColor: !!(styleId),
                    // NEW: Design Token fields (gradients don't typically use color variables)
                    designToken: undefined,
                    usesDesignToken: false
                };
            }
            if (paint.type === 'IMAGE') {
                return {
                    type: 'IMAGE',
                    opacity: paint.opacity || 1,
                    // NEW: Design Token fields (images don't use color variables)
                    designToken: undefined,
                    usesDesignToken: false
                };
            }
        }
        catch (error) {
            console.warn('Error converting paint to color info:', error);
        }
        return null;
    }
    /**
     * Convert RGB to hex color
     */
    static rgbToHex(rgb) {
        const toHex = (value) => {
            const hex = Math.round(value * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    }
    /**
     * Find primary text color by analyzing text nodes
     */
    static findPrimaryTextColor(node) {
        try {
            // Type guard: only nodes with children can use findAll
            if (!('findAll' in node)) {
                return null;
            }
            const textNodes = node.findAll(n => n.type === 'TEXT');
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
        }
        catch (error) {
            console.warn('Error finding text color:', error);
        }
        return null;
    }
    /**
     * Find background color by analyzing the largest rectangle or container
     */
    static findBackgroundColor(node) {
        try {
            // Type guard: only nodes with children can use findAll
            if (!('findAll' in node)) {
                return null;
            }
            // Look for rectangles that could be backgrounds
            const rectangles = node.findAll(n => n.type === 'RECTANGLE' || n.type === 'FRAME' || n.type === 'COMPONENT');
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
        }
        catch (error) {
            console.warn('Error finding background color:', error);
        }
        return null;
    }
    /**
     * NEW: Analyze auto-layout behavior of a component or frame
     * Extracts comprehensive auto-layout properties including nested behavior
     */
    static analyzeAutoLayoutBehavior(node) {
        try {
            console.log(`🎯 Analyzing auto-layout behavior for "${node.name}" (${node.type})`);
            // Check if node has auto-layout
            if (!('layoutMode' in node) || !node.layoutMode || node.layoutMode === 'NONE') {
                console.log(`  ❌ No auto-layout detected for "${node.name}"`);
                return {
                    isAutoLayout: false,
                    layoutMode: 'NONE'
                };
            }
            console.log(`  ✅ Auto-layout detected: ${node.layoutMode}`);
            // Extract basic auto-layout properties
            const behavior = {
                isAutoLayout: true,
                layoutMode: node.layoutMode,
            };
            // Extract sizing modes with graceful fallbacks
            if ('primaryAxisSizingMode' in node && node.primaryAxisSizingMode) {
                behavior.primaryAxisSizingMode = node.primaryAxisSizingMode;
                console.log(`    primaryAxisSizingMode: ${behavior.primaryAxisSizingMode}`);
            }
            if ('counterAxisSizingMode' in node && node.counterAxisSizingMode) {
                behavior.counterAxisSizingMode = node.counterAxisSizingMode;
                console.log(`    counterAxisSizingMode: ${behavior.counterAxisSizingMode}`);
            }
            // Extract wrapping behavior
            if ('layoutWrap' in node && node.layoutWrap) {
                behavior.layoutWrap = node.layoutWrap;
                console.log(`    layoutWrap: ${behavior.layoutWrap}`);
            }
            // Extract spacing properties
            if ('itemSpacing' in node && typeof node.itemSpacing === 'number') {
                behavior.itemSpacing = node.itemSpacing;
                console.log(`    itemSpacing: ${behavior.itemSpacing}`);
            }
            if ('counterAxisSpacing' in node && typeof node.counterAxisSpacing === 'number') {
                behavior.counterAxisSpacing = node.counterAxisSpacing;
                console.log(`    counterAxisSpacing: ${behavior.counterAxisSpacing}`);
            }
            // Extract padding properties
            if ('paddingLeft' in node && typeof node.paddingLeft === 'number') {
                behavior.paddingLeft = node.paddingLeft;
            }
            if ('paddingRight' in node && typeof node.paddingRight === 'number') {
                behavior.paddingRight = node.paddingRight;
            }
            if ('paddingTop' in node && typeof node.paddingTop === 'number') {
                behavior.paddingTop = node.paddingTop;
            }
            if ('paddingBottom' in node && typeof node.paddingBottom === 'number') {
                behavior.paddingBottom = node.paddingBottom;
            }
            console.log(`    padding: T${behavior.paddingTop || 0} R${behavior.paddingRight || 0} B${behavior.paddingBottom || 0} L${behavior.paddingLeft || 0}`);
            // Extract alignment properties
            if ('primaryAxisAlignItems' in node && node.primaryAxisAlignItems) {
                behavior.primaryAxisAlignItems = node.primaryAxisAlignItems;
                console.log(`    primaryAxisAlignItems: ${behavior.primaryAxisAlignItems}`);
            }
            if ('counterAxisAlignItems' in node && node.counterAxisAlignItems) {
                behavior.counterAxisAlignItems = node.counterAxisAlignItems;
                console.log(`    counterAxisAlignItems: ${behavior.counterAxisAlignItems}`);
            }
            if ('counterAxisAlignContent' in node && node.counterAxisAlignContent) {
                behavior.counterAxisAlignContent = node.counterAxisAlignContent;
                console.log(`    counterAxisAlignContent: ${behavior.counterAxisAlignContent}`);
            }
            // Extract additional properties
            if ('itemReverseZIndex' in node && typeof node.itemReverseZIndex === 'boolean') {
                behavior.itemReverseZIndex = node.itemReverseZIndex;
                console.log(`    itemReverseZIndex: ${behavior.itemReverseZIndex}`);
            }
            if ('layoutPositioning' in node && node.layoutPositioning) {
                behavior.layoutPositioning = node.layoutPositioning;
                console.log(`    layoutPositioning: ${behavior.layoutPositioning}`);
            }
            // Analyze children auto-layout behavior (nested analysis)
            if ('children' in node && node.children && node.children.length > 0) {
                console.log(`    🔍 Analyzing ${node.children.length} children for nested auto-layout...`);
                const childrenBehavior = [];
                for (const child of node.children) {
                    try {
                        const childBehavior = {
                            nodeId: child.id,
                            nodeName: child.name,
                            nodeType: child.type,
                        };
                        // Extract child layout properties
                        if ('layoutAlign' in child && child.layoutAlign) {
                            childBehavior.layoutAlign = child.layoutAlign;
                        }
                        if ('layoutGrow' in child && typeof child.layoutGrow === 'number') {
                            childBehavior.layoutGrow = child.layoutGrow;
                        }
                        if ('layoutSizingHorizontal' in child && child.layoutSizingHorizontal) {
                            childBehavior.layoutSizingHorizontal = child.layoutSizingHorizontal;
                        }
                        if ('layoutSizingVertical' in child && child.layoutSizingVertical) {
                            childBehavior.layoutSizingVertical = child.layoutSizingVertical;
                        }
                        // Recursive analysis for nested auto-layout frames
                        if ((child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'INSTANCE') &&
                            'layoutMode' in child && child.layoutMode && child.layoutMode !== 'NONE') {
                            // Nested auto-layout log removed for cleaner console output
                            childBehavior.autoLayoutBehavior = this.analyzeAutoLayoutBehavior(child);
                        }
                        childrenBehavior.push(childBehavior);
                    }
                    catch (childError) {
                        console.warn(`      ⚠️ Failed to analyze child "${child.name}":`, childError);
                    }
                }
                if (childrenBehavior.length > 0) {
                    behavior.childrenAutoLayoutBehavior = childrenBehavior;
                    console.log(`    ✅ Analyzed ${childrenBehavior.length} children behaviors`);
                }
            }
            console.log(`  ✅ Auto-layout analysis completed for "${node.name}"`);
            return behavior;
        }
        catch (error) {
            console.warn(`❌ Error analyzing auto-layout behavior for "${node.name}":`, error);
            return {
                isAutoLayout: false,
                layoutMode: 'NONE'
            };
        }
    }
}
exports.ComponentScanner = ComponentScanner;
// Static cache for text style lookups (id -> name mapping)
ComponentScanner.textStyleMap = new Map();
ComponentScanner.loggedMissingIds = new Set();
// NEW: Static cache for detailed text style properties (for exact matching)
ComponentScanner.textStyleDetails = new Map();
// Static cache for color style lookups (id -> name mapping)
ComponentScanner.paintStyleMap = new Map();
// NEW: Static cache for variable lookups (id -> name mapping)
ComponentScanner.variableMap = new Map();
ComponentScanner.variableDetails = new Map();
