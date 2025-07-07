// component-scanner.ts
// Design system component scanning and analysis for AIDesigner
export class ComponentScanner {
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
     * Convert Figma PaintStyle to our ColorStyle interface
     */
    static async convertPaintStyleToColorStyle(paintStyle) {
        const colorInfo = this.convertPaintToColorInfo(paintStyle.paints[0]);
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
        console.log("🔍 Starting comprehensive design system scan...");
        const components = [];
        let colorStyles;
        try {
            await figma.loadAllPagesAsync();
            console.log("✅ All pages loaded");
            // First, scan Color Styles
            console.log("\n🎨 Phase 1: Scanning Color Styles...");
            try {
                colorStyles = await this.scanFigmaColorStyles();
            }
            catch (error) {
                console.warn("⚠️ Color Styles scanning failed, continuing without color styles:", error);
                colorStyles = undefined;
            }
            // Then, scan components
            console.log("\n🧩 Phase 2: Scanning Components...");
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
                scanTime: Date.now(),
                version: "2.0.0",
                fileKey: figma.fileKey || undefined
            };
            console.log(`\n🎉 Comprehensive scan complete!`);
            console.log(`   📦 Components: ${components.length}`);
            console.log(`   🎨 Color Styles: ${colorStyles ? Object.values(colorStyles).reduce((sum, styles) => sum + styles.length, 0) : 0}`);
            console.log(`   📄 File Key: ${scanSession.fileKey || 'Unknown'}`);
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
        // NEW: Extract color and style information
        const styleInfo = this.extractStyleInfo(comp);
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
            textLayers: textLayers.length > 0 ? textLayers : undefined,
            textHierarchy: textHierarchy.length > 0 ? textHierarchy : undefined,
            componentInstances: componentInstances.length > 0 ? componentInstances : undefined,
            vectorNodes: vectorNodes.length > 0 ? vectorNodes : undefined,
            imageNodes: imageNodes.length > 0 ? imageNodes : undefined,
            styleInfo: styleInfo, // NEW: Include color and style information
            isFromLibrary: false
        };
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
    static analyzeTextHierarchy(comp) {
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
                            fontSizes.push(fontSize);
                            textNodeData.push({ node: textNode, fontSize, fontWeight });
                        }
                        catch (e) {
                            console.warn(`Could not read font properties for text node "${textNode.name}"`);
                        }
                    }
                });
                // Sort font sizes to determine hierarchy thresholds
                const uniqueSizes = [...new Set(fontSizes)].sort((a, b) => b - a);
                textNodeData.forEach(({ node, fontSize, fontWeight }) => {
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
                            const firstFill = node.fills[0];
                            if (firstFill.visible !== false) {
                                textColor = this.convertPaintToColorInfo(firstFill) || undefined;
                            }
                        }
                    }
                    catch (e) {
                        console.warn(`Could not extract text color for "${node.name}"`);
                    }
                    textHierarchy.push({
                        nodeName: node.name,
                        nodeId: node.id,
                        fontSize,
                        fontWeight,
                        classification,
                        visible: node.visible,
                        characters,
                        textColor // NEW: Include text color information
                    });
                });
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
                for (const fill of node.fills) {
                    if (fill.visible !== false) {
                        const colorInfo = this.convertPaintToColorInfo(fill);
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
                for (const stroke of node.strokes) {
                    if (stroke.visible !== false) {
                        const colorInfo = this.convertPaintToColorInfo(stroke);
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
     */
    static convertPaintToColorInfo(paint) {
        try {
            if (paint.type === 'SOLID' && paint.color) {
                return {
                    type: 'SOLID',
                    color: this.rgbToHex(paint.color),
                    opacity: paint.opacity || 1
                };
            }
            if (paint.type === 'GRADIENT_LINEAR' && paint.gradientStops) {
                return {
                    type: 'GRADIENT_LINEAR',
                    gradientStops: paint.gradientStops.map(stop => ({
                        color: this.rgbToHex(stop.color),
                        position: stop.position
                    })),
                    opacity: paint.opacity || 1
                };
            }
            // Add support for other gradient types
            if ((paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') && paint.gradientStops) {
                return {
                    type: paint.type,
                    gradientStops: paint.gradientStops.map(stop => ({
                        color: this.rgbToHex(stop.color),
                        position: stop.position
                    })),
                    opacity: paint.opacity || 1
                };
            }
            if (paint.type === 'IMAGE') {
                return {
                    type: 'IMAGE',
                    opacity: paint.opacity || 1
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
            const textNodes = node.findAll(n => n.type === 'TEXT');
            for (const textNode of textNodes) {
                if (textNode.visible && textNode.fills && Array.isArray(textNode.fills)) {
                    for (const fill of textNode.fills) {
                        if (fill.visible !== false && fill.type === 'SOLID') {
                            return this.convertPaintToColorInfo(fill);
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
                            const colorInfo = this.convertPaintToColorInfo(fill);
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
}
