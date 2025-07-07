// src/core/design-system-scanner-service.ts
// Design System Scanner service for AIDesigner plugin - handles all component scanning logic
import { ComponentScanner } from './component-scanner';
import { FigmaRenderer } from './figma-renderer';
export class DesignSystemScannerService {
    /**
     * Main scanning function - scans all pages for components and Color Styles
     */
    static async scanDesignSystem(progressCallback) {
        console.log("🔍 Starting comprehensive design system scan with Color Styles...");
        try {
            progressCallback === null || progressCallback === void 0 ? void 0 : progressCallback({ current: 0, total: 100, status: "Initializing comprehensive scan..." });
            // Use the enhanced ComponentScanner that includes Color Styles
            const scanSession = await ComponentScanner.scanDesignSystem();
            progressCallback === null || progressCallback === void 0 ? void 0 : progressCallback({ current: 50, total: 100, status: "Integrating Color Styles with renderer..." });
            // Initialize the FigmaRenderer with the scanned Color Styles
            FigmaRenderer.setColorStyles(scanSession.colorStyles || null);
            progressCallback === null || progressCallback === void 0 ? void 0 : progressCallback({ current: 100, total: 100, status: "Comprehensive scan complete!" });
            return scanSession;
        }
        catch (e) {
            console.error("❌ Critical error in comprehensive design system scan:", e);
            throw e;
        }
    }
    /**
     * Legacy method for backward compatibility - returns only components
     */
    static async scanComponents(progressCallback) {
        const session = await this.scanDesignSystem(progressCallback);
        return session.components;
    }
    /**
     * Scan only Color Styles without components
     */
    static async scanColorStyles() {
        console.log("🎨 Scanning only Color Styles...");
        try {
            const colorStyles = await ComponentScanner.scanFigmaColorStyles();
            FigmaRenderer.setColorStyles(colorStyles);
            return colorStyles;
        }
        catch (e) {
            console.error("❌ Error scanning Color Styles:", e);
            throw e;
        }
    }
    // Remove the old implementation below and replace with legacy support
    static async legacyScanImplementation(progressCallback) {
        console.log("🔍 Starting legacy design system scan...");
        const components = [];
        try {
            // Load all pages first
            await figma.loadAllPagesAsync();
            console.log("✅ All pages loaded");
            const totalPages = figma.root.children.length;
            let currentPage = 0;
            progressCallback === null || progressCallback === void 0 ? void 0 : progressCallback({ current: 0, total: totalPages, status: "Initializing scan..." });
            for (const page of figma.root.children) {
                currentPage++;
                const pageStatus = `Scanning page: "${page.name}" (${currentPage}/${totalPages})`;
                console.log(`📋 ${pageStatus}`);
                progressCallback === null || progressCallback === void 0 ? void 0 : progressCallback({
                    current: currentPage,
                    total: totalPages,
                    status: pageStatus
                });
                try {
                    // Find all COMPONENT and COMPONENT_SET nodes
                    const allNodes = page.findAll(node => {
                        if (node.type === 'COMPONENT_SET') {
                            return true;
                        }
                        if (node.type === 'COMPONENT') {
                            // Only include components that are not part of a component set
                            return !!(node.parent && node.parent.type !== 'COMPONENT_SET');
                        }
                        return false;
                    });
                    console.log(`✅ Found ${allNodes.length} main components on page "${page.name}"`);
                    // Analyze each component
                    for (const node of allNodes) {
                        try {
                            if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
                                const componentInfo = await ComponentScanner.analyzeComponent(node);
                                if (componentInfo) {
                                    // Add page information
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
            progressCallback === null || progressCallback === void 0 ? void 0 : progressCallback({
                current: totalPages,
                total: totalPages,
                status: `Scan complete! Found ${components.length} components`
            });
            console.log(`🎉 Design system scan complete! Found ${components.length} unique components.`);
            return components;
        }
        catch (e) {
            console.error("❌ Critical error in design system scan:", e);
            throw e;
        }
    }
    /**
     * Generate LLM prompt with components and color styles
     */
    static generateLLMPrompt(components, colorStyles) {
        return ComponentScanner.generateLLMPrompt(components, colorStyles);
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
        // Extract variant information for COMPONENT_SET nodes
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
        // Priority patterns for better matching
        const priorityPatterns = [
            'icon-button', 'upload', 'form', 'context-menu', 'modal-header', 'list-item',
            'appbar', 'dialog', 'snackbar', 'bottomsheet', 'actionsheet', 'searchbar',
            'fab', 'breadcrumb', 'pagination', 'skeleton', 'textarea', 'checkbox',
            'radio', 'switch', 'slider', 'tab', 'navigation', 'tooltip', 'badge',
            'progress', 'avatar', 'chip', 'stepper', 'chart', 'table', 'calendar',
            'timeline', 'gallery', 'rating'
        ];
        // Check priority patterns first
        for (const type of priorityPatterns) {
            if ((_a = patterns[type]) === null || _a === void 0 ? void 0 : _a.test(name))
                return type;
        }
        // Check remaining patterns
        for (const type in patterns) {
            if (patterns.hasOwnProperty(type) && !priorityPatterns.includes(type)) {
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
            // Use default variant for component sets, otherwise use the component directly
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
     * Save scan results to Figma storage - supports full scan session with color styles
     */
    static async saveScanResults(components, colorStyles) {
        try {
            const scanSession = {
                components,
                colorStyles: colorStyles || undefined,
                scanTime: Date.now(),
                version: "2.0.0",
                fileKey: figma.fileKey || figma.root.id
            };
            await figma.clientStorage.setAsync('design-system-scan', scanSession);
            await figma.clientStorage.setAsync('last-scan-results', components);
            const colorStylesCount = colorStyles ? Object.values(colorStyles).reduce((sum, styles) => sum + styles.length, 0) : 0;
            console.log(`💾 Saved ${components.length} components and ${colorStylesCount} color styles with session data`);
        }
        catch (error) {
            console.error("❌ Error saving scan results:", error);
            try {
                // Fallback save
                await figma.clientStorage.setAsync('last-scan-results', components);
                console.log("💾 Fallback save successful");
            }
            catch (fallbackError) {
                console.warn("⚠️ Could not save scan results:", fallbackError);
            }
        }
    }
    /**
     * Save complete scan session including color styles
     */
    static async saveScanSession(scanSession) {
        try {
            await figma.clientStorage.setAsync('design-system-scan', scanSession);
            await figma.clientStorage.setAsync('last-scan-results', scanSession.components);
            const colorStylesCount = scanSession.colorStyles ? Object.values(scanSession.colorStyles).reduce((sum, styles) => sum + styles.length, 0) : 0;
            console.log(`💾 Saved complete scan session: ${scanSession.components.length} components and ${colorStylesCount} color styles`);
        }
        catch (error) {
            console.error("❌ Error saving scan session:", error);
            throw error;
        }
    }
    /**
     * Get component ID by type for UI generation
     */
    static async getComponentIdByType(type) {
        const searchType = type.toLowerCase();
        const scanResults = await figma.clientStorage.getAsync('last-scan-results');
        if (scanResults && Array.isArray(scanResults)) {
            // First try exact type match with good confidence
            const matchingComponent = scanResults.find((comp) => comp.suggestedType.toLowerCase() === searchType && comp.confidence >= 0.7);
            if (matchingComponent)
                return matchingComponent.id;
            // Fallback to name matching
            const nameMatchingComponent = scanResults.find((comp) => comp.name.toLowerCase().includes(searchType));
            if (nameMatchingComponent)
                return nameMatchingComponent.id;
        }
        console.log(`❌ Component ID for type "${type}" not found`);
        return null;
    }
    /**
     * Get saved scan results from storage
     */
    static async getSavedScanResults() {
        try {
            const scanResults = await figma.clientStorage.getAsync('last-scan-results');
            return scanResults || null;
        }
        catch (error) {
            console.error("❌ Error getting saved scan results:", error);
            return null;
        }
    }
    /**
     * Get scan session data
     */
    static async getScanSession() {
        try {
            const scanSession = await figma.clientStorage.getAsync('design-system-scan');
            return scanSession || null;
        }
        catch (error) {
            console.error("❌ Error getting scan session:", error);
            return null;
        }
    }
    /**
     * Update component type manually
     */
    static async updateComponentType(componentId, newType) {
        try {
            const scanResults = await figma.clientStorage.getAsync('last-scan-results');
            if (scanResults && Array.isArray(scanResults)) {
                let componentName = '';
                const updatedResults = scanResults.map(comp => {
                    if (comp.id === componentId) {
                        componentName = comp.name;
                        return Object.assign(Object.assign({}, comp), { suggestedType: newType, confidence: 1.0 });
                    }
                    return comp;
                });
                await this.saveScanResults(updatedResults);
                return { success: true, componentName };
            }
            return { success: false };
        }
        catch (error) {
            console.error("❌ Error updating component type:", error);
            return { success: false };
        }
    }
    /**
     * Clear all scan data
     */
    static async clearScanData() {
        try {
            await figma.clientStorage.setAsync('design-system-scan', null);
            await figma.clientStorage.setAsync('last-scan-results', null);
            console.log("✅ Scan data cleared");
        }
        catch (error) {
            console.error("❌ Error clearing scan data:", error);
        }
    }
}
