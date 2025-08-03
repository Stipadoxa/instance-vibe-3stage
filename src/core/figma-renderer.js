"use strict";
// src/core/figma-renderer.ts
// UI generation and rendering engine for AIDesigner
Object.defineProperty(exports, "__esModule", { value: true });
exports.FigmaRenderer = void 0;
const component_scanner_1 = require("./component-scanner");
const session_manager_1 = require("./session-manager");
const component_property_engine_1 = require("./component-property-engine");
const json_migrator_1 = require("./json-migrator");
class FigmaRenderer {
    /**
     * Main UI generation function - creates UI from structured JSON data
     */
    static async generateUIFromData(layoutData, parentNode) {
        let currentFrame;
        const containerData = layoutData.layoutContainer || layoutData;
        if (parentNode.type === 'PAGE' && containerData) {
            currentFrame = figma.createFrame();
            parentNode.appendChild(currentFrame);
        }
        else if (parentNode.type === 'FRAME') {
            currentFrame = parentNode;
        }
        else {
            figma.notify("Cannot add items without a parent frame.", { error: true });
            return figma.createFrame();
        }
        if (containerData && containerData !== layoutData) {
            currentFrame.name = containerData.name || "Generated Frame";
            currentFrame.layoutMode = containerData.layoutMode === "HORIZONTAL" || containerData.layoutMode === "VERTICAL"
                ? containerData.layoutMode : "NONE";
            if (currentFrame.layoutMode !== 'NONE') {
                currentFrame.paddingTop = typeof containerData.paddingTop === 'number' ? containerData.paddingTop : 0;
                currentFrame.paddingBottom = typeof containerData.paddingBottom === 'number' ? containerData.paddingBottom : 0;
                currentFrame.paddingLeft = typeof containerData.paddingLeft === 'number' ? containerData.paddingLeft : 0;
                currentFrame.paddingRight = typeof containerData.paddingRight === 'number' ? containerData.paddingRight : 0;
                // Enhanced auto-layout properties
                if (containerData.itemSpacing === 'AUTO') {
                    currentFrame.itemSpacing = 'AUTO';
                }
                else {
                    currentFrame.itemSpacing = typeof containerData.itemSpacing === 'number' ? containerData.itemSpacing : 0;
                }
                // Layout wrap support
                if (containerData.layoutWrap !== undefined) {
                    currentFrame.layoutWrap = containerData.layoutWrap;
                }
                // Primary axis alignment
                if (containerData.primaryAxisAlignItems) {
                    currentFrame.primaryAxisAlignItems = containerData.primaryAxisAlignItems;
                }
                // Counter axis alignment
                if (containerData.counterAxisAlignItems) {
                    currentFrame.counterAxisAlignItems = containerData.counterAxisAlignItems;
                }
                // Sizing modes
                if (containerData.primaryAxisSizingMode) {
                    currentFrame.primaryAxisSizingMode = containerData.primaryAxisSizingMode;
                }
                else {
                    currentFrame.primaryAxisSizingMode = "AUTO";
                }
                if (containerData.counterAxisSizingMode) {
                    currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode;
                }
            }
            // Size constraints - wrapped in try-catch to prevent property setter errors
            try {
                if (containerData.minWidth !== undefined) {
                    currentFrame.minWidth = containerData.minWidth;
                }
            }
            catch (e) {
                console.warn('⚠️ Failed to set minWidth:', e.message);
            }
            try {
                if (containerData.maxWidth !== undefined) {
                    currentFrame.maxWidth = containerData.maxWidth;
                }
            }
            catch (e) {
                console.warn('⚠️ Failed to set maxWidth:', e.message);
            }
            try {
                if (containerData.minHeight !== undefined) {
                    currentFrame.minHeight = containerData.minHeight;
                }
            }
            catch (e) {
                console.warn('⚠️ Failed to set minHeight:', e.message);
            }
            try {
                if (containerData.maxHeight !== undefined) {
                    currentFrame.maxHeight = containerData.maxHeight;
                }
            }
            catch (e) {
                console.warn('⚠️ Failed to set maxHeight:', e.message);
            }
            if (containerData.width) {
                if (currentFrame.layoutMode !== 'NONE') {
                    // For auto-layout frames, set width directly and let auto-layout handle height
                    currentFrame.width = containerData.width;
                    if (!containerData.counterAxisSizingMode) {
                        currentFrame.counterAxisSizingMode = "FIXED";
                    }
                }
                else {
                    // For regular frames, use resize
                    currentFrame.resize(containerData.width, currentFrame.height);
                }
            }
            else if (!containerData.counterAxisSizingMode) {
                currentFrame.counterAxisSizingMode = "AUTO";
            }
        }
        const items = layoutData.items || containerData.items;
        if (!items || !Array.isArray(items))
            return currentFrame;
        for (const item of items) {
            if (item.type === 'layoutContainer') {
                const nestedFrame = figma.createFrame();
                currentFrame.appendChild(nestedFrame);
                // Apply child layout properties
                this.applyChildLayoutProperties(nestedFrame, item);
                await this.generateUIFromData({ layoutContainer: item, items: item.items }, nestedFrame);
            }
            else if (item.type === 'frame' && item.layoutContainer) {
                const nestedFrame = figma.createFrame();
                currentFrame.appendChild(nestedFrame);
                await this.generateUIFromData(item, nestedFrame);
            }
            // NATIVE ELEMENTS - Handle these BEFORE component resolution
            else if (item.type === 'native-text' || item.type === 'text') {
                await this.createTextNode(item, currentFrame);
                continue;
            }
            else if (item.type === 'native-rectangle') {
                await this.createRectangleNode(item, currentFrame);
                continue;
            }
            else if (item.type === 'native-circle') {
                await this.createEllipseNode(item, currentFrame);
                continue;
            }
            // COMPONENT ELEMENTS - All other types go through component resolution
            else {
                if (!item.componentNodeId)
                    continue;
                const componentNode = await figma.getNodeByIdAsync(item.componentNodeId);
                if (!componentNode) {
                    console.warn(`⚠️ Component with ID ${item.componentNodeId} not found. Skipping.`);
                    continue;
                }
                const masterComponent = (componentNode.type === 'COMPONENT_SET'
                    ? componentNode.defaultVariant
                    : componentNode);
                if (!masterComponent || masterComponent.type !== 'COMPONENT') {
                    console.warn(`⚠️ Could not find a valid master component for ID ${item.componentNodeId}. Skipping.`);
                    continue;
                }
                const instance = masterComponent.createInstance();
                currentFrame.appendChild(instance);
                console.log(`🔧 Creating instance of component: ${masterComponent.name}`);
                console.log(`🔧 Raw properties:`, item.properties);
                const { cleanProperties, variants } = this.separateVariantsFromProperties(item.properties, item.componentNodeId);
                const sanitizedProps = this.sanitizeProperties(cleanProperties);
                console.log(`🔧 Clean properties:`, sanitizedProps);
                console.log(`🔧 Extracted variants:`, variants);
                // Apply variants
                if (Object.keys(variants).length > 0) {
                    try {
                        if (componentNode && componentNode.type === 'COMPONENT_SET') {
                            const availableVariants = componentNode.variantGroupProperties;
                            console.log(`🔍 Available variants for ${componentNode.name}:`, Object.keys(availableVariants || {}));
                            console.log(`🔍 Requested variants:`, variants);
                            if (!availableVariants) {
                                console.warn('⚠️ No variant properties found on component, skipping variant application.');
                            }
                            else {
                                const validVariants = {};
                                let hasValidVariants = false;
                                Object.entries(variants).forEach(([propName, propValue]) => {
                                    const availableProp = availableVariants[propName];
                                    if (availableProp && availableProp.values) {
                                        // Convert boolean values to capitalized strings for Figma
                                        let stringValue;
                                        if (typeof propValue === 'boolean') {
                                            stringValue = propValue ? 'True' : 'False';
                                            console.log(`🔄 Boolean conversion: ${propName} = ${propValue} -> "${stringValue}"`);
                                        }
                                        else {
                                            stringValue = String(propValue);
                                        }
                                        if (availableProp.values.includes(stringValue)) {
                                            validVariants[propName] = stringValue;
                                            hasValidVariants = true;
                                            console.log(`✅ Valid variant: ${propName} = "${stringValue}"`);
                                        }
                                        else {
                                            console.warn(`⚠️ Invalid value for "${propName}": "${stringValue}". Available: [${availableProp.values.join(', ')}]`);
                                        }
                                    }
                                    else {
                                        console.warn(`⚠️ Unknown variant property: "${propName}". Available: [${Object.keys(availableVariants).join(', ')}]`);
                                    }
                                });
                                if (hasValidVariants) {
                                    console.log(`🔧 Applying variants:`, validVariants);
                                    instance.setProperties(validVariants);
                                    console.log('✅ Variants applied successfully');
                                }
                                else {
                                    console.warn('⚠️ No valid variants to apply, using default variant');
                                }
                            }
                        }
                        else {
                            console.log('ℹ️ Component is not a variant set, skipping variant application');
                        }
                    }
                    catch (e) {
                        console.error("❌ Error applying variants:", e);
                        console.log("ℹ️ Continuing with default variant");
                    }
                }
                // Apply child layout properties
                this.applyChildLayoutProperties(instance, sanitizedProps);
                // Apply text properties to component
                await this.applyTextProperties(instance, sanitizedProps);
                // Apply media properties to component
                await this.applyMediaProperties(instance, sanitizedProps);
            }
        }
        if (parentNode.type === 'PAGE') {
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
        console.log('🚀 START generateUIFromDataDynamic', { hasLayoutData: !!layoutData, hasItems: !!(layoutData === null || layoutData === void 0 ? void 0 : layoutData.items) });
        if (!layoutData || (!layoutData.items && !layoutData.layoutContainer)) {
            figma.notify("Invalid JSON structure", { error: true });
            return null;
        }
        try {
            // Enable performance optimizations
            figma.skipInvisibleInstanceChildren = true;
            // Load design system data if not already cached
            await this.ensureDesignSystemDataLoaded();
            // Skip ComponentPropertyEngine for testing if no schemas available
            console.log('🔧 Checking ComponentPropertyEngine schemas...');
            const existingSchemas = component_property_engine_1.ComponentPropertyEngine.getAllSchemas();
            if (existingSchemas.length === 0) {
                console.log('⚠️ No design system schemas found - running in basic mode');
            }
            else {
                await component_property_engine_1.ComponentPropertyEngine.initialize();
                console.log('✅ ComponentPropertyEngine initialized with', existingSchemas.length, 'schemas');
            }
            // Migrate JSON if needed
            const migratedData = json_migrator_1.JSONMigrator.migrateToSystematic(layoutData);
            // Existing ID resolution logic
            const isPlaceholderID = (id) => {
                if (!id)
                    return true;
                return id.includes('_id') ||
                    id.includes('placeholder') ||
                    !id.match(/^[0-9]+:[0-9]+$/);
            };
            async function resolveComponentIds(items) {
                for (const item of items) {
                    if (item.type === 'layoutContainer') {
                        if (item.items && Array.isArray(item.items)) {
                            await resolveComponentIds(item.items);
                        }
                        continue;
                    }
                    // SKIP native elements - they don't need component IDs
                    if (item.type === 'native-text' ||
                        item.type === 'text' ||
                        item.type === 'native-rectangle' ||
                        item.type === 'native-circle') {
                        console.log(`ℹ️ Skipping native element: ${item.type}`);
                        continue;
                    }
                    if (item.type === 'frame' && item.items) {
                        await resolveComponentIds(item.items);
                    }
                    else if (item.type !== 'frame') {
                        if (!item.componentNodeId || isPlaceholderID(item.componentNodeId)) {
                            console.log(` Resolving component ID for type: ${item.type}`);
                            const resolvedId = await component_scanner_1.ComponentScanner.getComponentIdByType(item.type);
                            if (!resolvedId) {
                                throw new Error(`Component for type "${item.type}" not found in design system. Please scan your design system first.`);
                            }
                            item.componentNodeId = resolvedId;
                            console.log(`✅ Resolved ${item.type} -> ${resolvedId}`);
                        }
                        else {
                            console.log(`✅ Using existing ID for ${item.type}: ${item.componentNodeId}`);
                        }
                    }
                }
            }
            await resolveComponentIds(migratedData.items);
            console.log('🟢 USING SYSTEMATIC GENERATION METHOD');
            return await this.generateUIFromDataSystematic(migratedData, figma.currentPage);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.notify(errorMessage, { error: true, timeout: 4000 });
            console.error("❌ generateUIFromDataDynamic error:", e);
            return null;
        }
    }
    /**
     * Create native text element
     */
    static async createTextNode(textData, container) {
        var _a;
        console.log('Creating native text:', textData);
        const textNode = figma.createText();
        // Load default font
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        // Extract text content from various possible property names
        const textContent = textData.text || textData.content || ((_a = textData.properties) === null || _a === void 0 ? void 0 : _a.content) || textData.characters || "Text";
        textNode.characters = textContent;
        // Extract and apply properties from the properties object
        const props = textData.properties || textData;
        // Font size
        const fontSize = props.fontSize || props.size || props.textSize || 16;
        textNode.fontSize = fontSize;
        // Font weight
        if (props.fontWeight === 'bold' || props.weight === 'bold' || props.style === 'bold') {
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });
            textNode.fontName = { family: "Inter", style: "Bold" };
        }
        // Text alignment
        if (props.alignment === 'center' || props.textAlign === 'center') {
            textNode.textAlignHorizontal = 'CENTER';
        }
        else if (props.alignment === 'right' || props.textAlign === 'right') {
            textNode.textAlignHorizontal = 'RIGHT';
        }
        else {
            textNode.textAlignHorizontal = 'LEFT';
        }
        // Color (if available) - supports both RGB objects and semantic color names
        if (props.color) {
            const fills = textNode.fills;
            if (fills.length > 0 && fills[0].type === 'SOLID') {
                // Check if color is a semantic color name (string)
                if (typeof props.color === 'string') {
                    console.log(`🎨 Attempting to resolve semantic color: "${props.color}"`);
                    try {
                        // Try to apply actual Figma color style first
                        const colorStyle = await this.resolveColorStyleReference(props.color);
                        if (colorStyle) {
                            await textNode.setFillStyleIdAsync(colorStyle.id);
                            console.log(`✅ Applied semantic color "${props.color}" to text (as style reference)`);
                        }
                        else {
                            // Fallback to RGB color if style not found
                            const resolvedColor = this.resolveColorReference(props.color);
                            if (resolvedColor) {
                                textNode.fills = [this.createSolidPaint(resolvedColor)];
                                console.log(`✅ Applied semantic color "${props.color}" to text (as RGB fallback)`);
                            }
                            else {
                                console.warn(`⚠️ Could not resolve semantic color "${props.color}", skipping color application`);
                            }
                        }
                    }
                    catch (error) {
                        console.error(`❌ Error applying color "${props.color}":`, error);
                        // Continue without color if there's an error
                    }
                }
                else {
                    // Handle RGB object (existing behavior)
                    textNode.fills = [{ type: 'SOLID', color: props.color }];
                }
            }
        }
        // Color style name support (new feature) - applies actual Figma color style
        if (props.colorStyleName) {
            console.log(`🎨 Attempting to resolve color style: "${props.colorStyleName}"`);
            try {
                // Try to apply actual Figma color style first
                const colorStyle = await this.resolveColorStyleReference(props.colorStyleName);
                if (colorStyle) {
                    await textNode.setFillStyleIdAsync(colorStyle.id);
                    console.log(`✅ Applied color style "${props.colorStyleName}" to text (as style reference)`);
                }
                else {
                    // Fallback to RGB color if style not found
                    const resolvedColor = this.resolveColorReference(props.colorStyleName);
                    if (resolvedColor) {
                        textNode.fills = [this.createSolidPaint(resolvedColor)];
                        console.log(`✅ Applied color style "${props.colorStyleName}" to text (as RGB fallback)`);
                    }
                    else {
                        console.warn(`⚠️ Could not resolve color style "${props.colorStyleName}", skipping color application`);
                    }
                }
            }
            catch (error) {
                console.error(`❌ Error applying color style "${props.colorStyleName}":`, error);
                // Continue without color if there's an error
            }
        }
        // Text style support (new feature) - applies actual Figma text style
        if (props.textStyle || props.textStyleName) {
            const styleName = props.textStyle || props.textStyleName;
            console.log(`📝 Attempting to apply text style: "${styleName}"`);
            try {
                await FigmaRenderer.applyTextStyle(textNode, styleName);
            }
            catch (error) {
                console.error(`❌ Error applying text style "${styleName}":`, error);
                // Continue without text style if there's an error
            }
        }
        // Apply child layout properties
        this.applyChildLayoutProperties(textNode, props);
        // Text auto-resize behavior
        if (props.horizontalSizing === 'FILL') {
            textNode.textAutoResize = 'HEIGHT';
        }
        else {
            textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
        }
        container.appendChild(textNode);
        console.log('Native text created successfully');
    }
    /**
     * Create native rectangle element
     */
    static async createRectangleNode(rectData, container) {
        console.log('Creating native rectangle:', rectData);
        const rect = figma.createRectangle();
        // Set dimensions
        if (rectData.width && rectData.height) {
            rect.resize(rectData.width, rectData.height);
        }
        else {
            rect.resize(100, 100); // Default size
        }
        // Set fill color
        if (rectData.fill) {
            rect.fills = [{ type: 'SOLID', color: rectData.fill }];
        }
        // Set corner radius
        if (rectData.cornerRadius) {
            rect.cornerRadius = rectData.cornerRadius;
        }
        // Handle sizing
        if (rectData.horizontalSizing === 'FILL') {
            rect.layoutAlign = 'STRETCH';
        }
        container.appendChild(rect);
        console.log('Rectangle created successfully');
    }
    /**
     * Create native ellipse element
     */
    static async createEllipseNode(ellipseData, container) {
        console.log('Creating native ellipse:', ellipseData);
        const ellipse = figma.createEllipse();
        // Set dimensions
        if (ellipseData.width && ellipseData.height) {
            ellipse.resize(ellipseData.width, ellipseData.height);
        }
        else {
            ellipse.resize(50, 50); // Default size
        }
        // Set fill color
        if (ellipseData.fill) {
            ellipse.fills = [{ type: 'SOLID', color: ellipseData.fill }];
        }
        container.appendChild(ellipse);
        console.log('Ellipse created successfully');
    }
    /**
     * Apply text properties to component instances using enhanced scan data
     */
    static async applyTextProperties(instance, properties) {
        if (!properties)
            return;
        console.log("🔍 Applying text properties:", properties);
        // Get all text nodes in the instance
        const allTextNodes = instance.findAll(n => n.type === 'TEXT');
        console.log("🔍 Available text nodes in component:", allTextNodes.map(textNode => ({
            name: textNode.name,
            id: textNode.id,
            visible: textNode.visible,
            chars: textNode.characters || '[empty]'
        })));
        // Get the component's textHierarchy data from scan results
        const componentTextHierarchy = await this.getComponentTextHierarchy(instance);
        console.log("🔍 Text hierarchy from scan data:", componentTextHierarchy);
        // Define semantic classification mappings
        const semanticMappings = {
            'primary-text': ['primary'],
            'secondary-text': ['secondary'],
            'tertiary-text': ['tertiary'],
            'headline': ['primary', 'secondary'],
            'title': ['primary', 'secondary'],
            'content': ['primary', 'secondary'],
            'text': ['primary', 'secondary'],
            'supporting-text': ['secondary', 'tertiary'],
            'supporting': ['secondary', 'tertiary'],
            'subtitle': ['secondary', 'tertiary'],
            'trailing-text': ['tertiary', 'secondary'],
            'trailing': ['tertiary', 'secondary'],
            'caption': ['tertiary'],
            'overline': ['tertiary']
        };
        // Define legacy text mappings for backward compatibility
        const legacyMappings = {
            'content': ['headline', 'title', 'text', 'label'],
            'headline': ['headline', 'title', 'text', 'label'],
            'text': ['headline', 'title', 'text', 'label'],
            'supporting-text': ['supporting', 'subtitle', 'description', 'body'],
            'supporting': ['supporting', 'subtitle', 'description', 'body'],
            'trailing-text': ['trailing', 'value', 'action', 'status', 'end'],
            'trailing': ['trailing', 'value', 'action', 'status', 'end'],
            'title': ['title', 'headline', 'text'],
            'subtitle': ['subtitle', 'supporting', 'description']
        };
        for (const [propKey, propValue] of Object.entries(properties)) {
            if (!propValue || typeof propValue !== 'string' || !propValue.trim())
                continue;
            // Exclude non-text properties (styles, icons, layout configs)
            const nonTextProperties = new Set([
                'horizontalSizing', 'variants', 'textStyle', 'colorStyleName',
                'leading-icon', 'trailing-icon', 'layoutAlign', 'layoutGrow'
            ]);
            if (nonTextProperties.has(propKey) || propKey.endsWith('Style') || propKey.includes('icon')) {
                continue;
            }
            console.log(`🔧 Trying to set ${propKey} = "${propValue}"`);
            let textNode = null;
            let matchMethod = 'none';
            // Method 1: Try exact node name match from scan data
            if (componentTextHierarchy) {
                const hierarchyEntry = componentTextHierarchy.find(entry => entry.nodeName.toLowerCase() === propKey.toLowerCase() ||
                    entry.nodeName.toLowerCase().replace(/\s+/g, '-') === propKey.toLowerCase());
                if (hierarchyEntry) {
                    textNode = allTextNodes.find(n => n.id === hierarchyEntry.nodeId) || null;
                    if (textNode) {
                        matchMethod = 'exact-name';
                        console.log(`✅ Found text node by exact name match: "${textNode.name}" (${hierarchyEntry.classification})`);
                    }
                    else {
                        // Enhanced fallback: match by name when ID fails (for nested components)
                        textNode = allTextNodes.find(n => n.name === hierarchyEntry.nodeName) || null;
                        if (textNode) {
                            matchMethod = 'name-fallback';
                            console.log(`✅ Found text node by name fallback: "${textNode.name}" (ID mismatch resolved)`);
                        }
                    }
                }
            }
            // Method 2: Try semantic classification match
            if (!textNode && componentTextHierarchy && semanticMappings[propKey.toLowerCase()]) {
                const targetClassifications = semanticMappings[propKey.toLowerCase()];
                for (const classification of targetClassifications) {
                    const hierarchyEntry = componentTextHierarchy.find(entry => entry.classification === classification);
                    if (hierarchyEntry) {
                        textNode = allTextNodes.find(n => n.id === hierarchyEntry.nodeId) || null;
                        if (textNode) {
                            matchMethod = 'semantic-classification';
                            console.log(`✅ Found text node by semantic classification: "${textNode.name}" (${classification})`);
                            break;
                        }
                        else {
                            // Enhanced fallback: match by name when ID fails (for nested components)
                            textNode = allTextNodes.find(n => n.name === hierarchyEntry.nodeName) || null;
                            if (textNode) {
                                matchMethod = 'semantic-name-fallback';
                                console.log(`✅ Found text node by semantic name fallback: "${textNode.name}" (ID mismatch resolved)`);
                                break;
                            }
                        }
                    }
                }
            }
            // Method 3: Try partial node name match from scan data
            if (!textNode && componentTextHierarchy) {
                const hierarchyEntry = componentTextHierarchy.find(entry => entry.nodeName.toLowerCase().includes(propKey.toLowerCase()) ||
                    propKey.toLowerCase().includes(entry.nodeName.toLowerCase()));
                if (hierarchyEntry) {
                    textNode = allTextNodes.find(n => n.id === hierarchyEntry.nodeId) || null;
                    if (textNode) {
                        matchMethod = 'partial-name';
                        console.log(`✅ Found text node by partial name match: "${textNode.name}"`);
                    }
                    else {
                        // Enhanced fallback: match by name when ID fails (for nested components)
                        textNode = allTextNodes.find(n => n.name === hierarchyEntry.nodeName) || null;
                        if (textNode) {
                            matchMethod = 'partial-name-fallback';
                            console.log(`✅ Found text node by partial name fallback: "${textNode.name}" (ID mismatch resolved)`);
                        }
                    }
                }
            }
            // Method 4: Fallback to legacy name-based matching
            if (!textNode) {
                const possibleNames = legacyMappings[propKey.toLowerCase()] || [propKey.toLowerCase()];
                for (const targetName of possibleNames) {
                    textNode = allTextNodes.find(n => n.name.toLowerCase().includes(targetName.toLowerCase())) || null;
                    if (textNode) {
                        matchMethod = 'legacy-mapping';
                        console.log(`✅ Found text node by legacy mapping: "${textNode.name}"`);
                        break;
                    }
                }
            }
            // Method 5: Position-based fallback
            if (!textNode) {
                if (propKey.toLowerCase().includes('headline') || propKey.toLowerCase().includes('title') || propKey.toLowerCase().includes('primary')) {
                    textNode = allTextNodes[0] || null;
                    matchMethod = 'position-first';
                    console.log(`🔄 Using first text node as fallback for "${propKey}"`);
                }
                else if (propKey.toLowerCase().includes('trailing') || propKey.toLowerCase().includes('tertiary')) {
                    textNode = allTextNodes[allTextNodes.length - 1] || null;
                    matchMethod = 'position-last';
                    console.log(`🔄 Using last text node as fallback for "${propKey}"`);
                }
                else if (propKey.toLowerCase().includes('supporting') || propKey.toLowerCase().includes('secondary')) {
                    textNode = allTextNodes[1] || allTextNodes[0] || null;
                    matchMethod = 'position-second';
                    console.log(`🔄 Using second text node as fallback for "${propKey}"`);
                }
            }
            // Apply the text and activate hidden nodes if needed
            if (textNode) {
                try {
                    // Activate hidden text node if needed
                    if (!textNode.visible) {
                        textNode.visible = true;
                        console.log(`👁️ Activated hidden text node: "${textNode.name}"`);
                    }
                    // Load font and set text
                    if (typeof textNode.fontName !== 'symbol') {
                        await figma.loadFontAsync(textNode.fontName);
                        textNode.characters = propValue;
                        console.log(`✅ Successfully set "${textNode.name}" to "${propValue}" (method: ${matchMethod})`);
                    }
                }
                catch (fontError) {
                    console.error(`❌ Font loading failed for "${textNode.name}":`, fontError);
                }
            }
            else {
                console.warn(`❌ No text node found for property "${propKey}" with value "${propValue}"`);
            }
        }
    }
    /**
     * Get text hierarchy data for a component instance from scan results
     */
    static async getComponentTextHierarchy(instance) {
        try {
            // Get the main component to find its scan data
            const mainComponent = await instance.getMainComponentAsync();
            if (!mainComponent)
                return null;
            // Get scan results from storage
            const scanResults = await figma.clientStorage.getAsync('last-scan-results');
            if (!scanResults || !Array.isArray(scanResults))
                return null;
            // Find the component in scan results
            const componentInfo = scanResults.find(comp => comp.id === mainComponent.id);
            return (componentInfo === null || componentInfo === void 0 ? void 0 : componentInfo.textHierarchy) || null;
        }
        catch (error) {
            console.warn("Could not get text hierarchy data:", error);
            return null;
        }
    }
    /**
     * Apply media properties to component instances using enhanced scan data validation
     */
    static async applyMediaProperties(instance, properties) {
        var _a;
        if (!properties)
            return;
        console.log("🖼️ Validating media properties:", properties);
        // Get the component's media structure from scan data
        const componentMediaData = await this.getComponentMediaData(instance);
        console.log("🖼️ Media data from scan results:", componentMediaData);
        // Define media property patterns to look for
        const mediaPropertyPatterns = [
            'icon', 'image', 'avatar', 'photo', 'logo', 'media',
            'leading-icon', 'trailing-icon', 'start-icon', 'end-icon',
            'profile-image', 'user-avatar', 'cover-image', 'thumbnail'
        ];
        // Extract media-related properties
        const mediaProperties = {};
        Object.entries(properties).forEach(([key, value]) => {
            const keyLower = key.toLowerCase();
            if (mediaPropertyPatterns.some(pattern => keyLower.includes(pattern))) {
                mediaProperties[key] = value;
            }
        });
        if (Object.keys(mediaProperties).length === 0) {
            console.log("🖼️ No media properties found to validate");
            return;
        }
        console.log("🖼️ Found media properties to validate:", Object.keys(mediaProperties));
        // Validate each media property against scan data
        for (const [propKey, propValue] of Object.entries(mediaProperties)) {
            if (!propValue || typeof propValue !== 'string' || !propValue.trim())
                continue;
            console.log(`🔍 Validating media property: ${propKey} = "${propValue}"`);
            let validationResult = this.validateMediaProperty(propKey, propValue, componentMediaData);
            if (validationResult.isValid) {
                console.log(`✅ ${propKey} → would set to "${propValue}" (${validationResult.targetType}: "${validationResult.targetName}")`);
            }
            else {
                console.warn(`❌ Invalid media property: "${propKey}" = "${propValue}" - ${validationResult.reason}`);
                // Suggest alternatives if available
                if ((_a = validationResult.suggestions) === null || _a === void 0 ? void 0 : _a.length) {
                    console.log(`💡 Available media slots: ${validationResult.suggestions.join(', ')}`);
                }
            }
        }
    }
    /**
     * Get media structure data for a component instance from scan results
     */
    static async getComponentMediaData(instance) {
        try {
            // Get the main component to find its scan data
            const mainComponent = await instance.getMainComponentAsync();
            if (!mainComponent) {
                console.warn("Could not get main component from instance");
                return null;
            }
            console.log("🔍 Looking for media data for main component ID:", mainComponent.id);
            // Get scan results from storage
            const scanResults = await figma.clientStorage.getAsync('last-scan-results');
            if (!scanResults || !Array.isArray(scanResults)) {
                console.warn("No scan results found in storage");
                return null;
            }
            console.log("🔍 Available component IDs in scan data:", scanResults.map(c => c.id));
            // Find the component in scan results
            const componentInfo = scanResults.find(comp => comp.id === mainComponent.id);
            if (!componentInfo) {
                console.warn(`Component ${mainComponent.id} not found in scan results`);
                return null;
            }
            console.log("🔍 Found component info:", componentInfo.name);
            console.log("🔍 Component instances:", componentInfo.componentInstances);
            console.log("🔍 Vector nodes:", componentInfo.vectorNodes);
            console.log("🔍 Image nodes:", componentInfo.imageNodes);
            return {
                componentInstances: componentInfo.componentInstances || [],
                vectorNodes: componentInfo.vectorNodes || [],
                imageNodes: componentInfo.imageNodes || []
            };
        }
        catch (error) {
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
        // Create a list of all available media slots
        const allMediaSlots = [
            ...componentInstances.map(c => ({ name: c.nodeName, type: 'component-instance' })),
            ...vectorNodes.map(v => ({ name: v.nodeName, type: 'vector-node' })),
            ...imageNodes.map(i => ({ name: i.nodeName, type: 'image-node' }))
        ];
        if (allMediaSlots.length === 0) {
            return {
                isValid: false,
                reason: "No media slots found in component"
            };
        }
        // Try exact name match
        const exactMatch = allMediaSlots.find(slot => slot.name.toLowerCase() === propKey.toLowerCase() ||
            slot.name.toLowerCase().replace(/\s+/g, '-') === propKey.toLowerCase());
        if (exactMatch) {
            return {
                isValid: true,
                targetType: exactMatch.type,
                targetName: exactMatch.name
            };
        }
        // Try partial name match
        const partialMatch = allMediaSlots.find(slot => slot.name.toLowerCase().includes(propKey.toLowerCase()) ||
            propKey.toLowerCase().includes(slot.name.toLowerCase()));
        if (partialMatch) {
            return {
                isValid: true,
                targetType: partialMatch.type,
                targetName: partialMatch.name
            };
        }
        // Try semantic matching based on property type
        const semanticMatch = this.findSemanticMediaMatch(propKey, allMediaSlots);
        if (semanticMatch) {
            return {
                isValid: true,
                targetType: semanticMatch.type,
                targetName: semanticMatch.name
            };
        }
        // Return suggestions for invalid properties
        return {
            isValid: false,
            reason: `No matching media slot found for "${propKey}"`,
            suggestions: allMediaSlots.map(slot => slot.name)
        };
    }
    /**
     * Find semantic matches for media properties using intelligent classification
     */
    static findSemanticMediaMatch(propKey, mediaSlots) {
        const keyLower = propKey.toLowerCase();
        // Enhanced semantic classification with multiple strategies
        const classifications = this.classifyMediaSlots(mediaSlots);
        // Strategy 1: Direct semantic category matching
        if (keyLower.includes('avatar') || keyLower.includes('profile') || keyLower.includes('user')) {
            return classifications.avatars[0] || classifications.images[0] || classifications.circles[0] || null;
        }
        if (keyLower.includes('icon') && !keyLower.includes('leading') && !keyLower.includes('trailing')) {
            return classifications.icons[0] || classifications.vectors[0] || classifications.smallImages[0] || null;
        }
        if (keyLower.includes('image') || keyLower.includes('photo') || keyLower.includes('picture')) {
            return classifications.images[0] || classifications.rectangularImages[0] || classifications.avatars[0] || null;
        }
        if (keyLower.includes('logo') || keyLower.includes('brand')) {
            return classifications.logos[0] || classifications.vectors[0] || classifications.images[0] || null;
        }
        if (keyLower.includes('badge') || keyLower.includes('indicator') || keyLower.includes('status')) {
            return classifications.badges[0] || classifications.smallImages[0] || classifications.vectors[0] || null;
        }
        // Strategy 2: Position-based matching
        if (keyLower.includes('leading') || keyLower.includes('start') || keyLower.includes('left')) {
            const positionMatch = this.findByPosition(mediaSlots, 'leading');
            if (positionMatch)
                return positionMatch;
            // Fallback to any icon/vector for leading positions
            return classifications.icons[0] || classifications.vectors[0] || null;
        }
        if (keyLower.includes('trailing') || keyLower.includes('end') || keyLower.includes('right')) {
            const positionMatch = this.findByPosition(mediaSlots, 'trailing');
            if (positionMatch)
                return positionMatch;
            // Fallback to any icon/vector for trailing positions
            return classifications.icons[0] || classifications.vectors[0] || null;
        }
        // Strategy 3: Size-based matching
        if (keyLower.includes('large') || keyLower.includes('big') || keyLower.includes('cover')) {
            return classifications.largeImages[0] || classifications.images[0] || null;
        }
        if (keyLower.includes('small') || keyLower.includes('mini') || keyLower.includes('thumb')) {
            return classifications.smallImages[0] || classifications.icons[0] || classifications.vectors[0] || null;
        }
        // Strategy 4: Fallback based on property type patterns
        if (keyLower.includes('icon')) {
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
        mediaSlots.forEach(slot => {
            const nameLower = slot.name.toLowerCase();
            // Avatar classification - look for people, faces, profiles
            if (nameLower.includes('avatar') ||
                nameLower.includes('profile') ||
                nameLower.includes('user') ||
                nameLower.includes('person') ||
                nameLower.includes('selfie') ||
                nameLower.includes('face') ||
                nameLower.includes('man') ||
                nameLower.includes('woman') ||
                nameLower.includes('people') ||
                (slot.type === 'image-node' && nameLower.includes('photo'))) {
                classifications.avatars.push(slot);
            }
            // Icon classification - small graphics, symbols
            else if (nameLower.includes('icon') ||
                nameLower.includes('symbol') ||
                nameLower.includes('pictogram') ||
                (slot.type === 'vector-node' && nameLower.length < 10)) {
                classifications.icons.push(slot);
            }
            // Badge classification - status indicators, notifications
            else if (nameLower.includes('badge') ||
                nameLower.includes('indicator') ||
                nameLower.includes('status') ||
                nameLower.includes('notification') ||
                nameLower.includes('dot') ||
                nameLower.includes('alert')) {
                classifications.badges.push(slot);
            }
            // Logo classification - brand elements
            else if (nameLower.includes('logo') ||
                nameLower.includes('brand') ||
                nameLower.includes('company')) {
                classifications.logos.push(slot);
            }
            // Vector classification - all vector nodes
            else if (slot.type === 'vector-node') {
                classifications.vectors.push(slot);
            }
            // Image classification - all image nodes and component instances with image-like names
            else if (slot.type === 'image-node' ||
                nameLower.includes('image') ||
                nameLower.includes('picture') ||
                nameLower.includes('photo')) {
                classifications.images.push(slot);
                // Sub-classify by apparent size/shape
                if (nameLower.includes('small') || nameLower.includes('mini') || nameLower.includes('thumb')) {
                    classifications.smallImages.push(slot);
                }
                else if (nameLower.includes('large') || nameLower.includes('big') || nameLower.includes('cover')) {
                    classifications.largeImages.push(slot);
                }
                // Shape classification
                if (nameLower.includes('circle') || nameLower.includes('round')) {
                    classifications.circles.push(slot);
                }
                else {
                    classifications.rectangularImages.push(slot);
                }
            }
            // Catch-all for component instances
            else if (slot.type === 'component-instance') {
                // If no specific category, put in general images category
                classifications.images.push(slot);
            }
        });
        return classifications;
    }
    /**
     * Find media slots by position keywords
     */
    static findByPosition(mediaSlots, position) {
        const positionKeywords = position === 'leading'
            ? ['leading', 'start', 'left', 'first', 'begin']
            : ['trailing', 'end', 'right', 'last', 'final'];
        return mediaSlots.find(slot => positionKeywords.some(keyword => slot.name.toLowerCase().includes(keyword))) || null;
    }
    /**
     * Sanitize and clean property names and values
     */
    static sanitizeProperties(properties) {
        if (!properties)
            return {};
        return Object.entries(properties).reduce((acc, [key, value]) => {
            const cleanKey = key.replace(/\s+/g, '-');
            if (key.toLowerCase().includes('text') && value !== null && value !== undefined) {
                acc[cleanKey] = String(value);
            }
            else {
                acc[cleanKey] = value;
            }
            return acc;
        }, {});
    }
    /**
     * Separate variant properties from regular properties
     */
    static separateVariantsFromProperties(properties, componentId) {
        if (!properties)
            return { cleanProperties: {}, variants: {} };
        const cleanProperties = {};
        const variants = {};
        const knownTextProperties = ['text', 'supporting-text', 'trailing-text', 'headline', 'subtitle', 'value'];
        const knownLayoutProperties = ['horizontalSizing', 'verticalSizing', 'layoutAlign', 'layoutGrow'];
        const variantPropertyNames = [
            'condition', 'Condition',
            'leading', 'Leading',
            'trailing', 'Trailing',
            'state', 'State',
            'style', 'Style',
            'size', 'Size',
            'type', 'Type',
            'emphasis', 'Emphasis',
            'variant', 'Variant'
        ];
        Object.entries(properties).forEach(([key, value]) => {
            if (key === 'variants') {
                Object.assign(variants, value);
                console.log(`🔧 Found existing variants object:`, value);
                return;
            }
            if (knownTextProperties.some(prop => key.toLowerCase().includes(prop.toLowerCase()))) {
                cleanProperties[key] = value;
                return;
            }
            if (knownLayoutProperties.some(prop => key.toLowerCase().includes(prop.toLowerCase()))) {
                cleanProperties[key] = value;
                return;
            }
            if (variantPropertyNames.includes(key)) {
                const properKey = key.charAt(0).toUpperCase() + key.slice(1);
                variants[properKey] = value;
                console.log(`🔧 Moved "${key}" -> "${properKey}" from properties to variants`);
                return;
            }
            cleanProperties[key] = value;
        });
        console.log(`🔍 Final separation for ${componentId}:`);
        console.log(`   Clean properties:`, cleanProperties);
        console.log(`   Variants:`, variants);
        return { cleanProperties, variants };
    }
    /**
     * Apply child layout properties for auto-layout items
     */
    static applyChildLayoutProperties(node, properties) {
        if (!properties)
            return;
        // layoutAlign - how the child aligns within its parent
        if (properties.layoutAlign) {
            node.layoutAlign = properties.layoutAlign;
        }
        else if (properties.horizontalSizing === 'FILL') {
            node.layoutAlign = 'STRETCH';
        }
        // layoutGrow - how much the child should grow to fill available space
        if (properties.layoutGrow !== undefined) {
            node.layoutGrow = properties.layoutGrow;
        }
        else if (properties.horizontalSizing === 'FILL') {
            const parent = node.parent;
            if (parent && 'layoutMode' in parent && parent.layoutMode === 'HORIZONTAL') {
                node.layoutGrow = 1;
            }
        }
        // layoutPositioning - absolute positioning within auto-layout
        if (properties.layoutPositioning) {
            node.layoutPositioning = properties.layoutPositioning;
        }
        // Size constraints for child elements
        if (properties.minWidth !== undefined && 'minWidth' in node) {
            node.minWidth = properties.minWidth;
        }
        if (properties.maxWidth !== undefined && 'maxWidth' in node) {
            node.maxWidth = properties.maxWidth;
        }
        if (properties.minHeight !== undefined && 'minHeight' in node) {
            node.minHeight = properties.minHeight;
        }
        if (properties.maxHeight !== undefined && 'maxHeight' in node) {
            node.maxHeight = properties.maxHeight;
        }
    }
    /**
     * Enhanced systematic component creation with modern API
     */
    static async createComponentInstanceSystematic(item, container) {
        if (!item.componentNodeId)
            return;
        const componentNode = await figma.getNodeByIdAsync(item.componentNodeId);
        if (!componentNode) {
            console.warn(`⚠️ Component with ID ${item.componentNodeId} not found. Skipping.`);
            return;
        }
        const masterComponent = (componentNode.type === 'COMPONENT_SET'
            ? componentNode.defaultVariant
            : componentNode);
        if (!masterComponent || masterComponent.type !== 'COMPONENT') {
            console.warn(`⚠️ Could not find a valid master component for ID ${item.componentNodeId}. Skipping.`);
            return;
        }
        console.log(` Creating systematic instance: ${masterComponent.name}`);
        // SYSTEMATIC VALIDATION - Merge properties and variants
        const allProperties = Object.assign(Object.assign({}, item.properties || {}), { variants: item.variants || {} });
        const validationResult = component_property_engine_1.ComponentPropertyEngine.validateAndProcessProperties(item.componentNodeId, allProperties);
        if (validationResult.warnings.length > 0) {
            console.warn(`⚠️ Warnings:`, validationResult.warnings);
        }
        if (validationResult.errors.length > 0) {
            console.error(`❌ Validation errors:`, validationResult.errors);
            // Create LLM-friendly error message
            const llmErrors = validationResult.errors.map(err => `${err.message}${err.suggestion ? ` - ${err.suggestion}` : ''}${err.llmHint ? ` (${err.llmHint})` : ''}`).join('\n');
            console.error(` LLM Error Summary:\n${llmErrors}`);
        }
        const { variants, textProperties, mediaProperties, layoutProperties } = validationResult.processedProperties;
        console.log('🔧 VALIDATION RESULTS:', {
            originalVariants: item.variants,
            processedVariants: variants,
            variantCount: Object.keys(variants).length
        });
        // Create and configure instance
        const instance = masterComponent.createInstance();
        container.appendChild(instance);
        // Apply properties in correct order
        if (Object.keys(variants).length > 0) {
            console.log('✅ About to apply variants:', variants);
            await this.applyVariantsSystematic(instance, variants, componentNode);
        }
        else {
            console.log('⚠️ NO VARIANTS TO APPLY - variants object is empty');
        }
        // Apply visibility overrides after variants
        this.applyVisibilityOverrides(instance, item);
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
        console.log('🎨 VARIANT APPLICATION START', {
            variants,
            componentType: componentNode === null || componentNode === void 0 ? void 0 : componentNode.type,
            instanceName: instance.name
        });
        try {
            await component_property_engine_1.PerformanceTracker.track('apply-variants', async () => {
                if (componentNode && componentNode.type === 'COMPONENT_SET') {
                    // Use modern componentPropertyDefinitions
                    const propertyDefinitions = componentNode.componentPropertyDefinitions;
                    if (!propertyDefinitions) {
                        console.warn('⚠️ No component property definitions found');
                        return;
                    }
                    const validVariants = {};
                    Object.entries(variants).forEach(([propName, propValue]) => {
                        var _a;
                        const propertyDef = propertyDefinitions[propName];
                        if (propertyDef && propertyDef.type === 'VARIANT') {
                            // Convert boolean values to capitalized strings for Figma
                            let stringValue;
                            if (typeof propValue === 'boolean') {
                                stringValue = propValue ? 'True' : 'False';
                                console.log(`🔄 Boolean conversion: ${propName} = ${propValue} -> "${stringValue}"`);
                            }
                            else {
                                stringValue = String(propValue);
                            }
                            if (propertyDef.variantOptions && propertyDef.variantOptions.includes(stringValue)) {
                                validVariants[propName] = stringValue;
                                console.log(`✅ Valid variant: ${propName} = "${stringValue}"`);
                            }
                            else {
                                console.warn(`⚠️ Invalid value for "${propName}": "${stringValue}". Available: [${((_a = propertyDef.variantOptions) === null || _a === void 0 ? void 0 : _a.join(', ')) || ''}]`);
                            }
                        }
                        else {
                            console.warn(`⚠️ Unknown variant property: "${propName}"`);
                        }
                    });
                    if (Object.keys(validVariants).length > 0) {
                        instance.setProperties(validVariants);
                        console.log('✅ Variants applied successfully');
                    }
                }
            });
        }
        catch (e) {
            console.error("❌ Error applying variants:", e);
        }
    }
    /**
     * Apply visibility overrides to component child elements
     */
    static applyVisibilityOverrides(instance, itemData) {
        console.log('🐛 applyVisibilityOverrides CALLED', {
            hasOverrides: !!itemData.visibilityOverrides,
            hasIconSwaps: !!itemData.iconSwaps,
            overrideCount: Object.keys(itemData.visibilityOverrides || {}).length,
            iconSwapCount: Object.keys(itemData.iconSwaps || {}).length,
            instanceName: instance.name,
            instanceId: instance.id,
            itemType: itemData.type
        });
        if (!itemData.visibilityOverrides && !itemData.iconSwaps) {
            console.log('🐛 No overrides to apply, returning early');
            return;
        }
        // Log all instance children for debugging
        console.log('🐛 Instance children:', instance.children.map(child => ({
            name: child.name,
            id: child.id,
            type: child.type,
            visible: child.visible
        })));
        try {
            // Apply visibility overrides
            if (itemData.visibilityOverrides) {
                console.log('🐛 Processing visibility overrides:', itemData.visibilityOverrides);
                Object.entries(itemData.visibilityOverrides).forEach(([nodeId, visible]) => {
                    console.log(`🐛 Looking for node ${nodeId} to set visibility to ${visible}`);
                    const child = instance.findChild(node => node.id === nodeId);
                    if (child) {
                        const previousVisible = child.visible;
                        child.visible = visible;
                        console.log(`✅ Applied visibility override: ${nodeId} = ${visible} (was: ${previousVisible}, name: ${child.name})`);
                    }
                    else {
                        console.warn(`⚠️ Child node ${nodeId} not found for visibility override`);
                        console.warn(`🐛 Available node IDs:`, instance.children.map(c => c.id));
                    }
                });
            }
            // Apply icon swaps (simplified - extend based on icon system)
            if (itemData.iconSwaps) {
                console.log('🐛 Processing icon swaps:', itemData.iconSwaps);
                Object.entries(itemData.iconSwaps).forEach(([nodeId, iconName]) => {
                    console.log(`🐛 Looking for node ${nodeId} to swap icon to ${iconName}`);
                    const child = instance.findChild(node => node.id === nodeId);
                    if (child && 'componentProperties' in child) {
                        // Attempt to swap icon - implementation depends on icon component structure
                        console.log(`🔄 Icon swap requested: ${nodeId} → ${iconName} (child: ${child.name})`);
                        // Note: Actual icon swapping implementation would depend on the specific design system
                    }
                    else {
                        console.warn(`⚠️ Child node ${nodeId} not found or not suitable for icon swap`);
                        if (child) {
                            console.warn(`🐛 Child found but no componentProperties: ${child.name}, type: ${child.type}`);
                        }
                    }
                });
            }
            console.log('🐛 applyVisibilityOverrides completed successfully');
        }
        catch (error) {
            console.error('❌ Visibility override application failed:', error);
        }
    }
    /**
     * Apply text properties with proper font loading and array support
     */
    static async applyTextPropertiesSystematic(instance, textProperties, componentId) {
        console.log(" Applying text properties systematically:", textProperties);
        const schema = component_property_engine_1.ComponentPropertyEngine.getComponentSchema(componentId);
        if (!schema) {
            console.warn(`⚠️ No schema found for component ${componentId}, using fallback text application`);
            // Fallback to original method
            await this.applyTextProperties(instance, textProperties);
            return;
        }
        // Use fast modern API for finding text nodes
        const allTextNodes = await component_property_engine_1.PerformanceTracker.track('find-text-nodes', async () => instance.findAllWithCriteria({ types: ['TEXT'] }));
        for (const [propKey, propValue] of Object.entries(textProperties)) {
            const textLayerInfo = schema.textLayers[propKey];
            if (!textLayerInfo) {
                console.warn(`⚠️ No text layer info found for property "${propKey}"`);
                // Try semantic matching as fallback
                const semanticMatch = Object.entries(schema.textLayers).find(([layerName, info]) => {
                    const layerLower = layerName.toLowerCase();
                    const propLower = propKey.toLowerCase();
                    return layerLower.includes(propLower) || propLower.includes(layerLower);
                });
                if (semanticMatch) {
                    const [matchedName, matchedInfo] = semanticMatch;
                    console.log(` Using semantic match: "${propKey}" → "${matchedName}"`);
                    if (matchedInfo.dataType === 'array' && Array.isArray(propValue)) {
                        await this.applyArrayTextProperty(propKey, propValue, allTextNodes, matchedInfo);
                    }
                    else {
                        const valueToUse = Array.isArray(propValue) ? propValue[0] : propValue;
                        await this.applySingleTextProperty(propKey, valueToUse, allTextNodes, matchedInfo);
                    }
                }
                continue;
            }
            if (textLayerInfo.dataType === 'array' && Array.isArray(propValue)) {
                await this.applyArrayTextProperty(propKey, propValue, allTextNodes, textLayerInfo);
            }
            else {
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
        // Find all nodes that match this text layer
        const matchingNodes = allTextNodes.filter(node => {
            const nodeLower = node.name.toLowerCase();
            const layerLower = textLayerInfo.nodeName.toLowerCase();
            const propLower = propKey.toLowerCase();
            return nodeLower === layerLower ||
                nodeLower.includes(propLower) ||
                nodeLower === propLower;
        });
        const maxItems = Math.min(propValues.length, textLayerInfo.maxItems || propValues.length);
        // Apply values to matching nodes
        for (let i = 0; i < maxItems && i < matchingNodes.length; i++) {
            const textNode = matchingNodes[i];
            const value = propValues[i];
            if (value && typeof value === 'string' && value.trim()) {
                await this.setTextNodeValueSafe(textNode, value, `${propKey}[${i}]`);
            }
        }
        // Hide extra nodes if we have fewer values than nodes
        for (let i = maxItems; i < matchingNodes.length; i++) {
            matchingNodes[i].visible = false;
            console.log(`️ Hidden extra text node: "${matchingNodes[i].name}"`);
        }
        console.log(`✅ Applied ${maxItems} values to ${propKey} array property`);
    }
    /**
     * Apply single text property
     */
    static async applySingleTextProperty(propKey, propValue, allTextNodes, textLayerInfo) {
        if (!propValue || typeof propValue !== 'string' || !propValue.trim())
            return;
        // Try exact ID match first
        let textNode = allTextNodes.find(n => n.id === textLayerInfo.nodeId);
        if (!textNode) {
            // Try exact name match
            textNode = allTextNodes.find(n => n.name.toLowerCase() === textLayerInfo.nodeName.toLowerCase());
        }
        if (!textNode) {
            // Try fuzzy name match
            textNode = allTextNodes.find(n => {
                const nodeLower = n.name.toLowerCase();
                const layerLower = textLayerInfo.nodeName.toLowerCase();
                return nodeLower.includes(layerLower) || layerLower.includes(nodeLower);
            });
        }
        if (textNode) {
            await this.setTextNodeValueSafe(textNode, propValue, propKey);
        }
        else {
            console.warn(`❌ No text node found for property "${propKey}" (looking for "${textLayerInfo.nodeName}")`);
        }
    }
    /**
     * Apply media properties systematically
     */
    static async applyMediaPropertiesSystematic(instance, mediaProperties, componentId) {
        console.log("️ Applying media properties systematically:", mediaProperties);
        const schema = component_property_engine_1.ComponentPropertyEngine.getComponentSchema(componentId);
        if (!schema) {
            console.warn(`⚠️ No schema found for component ${componentId}, skipping media application`);
            return;
        }
        // Get all potential media nodes
        const allMediaNodes = await component_property_engine_1.PerformanceTracker.track('find-media-nodes', async () => {
            const vectors = instance.findAllWithCriteria({ types: ['VECTOR'] });
            const rectangles = instance.findAllWithCriteria({ types: ['RECTANGLE'] });
            const ellipses = instance.findAllWithCriteria({ types: ['ELLIPSE'] });
            const components = instance.findAllWithCriteria({ types: ['INSTANCE', 'COMPONENT'] });
            return [...vectors, ...rectangles, ...ellipses, ...components];
        });
        for (const [propKey, propValue] of Object.entries(mediaProperties)) {
            const mediaLayerInfo = schema.mediaLayers[propKey];
            if (!mediaLayerInfo) {
                console.warn(`⚠️ No media layer info found for property "${propKey}"`);
                continue;
            }
            // Find matching node
            const mediaNode = allMediaNodes.find(n => n.id === mediaLayerInfo.nodeId) ||
                allMediaNodes.find(n => n.name.toLowerCase() === mediaLayerInfo.nodeName.toLowerCase());
            if (mediaNode) {
                console.log(`✅ Found media node for "${propKey}": "${mediaNode.name}" (${mediaNode.type})`);
                // Future: Apply actual media content here (swap instances, change fills, etc.)
            }
            else {
                console.warn(`❌ No media node found for property "${propKey}"`);
            }
        }
    }
    /**
     * Safe text setting with proper font loading
     */
    static async setTextNodeValueSafe(textNode, value, context) {
        try {
            await component_property_engine_1.PerformanceTracker.track('set-text-value', async () => {
                // Critical: Check for missing fonts first
                if (textNode.hasMissingFont) {
                    console.error(`❌ Cannot set text "${context}": Missing fonts`);
                    return;
                }
                if (!textNode.visible) {
                    textNode.visible = true;
                }
                // Load all required fonts properly
                await this.loadAllRequiredFonts(textNode);
                textNode.characters = value;
                console.log(`✅ Set "${textNode.name}" to "${value}" (${context})`);
            });
        }
        catch (fontError) {
            console.error(`❌ Font loading failed for "${textNode.name}":`, fontError);
            // Fallback to Inter Regular
            try {
                await figma.loadFontAsync({ family: "Inter", style: "Regular" });
                textNode.fontName = { family: "Inter", style: "Regular" };
                textNode.characters = value;
                console.log(`⚠️ Used fallback font for "${textNode.name}"`);
            }
            catch (fallbackError) {
                console.error(`❌ Even fallback failed:`, fallbackError);
            }
        }
    }
    /**
     * Load all fonts required for a text node (handles mixed fonts)
     */
    static async loadAllRequiredFonts(textNode) {
        try {
            // Handle single font scenario
            if (typeof textNode.fontName !== 'symbol') {
                await figma.loadFontAsync(textNode.fontName);
                return;
            }
            // Handle mixed fonts scenario
            if (textNode.fontName === figma.mixed && textNode.characters.length > 0) {
                const allFonts = textNode.getRangeAllFontNames(0, textNode.characters.length);
                const uniqueFonts = new Map();
                allFonts.forEach(font => {
                    uniqueFonts.set(`${font.family}-${font.style}`, font);
                });
                const fontPromises = Array.from(uniqueFonts.values()).map(font => figma.loadFontAsync(font));
                await Promise.all(fontPromises);
            }
        }
        catch (error) {
            throw error; // Will be handled by calling function
        }
    }
    /**
     * Enhanced dynamic generation using systematic approach
     */
    static async generateUIFromDataSystematic(layoutData, parentNode) {
        try {
            console.log('🔧 Starting generateUIFromDataSystematic with data:', {
                hasLayoutContainer: !!layoutData.layoutContainer,
                hasItems: !!layoutData.items,
                parentType: parentNode.type
            });
            // Skip ComponentPropertyEngine if no schemas available
            const schemas = component_property_engine_1.ComponentPropertyEngine.getAllSchemas();
            if (schemas.length === 0) {
                console.log('⚠️ No schemas - running systematic generation in basic mode');
            }
            let currentFrame;
            const containerData = layoutData.layoutContainer || layoutData;
            // DEBUG LOG 1: Input data verification + Full debug output
            const debugData = {
                timestamp: new Date().toISOString(),
                inputData: layoutData,
                containerData: containerData,
                parentNodeType: parentNode.type
            };
            console.log('📁 FULL INPUT DATA FOR DEBUGGING:', JSON.stringify(debugData, null, 2));
            // Create downloadable debug file
            try {
                const debugContent = JSON.stringify(debugData, null, 2);
                const blob = new Blob([debugContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                // Auto-download the file
                const a = document.createElement('a');
                a.href = url;
                a.download = 'debug-renderer-input.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('💾 Debug file auto-downloaded as: debug-renderer-input.json');
            }
            catch (e) {
                console.warn('⚠️ Could not auto-download debug file:', e.message);
                console.log('📋 Copy this JSON manually:', JSON.stringify(debugData, null, 2));
            }
            console.log('🔍 INPUT DATA:', {
                containerData: containerData,
                hasWidth: !!(containerData === null || containerData === void 0 ? void 0 : containerData.width),
                widthValue: containerData === null || containerData === void 0 ? void 0 : containerData.width
            });
            if (parentNode.type === 'PAGE' && containerData) {
                currentFrame = figma.createFrame();
                currentFrame.resize(containerData.width || 800, containerData.height || 600);
                parentNode.appendChild(currentFrame);
            }
            else if (parentNode.type === 'FRAME') {
                currentFrame = parentNode;
            }
            else {
                figma.notify("Cannot add items without a parent frame.", { error: true });
                return figma.createFrame();
            }
            // Apply container properties
            // DEBUG LOG 2: Container condition check
            console.log('🔍 CONTAINER CONDITION:', {
                hasContainerData: !!containerData,
                containerEqualsLayout: containerData === layoutData,
                conditionPassed: !!(containerData && containerData !== layoutData)
            });
            if (containerData) {
                currentFrame.name = containerData.name || "Generated Frame";
                console.log('🔧 Applying container properties:', {
                    name: containerData.name,
                    layoutMode: containerData.layoutMode,
                    itemSpacing: containerData.itemSpacing,
                    primaryAxisSizingMode: containerData.primaryAxisSizingMode,
                    width: containerData.width,
                    hasWidth: !!containerData.width
                });
                try {
                    currentFrame.layoutMode = containerData.layoutMode === "HORIZONTAL" || containerData.layoutMode === "VERTICAL"
                        ? containerData.layoutMode : "NONE";
                    console.log('🔧 Frame layoutMode set to:', currentFrame.layoutMode);
                }
                catch (e) {
                    console.warn('⚠️ Failed to set layoutMode:', e.message);
                }
                if (currentFrame.layoutMode !== 'NONE') {
                    try {
                        currentFrame.paddingTop = typeof containerData.paddingTop === 'number' ? containerData.paddingTop : 0;
                    }
                    catch (e) {
                        console.warn('⚠️ Failed to set paddingTop:', e.message);
                    }
                    try {
                        currentFrame.paddingBottom = typeof containerData.paddingBottom === 'number' ? containerData.paddingBottom : 0;
                    }
                    catch (e) {
                        console.warn('⚠️ Failed to set paddingBottom:', e.message);
                    }
                    try {
                        currentFrame.paddingLeft = typeof containerData.paddingLeft === 'number' ? containerData.paddingLeft : 0;
                    }
                    catch (e) {
                        console.warn('⚠️ Failed to set paddingLeft:', e.message);
                    }
                    try {
                        currentFrame.paddingRight = typeof containerData.paddingRight === 'number' ? containerData.paddingRight : 0;
                    }
                    catch (e) {
                        console.warn('⚠️ Failed to set paddingRight:', e.message);
                    }
                    // Enhanced auto-layout properties
                    try {
                        if (containerData.itemSpacing === 'AUTO') {
                            currentFrame.itemSpacing = 'AUTO';
                        }
                        else {
                            currentFrame.itemSpacing = typeof containerData.itemSpacing === 'number' ? containerData.itemSpacing : 0;
                        }
                    }
                    catch (e) {
                        console.warn('⚠️ Failed to set itemSpacing:', e.message);
                    }
                    // Layout wrap support
                    try {
                        if (containerData.layoutWrap !== undefined) {
                            currentFrame.layoutWrap = containerData.layoutWrap;
                        }
                    }
                    catch (e) {
                        console.warn('⚠️ Failed to set layoutWrap:', e.message);
                    }
                    // Primary axis alignment
                    try {
                        if (containerData.primaryAxisAlignItems) {
                            currentFrame.primaryAxisAlignItems = containerData.primaryAxisAlignItems;
                        }
                    }
                    catch (e) {
                        console.warn('⚠️ Failed to set primaryAxisAlignItems:', e.message);
                    }
                    // Counter axis alignment
                    try {
                        if (containerData.counterAxisAlignItems) {
                            currentFrame.counterAxisAlignItems = containerData.counterAxisAlignItems;
                        }
                    }
                    catch (e) {
                        console.warn('⚠️ Failed to set counterAxisAlignItems:', e.message);
                    }
                    // Sizing modes - Skip primaryAxisSizingMode here if we have explicit width
                    // (it will be set to FIXED later in the width setting block)
                    console.log('🔍 EARLY CHECK:', {
                        hasWidth: !!containerData.width,
                        widthValue: containerData.width,
                        skipEarlySetting: !containerData.width
                    });
                    if (!containerData.width || containerData.width === 0) {
                        try {
                            if (containerData.primaryAxisSizingMode) {
                                currentFrame.primaryAxisSizingMode = containerData.primaryAxisSizingMode;
                                console.log('🔍 Set primaryAxisSizingMode early:', containerData.primaryAxisSizingMode);
                            }
                        }
                        catch (e) {
                            console.warn('⚠️ Failed to set primaryAxisSizingMode:', e.message);
                        }
                    }
                    else {
                        console.log('🔍 SKIPPED early primaryAxisSizingMode setting (has width)');
                    }
                    try {
                        if (containerData.counterAxisSizingMode) {
                            currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode;
                        }
                    }
                    catch (e) {
                        console.warn('⚠️ Failed to set counterAxisSizingMode:', e.message);
                    }
                }
                // Size constraints - wrapped in try-catch to prevent property setter errors
                try {
                    if (containerData.minWidth !== undefined) {
                        currentFrame.minWidth = containerData.minWidth;
                    }
                }
                catch (e) {
                    console.warn('⚠️ Failed to set minWidth:', e.message);
                }
                try {
                    if (containerData.maxWidth !== undefined) {
                        currentFrame.maxWidth = containerData.maxWidth;
                    }
                }
                catch (e) {
                    console.warn('⚠️ Failed to set maxWidth:', e.message);
                }
                try {
                    if (containerData.minHeight !== undefined) {
                        currentFrame.minHeight = containerData.minHeight;
                    }
                }
                catch (e) {
                    console.warn('⚠️ Failed to set minHeight:', e.message);
                }
                try {
                    if (containerData.maxHeight !== undefined) {
                        currentFrame.maxHeight = containerData.maxHeight;
                    }
                }
                catch (e) {
                    console.warn('⚠️ Failed to set maxHeight:', e.message);
                }
                if (containerData.width) {
                    try {
                        if (currentFrame.layoutMode !== 'NONE') {
                            // DEBUG LOG 3: Before width setting
                            console.log('🔍 BEFORE width set:', {
                                specified: containerData.width,
                                current: currentFrame.width,
                                layoutMode: currentFrame.layoutMode
                            });
                            // CRITICAL: Set sizing modes BEFORE width
                            // When setting explicit width, primaryAxisSizingMode must be FIXED
                            currentFrame.primaryAxisSizingMode = "FIXED";
                            currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode || "FIXED";
                            // For auto-layout frames, set width directly and let auto-layout handle height
                            const frameState = {
                                primaryAxis: currentFrame.primaryAxisSizingMode,
                                counterAxis: currentFrame.counterAxisSizingMode,
                                layoutMode: currentFrame.layoutMode,
                                currentWidth: currentFrame.width
                            };
                            console.log('🔍 FRAME STATE before width:', frameState);
                            console.log('📋 FRAME STATE for file:', JSON.stringify(frameState, null, 2));
                            currentFrame.width = containerData.width;
                            // DEBUG LOG 4: After width setting
                            console.log('🔍 AFTER width set:', currentFrame.width);
                            console.log('🔧 Set auto-layout frame width to:', containerData.width);
                        }
                        else {
                            // For regular frames, use resize
                            currentFrame.resize(containerData.width, currentFrame.height);
                            console.log('🔧 Resized regular frame to width:', containerData.width);
                        }
                    }
                    catch (e) {
                        console.warn('⚠️ Failed to set width:', e.message);
                    }
                }
                else {
                    try {
                        if (!containerData.counterAxisSizingMode) {
                            currentFrame.counterAxisSizingMode = "AUTO";
                        }
                    }
                    catch (e) {
                        console.warn('⚠️ Failed to set counterAxisSizingMode (AUTO):', e.message);
                    }
                }
            }
            const items = layoutData.items || containerData.items;
            if (!items || !Array.isArray(items))
                return currentFrame;
            for (const item of items) {
                if (item.type === 'layoutContainer') {
                    console.log('🔧 Creating nested layoutContainer:', item.name, 'layoutMode:', item.layoutMode);
                    const nestedFrame = figma.createFrame();
                    currentFrame.appendChild(nestedFrame);
                    // Apply child layout properties
                    this.applyChildLayoutProperties(nestedFrame, item);
                    await this.generateUIFromDataSystematic({ layoutContainer: item, items: item.items }, nestedFrame);
                }
                else if (item.type === 'frame' && item.layoutContainer) {
                    const nestedFrame = figma.createFrame();
                    currentFrame.appendChild(nestedFrame);
                    await this.generateUIFromDataSystematic(item, nestedFrame);
                }
                else if (item.type === 'native-text' || item.type === 'text') {
                    await this.createTextNode(item, currentFrame);
                }
                else if (item.type === 'native-rectangle') {
                    await this.createRectangleNode(item, currentFrame);
                }
                else if (item.type === 'native-circle') {
                    await this.createEllipseNode(item, currentFrame);
                }
                else {
                    // Use systematic approach for components
                    await this.createComponentInstanceSystematic(item, currentFrame);
                }
            }
            // Post-processing: Ensure frame maintains intended dimensions after content is added
            const postProcessContainerData = layoutData.layoutContainer || layoutData;
            if (postProcessContainerData && postProcessContainerData.width && currentFrame.layoutMode !== 'NONE') {
                console.log('🔧 Post-processing: Re-enforcing frame width to:', postProcessContainerData.width);
                currentFrame.width = postProcessContainerData.width;
            }
            if (parentNode.type === 'PAGE') {
                figma.currentPage.selection = [currentFrame];
                figma.viewport.scrollAndZoomIntoView([currentFrame]);
                // Show performance report
                const perfReport = component_property_engine_1.ComponentPropertyEngine.getPerformanceReport();
                console.log("⚡ Performance Report:", perfReport);
                figma.notify(`UI generated with systematic validation!`, { timeout: 2500 });
            }
            return currentFrame;
        }
        catch (error) {
            console.error('❌ generateUIFromDataSystematic error:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                layoutData: layoutData,
                parentNodeType: parentNode.type
            });
            // Create a basic frame as fallback
            const fallbackFrame = figma.createFrame();
            fallbackFrame.name = "Error Frame";
            fallbackFrame.resize(375, 100);
            if (parentNode.type === 'PAGE') {
                parentNode.appendChild(fallbackFrame);
            }
            figma.notify(`❌ Error creating UI: ${error.message}`, { error: true });
            return fallbackFrame;
        }
    }
    /**
     * Modify existing UI frame by replacing its content
     */
    static async modifyExistingUI(modifiedJSON, frameId) {
        try {
            const existingFrame = await figma.getNodeByIdAsync(frameId);
            if (existingFrame && existingFrame.type === 'FRAME') {
                // Remove all existing children
                for (let i = existingFrame.children.length - 1; i >= 0; i--) {
                    existingFrame.children[i].remove();
                }
                // Generate new content
                await this.generateUIFromData(modifiedJSON, existingFrame);
                figma.notify("UI updated successfully!", { timeout: 2000 });
                return existingFrame;
            }
            else {
                throw new Error("Target frame for modification not found.");
            }
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.notify("Modification error: " + errorMessage, { error: true });
            console.error("❌ modifyExistingUI error:", e);
            return null;
        }
    }
    /**
     * Ensure color styles are loaded before UI generation
     */
    static async ensureColorStylesLoaded() {
        if (!this.cachedColorStyles) {
            console.log('🎨 Color styles not cached, attempting to load from storage...');
            try {
                const scanSession = await session_manager_1.SessionManager.loadLastScanSession();
                if (scanSession === null || scanSession === void 0 ? void 0 : scanSession.colorStyles) {
                    this.setColorStyles(scanSession.colorStyles);
                    console.log('✅ Color styles loaded from scan session');
                }
                else {
                    console.warn('⚠️ No color styles found in storage. Run a design system scan first.');
                }
            }
            catch (e) {
                console.warn('⚠️ Failed to load color styles from storage:', e);
            }
        }
        else {
            console.log('✅ Color styles already cached');
        }
    }
    /**
     * Ensure design tokens are loaded before UI generation
     */
    static async ensureDesignTokensLoaded() {
        if (!this.cachedDesignTokens) {
            console.log('🔧 Design tokens not cached, attempting to load from storage...');
            try {
                const scanSession = await session_manager_1.SessionManager.loadLastScanSession();
                if (scanSession === null || scanSession === void 0 ? void 0 : scanSession.designTokens) {
                    this.setDesignTokens(scanSession.designTokens);
                    console.log('✅ Design tokens loaded from scan session');
                }
                else {
                    console.warn('⚠️ No design tokens found in storage. Run a design system scan first.');
                }
            }
            catch (e) {
                console.warn('⚠️ Failed to load design tokens from storage:', e);
            }
        }
        else {
            console.log('✅ Design tokens already cached');
        }
    }
    /**
     * Ensure all cached design system data is loaded (color styles, text styles, design tokens)
     */
    static async ensureDesignSystemDataLoaded() {
        await this.ensureColorStylesLoaded();
        await this.ensureDesignTokensLoaded();
        // Note: Text styles are loaded differently since they don't have a caching mechanism like colors/tokens
    }
    /**
     * Initialize Color Styles from a scan session
     */
    static setColorStyles(colorStyles) {
        this.cachedColorStyles = colorStyles;
        if (colorStyles) {
            const totalStyles = Object.values(colorStyles).reduce((sum, styles) => sum + styles.length, 0);
            console.log(`🎨 FigmaRenderer: Loaded ${totalStyles} Color Styles for semantic color resolution`);
        }
    }
    /**
     * NEW: Set cached design tokens for renderer to use
     */
    static setDesignTokens(designTokens) {
        this.cachedDesignTokens = designTokens;
        console.log(`🔧 Cached ${(designTokens === null || designTokens === void 0 ? void 0 : designTokens.length) || 0} design tokens for renderer`);
    }
    /**
     * NEW: Resolve design token names to RGB values
     * Supports various token naming patterns: 'button.primary', 'color-primary-500', 'Primary/500'
     */
    static resolveDesignTokenReference(tokenName) {
        if (!this.cachedDesignTokens || this.cachedDesignTokens.length === 0) {
            return null;
        }
        console.log(`🔧 Resolving design token: "${tokenName}"`);
        // Find exact match first
        const exactMatch = this.cachedDesignTokens.find(token => token.type === 'COLOR' && token.name === tokenName);
        if (exactMatch) {
            console.log(`✅ Found exact design token: ${exactMatch.name}`);
            return this.convertTokenValueToRgb(exactMatch.value);
        }
        // Try case-insensitive match
        const caseInsensitiveMatch = this.cachedDesignTokens.find(token => token.type === 'COLOR' && token.name.toLowerCase() === tokenName.toLowerCase());
        if (caseInsensitiveMatch) {
            console.log(`✅ Found case-insensitive design token: ${caseInsensitiveMatch.name}`);
            return this.convertTokenValueToRgb(caseInsensitiveMatch.value);
        }
        // Try pattern matching: 'collection/name' format
        const collectionMatch = this.cachedDesignTokens.find(token => token.type === 'COLOR' && `${token.collection}/${token.name}`.toLowerCase() === tokenName.toLowerCase());
        if (collectionMatch) {
            console.log(`✅ Found collection-based design token: ${collectionMatch.collection}/${collectionMatch.name}`);
            return this.convertTokenValueToRgb(collectionMatch.value);
        }
        console.warn(`⚠️ Could not find design token "${tokenName}"`);
        return null;
    }
    /**
     * NEW: Convert design token value to RGB
     */
    static convertTokenValueToRgb(tokenValue) {
        try {
            // Handle Figma Variables color format: {r: 0.1, g: 0.2, b: 0.3}
            if (typeof tokenValue === 'object' && tokenValue !== null) {
                if ('r' in tokenValue && 'g' in tokenValue && 'b' in tokenValue) {
                    return {
                        r: Math.max(0, Math.min(1, Number(tokenValue.r) || 0)),
                        g: Math.max(0, Math.min(1, Number(tokenValue.g) || 0)),
                        b: Math.max(0, Math.min(1, Number(tokenValue.b) || 0))
                    };
                }
            }
            // Handle hex string format: "#ff0000"
            if (typeof tokenValue === 'string' && tokenValue.startsWith('#')) {
                return this.hexToRgb(tokenValue);
            }
            console.warn(`⚠️ Unsupported token value format:`, tokenValue);
            return null;
        }
        catch (error) {
            console.error(`❌ Error converting token value:`, error);
            return null;
        }
    }
    /**
     * Resolve color style names to actual Figma color styles (for style application)
     * Returns the actual Figma PaintStyle object so styles are applied, not raw colors
     */
    static async resolveColorStyleReference(colorStyleName) {
        console.log(`🎨 Resolving color style reference: "${colorStyleName}"`);
        try {
            // Get all local paint styles from Figma
            const localPaintStyles = await figma.getLocalPaintStylesAsync();
            console.log(`📋 Found ${localPaintStyles.length} local paint styles in Figma`);
            // Debug: Show first few style names
            if (localPaintStyles.length > 0) {
                console.log(`📋 First 5 style names:`, localPaintStyles.slice(0, 5).map(s => s.name));
            }
            // Find exact match first
            const exactMatch = localPaintStyles.find(style => style.name === colorStyleName);
            if (exactMatch) {
                console.log(`✅ Found exact color style: ${exactMatch.name}`);
                return exactMatch;
            }
            // Fallback: case-insensitive search
            const caseInsensitiveMatch = localPaintStyles.find(style => style.name.toLowerCase() === colorStyleName.toLowerCase());
            if (caseInsensitiveMatch) {
                console.log(`✅ Found case-insensitive color style: ${caseInsensitiveMatch.name}`);
                return caseInsensitiveMatch;
            }
            console.warn(`⚠️ Could not find color style "${colorStyleName}"`);
            console.log(`📋 All available paint styles:`, localPaintStyles.map(s => s.name));
            return null;
        }
        catch (error) {
            console.error(`❌ Error resolving color style "${colorStyleName}":`, error);
            return null;
        }
    }
    /**
     * ENHANCED: Resolve color references with 3-tier fallback system
     * 1. Design Tokens (preferred)
     * 2. Color Styles (legacy)
     * 3. Semantic color fallback
     */
    static resolveColorReference(colorName) {
        console.log(`🎨 Resolving color: "${colorName}" with 3-tier system`);
        // Tier 1: Try design tokens first (modern approach)
        const tokenColor = this.resolveDesignTokenReference(colorName);
        if (tokenColor) {
            console.log(`✅ Resolved via design token`);
            return tokenColor;
        }
        // Tier 2: Fallback to color styles (legacy approach)
        const styleColor = this.resolveSemanticColor(colorName);
        if (styleColor && !(styleColor.r === 0 && styleColor.g === 0 && styleColor.b === 0)) {
            console.log(`✅ Resolved via color style`);
            return styleColor;
        }
        // Tier 3: Ultimate fallback
        console.warn(`⚠️ Could not resolve color "${colorName}" through any method`);
        return { r: 0, g: 0, b: 0 }; // Black fallback
    }
    /**
     * Resolve color style names to actual RGB values from scanned Color Styles (fallback)
     * Uses exact name matching from design system scan data
     * Examples: "Primary/primary80", "Button-color", "Light Green", "ui-primary-500"
     */
    static resolveSemanticColor(colorStyleName) {
        if (!this.cachedColorStyles) {
            console.warn(`⚠️ No Color Styles loaded. Call setColorStyles() first or run a design system scan.`);
            return null;
        }
        console.log(`🎨 Resolving color style: "${colorStyleName}"`);
        // Search all categories for exact name match
        const allCategories = Object.values(this.cachedColorStyles).flat();
        const exactMatch = allCategories.find(style => style.name === colorStyleName);
        if (exactMatch && exactMatch.colorInfo.type === 'SOLID') {
            console.log(`✅ Found exact match: ${exactMatch.name} (${exactMatch.colorInfo.color})`);
            return this.hexToRgb(exactMatch.colorInfo.color || '#000000');
        }
        // Fallback: case-insensitive search
        const caseInsensitiveMatch = allCategories.find(style => style.name.toLowerCase() === colorStyleName.toLowerCase());
        if (caseInsensitiveMatch && caseInsensitiveMatch.colorInfo.type === 'SOLID') {
            console.log(`✅ Found case-insensitive match: ${caseInsensitiveMatch.name} (${caseInsensitiveMatch.colorInfo.color})`);
            return this.hexToRgb(caseInsensitiveMatch.colorInfo.color || '#000000');
        }
        console.warn(`⚠️ Could not find color style "${colorStyleName}"`);
        console.log(`Available color styles:`, allCategories.map(s => s.name));
        // Return black as fallback
        return { r: 0, g: 0, b: 0 };
    }
    /**
     * Convert hex color to RGB values (0-1 range)
     */
    static hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        // Handle 3-digit hex codes
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        return { r, g, b };
    }
    /**
     * Create a solid paint from RGB values
     */
    static createSolidPaint(rgb, opacity = 1) {
        return {
            type: 'SOLID',
            color: rgb,
            opacity: opacity
        };
    }
    /**
     * Helper method to resolve and apply semantic colors to text nodes
     */
    static applySemanticTextColor(textNode, semanticColorName) {
        const rgb = this.resolveColorReference(semanticColorName);
        if (rgb) {
            textNode.fills = [this.createSolidPaint(rgb)];
            console.log(`✅ Applied semantic color "${semanticColorName}" to text node`);
            return true;
        }
        return false;
    }
    /**
     * Helper method to resolve and apply color styles to any node with fills
     */
    static async applySemanticFillColor(node, semanticColorName) {
        // Try to apply actual Figma color style first
        const colorStyle = await this.resolveColorStyleReference(semanticColorName);
        if (colorStyle && 'setFillStyleIdAsync' in node) {
            await node.setFillStyleIdAsync(colorStyle.id);
            console.log(`✅ Applied color style "${semanticColorName}" to node (as style reference)`);
            return true;
        }
        // Fallback to RGB color if style not found
        const rgb = this.resolveColorReference(semanticColorName);
        if (rgb && 'fills' in node) {
            node.fills = [this.createSolidPaint(rgb)];
            console.log(`✅ Applied semantic fill color "${semanticColorName}" to node (as RGB fallback)`);
            return true;
        }
        return false;
    }
    // Text Styles Caching and Resolution
    /**
     * Sets the cached text styles for the renderer
     * Mirrors setColorStyles pattern exactly
     */
    static setTextStyles(textStyles) {
        FigmaRenderer.cachedTextStyles = textStyles;
        console.log(`📝 Cached ${textStyles.length} text styles for rendering`);
        // Log available text styles for debugging
        if (textStyles.length > 0) {
            console.log('Available text styles:', textStyles.map(s => s.name).join(', '));
        }
    }
    /**
     * Resolves text style name to Figma text style ID
     * Mirrors resolveColorStyleReference pattern
     */
    static async resolveTextStyleReference(textStyleName) {
        console.log(`📝 Resolving text style reference: "${textStyleName}"`);
        try {
            // Get all local text styles from Figma
            const localTextStyles = await figma.getLocalTextStylesAsync();
            console.log(`📋 Found ${localTextStyles.length} local text styles in Figma`);
            // Debug: Show first few style names
            if (localTextStyles.length > 0) {
                console.log(`📋 First 5 text style names:`, localTextStyles.slice(0, 5).map(s => s.name));
            }
            // Find exact match first
            const exactMatch = localTextStyles.find(style => style.name === textStyleName);
            if (exactMatch) {
                console.log(`✅ Found exact text style: ${exactMatch.name}`);
                return exactMatch;
            }
            // Fallback: case-insensitive search
            const caseInsensitiveMatch = localTextStyles.find(style => style.name.toLowerCase() === textStyleName.toLowerCase());
            if (caseInsensitiveMatch) {
                console.log(`✅ Found case-insensitive text style: ${caseInsensitiveMatch.name}`);
                return caseInsensitiveMatch;
            }
            console.warn(`⚠️ Could not find text style "${textStyleName}"`);
            console.log(`📋 All available text styles:`, localTextStyles.map(s => s.name));
            return null;
        }
        catch (error) {
            console.error(`❌ Error resolving text style "${textStyleName}":`, error);
            return null;
        }
    }
    /**
     * Applies text style to a text node
     */
    static async applyTextStyle(textNode, textStyleName) {
        try {
            console.log(`📝 Attempting to apply text style: "${textStyleName}"`);
            const textStyle = await FigmaRenderer.resolveTextStyleReference(textStyleName);
            if (textStyle) {
                console.log(`📝 Text style found - ID: ${textStyle.id}, Name: ${textStyle.name}`);
                await textNode.setTextStyleIdAsync(textStyle.id);
                console.log(`✅ Applied text style "${textStyleName}" to text node`);
            }
            else {
                console.warn(`❌ Could not apply text style "${textStyleName}" - style not found`);
            }
        }
        catch (error) {
            console.error(`❌ Error applying text style "${textStyleName}":`, error);
            console.error(`❌ Error details:`, {
                errorMessage: error.message,
                errorStack: error.stack,
                textStyleName: textStyleName,
                textNodeType: textNode === null || textNode === void 0 ? void 0 : textNode.type,
                textNodeId: textNode === null || textNode === void 0 ? void 0 : textNode.id
            });
        }
    }
}
exports.FigmaRenderer = FigmaRenderer;
// Static storage for Color Styles scanned from the design system
FigmaRenderer.cachedColorStyles = null;
FigmaRenderer.cachedDesignTokens = null; // NEW: Design tokens cache
// Static storage for Text Styles scanned from the design system
FigmaRenderer.cachedTextStyles = null;
