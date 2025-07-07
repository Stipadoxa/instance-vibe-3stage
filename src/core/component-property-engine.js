// src/core/component-property-engine.ts
// Systematic component property validation and processing engine
class TabComponentHandler {
    preprocessProperties(properties) {
        // Ensure Label is treated as array
        if (properties.Label && !Array.isArray(properties.Label)) {
            properties.Label = [properties.Label];
        }
        return properties;
    }
    postProcessInstance(instance, properties) {
        // Tab-specific post-processing if needed
    }
    getVariantPurpose(variantName) {
        const purposes = {
            'Type': 'layout behavior (Fixed vs Scrollable)',
            'Style': 'visual emphasis (Primary vs Secondary)',
            'Configuration': 'content structure (Label-only vs Label & Icon)'
        };
        return purposes[variantName] || 'component appearance';
    }
}
class ChipComponentHandler {
    preprocessProperties(properties) {
        if (properties.label && !Array.isArray(properties.label)) {
            properties.label = [properties.label];
        }
        return properties;
    }
    postProcessInstance(instance, properties) {
        // Chip-specific handling
    }
    getVariantPurpose(variantName) {
        return 'chip appearance and behavior';
    }
}
export class PerformanceTracker {
    static async track(operation, fn) {
        const start = Date.now();
        try {
            return await fn();
        }
        finally {
            const duration = Date.now() - start;
            if (!PerformanceTracker.metrics.has(operation)) {
                PerformanceTracker.metrics.set(operation, []);
            }
            PerformanceTracker.metrics.get(operation).push(duration);
            console.log(`⏱️ ${operation}: ${duration.toFixed(2)}ms`);
        }
    }
    static getReport() {
        const report = {};
        PerformanceTracker.metrics.forEach((durations, operation) => {
            report[operation] = {
                avg: durations.reduce((a, b) => a + b, 0) / durations.length,
                min: Math.min(...durations),
                max: Math.max(...durations)
            };
        });
        return report;
    }
}
PerformanceTracker.metrics = new Map();
// ===== MAIN ENGINE CLASS =====
export class ComponentPropertyEngine {
    static async initialize() {
        try {
            await PerformanceTracker.track('engine-initialization', async () => {
                // Enable performance optimization
                figma.skipInvisibleInstanceChildren = true;
                // Preload common fonts
                await ComponentPropertyEngine.preloadCommonFonts();
                const scanResults = await figma.clientStorage.getAsync('last-scan-results');
                if (!scanResults || !Array.isArray(scanResults)) {
                    console.warn("⚠️ No scan results found. Run ComponentScanner.scanDesignSystem() first.");
                    return;
                }
                for (const component of scanResults) {
                    const schema = await ComponentPropertyEngine.buildComponentSchemaFromScanData(component);
                    ComponentPropertyEngine.componentSchemas.set(component.id, schema);
                    console.log(`📋 Loaded schema for ${schema.name} (${schema.id})`);
                }
            });
            console.log(`🎯 ComponentPropertyEngine initialized with ${ComponentPropertyEngine.componentSchemas.size} component schemas`);
        }
        catch (error) {
            console.error("❌ Failed to initialize ComponentPropertyEngine:", error);
        }
    }
    static async preloadCommonFonts() {
        if (ComponentPropertyEngine.commonFontsLoaded)
            return;
        const commonFonts = [
            { family: "Inter", style: "Regular" },
            { family: "Inter", style: "Medium" },
            { family: "Inter", style: "Bold" },
            { family: "Roboto", style: "Regular" },
            { family: "Roboto", style: "Medium" },
            { family: "Roboto", style: "Bold" },
        ];
        await Promise.all(commonFonts.map(font => figma.loadFontAsync(font).catch(() => {
            console.warn(`⚠️ Could not preload font: ${font.family} ${font.style}`);
        })));
        ComponentPropertyEngine.commonFontsLoaded = true;
        console.log("✅ Common fonts preloaded");
    }
    static async buildComponentSchemaFromScanData(scanData) {
        // Get modern component properties from actual component
        let componentProperties = {};
        let availableVariants = {};
        try {
            const componentNode = await figma.getNodeByIdAsync(scanData.id);
            if (componentNode && componentNode.type === 'COMPONENT_SET') {
                // Use modern componentPropertyDefinitions instead of deprecated variantGroupProperties
                const propertyDefs = componentNode.componentPropertyDefinitions;
                if (propertyDefs) {
                    componentProperties = propertyDefs;
                    // Extract variant properties from modern API
                    Object.entries(propertyDefs).forEach(([key, definition]) => {
                        if (definition.type === 'VARIANT' && definition.variantOptions) {
                            availableVariants[key] = definition.variantOptions;
                        }
                    });
                }
            }
        }
        catch (error) {
            // Fallback to scan data
            if (scanData.variantDetails) {
                Object.entries(scanData.variantDetails).forEach(([key, values]) => {
                    availableVariants[key] = Array.isArray(values) ? values : [values];
                });
            }
        }
        // Build text layers with enhanced metadata
        const textLayers = {};
        if (scanData.textHierarchy && Array.isArray(scanData.textHierarchy)) {
            scanData.textHierarchy.forEach((textInfo) => {
                const dataType = this.inferTextDataType(scanData.suggestedType, textInfo.nodeName);
                textLayers[textInfo.nodeName] = {
                    nodeId: textInfo.nodeId,
                    nodeName: textInfo.nodeName,
                    classification: textInfo.classification || 'secondary',
                    dataType: dataType,
                    maxItems: dataType === 'array' ? this.inferMaxItems(scanData.suggestedType, textInfo.nodeName) : undefined,
                    fontSize: textInfo.fontSize,
                    fontWeight: textInfo.fontWeight
                };
            });
        }
        // Build media layers from scan data
        const mediaLayers = {};
        [scanData.componentInstances, scanData.vectorNodes, scanData.imageNodes].forEach(nodeArray => {
            if (nodeArray) {
                nodeArray.forEach(node => {
                    mediaLayers[node.nodeName] = {
                        nodeId: node.nodeId,
                        nodeName: node.nodeName,
                        mediaType: this.inferMediaType(node.nodeName),
                        dataType: 'single',
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
            componentType: scanData.suggestedType || 'unknown',
            scanTimestamp: Date.now(),
            scanVersion: "1.1",
            componentHash: "hash_" + Date.now().toString(36)
        };
    }
    static generateComponentHash(scanData) {
        var _a, _b;
        // Simple hash based on component structure
        const hashData = JSON.stringify({
            variants: scanData.variants,
            textLayers: (_a = scanData.textLayers) === null || _a === void 0 ? void 0 : _a.length,
            componentInstances: (_b = scanData.componentInstances) === null || _b === void 0 ? void 0 : _b.length
        });
        // Simple hash function for Figma environment (btoa may not be available)
        try {
            return btoa(hashData).substring(0, 8);
        }
        catch (e) {
            // Fallback: simple string hash
            let hash = 0;
            for (let i = 0; i < hashData.length; i++) {
                const char = hashData.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash).toString(16).substring(0, 8);
        }
    }
    static inferTextDataType(componentType, layerName) {
        const layerLower = layerName.toLowerCase();
        // Components that support arrays
        const arrayPatterns = {
            'tab': ['label'], 'tabs': ['label'],
            'chip': ['label', 'text'],
            'list': ['item', 'option', 'choice'],
            'navigation': ['label', 'text'],
            'menu': ['item', 'option', 'label'],
            'breadcrumb': ['item', 'label'],
            'carousel': ['caption', 'title']
        };
        const componentPatterns = arrayPatterns[componentType];
        if (componentPatterns) {
            const supportsArray = componentPatterns.some(pattern => layerLower.includes(pattern));
            if (supportsArray)
                return 'array';
        }
        return 'single';
    }
    static inferMaxItems(componentType, layerName) {
        const maxItemsMap = {
            'tab': 8, 'tabs': 8,
            'navigation': 6,
            'chip': 10,
            'list': 50,
            'menu': 20,
            'breadcrumb': 5,
            'carousel': 10
        };
        return maxItemsMap[componentType] || 10;
    }
    static inferMediaType(nodeName) {
        const nameLower = nodeName.toLowerCase();
        if (nameLower.includes('avatar') || nameLower.includes('profile'))
            return 'avatar';
        if (nameLower.includes('badge') || nameLower.includes('indicator'))
            return 'badge';
        if (nameLower.includes('image') || nameLower.includes('photo'))
            return 'image';
        return 'icon';
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
                        suggestion: 'Ensure design system has been scanned',
                        llmHint: 'Run ComponentScanner.scanDesignSystem() first'
                    }]
            };
        }
        // Apply component-specific preprocessing
        const handler = this.componentHandlers.get(schema.componentType);
        const processedRawProperties = handler ?
            handler.preprocessProperties(Object.assign({}, rawProperties)) :
            rawProperties;
        const result = {
            isValid: true,
            processedProperties: { variants: {}, textProperties: {}, mediaProperties: {}, layoutProperties: {} },
            warnings: [],
            errors: []
        };
        // Process each property intelligently
        Object.entries(processedRawProperties).forEach(([key, value]) => {
            // Skip the 'variants' object itself if present
            if (key === 'variants' && typeof value === 'object') {
                Object.entries(value).forEach(([variantKey, variantValue]) => {
                    result.processedProperties.variants[variantKey] = variantValue;
                });
                return;
            }
            // Check if it's a variant (modern API first, then legacy)
            if (schema.componentProperties[key] || schema.availableVariants[key]) {
                result.processedProperties.variants[key] = value;
            }
            // Check if it's a text property
            else if (schema.textLayers[key]) {
                result.processedProperties.textProperties[key] = value;
            }
            // Check if it's a media property
            else if (schema.mediaLayers[key]) {
                result.processedProperties.mediaProperties[key] = value;
            }
            // Check if it's a layout property
            else if (['horizontalSizing', 'verticalSizing', 'layoutAlign', 'layoutGrow',
                'minWidth', 'maxWidth', 'minHeight', 'maxHeight'].some(prop => key.toLowerCase().includes(prop.toLowerCase()))) {
                result.processedProperties.layoutProperties[key] = value;
            }
            // Try semantic matching
            else {
                const textMatch = this.findSemanticMatch(key, Object.keys(schema.textLayers));
                const variantMatch = this.findSemanticMatch(key, Object.keys(schema.availableVariants));
                const mediaMatch = this.findSemanticMatch(key, Object.keys(schema.mediaLayers));
                if (textMatch) {
                    result.processedProperties.textProperties[textMatch] = value;
                    result.warnings.push(`Mapped "${key}" to text layer "${textMatch}"`);
                }
                else if (variantMatch) {
                    result.processedProperties.variants[variantMatch] = value;
                    result.warnings.push(`Mapped "${key}" to variant "${variantMatch}"`);
                }
                else if (mediaMatch) {
                    result.processedProperties.mediaProperties[mediaMatch] = value;
                    result.warnings.push(`Mapped "${key}" to media layer "${mediaMatch}"`);
                }
                else {
                    result.warnings.push(`Unknown property "${key}" for component ${schema.name}`);
                }
            }
        });
        // Validate variants
        Object.entries(result.processedProperties.variants).forEach(([variantName, variantValue]) => {
            const modernProp = schema.componentProperties[variantName];
            const legacyValues = schema.availableVariants[variantName];
            if (modernProp && modernProp.type === 'VARIANT') {
                if (!modernProp.variantOptions.includes(String(variantValue))) {
                    const variantPurpose = handler ? handler.getVariantPurpose(variantName) : 'component appearance';
                    result.errors.push({
                        message: `Invalid value "${variantValue}" for variant "${variantName}"`,
                        suggestion: `Use one of: ${modernProp.variantOptions.map((v) => `"${v}"`).join(', ')}`,
                        jsonPath: `properties.${variantName}`,
                        llmHint: `For ${schema.componentType} components, ${variantName} controls ${variantPurpose}`
                    });
                }
            }
            else if (legacyValues) {
                if (!legacyValues.includes(String(variantValue))) {
                    const variantPurpose = handler ? handler.getVariantPurpose(variantName) : 'component appearance';
                    result.errors.push({
                        message: `Invalid value "${variantValue}" for variant "${variantName}"`,
                        suggestion: `Use one of: ${legacyValues.map(v => `"${v}"`).join(', ')}`,
                        jsonPath: `properties.${variantName}`,
                        llmHint: `For ${schema.componentType} components, ${variantName} controls ${variantPurpose}`
                    });
                }
            }
        });
        // Validate text properties
        Object.entries(result.processedProperties.textProperties).forEach(([textProp, value]) => {
            const textLayer = schema.textLayers[textProp];
            if (textLayer && textLayer.dataType === 'array' && !Array.isArray(value)) {
                result.warnings.push(`Property "${textProp}" expects array but got ${typeof value}. Converting to array.`);
                result.processedProperties.textProperties[textProp] = [value];
            }
        });
        result.isValid = result.errors.length === 0;
        return result;
    }
    static findSemanticMatch(propertyKey, availableKeys) {
        const keyLower = propertyKey.toLowerCase();
        // Direct fuzzy matching
        for (const availableKey of availableKeys) {
            const availableLower = availableKey.toLowerCase();
            // Exact match (case insensitive)
            if (availableLower === keyLower)
                return availableKey;
            // Remove common separators and compare
            const normalizedKey = keyLower.replace(/[-_\s]/g, '');
            const normalizedAvailable = availableLower.replace(/[-_\s]/g, '');
            if (normalizedAvailable === normalizedKey)
                return availableKey;
            // Partial matches
            if (availableLower.includes(keyLower) || keyLower.includes(availableLower)) {
                return availableKey;
            }
        }
        // Semantic equivalents
        const semanticMap = {
            'text': ['label', 'title', 'headline', 'content'],
            'label': ['text', 'title', 'headline'],
            'supporting': ['subtitle', 'description', 'secondary'],
            'trailing': ['end', 'right', 'action'],
            'leading': ['start', 'left', 'icon'],
        };
        for (const [semantic, equivalents] of Object.entries(semanticMap)) {
            if (keyLower.includes(semantic)) {
                for (const equivalent of equivalents) {
                    const match = availableKeys.find(k => k.toLowerCase().includes(equivalent));
                    if (match)
                        return match;
                }
            }
        }
        return null;
    }
    static getComponentSchema(componentId) {
        return ComponentPropertyEngine.componentSchemas.get(componentId) || null;
    }
    static getAllSchemas() {
        return Array.from(ComponentPropertyEngine.componentSchemas.values());
    }
    static isSchemaStale(schema) {
        const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
        return Date.now() - schema.scanTimestamp > staleThreshold;
    }
    static debugSchema(componentId) {
        const schema = this.getComponentSchema(componentId);
        if (schema) {
            console.log(`📋 Schema for ${schema.name}:`);
            console.log("  🎯 Variants:", Object.keys(schema.availableVariants));
            console.log("  📝 Text Layers:", Object.keys(schema.textLayers));
            Object.entries(schema.textLayers).forEach(([name, info]) => {
                console.log(`    - ${name}: ${info.dataType}${info.maxItems ? ` (max: ${info.maxItems})` : ''}`);
            });
            console.log("  🖼️ Media Layers:", Object.keys(schema.mediaLayers));
            console.log("  📅 Scanned:", new Date(schema.scanTimestamp).toLocaleString());
            console.log("  🔢 Version:", schema.scanVersion);
        }
        else {
            console.log(`❌ No schema found for component ${componentId}`);
        }
    }
    static async createSchemaDebugFrame(componentId) {
        const schema = this.getComponentSchema(componentId);
        if (!schema)
            return;
        const debugFrame = figma.createFrame();
        debugFrame.name = `Debug: ${schema.name}`;
        debugFrame.resize(400, 600);
        debugFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
        await figma.loadFontAsync({ family: "Inter", style: "Bold" });
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        let yPos = 20;
        // Title
        const title = figma.createText();
        title.fontName = { family: "Inter", style: "Bold" };
        title.fontSize = 18;
        title.characters = `${schema.name} (${schema.componentType})`;
        title.x = 20;
        title.y = yPos;
        debugFrame.appendChild(title);
        yPos += 40;
        // Variants section
        if (Object.keys(schema.availableVariants).length > 0) {
            const variantsTitle = figma.createText();
            variantsTitle.fontName = { family: "Inter", style: "Bold" };
            variantsTitle.fontSize = 14;
            variantsTitle.characters = "🎯 Variants:";
            variantsTitle.x = 20;
            variantsTitle.y = yPos;
            debugFrame.appendChild(variantsTitle);
            yPos += 25;
            Object.entries(schema.availableVariants).forEach(([name, values]) => {
                const variantText = figma.createText();
                variantText.fontName = { family: "Inter", style: "Regular" };
                variantText.fontSize = 12;
                variantText.characters = `${name}: [${values.join(', ')}]`;
                variantText.x = 30;
                variantText.y = yPos;
                debugFrame.appendChild(variantText);
                yPos += 20;
            });
            yPos += 10;
        }
        // Text layers section
        if (Object.keys(schema.textLayers).length > 0) {
            const textTitle = figma.createText();
            textTitle.fontName = { family: "Inter", style: "Bold" };
            textTitle.fontSize = 14;
            textTitle.characters = "📝 Text Layers:";
            textTitle.x = 20;
            textTitle.y = yPos;
            debugFrame.appendChild(textTitle);
            yPos += 25;
            Object.entries(schema.textLayers).forEach(([name, info]) => {
                const layerText = figma.createText();
                layerText.fontName = { family: "Inter", style: "Regular" };
                layerText.fontSize = 12;
                layerText.characters = `${name}: ${info.dataType}${info.maxItems ? ` (max: ${info.maxItems})` : ''} - ${info.classification}`;
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
}
ComponentPropertyEngine.componentSchemas = new Map();
ComponentPropertyEngine.componentHandlers = new Map([
    ['tab', new TabComponentHandler()],
    ['tabs', new TabComponentHandler()],
    ['chip', new ChipComponentHandler()],
]);
ComponentPropertyEngine.commonFontsLoaded = false;
