// src/core/figma-renderer.ts
// UI generation and rendering engine for AIDesigner
import { ComponentScanner } from './component-scanner';
import { ComponentPropertyEngine, PerformanceTracker } from './component-property-engine';
import { JSONMigrator } from './json-migrator';
export class FigmaRenderer {
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
            // Size constraints
            if (containerData.minWidth !== undefined) {
                currentFrame.minWidth = containerData.minWidth;
            }
            if (containerData.maxWidth !== undefined) {
                currentFrame.maxWidth = containerData.maxWidth;
            }
            if (containerData.minHeight !== undefined) {
                currentFrame.minHeight = containerData.minHeight;
            }
            if (containerData.maxHeight !== undefined) {
                currentFrame.maxHeight = containerData.maxHeight;
            }
            if (containerData.width) {
                currentFrame.resize(containerData.width, currentFrame.height);
                if (!containerData.counterAxisSizingMode) {
                    currentFrame.counterAxisSizingMode = "FIXED";
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
                                        const stringValue = String(propValue);
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
        if (!layoutData || !layoutData.items) {
            figma.notify("Invalid JSON structure", { error: true });
            return null;
        }
        try {
            // Enable performance optimizations
            figma.skipInvisibleInstanceChildren = true;
            // Skip ComponentPropertyEngine for testing if no schemas available
            console.log('🔧 Checking ComponentPropertyEngine schemas...');
            const existingSchemas = ComponentPropertyEngine.getAllSchemas();
            if (existingSchemas.length === 0) {
                console.log('⚠️ No design system schemas found - running in basic mode');
            }
            else {
                await ComponentPropertyEngine.initialize();
                console.log('✅ ComponentPropertyEngine initialized with', existingSchemas.length, 'schemas');
            }
            // Migrate JSON if needed
            const migratedData = JSONMigrator.migrateToSystematic(layoutData);
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
                            const resolvedId = await ComponentScanner.getComponentIdByType(item.type);
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
                    const resolvedColor = this.resolveSemanticColor(props.color);
                    if (resolvedColor) {
                        textNode.fills = [this.createSolidPaint(resolvedColor)];
                        console.log(`✅ Applied semantic color "${props.color}" to text`);
                    }
                    else {
                        console.warn(`⚠️ Could not resolve semantic color "${props.color}", skipping color application`);
                    }
                }
                else {
                    // Handle RGB object (existing behavior)
                    textNode.fills = [{ type: 'SOLID', color: props.color }];
                }
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
            if (propKey === 'horizontalSizing' || propKey === 'variants')
                continue;
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
        // SYSTEMATIC VALIDATION
        const validationResult = ComponentPropertyEngine.validateAndProcessProperties(item.componentNodeId, item.properties || {});
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
        // Create and configure instance
        const instance = masterComponent.createInstance();
        container.appendChild(instance);
        // Apply properties in correct order
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
            await PerformanceTracker.track('apply-variants', async () => {
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
                            const stringValue = String(propValue);
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
     * Apply text properties with proper font loading and array support
     */
    static async applyTextPropertiesSystematic(instance, textProperties, componentId) {
        console.log(" Applying text properties systematically:", textProperties);
        const schema = ComponentPropertyEngine.getComponentSchema(componentId);
        if (!schema) {
            console.warn(`⚠️ No schema found for component ${componentId}, using fallback text application`);
            // Fallback to original method
            await this.applyTextProperties(instance, textProperties);
            return;
        }
        // Use fast modern API for finding text nodes
        const allTextNodes = await PerformanceTracker.track('find-text-nodes', async () => instance.findAllWithCriteria({ types: ['TEXT'] }));
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
        const schema = ComponentPropertyEngine.getComponentSchema(componentId);
        if (!schema) {
            console.warn(`⚠️ No schema found for component ${componentId}, skipping media application`);
            return;
        }
        // Get all potential media nodes
        const allMediaNodes = await PerformanceTracker.track('find-media-nodes', async () => {
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
            await PerformanceTracker.track('set-text-value', async () => {
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
        // Skip ComponentPropertyEngine if no schemas available
        const schemas = ComponentPropertyEngine.getAllSchemas();
        if (schemas.length === 0) {
            console.log('⚠️ No schemas - running systematic generation in basic mode');
        }
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
        // Apply container properties
        if (containerData && containerData !== layoutData) {
            currentFrame.name = containerData.name || "Generated Frame";
            console.log('🔧 Applying container properties:', {
                name: containerData.name,
                layoutMode: containerData.layoutMode,
                itemSpacing: containerData.itemSpacing,
                primaryAxisSizingMode: containerData.primaryAxisSizingMode
            });
            currentFrame.layoutMode = containerData.layoutMode === "HORIZONTAL" || containerData.layoutMode === "VERTICAL"
                ? containerData.layoutMode : "NONE";
            console.log('🔧 Frame layoutMode set to:', currentFrame.layoutMode);
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
                if (containerData.counterAxisSizingMode) {
                    currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode;
                }
            }
            // Size constraints
            if (containerData.minWidth !== undefined) {
                currentFrame.minWidth = containerData.minWidth;
            }
            if (containerData.maxWidth !== undefined) {
                currentFrame.maxWidth = containerData.maxWidth;
            }
            if (containerData.minHeight !== undefined) {
                currentFrame.minHeight = containerData.minHeight;
            }
            if (containerData.maxHeight !== undefined) {
                currentFrame.maxHeight = containerData.maxHeight;
            }
            if (containerData.width) {
                currentFrame.resize(containerData.width, currentFrame.height);
                if (!containerData.counterAxisSizingMode) {
                    currentFrame.counterAxisSizingMode = "FIXED";
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
        if (parentNode.type === 'PAGE') {
            figma.currentPage.selection = [currentFrame];
            figma.viewport.scrollAndZoomIntoView([currentFrame]);
            // Show performance report
            const perfReport = ComponentPropertyEngine.getPerformanceReport();
            console.log("⚡ Performance Report:", perfReport);
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
     * Resolve semantic color names to actual RGB values from scanned Color Styles
     * Examples: "primary", "secondary", "primary-500", "neutral-100", "success"
     */
    static resolveSemanticColor(semanticColorName) {
        if (!this.cachedColorStyles) {
            console.warn(`⚠️ No Color Styles loaded. Call setColorStyles() first or run a design system scan.`);
            return null;
        }
        console.log(`🎨 Resolving semantic color: "${semanticColorName}"`);
        const { category, variant } = this.parseSemanticColorName(semanticColorName);
        const categoryStyles = this.cachedColorStyles[category];
        if (!categoryStyles || categoryStyles.length === 0) {
            console.warn(`⚠️ No Color Styles found for category "${category}"`);
            return this.getFallbackColor(category);
        }
        // Find exact variant match if specified
        if (variant) {
            const exactMatch = categoryStyles.find(style => style.variant === variant);
            if (exactMatch && exactMatch.colorInfo.type === 'SOLID') {
                console.log(`✅ Found exact match: ${exactMatch.name} (${exactMatch.colorInfo.color})`);
                return this.hexToRgb(exactMatch.colorInfo.color || '#000000');
            }
        }
        // Find default/primary variant for the category
        const defaultVariants = ['default', '500', '50', '100', ''];
        for (const defaultVariant of defaultVariants) {
            const defaultMatch = categoryStyles.find(style => !style.variant || style.variant === defaultVariant);
            if (defaultMatch && defaultMatch.colorInfo.type === 'SOLID') {
                console.log(`✅ Found default variant: ${defaultMatch.name} (${defaultMatch.colorInfo.color})`);
                return this.hexToRgb(defaultMatch.colorInfo.color || '#000000');
            }
        }
        // Use first available style in the category
        const firstStyle = categoryStyles[0];
        if (firstStyle && firstStyle.colorInfo.type === 'SOLID') {
            console.log(`✅ Using first available: ${firstStyle.name} (${firstStyle.colorInfo.color})`);
            return this.hexToRgb(firstStyle.colorInfo.color || '#000000');
        }
        console.warn(`⚠️ Could not resolve semantic color "${semanticColorName}"`);
        return this.getFallbackColor(category);
    }
    /**
     * Parse semantic color name to extract category and variant
     * Examples: "primary-500" -> { category: "primary", variant: "500" }
     *          "secondary" -> { category: "secondary", variant: null }
     */
    static parseSemanticColorName(semanticColorName) {
        const name = semanticColorName.toLowerCase().trim();
        // Handle hyphenated variants (e.g., "primary-500", "neutral-100")
        const hyphenMatch = name.match(/^(primary|secondary|tertiary|neutral|semantic|surface)-(\d+)$/);
        if (hyphenMatch) {
            return {
                category: hyphenMatch[1],
                variant: hyphenMatch[2]
            };
        }
        // Handle direct semantic color names
        const semanticMapping = {
            'primary': 'primary',
            'secondary': 'secondary',
            'tertiary': 'tertiary',
            'neutral': 'neutral',
            'semantic': 'semantic',
            'surface': 'surface',
            'brand': 'primary',
            'accent': 'secondary',
            'success': 'semantic',
            'error': 'semantic',
            'warning': 'semantic',
            'info': 'semantic',
            'danger': 'semantic',
            'green': 'semantic',
            'red': 'semantic',
            'blue': 'semantic',
            'yellow': 'semantic',
            'orange': 'semantic'
        };
        const category = semanticMapping[name] || 'other';
        return { category, variant: null };
    }
    /**
     * Get fallback colors when semantic resolution fails
     */
    static getFallbackColor(category) {
        const fallbacks = {
            primary: { r: 0.149, g: 0.376, b: 0.894 }, // Blue #2563EB
            secondary: { r: 0.596, g: 0.525, b: 0.843 }, // Purple #9A8ED7
            tertiary: { r: 0.627, g: 0.627, b: 0.627 }, // Gray #A0A0A0
            neutral: { r: 0.627, g: 0.627, b: 0.627 }, // Gray #A0A0A0
            semantic: { r: 0.0, g: 0.7, b: 0.3 }, // Green #00B53F
            surface: { r: 0.98, g: 0.98, b: 0.98 }, // Light Gray #FAFAFA
            other: { r: 0.0, g: 0.0, b: 0.0 } // Black #000000
        };
        console.log(`🎨 Using fallback color for category "${category}"`);
        return fallbacks[category];
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
        const rgb = this.resolveSemanticColor(semanticColorName);
        if (rgb) {
            textNode.fills = [this.createSolidPaint(rgb)];
            console.log(`✅ Applied semantic color "${semanticColorName}" to text node`);
            return true;
        }
        return false;
    }
    /**
     * Helper method to resolve and apply semantic colors to any node with fills
     */
    static applySemanticFillColor(node, semanticColorName) {
        const rgb = this.resolveSemanticColor(semanticColorName);
        if (rgb && 'fills' in node) {
            node.fills = [this.createSolidPaint(rgb)];
            console.log(`✅ Applied semantic fill color "${semanticColorName}" to node`);
            return true;
        }
        return false;
    }
}
// Static storage for Color Styles scanned from the design system
FigmaRenderer.cachedColorStyles = null;
